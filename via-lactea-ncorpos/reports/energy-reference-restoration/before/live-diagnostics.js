import {LaboratoryHistory,energyDrift} from './physics/laboratory.js';
import {plotSVG} from './laboratory-panel.js';
import {componentRotationPlot} from './component-rotation-plot.js';
import {relativeEnergy,compareEnergy} from './physics/live-energy.js';
import {LiveEnergyReference} from './compute/live-energy-reference.js';

export const liveDiagnosticsView=()=>`<section class="live-diagnostics" aria-labelledby="live-title"><div class="panel-heading"><span class="section-number">05</span><h2 id="live-title">Diagnósticos em tempo real</h2><span class="measurement-tag">Estados medidos</span></div><p id="live-epoch" class="field-help" role="status">Inicie a simulação para medir os gráficos.</p><div class="live-chart-grid"><figure><div id="live-height"></div><div class="live-chart-actions"><button type="button" class="save-chart" data-save-chart="live-height" aria-label="Salvar gráfico de espessura do disco" disabled>Salvar gráfico</button></div></figure><figure><div id="live-energy"></div><div class="live-chart-actions"><button type="button" class="save-chart" data-save-chart="live-energy" aria-label="Salvar gráfico de conservação da energia" disabled>Salvar gráfico</button></div></figure><figure class="live-rotation"><div id="live-rotation"></div><div class="live-chart-actions"><button type="button" class="save-chart" data-save-chart="live-rotation" aria-label="Salvar gráfico das curvas de rotação" disabled>Salvar gráfico</button></div></figure></div></section>`;

// Pure projection of recorded diagnostics. Never advances or modifies particles.
export function liveChartData(samples){
 const first=samples[0],last=samples.at(-1);
 return {
  height:samples.map(s=>[s.timeMyr,s.diskFrame?.available&&Number.isFinite(s.diskFrame.instant?.h50)?s.diskFrame.instant.h50:null]),
  energy:samples.map(s=>[s.timeMyr,relativeEnergy(s.conservation,first?.conservation)?.percent??null]),
  rotationField:last?.rotationField??null,
  timeMyr:last?.timeMyr??null,energyApproximate:last?.conservation?.energyApproximate??null
 };
}

export function energyPlot(samples,references=[]){
 const fast=liveChartData(samples).energy,d0=references[0]?.direct;
 const points=references.flatMap(r=>[[r.timeMyr,relativeEnergy(r.direct,d0)?.percent??null],[r.timeMyr,null]]);
 return plotSVG([{label:'Estimada · Barnes–Hut',points:fast},{label:'Direta · Float64',points}],{title:'Conservação da energia × tempo físico',yLabel:'Desvio assinado [%]'});
}
export function initializeLiveDiagnostics({getRunReport,captureEnergy}){
 const history=new LaboratoryHistory(512),$=id=>document.getElementById(id),pool=new LiveEnergyReference();let context={},references=[],selected=null,token=0,maxFast=0,jobBusy=false,codeIdentity=null;
 fetch('./reports/interface-106/code-identity.json').then(r=>r.ok?r.json():null).then(r=>codeIdentity=r).catch(()=>{});
 const number=x=>Number.isFinite(x)?x.toLocaleString('pt-BR',{maximumSignificantDigits:6}):'indisponível';
 const download=(name,data,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
 function render(){
  const samples=history.samples,data=liveChartData(samples);
  $('live-height').innerHTML=plotSVG([{label:'Disco · plano próprio',points:data.height}],{title:'Espessura do disco × tempo',yLabel:'h50 [kpc]'});
  $('live-energy').innerHTML=energyPlot(samples,references);
  $('live-rotation').innerHTML=componentRotationPlot(data.rotationField);
  document.querySelectorAll('[data-save-chart]').forEach(button=>button.disabled=!samples.length);
  const epoch=$('live-epoch');epoch.dataset.timeMyr=data.timeMyr??'';epoch.dataset.measurements=history.totalMeasurements;
  epoch.textContent=samples.length?`Medição em ${number(data.timeMyr)} Myr · ${history.totalMeasurements} estados medidos · energia estimada — Barnes–Hut${history.failure?' · '+history.failure:''}.`:'Inicie a simulação para medir os gráficos.';
  const first=samples[0]?.conservation,last=samples.at(-1)?.conservation,r=relativeEnergy(last,first),recent=references.at(-1),r0=references[0],dt=samples.slice(1).map((s,i)=>s.timeMyr-samples[i].timeMyr);
  if($('energy-summary')) $('energy-summary').textContent=first?`Estimativa BH: E₀ = ${number(first.energy)}; E(${number(data.timeMyr)} Myr) = ${number(last.energy)} [10¹⁰ M☉ kpc²/Myr²]. Último erro: ${number(r?.percent)}% (assinado); |erro| = ${number(r?100*r.absolute:null)}%; maior |erro| amostrado = ${number(100*maxFast)}%. Normalização: ${r?.normalization}.`:'Sem medições de energia.';
  if($('energy-quality')) $('energy-quality').textContent=recent?`${references.length<2?'Somente a energia inicial foi auditada; conservação temporal ainda não verificada. ':''}Referência direta em ${number(recent.timeMyr)} Myr: E = ${number(recent.direct.energy)}; desvio = ${number(relativeEnergy(recent.direct,r0.direct)?.percent)}%; maior |desvio| direto amostrado = ${number(100*Math.max(...references.map(x=>relativeEnergy(x.direct,r0.direct)?.absolute??0)))}%. No mesmo snapshot: U_BH − U_direto = ${number(recent.deltaU)}; erro relativo de U = ${number(100*recent.relativeU)}%. Calibração pontual; sem faixa de incerteza entre estados auditados.`:'Conservação energética ainda não verificada por referência direta nesta execução.';
  if($('energy-method')) $('energy-method').textContent=last?`Força: ${last.forceAlgorithm}; trajetória ${last.trajectoryPrecision}. Diagnóstico CPU Float64; K e referência com somatório compensado. Árvore monopolar, θ=${last.theta}, folhas de 8 corpos. G=${last.G}; ε² efetivo=${last.epsilonSquared} kpc²; ε² usado na árvore=${last.treeEpsilonSquared}. Velocidades: ${last.velocityEpoch}. Cadência efetivamente retida: ${dt.length?number(Math.min(...dt))+' a '+number(Math.max(...dt))+' Myr':'ainda sem intervalo'}. Custo do último diagnóstico energético: ${number(last.diagnosticCostMs)} ms. O histórico conserva o início e é reduzido após 512 registros; o maior erro amostrado é preservado. Referência sem aproximação de árvore; arredondamento Float64 não possui intervalo formal certificado.`:'Parâmetros disponíveis após iniciar.';
 }
 for(const button of document.querySelectorAll('[data-save-chart]'))button.addEventListener('click',()=>{
  const svg=$(button.dataset.saveChart)?.querySelector('svg');if(!svg||!history.samples.length)return;
  const names={'live-height':'espessura-disco','live-energy':'conservacao-energia','live-rotation':'curvas-rotacao-componentes'};
  download(names[button.dataset.saveChart]+'.svg',svg.outerHTML,'image/svg+xml;charset=utf-8');
 });
 render();
 if($('energy-estimate')) $('energy-estimate').onclick=async()=>{
  if(jobBusy)return;const mine=token;jobBusy=true;$('energy-estimate').disabled=true;$('energy-reference').disabled=true;$('energy-cancel').disabled=false;
  try{selected=await captureEnergy();if(mine!==token)return;const s=selected.states.at(-1).state,n=Math.min(1000,s.n),pilot={...s,n,positions:s.positions.slice(0,3*n),velocities:s.velocities.slice(0,3*n),masses:s.masses.slice(0,n),components:s.components.slice(0,n)};
   $('energy-job').textContent='Medindo custo com até 1.000 corpos; este piloto não é um ponto de referência da galáxia.';
   await pool.evaluate(pilot,selected.options,p=>$('energy-progress').value=p);if(mine!==token)return;
   $('energy-job').textContent=`Estados fixados: ${selected.states.map(x=>number(x.state.time)+' Myr').join(', ')}; N=${s.n}; ${s.n*(s.n-1)/2} pares/estado. Custo projetado total: ~${number(pool.estimate(s.n)*selected.states.length/1000)} s, sensível à carga e à extrapolação do piloto. Execute a referência para esses estados ou estime novamente para selecionar outro instante.`;$('energy-reference').disabled=false;
  }catch(e){if(mine===token)$('energy-job').textContent=e.message;}finally{if(mine===token){jobBusy=false;$('energy-estimate').disabled=false;$('energy-cancel').disabled=true;}}
 };
 if($('energy-reference')) $('energy-reference').onclick=async()=>{
  if(jobBusy||!selected)return;jobBusy=true;const mine=token,job=selected;$('energy-estimate').disabled=true;$('energy-reference').disabled=true;$('energy-cancel').disabled=false;
  try{for(let i=0;i<job.states.length;i++){
   const {state,fast}=job.states[i];if(references.some(r=>r.timeMyr===state.time))continue;
   $('energy-job').textContent=`Referência direta ${i+1}/${job.states.length}, em ${number(state.time)} Myr; ${pool.count} Workers CPU. Progresso por partição concluída.`;
   const direct=await pool.evaluate(state,job.options,p=>$('energy-progress').value=(i+p)/job.states.length);if(mine!==token)return;
   references.push({...compareEnergy(fast,direct),snapshot:{n:state.n,time:state.time,positions:state.positions,velocities:state.velocities,masses:state.masses,components:state.components}});references.sort((a,b)=>a.timeMyr-b.timeMyr);render();
  }$('energy-job').textContent='Referências concluídas. Os pontos correspondem somente aos estados selecionados; nenhuma interpolação direta foi criada.';selected=null;
  }catch(e){if(mine===token)$('energy-job').textContent=e.message;}finally{if(mine===token){jobBusy=false;$('energy-estimate').disabled=false;$('energy-cancel').disabled=true;}}
 };
 if($('energy-cancel')) $('energy-cancel').onclick=()=>{token++;pool.cancel();jobBusy=false;selected=null;$('energy-estimate').disabled=false;$('energy-reference').disabled=true;$('energy-cancel').disabled=true;$('energy-job').textContent='Referência cancelada. Pontos já concluídos foram preservados.';};
 function energyReport(){return {schema:'legacy-energy-audit-v1',codeIdentity,configuration:context.configuration,fastSamples:history.samples.map(s=>({timeMyr:s.timeMyr,...s.conservation,relative:relativeEnergy(s.conservation,history.samples[0].conservation)})),references,maxFastAbsolute:maxFast,normalization:'signed (E(t)-E0)/abs(E0); fallback K0+abs(U0) near cancellation',noInterpolatedReference:true};}
 if($('energy-json')) $('energy-json').onclick=()=>download('energia-ncorpos.json',JSON.stringify(energyReport(),(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v,2),'application/json');
 if($('energy-svg')) $('energy-svg').onclick=()=>download('energia-ncorpos.svg',energyPlot(history.samples,references),'image/svg+xml');
 if($('energy-csv')) $('energy-csv').onclick=()=>{const rows=[['time_Myr','method','K','U','E','deltaE_signed','deltaE_percent','deltaU_BH_minus_direct','relative_U_error','cost_ms','G','epsilonSquared','force','trajectory_precision']];for(const s of energyReport().fastSamples)rows.push([s.timeMyr,'BH',s.kinetic,s.potential,s.energy,s.relative?.signed,s.relative?.percent,'','',s.diagnosticCostMs,s.G,s.epsilonSquared,s.forceAlgorithm,s.trajectoryPrecision]);for(const r of references){const d=r.direct,e=relativeEnergy(d,references[0].direct);rows.push([r.timeMyr,'direct-Float64',d.kinetic,d.potential,d.energy,e?.signed,e?.percent,r.deltaU,r.relativeU,d.diagnosticCostMs,d.G,d.epsilonSquared,d.forceAlgorithm,d.trajectoryPrecision]);}download('energia-ncorpos.csv',rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv');};
 return {
  add(sample){context=structuredClone(getRunReport());history.add(sample);maxFast=Math.max(maxFast,relativeEnergy(sample.conservation,history.samples[0].conservation)?.absolute??0);render();},
  reset(){token++;pool.cancel();history.reset();context={};references=[];selected=null;maxFast=0;jobBusy=false;if($('energy-estimate')){$('energy-estimate').disabled=false;$('energy-reference').disabled=true;$('energy-cancel').disabled=true;$('energy-progress').value=0;$('energy-job').textContent='Sem referência selecionada.';}render();},
  fail(message){history.failure=message;render();},
  cadence:()=>1,
  report:()=>({schema:'live-nbody-diagnostics-v3',configuration:context.configuration,initial:context.initial,samples:history.samples,energyAudit:energyReport(),totalMeasurements:history.totalMeasurements,decimations:history.decimations,chartData:liveChartData(history.samples),qualification:'Read-only diagnostics of actual integrated states. Sparse direct references are not interpolated. Float64 energy evaluation does not upgrade Float32 trajectories.'})
 };
}
