import {LaboratoryHistory,energyDrift} from './physics/laboratory.js';
import {plotSVG} from './laboratory-panel.js';
import {componentRotationPlot} from './component-rotation-plot.js';
import {relativeEnergy,compareEnergy} from './physics/live-energy.js';
import {LiveEnergyReference} from './compute/live-energy-reference.js';

export const liveDiagnosticsView=()=>`<section class="live-diagnostics" aria-labelledby="live-title"><div class="panel-heading"><span class="section-number">05</span><h2 id="live-title">Diagnósticos em tempo real</h2><span class="measurement-tag">Estados medidos</span></div><p id="live-epoch" class="field-help" role="status">Inicie a simulação para medir os gráficos.</p><div class="live-chart-grid"><figure><div id="live-height"></div><figcaption>h50: altura que contém metade da massa do disco em relação ao plano próprio instantâneo. O modelo sintético possui um único disco.</figcaption></figure><figure><div id="live-energy"></div><figcaption>Linha: energia estimada — Barnes–Hut. Pontos: energia direta Float64, somente nos estados auditados. ΔE/|E₀| assinado, em %. Cada método usa sua própria energia inicial, no mesmo estado físico. Conservar energia não certifica estabilidade estrutural.</figcaption><div class="energy-audit"><p id="energy-summary"></p><p id="energy-quality">Conservação energética ainda não verificada por referência direta nesta execução.</p><button id="energy-estimate" class="button secondary">Estimar referência direta</button><button id="energy-reference" class="button primary" disabled>Calcular referência direta</button><button id="energy-cancel" class="button secondary" disabled>Cancelar referência</button><progress id="energy-progress" max="1" value="0" aria-label="Progresso da referência energética"></progress><p id="energy-job" role="status">O custo O(N²) é medido antes da avaliação completa. A integração pausa para capturar o estado e retoma se estava em execução.</p><details><summary>Métodos, parâmetros e dados de energia</summary><p id="energy-method"></p><button id="energy-json" class="button secondary">Energia · JSON</button><button id="energy-csv" class="button secondary">Energia · CSV</button><button id="energy-svg" class="button secondary">Gráfico · SVG</button><p><a href="./AUDITORIA_ENERGIA_NCORPOS.md">Auditoria</a> · <a href="./COMPARACAO_ENERGIA_DIRETA_BH.md">Comparação direta/BH</a> · <a href="./VALIDACAO_CONSERVACAO_ENERGIA.md">Ensaios e limites</a></p></details></div></figure><figure class="live-rotation"><div id="live-rotation"></div><figcaption>Contribuições gravitacionais atuais: disco, bojo, halo, disco + bojo e total (disco + bojo + halo). Calculadas por v² = −R⟨aR⟩ no plano z=0, com 32 sondas em azimute por raio e a mesma suavização da simulação. As contribuições são somadas em v². O ruído de partículas e da amostragem angular permanece; campos médios para fora geram lacunas em v.</figcaption></figure></div><p class="field-help">Os gráficos recebem estados calculados durante a execução e na pausa. A coleta procura intervalos de 1 Myr, com frequência limitada pelo custo do diagnóstico. A rotação é um diagnóstico do campo médio, distinto da velocidade média das partículas.</p></section>`;

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
  const epoch=$('live-epoch');epoch.dataset.timeMyr=data.timeMyr??'';epoch.dataset.measurements=history.totalMeasurements;
  epoch.textContent=samples.length?`Medição em ${number(data.timeMyr)} Myr · ${history.totalMeasurements} estados medidos · energia estimada — Barnes–Hut${history.failure?' · '+history.failure:''}.`:'Inicie a simulação para medir os gráficos.';
  const first=samples[0]?.conservation,last=samples.at(-1)?.conservation,r=relativeEnergy(last,first),recent=references.at(-1),r0=references[0],dt=samples.slice(1).map((s,i)=>s.timeMyr-samples[i].timeMyr);
  $('energy-summary').textContent=first?`Estimativa BH: E₀ = ${number(first.energy)}; E(${number(data.timeMyr)} Myr) = ${number(last.energy)} [10¹⁰ M☉ kpc²/Myr²]. Último erro: ${number(r?.percent)}% (assinado); |erro| = ${number(r?100*r.absolute:null)}%; maior |erro| amostrado = ${number(100*maxFast)}%. Normalização: ${r?.normalization}.`:'Sem medições de energia.';
  $('energy-quality').textContent=recent?`${references.length<2?'Somente a energia inicial foi auditada; conservação temporal ainda não verificada. ':''}Referência direta em ${number(recent.timeMyr)} Myr: E = ${number(recent.direct.energy)}; desvio = ${number(relativeEnergy(recent.direct,r0.direct)?.percent)}%; maior |desvio| direto amostrado = ${number(100*Math.max(...references.map(x=>relativeEnergy(x.direct,r0.direct)?.absolute??0)))}%. No mesmo snapshot: U_BH − U_direto = ${number(recent.deltaU)}; erro relativo de U = ${number(100*recent.relativeU)}%. Calibração pontual; sem faixa de incerteza entre estados auditados.`:'Conservação energética ainda não verificada por referência direta nesta execução.';
  $('energy-method').textContent=last?`Força: ${last.forceAlgorithm}; trajetória ${last.trajectoryPrecision}. Diagnóstico CPU Float64; K e referência com somatório compensado. Árvore monopolar, θ=${last.theta}, folhas de 8 corpos. G=${last.G}; ε² efetivo=${last.epsilonSquared} kpc²; ε² usado na árvore=${last.treeEpsilonSquared}. Velocidades: ${last.velocityEpoch}. Cadência efetivamente retida: ${dt.length?number(Math.min(...dt))+' a '+number(Math.max(...dt))+' Myr':'ainda sem intervalo'}. Custo do último diagnóstico energético: ${number(last.diagnosticCostMs)} ms. O histórico conserva o início e é reduzido após 512 registros; o maior erro amostrado é preservado. Referência sem aproximação de árvore; arredondamento Float64 não possui intervalo formal certificado.`:'Parâmetros disponíveis após iniciar.';
 }
 render();
 $('energy-estimate').onclick=async()=>{
  if(jobBusy)return;const mine=token;jobBusy=true;$('energy-estimate').disabled=true;$('energy-reference').disabled=true;$('energy-cancel').disabled=false;
  try{selected=await captureEnergy();if(mine!==token)return;const s=selected.states.at(-1).state,n=Math.min(1000,s.n),pilot={...s,n,positions:s.positions.slice(0,3*n),velocities:s.velocities.slice(0,3*n),masses:s.masses.slice(0,n),components:s.components.slice(0,n)};
   $('energy-job').textContent='Medindo custo com até 1.000 corpos; este piloto não é um ponto de referência da galáxia.';
   await pool.evaluate(pilot,selected.options,p=>$('energy-progress').value=p);if(mine!==token)return;
   $('energy-job').textContent=`Estados fixados: ${selected.states.map(x=>number(x.state.time)+' Myr').join(', ')}; N=${s.n}; ${s.n*(s.n-1)/2} pares/estado. Custo projetado total: ~${number(pool.estimate(s.n)*selected.states.length/1000)} s, sensível à carga e à extrapolação do piloto. Execute a referência para esses estados ou estime novamente para selecionar outro instante.`;$('energy-reference').disabled=false;
  }catch(e){if(mine===token)$('energy-job').textContent=e.message;}finally{if(mine===token){jobBusy=false;$('energy-estimate').disabled=false;$('energy-cancel').disabled=true;}}
 };
 $('energy-reference').onclick=async()=>{
  if(jobBusy||!selected)return;jobBusy=true;const mine=token,job=selected;$('energy-estimate').disabled=true;$('energy-reference').disabled=true;$('energy-cancel').disabled=false;
  try{for(let i=0;i<job.states.length;i++){
   const {state,fast}=job.states[i];if(references.some(r=>r.timeMyr===state.time))continue;
   $('energy-job').textContent=`Referência direta ${i+1}/${job.states.length}, em ${number(state.time)} Myr; ${pool.count} Workers CPU. Progresso por partição concluída.`;
   const direct=await pool.evaluate(state,job.options,p=>$('energy-progress').value=(i+p)/job.states.length);if(mine!==token)return;
   references.push({...compareEnergy(fast,direct),snapshot:{n:state.n,time:state.time,positions:state.positions,velocities:state.velocities,masses:state.masses,components:state.components}});references.sort((a,b)=>a.timeMyr-b.timeMyr);render();
  }$('energy-job').textContent='Referências concluídas. Os pontos correspondem somente aos estados selecionados; nenhuma interpolação direta foi criada.';selected=null;
  }catch(e){if(mine===token)$('energy-job').textContent=e.message;}finally{if(mine===token){jobBusy=false;$('energy-estimate').disabled=false;$('energy-cancel').disabled=true;}}
 };
 $('energy-cancel').onclick=()=>{token++;pool.cancel();jobBusy=false;selected=null;$('energy-estimate').disabled=false;$('energy-reference').disabled=true;$('energy-cancel').disabled=true;$('energy-job').textContent='Referência cancelada. Pontos já concluídos foram preservados.';};
 function energyReport(){return {schema:'legacy-energy-audit-v1',codeIdentity,configuration:context.configuration,fastSamples:history.samples.map(s=>({timeMyr:s.timeMyr,...s.conservation,relative:relativeEnergy(s.conservation,history.samples[0].conservation)})),references,maxFastAbsolute:maxFast,normalization:'signed (E(t)-E0)/abs(E0); fallback K0+abs(U0) near cancellation',noInterpolatedReference:true};}
 $('energy-json').onclick=()=>download('energia-ncorpos.json',JSON.stringify(energyReport(),(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v,2),'application/json');
 $('energy-svg').onclick=()=>download('energia-ncorpos.svg',energyPlot(history.samples,references),'image/svg+xml');
 $('energy-csv').onclick=()=>{const rows=[['time_Myr','method','K','U','E','deltaE_signed','deltaE_percent','deltaU_BH_minus_direct','relative_U_error','cost_ms','G','epsilonSquared','force','trajectory_precision']];for(const s of energyReport().fastSamples)rows.push([s.timeMyr,'BH',s.kinetic,s.potential,s.energy,s.relative?.signed,s.relative?.percent,'','',s.diagnosticCostMs,s.G,s.epsilonSquared,s.forceAlgorithm,s.trajectoryPrecision]);for(const r of references){const d=r.direct,e=relativeEnergy(d,references[0].direct);rows.push([r.timeMyr,'direct-Float64',d.kinetic,d.potential,d.energy,e?.signed,e?.percent,r.deltaU,r.relativeU,d.diagnosticCostMs,d.G,d.epsilonSquared,d.forceAlgorithm,d.trajectoryPrecision]);}download('energia-ncorpos.csv',rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv');};
 return {
  add(sample){context=structuredClone(getRunReport());history.add(sample);maxFast=Math.max(maxFast,relativeEnergy(sample.conservation,history.samples[0].conservation)?.absolute??0);render();},
  reset(){token++;pool.cancel();history.reset();context={};references=[];selected=null;maxFast=0;jobBusy=false;$('energy-estimate').disabled=false;$('energy-reference').disabled=true;$('energy-cancel').disabled=true;$('energy-progress').value=0;$('energy-job').textContent='Sem referência selecionada.';render();},
  fail(message){history.failure=message;render();},
  cadence:()=>1,
  report:()=>({schema:'live-nbody-diagnostics-v3',configuration:context.configuration,initial:context.initial,samples:history.samples,energyAudit:energyReport(),totalMeasurements:history.totalMeasurements,decimations:history.decimations,chartData:liveChartData(history.samples),qualification:'Read-only diagnostics of actual integrated states. Sparse direct references are not interpolated. Float64 energy evaluation does not upgrade Float32 trajectories.'})
 };
}
