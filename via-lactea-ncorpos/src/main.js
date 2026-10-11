import {detectCapabilities,assessResources} from './compute/capability.js';
import {GPUBackend,compareCPUvsGPU,benchmarkGPU} from './compute/gpu.js';
import {GPURenderer} from './render/gpu-renderer.js';
import {WebGLRenderer} from './render/webgl-renderer.js';
import {OrbitCamera} from './render/camera.js';
import {rotationCurve} from './physics/models.js';
import {KM_S_TO_KPC_MYR} from './physics/constants.js';
const $=id=>document.getElementById(id),fmt=new Intl.NumberFormat('pt-BR'),MiB=1024**2;
let capabilities=null,worker=null,pending=null,gpu=null,renderer=null,camera=null,canvas=$('galaxy');
let ready=false,running=false,creating=false,dirty=false,generation=0,current=null,lastDiagnostic=null,lastErrors=null,lastMeta=null,benchmarkSamples=[],gpuValidation=null;
let physicsTime=0,physicsSteps=0,stepMs=0,lastGpuDiagnostic=0,renderRequest=0,lastFrame=0,frames=0,fpsStart=0,rateTime=0,rateStart=0;
let stepSamples=[];
let lastDiagnosticTime=0;
let inFlight=false;
function status(text){$('status').textContent=text;}
function refreshButtons(){ $('start').disabled=creating||running||inFlight;$('pause').disabled=!running;$('reset').disabled=creating;$('stop').disabled=!worker&&!gpu&&!creating;$('benchmark').disabled=creating||running||inFlight;$('validate-gpu').disabled=creating||running||inFlight;$('n').disabled=$('mode').value==='auto'; }
function config() {
  const n=Number($('n').value),dt=Number($('dt').value),epsilon=Number($('epsilon').value),theta=Number($('theta').value),budgetBytes=Number($('budget').value)*MiB,seed=Number($('seed').value);
  if(!Number.isSafeInteger(n)||n<3)throw Error('Informe N inteiro com ao menos três partículas.');
  if(!Number.isSafeInteger(seed))throw Error('A semente precisa ser um inteiro seguro.');
  if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(epsilon)||epsilon<=0||!Number.isFinite(theta)||theta<0||!Number.isFinite(budgetBytes)||budgetBytes<=0)throw Error('Verifique dt > 0, ε > 0, θ ≥ 0 e orçamento > 0.');
  return {n,dt,epsilon,theta,budgetBytes,seed,withHalo:$('model').value==='halo',requestedBackend:$('backend').value};
}
async function detect(){capabilities??=await detectCapabilities();const c=capabilities;$('hardware').textContent=`${c.hardwareConcurrency??'?'} processadores lógicos · WebGPU ${c.webgpu.available?'disponível':'indisponível'} · WASM ${c.wasm?'sim':'não'} / SIMD ${c.wasmSIMD?'sim':'não'} · Worker ${c.worker?'sim':'não'}. ${c.webgpu.info?.vendor??''} ${c.webgpu.info?.architecture??''}. RAM/VRAM exatas não são reveladas.`;return c;}
function newWorker(){if(typeof Worker==='undefined')throw Error('Este navegador não permite Web Workers; os cálculos não serão iniciados na interface.');const created=new Worker(new URL('./compute/worker.js',import.meta.url),{type:'module'});worker=created;created.onmessage=({data})=>{if(worker!==created)return;const p=pending;pending=null;if(!p)return;if(data.type==='error')p.reject(Error(data.message));else p.resolve(data);};created.onerror=e=>{if(worker!==created)return;pending?.reject(Error(e.message||'Falha no Worker'));pending=null;};}
function rpc(message,transfer=[]){if(!worker)newWorker();if(pending)throw Error('Já existe uma tarefa CPU pendente.');return new Promise((resolve,reject)=>{pending={resolve,reject};worker.postMessage(message,transfer);});}
function cancel(){generation++;running=false;creating=false;ready=false;inFlight=false;pending?.reject(Error('Operação cancelada.'));pending=null;worker?.terminate();worker=null;renderer?.dispose();renderer=null;camera?.dispose();camera=null;gpu?.dispose();gpu=null;cancelAnimationFrame(renderRequest);renderRequest=0;
  frames=0;fpsStart=0;
  $('empty').hidden=false;$('count').textContent='0';$('time').textContent='0.00 Myr';$('rate').textContent='0.00 Myr/s';$('fps').textContent='0 FPS';$('step-ms').textContent='—';$('backend-label').textContent='—';$('algorithm').textContent='—';
  $('counts').textContent='—';$('memory').textContent='— MiB';for(const id of ['error-energy','error-momentum','error-angular'])$(id).textContent='—';
  updateVisibleCount();
}
function replaceCanvas(){camera?.dispose();const next=canvas.cloneNode(false);canvas.replaceWith(next);canvas=next;camera=new OrbitCamera(canvas,{distance:75});}
function updateEstimate(){try{const c=config(),allocated=ready&&!dirty,b=allocated?current.selected:c.requestedBackend==='gpu'?'gpu':c.requestedBackend==='cpu-direct'?'cpu-direct':'cpu-bh',a=assessResources(c.n,capabilities??{}, {...c,backend:b});$('estimate').textContent=`${fmt.format(c.n)} corpos físicos · ~${(a.estimate.estimatedBytes/MiB).toFixed(1)} MiB estimados${a.admissible?'':` · ${a.reasons.join(' ')}`}${allocated?' · buffers alocados nesta execução.':' · alocação e desempenho ainda precisam de teste.'}`;}catch(e){$('estimate').textContent=e.message;}}
function admission(c,backend){const a=assessResources(c.n,capabilities,{...c,backend});if(!a.admissible)throw Error(a.reasons.join(' '));$('memory').textContent=`~${(a.estimate.estimatedBytes/MiB).toFixed(1)} MiB`;return a;}
function estimatedStep(c,backend){const samples=benchmarkSamples.filter(x=>x.backend===backend&&x.stepMs>0).sort((a,b)=>a.n-b.n);const sample=samples.filter(x=>x.n<=c.n).at(-1)??samples[0];if(!sample)return null;return sample.stepMs*(backend==='cpu-bh'?(c.n*Math.log2(c.n))/(sample.n*Math.log2(sample.n)):(c.n/sample.n)**2);}
function gpuDiagnosticOptions(c){
  // The force backend remains GPU direct. Only the occasional energy diagnostic
  // uses a tree when a direct CPU readback would dominate the simulation.
  const directMs=estimatedStep(c,'cpu-direct');
  return {algorithm:directMs!==null&&directMs<=100?'direct':'barnes-hut',epsilon:c.epsilon,theta:c.theta};
}
function recommendResolution(){
  if(!benchmarkSamples.length)return;
  const target=20;
  const recommendations=[...new Set(benchmarkSamples.map(s=>s.backend))].map(backend=>{
    const sample=benchmarkSamples.filter(s=>s.backend===backend).sort((a,b)=>b.n-a.n)[0];
    let n=backend==='cpu-bh'?sample.n*target/sample.stepMs:sample.n*Math.sqrt(target/sample.stepMs);
    if(backend==='cpu-bh')n/=Math.max(1,Math.log2(Math.max(sample.n,n))/Math.log2(sample.n));
    return {backend,n};
  });
  const fastest=recommendations.reduce((a,b)=>a.n>b.n?a:b);let n=Math.max(3,Math.floor(fastest.n/2)*2);
  const budget=Number($('budget').value)*MiB;
  while(!assessResources(n,capabilities,{backend:fastest.backend,budgetBytes:budget}).admissible&&n>3)n=Math.max(3,Math.floor(n/2));
  $('n').value=n;dirty=true;updateEstimate();
}
async function evaluateDevice(recommend=true,token=generation) {
  status('Avaliando 512 corpos no dispositivo; cálculos iniciados por sua ação.');await detect();
  if(token!==generation)throw Error('Operação cancelada.');
  const result=await rpc({type:'benchmark',config:{dt:0.1,epsilon:0.1,theta:0.5}});
  if(token!==generation)throw Error('Operação cancelada.');
  benchmarkSamples=result.samples.filter(x=>Number.isFinite(x.stepMs)&&x.stepMs>0).map(x=>({...x,backend:x.algorithm==='direct'?'cpu-direct':'cpu-bh'}));
  if(capabilities.webgpu.available){const check=await compareCPUvsGPU(undefined,{n:512,steps:3});if(token!==generation)throw Error('Operação cancelada.');if(check.status==='passed'&&Number.isFinite(check.gpuStepMs)&&check.gpuStepMs>0)benchmarkSamples.push({backend:'gpu',algorithm:'direct',n:512,stepMs:check.gpuStepMs,steps:3,precision:'f32'});else status(`GPU sem ensaio de desempenho aprovado: ${check.reason??check.status}. CPU disponível.`);}
  // Queue overhead dominates small GPU batches. A larger admitted measurement
  // gives a more useful projection without attempting a large unbounded force.
  if((estimatedStep({n:10000},'gpu')??Infinity)<500&&assessResources(10000,capabilities,{backend:'gpu',budgetBytes:Number($('budget').value)*MiB}).admissible){
    status('Medindo também 10.000 corpos na GPU para calibrar a projeção de custo.');
    const measured=await benchmarkGPU({n:10000,steps:3});if(token!==generation)throw Error('Operação cancelada.');
    if(measured.status==='measured'&&measured.finite&&Number.isFinite(measured.stepMs)&&measured.stepMs>0)benchmarkSamples.push({backend:'gpu',algorithm:'direct',n:10000,stepMs:measured.stepMs,steps:3,precision:'f32'});
  }
  if(recommend&&$('mode').value==='auto'){
    recommendResolution();
  }
  status(`Ensaios medidos: ${benchmarkSamples.map(s=>`${s.backend}, N=${fmt.format(s.n)}, ${s.stepMs.toFixed(2)} ms/passo`).join(' · ')}. N recomendado é estimativa; verificação ao iniciar.`);updateEstimate();return benchmarkSamples;
}
function updateMetrics(result){if(result.time!==undefined)physicsTime=result.time;if(result.steps!==undefined)physicsSteps=result.steps;if(result.lastStepMs>0){stepSamples.push(result.lastStepMs);if(stepSamples.length>64)stepSamples.shift();stepMs=stepSamples.reduce((a,b)=>a+b,0)/stepSamples.length;}
  if(result.data)renderer.update(result.data);if(result.diagnostic){lastDiagnostic=result.diagnostic;lastDiagnosticTime=physicsTime;}if(result.errors)lastErrors=result.errors;if(result.meta){lastMeta=result.meta;$('initial-info').textContent=`Jeans aproximado · semente ${lastMeta.seed} · ${lastMeta.unbound} partículas acima do escape analítico inicial · ${lastMeta.clippedStreaming} casos com rotação média limitada. Estabilidade prolongada ainda não validada.`;}
  $('time').textContent=`${physicsTime.toFixed(2)} Myr`;$('step-ms').textContent=stepSamples.length?`${stepMs.toFixed(2)} ms`:'—';
  if(lastErrors){$('error-energy').textContent=`${(100*lastErrors.energy).toExponential(2)} %${lastErrors.energyApproximate?' (U árvore)':''}`;$('error-momentum').textContent=lastErrors.momentum.toExponential(2);$('error-angular').textContent=lastErrors.angularMomentum.toExponential(2);}
  if(result.vphi)drawRotation(result.vphi);
}
function drawRotation(bins=[]) {
  const curve=rotationCurve(true),w=480,h=170,left=42,right=12,top=12,bottom=28,x=r=>left+r/30*(w-left-right),y=v=>h-bottom-v/350*(h-top-bottom);
  const line=key=>curve.map((p,i)=>`${i?'L':'M'}${x(p.r).toFixed(2)},${y(p[key]).toFixed(2)}`).join(' ');
  let svg=`<title>Velocidades circulares contínuas iniciais e velocidade tangencial mediana das partículas</title>`;
  for(const v of [0,100,200,300])svg+=`<line x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}" stroke="#293642"/><text x="${left-6}" y="${y(v)+3}" text-anchor="end" fill="#8798a7" font-size="10">${v}</text>`;
  for(const r of [0,10,20,30])svg+=`<text x="${x(r)}" y="${h-10}" text-anchor="middle" fill="#8798a7" font-size="10">${r}</text>`;
  const curves=[['bulge','#ffbd81'],['disk','#dceaff'],['halo','#52b6c8'],['baryons','#98a4b6'],['total','#73d6b0']];
  for(const [key,color]of curves)svg+=`<path d="${line(key)}" fill="none" stroke="${color}" stroke-width="${key==='total'?2:1.3}" ${key==='baryons'?'stroke-dasharray="4 3"':''}/>`;
  for(const p of bins)if(p.vphi!==null&&p.count>=3)svg+=`<circle cx="${x(p.r)}" cy="${y(p.vphi/KM_S_TO_KPC_MYR)}" r="2.5" fill="#f4d27f"><title>vφ mediana ${ (p.vphi/KM_S_TO_KPC_MYR).toFixed(1)} km/s; ${p.count} partículas; R≈${p.r} kpc</title></circle>`;
  svg+=`<text x="5" y="10" fill="#8798a7" font-size="10">km/s</text><text x="${w-16}" y="${h-10}" fill="#8798a7" font-size="10">kpc</text>`;
  $('rotation').setAttribute('viewBox',`0 0 ${w} ${h}`);$('rotation').innerHTML=svg;
}
function drawFrame(now){if(!renderer)return;
  try{renderer.draw(camera.matrix(canvas.clientWidth,canvas.clientHeight),[$('show-bulge').checked,$('show-disk').checked,$('show-halo').checked]);}catch(e){pause(e.message);return;}
  frames++;if(!fpsStart)fpsStart=now;if(now-fpsStart>1000){$('fps').textContent=(frames*1000/(now-fpsStart)).toFixed(0)+' FPS';frames=0;fpsStart=now;}
  if(running&&now-rateStart>1000){$('rate').textContent=`${((physicsTime-rateTime)*1000/(now-rateStart)).toFixed(2)} Myr/s`;rateTime=physicsTime;rateStart=now;}
  lastFrame=now;renderRequest=requestAnimationFrame(drawFrame);
}
function pause(message='Simulação pausada.'){running=false;$('rate').textContent='0.00 Myr/s';status(message);refreshButtons();}
function updateVisibleCount(){const ids=['show-bulge','show-disk','show-halo'];const n=ready?lastMeta.counts.reduce((sum,count,i)=>sum+($(ids[i]).checked?count:0),0):0;$('render-count').textContent=`Seleção visual: ${fmt.format(n)} corpos após filtros; a câmera pode recortar o campo.`;}
async function advance(token){if(!running||token!==generation||document.hidden)return;
  inFlight=true;
  try {
    const result=gpu?await gpu.step(1):await rpc({type:'step',count:1});if(token!==generation)return;updateMetrics(result);
    if(gpu&&performance.now()-lastGpuDiagnostic>3000){const s=await gpu.snapshot();if(token!==generation)return;const d=await rpc({type:'diagnostic',state:s,options:current.diagnosticOptions},[s.positions.buffer,s.velocities.buffer,s.masses.buffer,s.components.buffer,s.accelerations.buffer]);if(token!==generation)return;updateMetrics(d);lastGpuDiagnostic=performance.now();}
    if(lastErrors?.energy>0.01)pause('Deriva de energia acima de 1%: integração pausada. Reduza dt, compare as precisões e confira o diagnóstico antes de continuar. Este é um alerta numérico do protótipo.');
    if(running)setTimeout(()=>advance(token),0);
  } catch(e){if(token===generation)pause(`Cálculos pausados: ${e.message}`);}
  finally {if(token===generation){inFlight=false;refreshButtons();}}
}
async function start(force=false,runAfter=true){if(creating||running)return;
  if(ready&&!dirty&&!force){running=true;rateTime=physicsTime;rateStart=performance.now();status('Integrando forças das partículas no seu dispositivo.');refreshButtons();advance(generation);return;}
  cancel();const token=generation;creating=true;refreshButtons();
  try {
    await detect();if(token!==generation)return;
    if(!benchmarkSamples.length)await evaluateDevice(false);if(token!==generation)return;
    if($('mode').value==='auto')recommendResolution();
    const c=config();let selected=c.requestedBackend;
    if(selected==='auto'){
      const candidates=benchmarkSamples.filter(s=>s.backend!=='gpu');
      selected=candidates.reduce((best,s)=>(estimatedStep(c,s.backend)??Infinity)<(estimatedStep(c,best)??Infinity)?s.backend:best,'cpu-bh');
      // Projection only decides whether a safe GPU pilot is worth attempting.
      // Acceptance below requires a measurement at the requested physical N.
      const cpuCost=estimatedStep(c,selected)??Infinity,gpuCost=estimatedStep(c,'gpu')??Infinity;
      if(capabilities.webgpu.available&&gpuCost<Math.min(2000,Math.max(40,cpuCost))&&assessResources(c.n,capabilities,{...c,backend:'gpu'}).admissible)selected='gpu';
    }
    admission(c,selected);const predicted=estimatedStep(c,selected);
    if(selected==='cpu-direct'&&predicted===null)throw Error('O temporizador não forneceu uma medição válida do custo direto. Selecione CPU Barnes–Hut.');
    if(selected==='gpu'&&!benchmarkSamples.some(s=>s.backend==='gpu'))throw Error('A GPU não passou pela comparação local CPU × GPU. Selecione um backend CPU e consulte a validação.');
    if((selected==='gpu'||selected==='cpu-direct')&&predicted!==null&&predicted>2000)throw Error(`Custo direto estimado de ${(predicted/1000).toFixed(1)} s/passo. Selecione CPU Barnes–Hut para este N. A estimativa vem do ensaio local, não de um limite de corpos.`);
    current={...c,selected,diagnosticOptions:gpuDiagnosticOptions(c)};stepSamples=[];stepMs=0;status(`Gerando ${fmt.format(c.n)} partículas físicas e calculando a aceleração inicial…${predicted===null?'':` Custo estimado ${predicted.toFixed(0)} ms/passo; ainda não medido neste N.`}`);replaceCanvas();
    let initial;
    if(selected==='gpu') {
      initial=await rpc({type:'initial',config:c});if(token!==generation)return;
      const candidate=await GPUBackend.create(undefined,reason=>{cancel();status(`Dispositivo GPU perdido: ${reason?.message??'reinicie os cálculos'}`);refreshButtons();});if(token!==generation){candidate.dispose();return;}gpu=candidate;
      await gpu.initialize(initial.state,c);if(token!==generation)return;
      if(c.requestedBackend==='auto'){
        const pilot=await gpu.step(2);if(token!==generation)return;
        benchmarkSamples.push({backend:'gpu',algorithm:'direct',n:c.n,stepMs:pilot.lastStepMs,steps:2,precision:'f32',purpose:'pilot at requested N; physical state reset to t0 afterwards'});
        const cpuCost=Math.min(estimatedStep(c,'cpu-direct')??Infinity,estimatedStep(c,'cpu-bh')??Infinity);
        if(pilot.lastStepMs>Math.min(2000,Math.max(40,cpuCost))){gpu.dispose();gpu=null;selected='cpu-bh';current.selected=selected;admission(c,selected);}
        else await gpu.initialize(initial.state,c);
      }
    }
    if(gpu) {
      renderer=new GPURenderer(canvas,gpu);await renderer.initialize();
      const s=await gpu.snapshot();const d=await rpc({type:'diagnostic',state:s,options:current.diagnosticOptions,baseline:true},[s.positions.buffer,s.velocities.buffer,s.masses.buffer,s.components.buffer,s.accelerations.buffer]);if(token!==generation)return;updateMetrics({...d,meta:initial.state.meta,time:0,steps:0,lastStepMs:0});lastGpuDiagnostic=performance.now();
    } else {
      renderer=new WebGLRenderer(canvas);renderer.onContextLost=()=>pause('Contexto WebGL perdido. Reinicie para continuar.');
      const result=await rpc({type:'prepare',config:{...c,algorithm:selected==='cpu-direct'?'direct':'barnes-hut'}});if(token!==generation)return;updateMetrics(result);
    }
    $('empty').hidden=true;$('count').textContent=fmt.format(c.n);$('counts').textContent=lastMeta.counts.map((n,i)=>`${['bojo','disco','halo'][i]} ${fmt.format(n)}`).join(' · ');
    $('algorithm').textContent=selected==='cpu-bh'?`Barnes–Hut 3D · θ=${c.theta}`:'Direto O(N²)';$('backend-label').textContent=selected==='gpu'?'GPU WebGPU · f32':'CPU Worker · f64';
    creating=false;ready=true;dirty=false;running=runAfter;physicsTime=0;physicsSteps=0;rateTime=0;rateStart=performance.now();refreshButtons();updateEstimate();updateVisibleCount();drawFrame(performance.now());
    status(`Preparado: ${fmt.format(c.n)} integradas e desenhadas · ${selected}. ${running?'Evolução iniciada.':'Simulação pausada.'}`);if(running)advance(token);
  } catch(e){if(token===generation){cancel();status(e.message);refreshButtons();}}
}
function exportReport(){const report={dateUTC:new Date().toISOString(),stateAvailable:ready,running,capabilities,configuration:current,physicalMyr:physicsTime,steps:physicsSteps,diagnosticPhysicalMyr:lastDiagnosticTime,diagnostic:lastDiagnostic,conservation:lastErrors,initial:lastMeta,benchmarks:benchmarkSamples,gpuValidation,qualification:'Última medição: pode ser de um estado já encerrado. Condições iniciais Jeans aproximadas. Curvas contínuas de referência não são medidas instantâneas. FPS não mede integração.'};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.download='medicao-ncorpos.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('start').onclick=()=>start();$('pause').onclick=()=>pause();$('reset').onclick=()=>{pause();start(true,false);};$('stop').onclick=()=>{cancel();$('empty').hidden=false;$('count').textContent='0';$('time').textContent='0.00 Myr';$('rate').textContent='0.00 Myr/s';status('Cálculos encerrados e recursos liberados.');refreshButtons();};
$('benchmark').onclick=async()=>{if(creating||running)return;cancel();const token=generation;creating=true;refreshButtons();try{await evaluateDevice(true,token);}catch(e){if(token===generation)status(e.message);}finally{if(token===generation){creating=false;refreshButtons();}}};
$('validate-gpu').onclick=async()=>{if(creating||running)return;cancel();const token=generation;creating=true;refreshButtons();status('Comparando forças e oito passos KDK entre CPU f64 e GPU f32…');try{const validation=await compareCPUvsGPU(undefined,{n:1024,steps:8});if(token!==generation)return;gpuValidation=validation;status(gpuValidation.status==='passed'?`CPU × GPU aprovado em 1.024 corpos: erro RMS de força ${gpuValidation.force.rmsRelative.toExponential(2)}. Ensaio curto; exporte a medição.`:`CPU × GPU: ${gpuValidation.status} · ${gpuValidation.reason??'tolerância excedida'}`);}catch(e){if(token===generation)status(e.message);}finally{if(token===generation){creating=false;refreshButtons();}}};
$('export').onclick=exportReport;
for(const id of ['mode','n','backend','model','seed','dt','epsilon','theta','budget'])$(id).onchange=()=>{dirty=true;if(running)pause('Configuração alterada. Inicie para aplicar um novo estado.');refreshButtons();updateEstimate();};
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>camera?.setView(button.dataset.view);
for(const id of ['show-bulge','show-disk','show-halo'])$(id).onchange=updateVisibleCount;
$('halo-view').onclick=()=>camera?.fitHalo();
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&(running||creating||inFlight)){
    // Terminating the worker/device also stops a very long force pass; waiting
    // for its event loop to receive a pause could leave hidden work running.
    cancel();$('empty').hidden=false;$('count').textContent='0';$('rate').textContent='0.00 Myr/s';$('fps').textContent='0 FPS';
    status('Aba inativa: cálculos encerrados para interromper também passos longos. Iniciar reconstruirá a configuração e a semente.');refreshButtons();
  }
  if(document.hidden){cancelAnimationFrame(renderRequest);renderRequest=0;}else if(renderer&&!renderRequest)drawFrame(performance.now());
});
window.addEventListener('pagehide',cancel);
refreshButtons();drawRotation();updateEstimate();detect().then(updateEstimate).catch(e=>status(e.message));
