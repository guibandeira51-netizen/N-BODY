import {LaboratoryHistory,energyDrift} from './physics/laboratory.js';
import {analyticAcceleration} from './physics/models.js';
import {KM_S_TO_KPC_MYR} from './physics/constants.js';
import {plotSVG} from './laboratory-panel.js';

export const liveDiagnosticsView=()=>`<section class="live-diagnostics" aria-labelledby="live-title"><div class="panel-heading"><span class="section-number">05</span><h2 id="live-title">Diagnósticos em tempo real</h2><span class="measurement-tag">Estados medidos</span></div><p id="live-epoch" class="field-help" role="status">Inicie a simulação para medir os gráficos.</p><div class="live-chart-grid"><figure><div id="live-height"></div><figcaption>h50: altura que contém metade da massa do disco em relação ao plano próprio instantâneo. O modelo sintético possui um único disco.</figcaption></figure><figure><div id="live-energy"></div><figcaption>ΔE/|E₀| com sinal, em %. O método da energia aparece junto à época medida; conservar energia não certifica estabilidade estrutural.</figcaption></figure><figure class="live-rotation"><div id="live-rotation"></div><figcaption>Rotação média das partículas do disco por anel, ponderada por massa, em torno do eixo z e da origem inicial. A referência circular vem do potencial analítico inicial; não acompanha o campo evoluído. Nenhuma observação astronômica é desenhada aqui.</figcaption></figure></div><p class="field-help">Os gráficos recebem estados calculados durante a execução e na pausa. A coleta procura intervalos de 1 Myr, com frequência limitada pelo custo do diagnóstico. Anéis vazios ficam sem valor.</p></section>`;

// Pure projection of recorded diagnostics. Never advances or modifies particles.
export function liveChartData(samples,{withHalo=true}={}){
 const first=samples[0],last=samples.at(-1),disk=s=>s?.components?.find(c=>c.id===1);
 const bins=disk(last)?.profiles?.velocity??[];
 const rings=s=>(disk(s)?.profiles?.velocity??[]).filter(b=>Number.isFinite(b.upper)&&b.upper<=30);
 const rotation=s=>rings(s).map(b=>[(b.lower+b.upper)/2,b.mass>0&&Number.isFinite(b.mean?.[1])?b.mean[1]/KM_S_TO_KPC_MYR:null]);
 return {
  height:samples.map(s=>[s.timeMyr,s.diskFrame?.available&&Number.isFinite(s.diskFrame.instant?.h50)?s.diskFrame.instant.h50:null]),
  energy:samples.map(s=>{const value=first?energyDrift(s.conservation,first.conservation):null;return[s.timeMyr,value==null?null:100*value];}),
  initialRotation:rotation(first),currentRotation:rotation(last),
  circularReference:rings(last).map(b=>{const R=(b.lower+b.upper)/2,aR=analyticAcceleration(R,0,0,withHalo)[0];return[R,aR<0?Math.sqrt(-R*aR)/KM_S_TO_KPC_MYR:null];}),
  rotationBins:bins.filter(b=>Number.isFinite(b.upper)&&b.upper<=30).map(b=>({lowerKpc:b.lower,upperKpc:b.upper,count:b.count,effectiveCount:b.effectiveCount??null})),
  timeMyr:last?.timeMyr??null,energyApproximate:last?.conservation?.energyApproximate??null
 };
}

export function initializeLiveDiagnostics({getRunReport}){
 const history=new LaboratoryHistory(512),$=id=>document.getElementById(id);let context={};
 function render(){
  const samples=history.samples,data=liveChartData(samples,{withHalo:context.configuration?.withHalo!==false});
  $('live-height').innerHTML=plotSVG([{label:'Disco · plano próprio',points:data.height}],{title:'Espessura do disco × tempo',yLabel:'h50 [kpc]'});
  $('live-energy').innerHTML=plotSVG([{label:'ΔE / |E₀|',points:data.energy}],{title:'Erro relativo de energia × tempo',yLabel:'ΔE / |E₀| [%]'});
  $('live-rotation').innerHTML=plotSVG([{label:'Rotação média inicial',points:data.initialRotation},{label:'Rotação média atual',points:data.currentRotation},{label:'Circular · potencial inicial',points:data.circularReference}],{title:'Curvas de rotação · disco',xLabel:'Raio cilíndrico R [kpc]',yLabel:'Velocidade [km/s]'});
  const epoch=$('live-epoch');epoch.dataset.timeMyr=data.timeMyr??'';epoch.dataset.measurements=history.totalMeasurements;
  epoch.textContent=samples.length?`Medição em ${data.timeMyr.toLocaleString('pt-BR',{maximumFractionDigits:3})} Myr · ${history.totalMeasurements} ${history.totalMeasurements===1?'estado medido':'estados medidos'} · energia ${data.energyApproximate?'aproximada por Barnes–Hut; erro da árvore não calibrado':'direta por pares Plummer'}${history.failure?' · '+history.failure:''}.`:'Inicie a simulação para medir os gráficos.';
 }
 render();
 return {
  add(sample){context=structuredClone(getRunReport());history.add(sample);render();},
  reset(){history.reset();context={};render();},
  fail(message){history.failure=message;render();},
  cadence:()=>1,
  report:()=>({schema:'live-nbody-diagnostics-v1',configuration:context.configuration,initial:context.initial,samples:history.samples,totalMeasurements:history.totalMeasurements,decimations:history.decimations,chartData:liveChartData(history.samples,{withHalo:context.configuration?.withHalo!==false}),qualification:'Measured live diagnostics; initial analytic circular curve is a reference, not the evolved particle field or an observation.'})
 };
}
