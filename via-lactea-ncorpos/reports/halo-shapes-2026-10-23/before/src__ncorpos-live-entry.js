// Maintained GPU-only controller. Historical CPU controllers remain archived.
import {requireEnergyAuditCadence} from './energy-audit-cadence.js';
import {liveInputResolution} from './live-particle-input.js';
import {initializeLiveDiagnostics as initializeLaboratory} from './live-diagnostics.js';
import {stepBatch} from './compute/scheduling.js';
import {detectCapabilities,assessResources} from './compute/capability.js';
import {compareCPUvsGPU} from './compute/gpu.js';
import {LiveGPUBackend} from './compute/gpu-live.js';
import {GeometryHaloGPUBackend} from './compute/gpu-halo-geometry.js';
import {benchmarkLiveRepresentation} from './compute/halo-representation-benchmark.js';
import {recommendGPUBase,GPU_AUTO_TARGET_MS} from './compute/gpu-auto-policy.js';
import {GPURenderer} from './render/gpu-renderer.js';
import {OrbitCamera} from './render/camera.js';
import {waitIdle} from './export/state.js';
const $=id=>document.getElementById(id),fmt=new Intl.NumberFormat('pt-BR'),MiB=1024**2;
let capabilities=null,worker=null,pending=null,gpu=null,renderer=null,camera=null,canvas=$('galaxy');
let ready=false,running=false,creating=false,dirty=false,generation=0,current=null,lastDiagnostic=null,lastErrors=null,lastMeta=null,benchmarkSamples=[],gpuValidation=null;
let physicsTime=0,physicsSteps=0,stepMs=0,lastGpuDiagnostic=0,renderRequest=0,lastFrame=0,frames=0,fpsStart=0,rateTime=0,rateStart=0;
let stepSamples=[],automaticBasePrepared=false;
let lastDiagnosticTime=0;
let inFlight=false,computeMs=0,needsPausedSnapshot=false;
function status(text){$('status').textContent=text;}
function refreshButtons(){ $('start').disabled=creating||running||inFlight||!$('energy-audit-cadence').value;$('energy-audit-cadence').disabled=creating||running;$('pause').disabled=!running;$('reset').disabled=creating||!$('energy-audit-cadence').value;$('stop').disabled=!worker&&!gpu&&!creating;$('benchmark').disabled=creating||running||inFlight;$('validate-gpu').disabled=creating||running||inFlight;$('n').disabled=creating||$('mode').value==='auto';$('halo-refinement').disabled=creating||$('model').value!=='halo'||$('halo-representation').value==='geometry';$('halo-representation').disabled=creating||$('model').value!=='halo';for(const id of ['mode','backend','force-method','model','seed','dt','epsilon'])$(id).disabled=creating; }
function config() {
  const requestedN=$('n').value?Number($('n').value):NaN,withHalo=$('model').value==='halo',haloRefinement=withHalo?Number($('halo-refinement').value):1,dt=Number($('dt').value),epsilon=Number($('epsilon').value),seed=Number($('seed').value);
  const haloRepresentation=withHalo?$('halo-representation').value:'particles',layout=liveInputResolution(requestedN,haloRefinement,withHalo,haloRepresentation);
  if(!Number.isSafeInteger(seed))throw Error('A semente precisa ser um inteiro seguro.');
  if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(epsilon)||epsilon<=0)throw Error('Verifique dt > 0 e ε > 0.');
  return {...layout,gpuDiagnostics:true,enforceMemoryBudget:false,enforceEnergyReferenceBudget:false,dt,epsilon,seed,energyAuditCadenceMyr:$('energy-audit-cadence').value?requireEnergyAuditCadence($('energy-audit-cadence').value):null,withHalo,requestedAlgorithm:$('force-method').value,requestedBackend:$('backend').value};
}
async function detect(){capabilities??=await detectCapabilities();const c=capabilities;$('hardware').textContent=`WebGPU ${c.webgpu.available?'disponível':'indisponível'} · CPU com ${c.hardwareConcurrency??'?'} processadores lógicos para análises e referência Float64. ${c.webgpu.info?.vendor??''} ${c.webgpu.info?.architecture??''}. RAM/VRAM exatas não são reveladas.`;return c;}
function newWorker(){if(typeof Worker==='undefined')throw Error('Este navegador não permite Web Workers; os cálculos não serão iniciados na interface.');const created=new Worker(new URL('./compute/gpu-diagnostic-worker.js',import.meta.url),{type:'module'});worker=created;created.onmessage=({data})=>{if(worker!==created)return;const p=pending;pending=null;if(!p)return;if(data.type==='error')p.reject(Error(data.message));else p.resolve(data);};created.onerror=e=>{if(worker!==created)return;pending?.reject(Error(e.message||'Falha no Worker'));pending=null;};}
function rpc(message,transfer=[]){if(!worker)newWorker();if(pending)throw Error('Já existe uma tarefa CPU pendente.');return new Promise((resolve,reject)=>{pending={resolve,reject};worker.postMessage(message,transfer);});}
function cancel(preserveLab=false){if(preserveLab!==true){laboratory.reset();energySavedStates=null;}needsPausedSnapshot=false;physicsTime=physicsSteps=computeMs=0;current=lastDiagnostic=lastErrors=lastMeta=null;lastDiagnosticTime=0;generation++;running=false;creating=false;ready=false;inFlight=false;pending?.reject(Error('Operação cancelada.'));pending=null;worker?.terminate();worker=null;renderer?.dispose();renderer=null;camera?.dispose();camera=null;gpu?.dispose();gpu=null;cancelAnimationFrame(renderRequest);renderRequest=0;
  frames=0;fpsStart=0;stepSamples=[];stepMs=0;
  $('empty').hidden=false;$('count').textContent='0';$('time').textContent='0.00 Myr';$('rate').textContent='0.00 Myr/s';$('fps').textContent='0 FPS';$('step-ms').textContent='—';$('backend-label').textContent='—';$('algorithm').textContent='—';
  $('counts').textContent='—';$('memory').textContent='— MiB';$('compute-time').textContent='0.00 s';$('steps').textContent='0';$('diagnostic-time').textContent='Sem diagnóstico.';for(const id of ['error-energy','error-momentum','error-angular'])$(id).textContent='—';
  $('initial-info').textContent='Os diagnósticos das condições iniciais aparecerão aqui. Conservação numérica e estabilidade do modelo exigem verificações separadas.';updateVisibleCount();updateHaloAppearance();
}
function replaceCanvas(){camera?.dispose();const next=canvas.cloneNode(false);canvas.replaceWith(next);canvas=next;camera=new OrbitCamera(canvas,{distance:75});}
function updateHaloAppearance(){const continuous=ready&&current?.withHalo&&current.haloRepresentation==='geometry';$('halo-mode-badge').hidden=!continuous;$('continuous-halo-note').hidden=!continuous;$('continuous-halo-display').hidden=!continuous;$('show-halo').closest('label').hidden=continuous;}
function updateEstimate(){const continuous=$('model').value==='halo'&&$('halo-representation').value==='geometry';$('n-label').textContent=continuous?'Partículas · bojo + disco':'Partículas de base · N₀';$('n-input-help').textContent=continuous?'N é o total integrado de bojo + disco. Exemplo: 80.000 gera 80.000 partículas; o halo é um campo contínuo.':'N₀ define a realização de base. O refinamento aumenta somente as partículas do halo.';try{if(!$('n').value){$('estimate').textContent='Avaliando a GPU antes de definir N…';$('halo-counts').textContent='N de base e contagens serão preenchidos após os ensaios.';return;}const c=config(),allocated=ready&&!dirty,a=assessResources(c.n,capabilities??{}, {...c,backend:'gpu'});$('halo-counts').textContent=`${allocated?'Execução atual':'Nova realização'}: bojo ${fmt.format(c.counts[0])} · disco ${fmt.format(c.counts[1])} · halo ${fmt.format(c.counts[2])}. Total: ${fmt.format(c.n)}.${c.haloRepresentation==='geometry'?' Halo contínuo estático; sem macropartículas.':c.withHalo?' Halo ×'+c.haloRefinement+'.':' Sem halo; refinamento não aplicado.'}`;$('estimate').textContent=`${fmt.format(c.n)} corpos físicos · ~${(a.estimate.estimatedBytes/MiB).toFixed(1)} MiB estimados${a.admissible?'':` · ${a.reasons.join(' ')}`}${allocated?' · buffers alocados nesta execução.':automaticBasePrepared?' · GPU avaliada; a realização será alocada ao iniciar.':' · alocação e custo final serão conferidos ao iniciar.'}`;}catch(e){$('estimate').textContent=e.message;$('halo-counts').textContent=e.message;}}
function admission(c,backend){const a=assessResources(c.n,capabilities,{...c,backend});if(!a.admissible)throw Error(a.reasons.join(' '));$('memory').textContent=`~${(a.estimate.estimatedBytes/MiB).toFixed(1)} MiB`;return a;}
function gpuDiagnosticOptions(c){return {dt:c.dt,energyAuditCadenceMyr:c.energyAuditCadenceMyr,enforceEnergyReferenceBudget:c.enforceEnergyReferenceBudget,withHalo:c.withHalo,haloRepresentation:c.haloRepresentation,haloMode:c.haloRepresentation==='geometry'?'fixed':'live',forceMethod:'GPU direct f32',algorithm:'direct',epsilon:c.epsilon};}
async function measureGPU(n,token,layout=null){
 const options={dt:Number($('dt').value),epsilon:Number($('epsilon').value),seed:Number($('seed').value),enforceMemoryBudget:false,haloRepresentation:$('model').value==='halo'?$('halo-representation').value:'particles'};
 const baseN=layout?.baseN??liveInputResolution(n,1,true,options.haloRepresentation).baseN,state=await rpc({type:'initial',config:{baseN,...options,haloRefinement:layout?.haloRefinement??1,withHalo:true}});if(token!==generation)throw Error('Avaliação cancelada.');
 const measured=await benchmarkLiveRepresentation(state.state,options);if(token!==generation)throw Error('Avaliação cancelada.');
 if(!measured.finite||!(measured.stepMs>0))throw Error('Ensaio GPU inválido.');benchmarkSamples.push(measured);return measured;
}
async function evaluateDevice(recommend=true,token=generation){
 await detect();if(!capabilities.webgpu.available)throw Error('WebGPU indisponível. Esta página exige GPU; nenhum motor CPU será escolhido automaticamente.');
 benchmarkSamples=[];automaticBasePrepared=false;
 status('Validando força direta GPU contra uma referência CPU Float64 pequena…');
 const check=await compareCPUvsGPU(undefined,{n:512,steps:3});if(token!==generation)throw Error('Avaliação cancelada.');gpuValidation=check;
 if(check.status!=='passed')throw Error('Validação WebGPU não aprovada: '+(check.reason??check.status));
 const enforceMemoryBudget=false;
 for(const n of [10000,30000]){if(!assessResources(n,capabilities,{backend:'gpu',enforceMemoryBudget,gpuDiagnostics:true}).admissible){if(!benchmarkSamples.length)throw Error('Os limites reais do adaptador não comportam o ensaio GPU inicial.');break;}status('Medindo '+fmt.format(n)+' corpos na GPU…');await measureGPU(n,token);}
 if(recommend&&$('mode').value==='auto'){
  let source=benchmarkSamples,chosen;
  for(let attempt=0;attempt<3;attempt++){
   chosen=recommendGPUBase(source,capabilities,{haloRefinement:$('model').value==='halo'?Number($('halo-refinement').value):1,withHalo:$('model').value==='halo',haloRepresentation:$('model').value==='halo'?$('halo-representation').value:'particles',enforceMemoryBudget});
   status('Verificando N automático: '+fmt.format(chosen.haloRepresentation==='geometry'?chosen.n:chosen.baseN)+' solicitadas, '+fmt.format(chosen.n)+' integradas…');
   const actual=await measureGPU(chosen.n,token,chosen);if(actual.stepMs<=GPU_AUTO_TARGET_MS*1.15){chosen.actualMeasurement=actual;break;}source=[actual];chosen=null;
  }
  if(!chosen)throw Error('A GPU variou demais para fixar N automático. Reavalie com menor carga no dispositivo ou use resolução manual.');
  if(chosen.haloRepresentation==='geometry')$('n').value=chosen.n;
  else $('n').value=chosen.baseN;
  automaticBasePrepared=true;dirty=true;
 }
 status('GPU avaliada: '+benchmarkSamples.map(x=>'N='+fmt.format(x.n)+', '+x.stepMs.toFixed(2)+' ms/passo').join(' · ')+'. '+(automaticBasePrepared?'N automático verificado antes de iniciar; alvo de cálculo ~20 ms/passo.':'Resolução manual preservada.'));
 updateEstimate();return benchmarkSamples;
}
async function calibrateAutomatic(){if(creating||running||inFlight||$('mode').value!=='auto')return;creating=true;$('n').value='';refreshButtons();updateEstimate();const token=generation;try{await evaluateDevice(true,token);}catch(e){if(token===generation)status(e.message);}finally{if(token===generation){creating=false;refreshButtons();}}}
function updateMetrics(result){if(result.laboratory)laboratory.add(result.laboratory);if(result.workMs>0)computeMs+=result.workMs;else if(result.lastStepMs>0)computeMs+=result.lastStepMs*(result.completedSteps??1);$('compute-time').textContent=(computeMs/1000).toFixed(2)+' s';$('steps').textContent=fmt.format(result.steps??physicsSteps);if(result.time!==undefined)physicsTime=result.time;if(result.steps!==undefined)physicsSteps=result.steps;if(result.lastStepMs>0&&result.completedSteps>0){stepSamples.push(result.lastStepMs);if(stepSamples.length>64)stepSamples.shift();stepMs=stepSamples.reduce((a,b)=>a+b,0)/stepSamples.length;}
  if(result.data)renderer.update(result.data);if(result.diagnostic){lastDiagnostic={...result.diagnostic,costMs:result.workMs??0};lastDiagnosticTime=physicsTime;$('diagnostic-time').textContent=`Diagnóstico em ${lastDiagnosticTime.toFixed(3)} Myr.`;}if(result.errors)lastErrors=result.errors;if(result.meta){lastMeta=result.meta;$('initial-info').textContent=`Jeans aproximado · semente ${lastMeta.seed} · ${lastMeta.unbound} partículas acima do escape analítico inicial · ${lastMeta.clippedStreaming} casos com rotação média limitada. Estabilidade prolongada ainda não validada.`;}
  $('time').textContent=`${physicsTime.toFixed(2)} Myr`;$('step-ms').textContent=stepSamples.length?`${stepMs.toFixed(2)} ms`:'—';
  if(lastErrors){$('error-energy').textContent=`${lastErrors.energy==null?"indisponível":(100*lastErrors.energy).toExponential(2)+" %"}${lastErrors.energyApproximate?' (U GPU f32)':''}`;$('error-momentum').textContent=lastDiagnostic?.conditions?.linearMomentum===false?'Não invariante':lastErrors.momentum.toExponential(2);$('error-angular').textContent=lastErrors.angularMomentum.toExponential(2);}
}
function drawFrame(now){if(!renderer)return;
  try{renderer.draw(camera.matrix(canvas.clientWidth,canvas.clientHeight),[$('show-bulge').checked,$('show-disk').checked,$('show-halo').checked],undefined,{eyeDepth:camera.depthRow(),showContinuousHalo:$('show-continuous-halo').checked,haloOpacity:Number($('continuous-halo-opacity').value)/100});}catch(e){pause(e.message);return;}
  frames++;if(!fpsStart)fpsStart=now;if(now-fpsStart>1000){$('fps').textContent=(frames*1000/(now-fpsStart)).toFixed(0)+' FPS';frames=0;fpsStart=now;}
  if(running&&now-rateStart>1000){$('rate').textContent=`${((physicsTime-rateTime)*1000/(now-rateStart)).toFixed(2)} Myr/s`;rateTime=physicsTime;rateStart=now;}
  lastFrame=now;renderRequest=requestAnimationFrame(drawFrame);
}
function pause(message='Simulação pausada.',snapshot=true){running=false;$('rate').textContent='0.00 Myr/s';status(message);needsPausedSnapshot=Boolean(snapshot&&ready&&!creating);refreshButtons();if(needsPausedSnapshot&&!inFlight&&!pending)capturePausedSnapshot(generation);}
async function capturePausedSnapshot(token){
  if(token!==generation||running||creating||!ready||inFlight||pending)return;needsPausedSnapshot=false;inFlight=true;refreshButtons();
  try{let result;if(gpu){const state=await gpu.snapshot();if(token!==generation)return;result=await rpc({type:'diagnostic',state,options:{...current.diagnosticOptions,effectiveParameters:gpu.effectiveParameters,rotationParameters:gpu.effectiveParameters}},[state.positions.buffer,state.velocities.buffer,state.masses.buffer,state.components.buffer,state.accelerations.buffer]);}
  else throw Error('Motor GPU indisponível.');if(token!==generation)return;updateMetrics(result);
  }catch(e){if(token===generation)status('Pausada; diagnóstico final: '+e.message);}finally{if(token===generation){inFlight=false;refreshButtons();if(dirty&&$('mode').value==='auto'&&!automaticBasePrepared)calibrateAutomatic();}}
}
function updateVisibleCount(){const ids=['show-bulge','show-disk','show-halo'];const n=ready?lastMeta.counts.reduce((sum,count,i)=>sum+($(ids[i]).checked?count:0),0):0;$('render-count').textContent=`Seleção visual: ${fmt.format(n)} corpos após filtros; a câmera pode recortar o campo.`;}
async function advance(token){if(!running||token!==generation||document.hidden)return;
  inFlight=true;
  try {
    if(!gpu)throw Error('Motor GPU indisponível.');const count=stepBatch(stepMs),result=await gpu.step(count);result.completedSteps=count;if(token!==generation)return;updateMetrics(result);
    if(gpu&&((physicsTime-lastDiagnosticTime>=laboratory.cadence()&&performance.now()-lastGpuDiagnostic>Math.max(1000,10*(lastDiagnostic?.costMs??0)))||laboratory.automaticDue(physicsTime))){const s=await gpu.snapshot();if(token!==generation)return;const d=await rpc({type:'diagnostic',state:s,options:{...current.diagnosticOptions,effectiveParameters:gpu.effectiveParameters,rotationParameters:gpu.effectiveParameters}},[s.positions.buffer,s.velocities.buffer,s.masses.buffer,s.components.buffer,s.accelerations.buffer]);if(token!==generation)return;updateMetrics(d);lastGpuDiagnostic=performance.now();}
    if(running)setTimeout(()=>advance(token),0);
  } catch(e){if(token===generation){laboratory.fail(e.message);pause(`Cálculos pausados: ${e.message}`,false);}}
  finally {if(token===generation){inFlight=false;refreshButtons();if(needsPausedSnapshot&&!running)await capturePausedSnapshot(token);}}
}
async function start(force=false,runAfter=true){if(creating||running)return;try{requireEnergyAuditCadence($('energy-audit-cadence').value);}catch(e){status(e.message);$('energy-audit-cadence').reportValidity();return;}
  if(ready&&!dirty&&!force){running=true;rateTime=physicsTime;rateStart=performance.now();status('Integrando forças das partículas no seu dispositivo.');refreshButtons();advance(generation);return;}
  cancel();const token=generation;creating=true;refreshButtons();
  try {
    await detect();if(token!==generation)return;
    if($('mode').value==='auto'&&!automaticBasePrepared)await evaluateDevice(true,token);
    else if(!benchmarkSamples.length)await evaluateDevice(false,token);
    if(token!==generation)return;const c=config();admission(c,'gpu');
    if(!capabilities.webgpu.available)throw Error('WebGPU indisponível; não há fallback CPU nesta página.');
    current={...c,selected:'gpu',diagnosticOptions:gpuDiagnosticOptions(c)};stepSamples=[];stepMs=0;
    status('Gerando '+fmt.format(c.n)+' corpos para força direta GPU…');replaceCanvas();
    const initial=await rpc({type:'initial',config:c});if(token!==generation)return;
    const Backend=c.haloRepresentation==='geometry'?GeometryHaloGPUBackend:LiveGPUBackend;const candidate=await Backend.create(undefined,reason=>{cancel();status('Dispositivo GPU perdido: '+(reason?.message??'reinicie'));refreshButtons();});if(token!==generation){candidate.dispose();return;}gpu=candidate;
    await gpu.initialize(initial.state,c);if(token!==generation)return;
    renderer=new GPURenderer(canvas,gpu);await renderer.initialize();
    const state=await gpu.snapshot();const d=await rpc({type:'diagnostic',state,options:{...current.diagnosticOptions,effectiveParameters:gpu.effectiveParameters},baseline:true},[state.positions.buffer,state.velocities.buffer,state.masses.buffer,state.components.buffer,state.accelerations.buffer]);if(token!==generation)return;
    updateMetrics({...d,meta:initial.state.meta,time:0,steps:0,lastStepMs:0});lastGpuDiagnostic=performance.now();
    $('empty').hidden=true;$('count').textContent=fmt.format(c.n);$('counts').textContent=lastMeta.counts.map((n,i)=>`${['bojo','disco','halo'][i]} ${fmt.format(n)}`).join(' · ');
    document.querySelector('.scene-header .eyebrow').textContent=c.haloRepresentation==='geometry'?'Gravitação newtoniana · bariões autogravitantes':'Sistema isolado · Gravitação newtoniana';$('algorithm').textContent=c.haloRepresentation==='geometry'?'Bariões Plummer + NFW contínuo · Newtoniano':'Direto O(N²) · Plummer';$('backend-label').textContent='GPU WebGPU · f32';
    creating=false;ready=true;dirty=false;running=runAfter;physicsTime=0;physicsSteps=0;rateTime=0;rateStart=performance.now();refreshButtons();updateEstimate();updateVisibleCount();updateHaloAppearance();drawFrame(performance.now());
    $('estimate').textContent+=' Cálculo efetivo: GPU WebGPU · f32.';
    status('Preparado: '+fmt.format(c.n)+' partículas massivas · GPU direta Float32. '+(running?'Evolução iniciada.':'Simulação pausada.'));if(running)advance(token);
  } catch(e){if(token===generation){cancel();status(e.message);refreshButtons();}}
}
function continuousHaloDisplayMetadata(){const layer=renderer?.continuousHalo;return {kind:'projected-density-billboard',enabled:Boolean(layer&&$('show-continuous-halo').checked),opacity:Number($('continuous-halo-opacity').value)/100,source:'rho=Mprime(r)/(4*pi*r^2) of the same finite NFW field; projected column density',normalization:'log1p(Sigma(b)/Sigma(R200)) / log1p(Sigma(b_min)/Sigma(R200))',minProjectedRadiusKpc:layer?.profile.minRadius??null,quadrature:256,radialSamples:384,interpretation:'Illustrative density map without emission or additional particles; never an input to the force or energy'};}
function createRunReport(){return {visualization:continuousHaloDisplayMetadata(),laboratory:laboratory.report(),dateUTC:new Date().toISOString(),stateAvailable:ready,running,dirty,capabilities,configuration:current,physicalMyr:physicsTime,steps:physicsSteps,physicalClock:current?{convention:'initial epoch + completed steps * represented effective dt',initialMyr:gpu?.initialTime??0,requestedDtMyr:current.dt,effectiveDtMyr:gpu?.effectiveParameters.dt??current.dt,gyr:physicsTime/1000}:null,analyticHaloPotentialReference:'mass-integral-consistent-v1',computeMs,diagnosticPhysicalMyr:lastDiagnosticTime,diagnostic:lastDiagnostic,conservation:lastErrors,initial:lastMeta,benchmarks:benchmarkSamples,gpuValidation,qualification:'Última medição: pode ser de um estado já encerrado. Condições iniciais Jeans aproximadas. Diagnósticos registrados na época indicada. FPS não mede integração. Cores e pesos de desenho são visuais, sem calibração de luminosidade.'};}
function exportReport(){const report=createRunReport();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.download='medicao-ncorpos.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('start').onclick=()=>start();$('pause').onclick=()=>pause();$('reset').onclick=()=>{pause();start(true,false);};$('stop').onclick=async()=>{try{if(ready)energySavedStates=await energyAuditStates(false);cancel(true);status('Cálculos encerrados; gráficos da sessão preservados.');refreshButtons();}catch(e){status('Não foi possível capturar o encerramento: '+e.message);}};
$('benchmark').onclick=async()=>{if(creating||running||inFlight)return;const token=generation;creating=true;refreshButtons();try{await evaluateDevice(true,token);}catch(e){if(token===generation)status(e.message);}finally{if(token===generation){creating=false;refreshButtons();}}};
$('validate-gpu').onclick=async()=>{if(creating||running||inFlight)return;const token=generation;creating=true;refreshButtons();status('Comparando forças e oito passos KDK entre CPU f64 e GPU f32…');try{const validation=await compareCPUvsGPU(undefined,{n:1024,steps:8});if(token!==generation)return;gpuValidation=validation;status(gpuValidation.status==='passed'?`CPU × GPU aprovado em 1.024 corpos: erro RMS de força ${gpuValidation.force.rmsRelative.toExponential(2)}. Ensaio curto; exporte a medição.`:`CPU × GPU: ${gpuValidation.status} · ${gpuValidation.reason??'tolerância excedida'}`);}catch(e){if(token===generation)status(e.message);}finally{if(token===generation){creating=false;refreshButtons();}}};
$('export').onclick=exportReport;
for(const id of ['mode','n','halo-refinement','halo-representation','backend','force-method','model','seed','dt','epsilon','energy-audit-cadence'])$(id).onchange=()=>{
 dirty=true;if(['mode','halo-refinement','halo-representation','model','backend','force-method'].includes(id))automaticBasePrepared=false;
 if(running)pause('Configuração alterada. Inicie para uma nova realização.');if($('mode').value==='auto'&&!automaticBasePrepared)$('n').value='';refreshButtons();updateEstimate();
 if($('mode').value==='auto'&&!automaticBasePrepared)calibrateAutomatic();
};
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>camera?.setView(button.dataset.view);
for(const id of ['show-bulge','show-disk','show-halo'])$(id).onchange=updateVisibleCount;
$('halo-view').onclick=()=>camera?.fitHalo(current?.haloRepresentation==='geometry'?gpu?.meta?.haloField?.outerRadius:220);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(running)pause('Aba inativa: integração pausada após o passo pendente. Iniciar continua o mesmo estado.');cancelAnimationFrame(renderRequest);renderRequest=0;}
  else if(renderer&&!renderRequest)drawFrame(performance.now());
});
window.addEventListener('pagehide',cancel);

const laboratory=initializeLaboratory({getRunReport:()=>({configuration:current,initial:lastMeta}),capture:captureReviewState,captureEnergy:energyAuditStates});
updateHaloAppearance();refreshButtons();updateEstimate();detect().then(()=>calibrateAutomatic()).catch(e=>status(e.message));
let capturePromise=null;
function captureReviewState(){if(capturePromise)return capturePromise;capturePromise=captureReviewStateOnce().finally(()=>{capturePromise=null;});return capturePromise;}
async function captureReviewStateOnce(){
  if(creating)throw Error('Aguarde a preparação antes de exportar o estado.');if(!ready)return null;
  const token=generation;pause('Simulação pausada para exportar um instante consistente. Iniciar continua do mesmo estado.',false);await waitIdle(()=>inFlight||pending);
  if(token!==generation)throw Error('O estado mudou durante a exportação.');
  const snapshot={state:await gpu.snapshot(),time:gpu.time,steps:gpu.steps};
  const options={...current.diagnosticOptions,effectiveParameters:gpu.effectiveParameters,forceMethod:'GPU direct f32'};
  const d=await rpc({type:'diagnostic',state:snapshot.state,options});updateMetrics(d);lastDiagnosticTime=physicsTime;
  return {massiveState:snapshot.state,time:snapshot.time,steps:snapshot.steps};
}

async function energyAuditStates(resume=true){
 if(!ready&&energySavedStates)return energySavedStates;
 const wasRunning=running,token=generation;
 try{
  const snapshot=await captureReviewState();
  if(!snapshot)throw Error('Inicie uma execução antes de auditar a energia.');
  if(token!==generation)throw Error('A realização mudou durante a captura. Estime novamente.');
  const initial=await rpc({type:'energy-baseline'});
  if(initial.state?.time!==0||initial.fast?.time!==0)throw Error('Estado inicial em t=0 indisponível. Reinicie uma nova realização para preservar a referência inicial.');
  const options={...current.diagnosticOptions,effectiveParameters:gpu.effectiveParameters,forceMethod:'GPU direct f32'};
  const states=[{state:initial.state,fast:initial.fast}];
  if(snapshot.state!==undefined)throw Error('Formato de snapshot inesperado.');
  if(snapshot.time!==initial.state.time)states.push({state:snapshot.massiveState,fast:structuredClone(lastDiagnostic)});
  energySavedStates={states,options:structuredClone(options),configuration:structuredClone(current)};return energySavedStates;
 }finally{if(resume&&wasRunning&&token===generation&&ready)await start();}
}
let energySavedStates=null;

window.addEventListener('halo-validation-start',async event=>{try{if(creating)throw Error('Aguarde a avaliação ou preparação do dispositivo.');if(running)pause('Pausada para comparação das representações do halo.',false);await waitIdle(()=>inFlight||pending);event.detail.resolve();}catch(error){event.detail.reject(error);}});
