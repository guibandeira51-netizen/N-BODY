import {LaboratoryHistory} from './physics/laboratory.js';
import {plotSVG} from './laboratory-panel.js';
import {componentRotationPlot} from './component-rotation-plot.js';
import {relativeEnergy,compareEnergy} from './physics/live-energy.js';
import {LiveEnergyReference} from './compute/live-energy-reference.js';
import {directReferenceData,preserveEnergyCapture} from './energy-audit-session.js';
import {AutomaticEnergyReferences} from './automatic-energy.js';
import {energyChartsView,renderEnergyPanels} from './energy-charts.js';
import {EnergyTimeline,energyPanelsData,energyPanelsCSV} from './energy-chart-data.js';

const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const figure=(id,label,extra='')=>`<figure${extra}><div id="${id}"></div><div class="live-chart-actions"><button type="button" class="save-chart" data-save-chart="${id}" aria-label="Salvar gráfico ${label}" disabled>Salvar gráfico</button></div></figure>`;
export const liveDiagnosticsView=()=>`<section class="live-diagnostics" aria-labelledby="live-title"><div class="panel-heading"><span class="section-number">05</span><h2 id="live-title">Diagnósticos em tempo real</h2><span class="measurement-tag">Estados medidos</span></div><p id="live-epoch" class="field-help" role="status">Inicie a simulação para medir os gráficos.</p><p id="energy-auto-status" class="field-help" role="status">Referência direta Float64: automática ao iniciar.</p><div class="live-chart-grid">${figure('live-height','de espessura do disco',' class="live-structure"')}${energyChartsView()}${figure('live-rotation','das curvas de rotação',' class="live-rotation"')}</div></section>`;

// Read-only projection of diagnostics; never advances or modifies particles.
export function liveChartData(samples){
 const first=samples[0],last=samples.at(-1);
 return {
  height:samples.map(s=>[s.timeMyr,s.diskFrame?.available&&Number.isFinite(s.diskFrame.instant?.h50)?s.diskFrame.instant.h50:null]),
  energy:samples.map(s=>[s.timeMyr,relativeEnergy(s.conservation,first?.conservation)?.percent??null]),
  rotationField:last?.rotationField??null,
  timeMyr:last?.timeMyr??null,energyApproximate:last?.conservation?.energyApproximate??null
 };
}

export function energyChartEvidence(samples,references=[]){
 const direct=directReferenceData(references),fastInitial=samples[0]?.conservation??null;
 return {schema:'live-energy-chart-v1',units:'1e10 Msun kpc^2 Myr^-2',errorUnits:'percent',
  normalization:'Independent E(0) for each method in the same realization; signed 100*(E(t)-E(0))/abs(E(0)); explicit K0+abs(U0) fallback near cancellation',
  fastInitial,directInitial:direct.initial,
  estimated:samples.map(s=>({timeMyr:s.timeMyr,energy:s.conservation?.energy,relative:relativeEnergy(s.conservation,fastInitial)})),
  references:references.map(r=>({timeMyr:r.timeMyr,origin:r.origin??'manual',requestedTimeMyr:r.requestedTimeMyr,direct:r.direct,relative:relativeEnergy(r.direct,direct.initial),deltaU:r.deltaU,relativeU:r.relativeU,snapshot:r.snapshot?{n:r.snapshot.n,time:r.snapshot.time,parameters:r.snapshot.parameters,backend:r.snapshot.backend,configuration:r.snapshot.configuration,rawArraysRetained:Boolean(r.snapshot.positions)}:null})),noInterpolatedReference:true};
}

export function energyPlot(samples,references=[]){
 const fast=liveChartData(samples).energy,direct=directReferenceData(references);
 let svg=plotSVG([{label:'Estimada · Barnes–Hut',points:fast},{label:'Direta · Float64',points:direct.points}],{title:'Conservação da energia × tempo físico',yLabel:'Desvio assinado [%]'});
 const message=direct.initial?'':'<text x="85" y="297" font-family="Arial,sans-serif" font-size="9" fill="#65777b">Nenhuma referência direta calculada nesta execução.</text>';
 return svg.replace('</svg>',`<desc>Energia Barnes–Hut aproximada; referência direta Float64 somente nos estados auditados, sem interpolação. Cada método usa sua própria energia inicial em t=0.</desc><metadata id="energy-chart-data">${escape(JSON.stringify(energyChartEvidence(samples,references)))}</metadata>${message}</svg>`);
}

export function initializeLiveDiagnostics({getRunReport,captureEnergy}){
 const energyTimeline=new EnergyTimeline(),history=new LaboratoryHistory(512),$=id=>document.getElementById(id),pool=new LiveEnergyReference();
 let guideEvents=[],realizationId=crypto.randomUUID(),context={},references=[],selected=null,token=0,maxFast=0,jobBusy=false,codeIdentity=null,nextAutoCapture=Infinity;
 const automatic=new AutomaticEnergyReferences({pool,isExternallyBusy:()=>jobBusy,onReference:(job,direct)=>recordReference(job,direct,'automatic'),onChange:state=>{autoStatus(state);buttons();}});
 fetch('./reports/disk-audit-current/code-identity.json').then(r=>r.ok?r.json():null).then(r=>codeIdentity=r).catch(()=>{});
 const number=x=>Number.isFinite(x)?x.toLocaleString('pt-BR',{maximumSignificantDigits:12}):'indisponível';
 const download=(name,data,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
 const status=text=>$('energy-job').textContent=text;
 function progress(value){$('energy-progress').value=value;$('energy-progress').setAttribute('aria-valuetext',number(100*value)+'%');}
 function buttons(){
  const busy=jobBusy||Boolean(automatic.active);
  $('energy-estimate').disabled=busy;
  $('energy-reference').disabled=busy||!selected||selected.states.every(x=>references.some(r=>r.timeMyr===x.state.time));
  $('energy-cancel').disabled=!busy;
 }
 function autoStatus(state){
  const text=state.phase==='calculating'?`Calculando referência direta Float64 em ${number(state.activeTimeMyr)} Myr · ${(100*state.progress).toLocaleString('pt-BR',{maximumFractionDigits:1})}%.${state.estimatedCostMs!==null?' Custo projetado ~'+Math.ceil(state.estimatedCostMs/1000)+' s por estado; estimativa, não tempo físico.':''}${state.estimatedCostMs>state.policy?.slowWarningMs?' Cálculo demorado, sem corte automático em 60 s; pode cancelar no painel de validação.':''}`:state.lastError?`Referência direta indisponível neste instante. ${state.lastError}`:state.lastTimeMyr!==null?`Referência direta Float64: automática · última avaliação em ${number(state.lastTimeMyr)} Myr · intervalo escolhido ${number(state.requestedCadenceMyr??state.cadenceMyr)} Myr. Próxima coleta a partir de ${number(state.lastTimeMyr===0?state.cadenceMyr:(Math.floor(state.lastTimeMyr/state.cadenceMyr)+1)*state.cadenceMyr)} Myr.`:'Referência direta Float64: automática ao iniciar.';
  $('energy-auto-status').textContent=text+(state.omitted?` ${state.omitted} snapshots omitidos; instantes ausentes não são reconstruídos.`:'');
  if(!jobBusy)status(text);
  if(automatic.active&&!jobBusy)progress(state.progress);
 }
 function recordReference(job,direct,origin){
  if(references.some(r=>r.timeMyr===job.state.time))return;
  references.push({...compareEnergy(job.fast,direct),origin,samplingCadenceMyr:origin==='automatic'?automatic.policy?.cadenceMyr:null,requestedTimeMyr:job.requestedTimeMyr,snapshot:{...job.state,parameters:job.parameters,configuration:job.configuration,backend:job.backend}});
  references.sort((a,b)=>a.timeMyr-b.timeMyr);
  // Retain t=0 and only the latest two raw arrays. Keep every measured energy.
  for(const r of references.slice(1,-2)){const s=r.snapshot;if(s.positions)r.snapshot={n:s.n,time:s.time,parameters:s.parameters,configuration:s.configuration,backend:s.backend,rawArraysRetained:false};}
  render();
 }
 function render(){
  const samples=history.samples,data=liveChartData(samples),direct=directReferenceData(references),fast0=samples[0]?.conservation;
  $('live-height').innerHTML=plotSVG([{label:'Disco · plano próprio',points:data.height}],{title:'Espessura do disco × tempo',yLabel:'h50 [kpc]'});
  renderEnergyPanels(document,panelsData());
  $('live-rotation').innerHTML=componentRotationPlot(data.rotationField);
  document.querySelectorAll('[data-save-chart]').forEach(button=>button.disabled=!samples.length);
  const epoch=$('live-epoch');epoch.dataset.timeMyr=data.timeMyr??'';epoch.dataset.measurements=history.totalMeasurements;
  epoch.textContent=samples.length?`Medição em ${number(data.timeMyr)} Myr · ${history.totalMeasurements} estados medidos · energia estimada — Barnes–Hut${history.failure?' · '+history.failure:''}.`:'Inicie a simulação para medir os gráficos.';
  $('energy-availability').textContent=references.length?`${references.length} ${references.length===1?'estado auditado':'estados auditados'}: ${references.map(r=>number(r.timeMyr)+' Myr').join('; ')}.${references.length===1?' Somente t=0 foi auditado; a conservação temporal ainda não foi verificada.':''}`:'Nenhuma referência direta calculada nesta execução.';
  $('energy-baselines').textContent=fast0?`E₀,BH = ${number(fast0.energy)}; E₀,direta = ${number(direct.initial?.energy)}. ${direct.initial?'Normalização direta: '+relativeEnergy(direct.initial,direct.initial)?.normalization+'.':'A referência direta inicial ainda não foi calculada.'}`:'';
  $('energy-audited').innerHTML=references.map(r=>{const d=r.direct,e=relativeEnergy(d,direct.initial),s=r.snapshot;return `<tr data-audit-time="${r.timeMyr}"><td>${number(r.timeMyr)}</td><td>${s.n}</td><td>${number(d.energy)}</td><td>${number(e?.percent)}</td></tr><tr><td colspan="4"><details><summary>Snapshot em ${number(r.timeMyr)} Myr</summary><p>${escape(`${s.backend} · ${d.forceAlgorithm} · trajetória ${d.trajectoryPrecision}. G=${d.G}; ε²=${d.epsilonSquared} kpc²; dt efetivo=${d.effectiveDt} Myr; velocidades ${d.velocityEpoch}. Avaliação CPU Float64 compensada; ${number(d.diagnosticCostMs)} ms. Normalização: ${e?.normalization}.`)}</p></details></td></tr>`;}).join('');
 }
 for(const button of document.querySelectorAll('[data-save-chart]'))button.addEventListener('click',()=>{
  const svg=$(button.dataset.saveChart)?.querySelector('svg');if(!svg||!history.samples.length)return;
  const names={'live-height':'espessura-disco','live-energy-bh':'energia-estimada-barnes-hut','live-energy-direct':'energia-direta-float64','live-rotation':'curvas-rotacao-componentes'};
  download(names[button.dataset.saveChart]+'.svg',svg.outerHTML,'image/svg+xml;charset=utf-8');
 });
 function failure(error){
  guideEvents.push({type:'failed',timeMyr:selected?.states?.at(-1)?.state.time??history.samples.at(-1)?.timeMyr,reason:error.message});render();
  status(error.message);$('energy-restart').hidden=!/inicial|t=0|realizaç/.test(error.message);
 }
 $('energy-estimate').onclick=async()=>{
  if(jobBusy||automatic.active)return;const mine=token;jobBusy=true;selected=null;buttons();progress(0);$('energy-restart').hidden=true;
  status('Capturando estados sincronizados; a integração retoma se estava em execução.');
  try{
   const capture=await captureEnergy();if(mine!==token)return;
   const job=preserveEnergyCapture(capture);selected=job;
   const s=job.states.at(-1).state,n=Math.min(10000,s.n),pilot={...s,n,positions:s.positions.slice(0,3*n),velocities:s.velocities.slice(0,3*n),masses:s.masses.slice(0,n),components:s.components.slice(0,n)};
   status('Medindo custo com até 10.000 corpos; o piloto não adiciona referências ao gráfico.');
   await pool.evaluate(pilot,job.options,p=>{if(mine===token)progress(p);});if(mine!==token)return;
   const count=job.states.filter(x=>!references.some(r=>r.timeMyr===x.state.time)).length;
   status(`Snapshots preservados: ${job.states.map(x=>number(x.state.time)+' Myr').join('; ')}; N=${s.n}. ${count} avaliações pendentes; custo projetado ~${number(pool.estimate(s.n)*count/1000)} s. Estimativa sujeita à carga e à extrapolação do piloto. Calcular usa estes instantes, mesmo que a integração avance.`);
  }catch(error){if(mine===token){selected=null;failure(error);}}
  finally{if(mine===token){jobBusy=false;buttons();automatic.pump();}}
 };
 $('energy-reference').onclick=async()=>{
  if(jobBusy||automatic.active||!selected)return;jobBusy=true;const mine=token,job=selected;buttons();progress(0);
  try{
   const pendingStates=job.states.filter(x=>!references.some(r=>r.timeMyr===x.state.time));
   for(let i=0;i<pendingStates.length;i++){
    const {state,fast}=pendingStates[i];
    status(`Referência direta em ${number(state.time)} Myr; N=${state.n}; ${pool.count} Workers CPU. Snapshot preservado; época independente do tempo atual da integração.`);
    const direct=await pool.evaluate(state,job.options,p=>{if(mine===token)progress((i+p)/pendingStates.length);});if(mine!==token)return;
    recordReference({state,fast,parameters:job.parameters,configuration:job.configuration,backend:job.backend},direct,'manual');
   }
   status('Referências concluídas. Para outro instante, estime novamente e calcule os novos snapshots. Pontos sem interpolação.');progress(1);selected=null;
  }catch(error){if(mine===token)failure(error);}
  finally{if(mine===token){jobBusy=false;buttons();automatic.pump();}}
 };
 $('energy-cancel').onclick=()=>{guideEvents.push({type:'cancelled',timeMyr:automatic.active?.state.time??selected?.states?.at(-1)?.state.time??history.samples.at(-1)?.timeMyr,reason:'Avaliação direta cancelada.'});token++;if(automatic.active)automatic.cancelCurrent();else pool.cancel();jobBusy=false;selected=null;buttons();progress(0);status('Referência cancelada. Pontos já concluídos foram preservados; nenhum ponto incompleto foi registrado.');automatic.pump();render();};
 $('energy-restart').onclick=()=>$('reset').click();
 function panelsData(){return energyPanelsData(energyTimeline.samples,references,{realizationId,configuration:context.configuration,codeIdentity,maxFastAbsolute:maxFast,automatic:automatic.report(),guideEvents});}
 new ResizeObserver(()=>renderEnergyPanels(document,panelsData())).observe($('live-energy'));
 for(const id of ['energy-direct-mode'])$(id).addEventListener('change',()=>renderEnergyPanels(document,panelsData()));
 function energyReport(){return {realizationId,panels:panelsData(),displayModes:{direct:$('energy-direct-mode').value,directGuide:'Dashed straight visual segments only; no extra measured samples'},schema:'legacy-energy-audit-v3',codeIdentity,configuration:context.configuration,automatic:automatic.report(),fastSamples:energyTimeline.samples.map(s=>({timeMyr:s.timeMyr,...s.conservation,relative:relativeEnergy(s.conservation,history.samples[0].conservation)})),references,maxFastAbsolute:maxFast,chart:energyChartEvidence(energyTimeline.samples,references),noInterpolatedReference:true};}
 $('energy-json').onclick=()=>download('energia-ncorpos.json',JSON.stringify(energyReport(),(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v,2),'application/json');
 $('energy-csv').onclick=()=>download('energia-ncorpos.csv',energyPanelsCSV(panelsData()),'text/csv;charset=utf-8');
 render();buttons();
 return {
  add(sample){context=structuredClone(getRunReport());const {automaticEnergy,...measured}=sample;history.add(measured);energyTimeline.add(measured);maxFast=Math.max(maxFast,relativeEnergy(sample.conservation,history.samples[0].conservation)?.absolute??0);if(automaticEnergy?.nextCaptureMyr!==undefined)nextAutoCapture=automaticEnergy.nextCaptureMyr;render();automatic.enqueue(automaticEnergy,context.configuration);},
  reset(){token++;guideEvents=[];realizationId=crypto.randomUUID();history.reset();energyTimeline.reset();context={};references=[];selected=null;maxFast=0;jobBusy=false;nextAutoCapture=Infinity;automatic.reset();buttons();progress(0);$('energy-restart').hidden=true;status('Automática ao iniciar. Os controles abaixo permitem uma medição manual adicional.');render();},
  fail(message){history.failure=message;render();},
  cadence:()=>1,
  automaticDue:time=>!automatic.disabled&&time>=Math.max(nextAutoCapture,automatic.nextEligible),
  report:()=>({realizationId,schema:'live-nbody-diagnostics-v3',configuration:context.configuration,initial:context.initial,samples:history.samples,energyAudit:energyReport(),totalMeasurements:history.totalMeasurements,decimations:history.decimations,chartData:liveChartData(history.samples),qualification:'Read-only diagnostics of actual integrated states. Direct measurements exist only at audited snapshots; dashed segments are visual guides. Float64 energy evaluation does not upgrade Float32 trajectories.'})
 };
}
