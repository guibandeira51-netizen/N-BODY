import {LaboratoryHistory,energyDrift} from './physics/laboratory.js';
import {plotSVG} from './laboratory-panel.js';
import {componentRotationPlot} from './component-rotation-plot.js';

export const liveDiagnosticsView=()=>`<section class="live-diagnostics" aria-labelledby="live-title"><div class="panel-heading"><span class="section-number">05</span><h2 id="live-title">Diagnósticos em tempo real</h2><span class="measurement-tag">Estados medidos</span></div><p id="live-epoch" class="field-help" role="status">Inicie a simulação para medir os gráficos.</p><div class="live-chart-grid"><figure><div id="live-height"></div><figcaption>h50: altura que contém metade da massa do disco em relação ao plano próprio instantâneo. O modelo sintético possui um único disco.</figcaption></figure><figure><div id="live-energy"></div><figcaption>ΔE/|E₀| com sinal, em %. O método da energia aparece junto à época medida; conservar energia não certifica estabilidade estrutural.</figcaption></figure><figure class="live-rotation"><div id="live-rotation"></div><figcaption>Contribuições gravitacionais atuais: disco, bojo, halo, disco + bojo e total (disco + bojo + halo). Calculadas por v² = −R⟨aR⟩ no plano z=0, com 32 sondas em azimute por raio e a mesma suavização da simulação. As contribuições são somadas em v². O ruído de partículas e da amostragem angular permanece; campos médios para fora geram lacunas em v.</figcaption></figure></div><p class="field-help">Os gráficos recebem estados calculados durante a execução e na pausa. A coleta procura intervalos de 1 Myr, com frequência limitada pelo custo do diagnóstico. A rotação é um diagnóstico do campo médio, distinto da velocidade média das partículas.</p></section>`;

// Pure projection of recorded diagnostics. Never advances or modifies particles.
export function liveChartData(samples){
 const first=samples[0],last=samples.at(-1);
 return {
  height:samples.map(s=>[s.timeMyr,s.diskFrame?.available&&Number.isFinite(s.diskFrame.instant?.h50)?s.diskFrame.instant.h50:null]),
  energy:samples.map(s=>{const value=first?energyDrift(s.conservation,first.conservation):null;return[s.timeMyr,value==null?null:100*value];}),
  rotationField:last?.rotationField??null,
  timeMyr:last?.timeMyr??null,energyApproximate:last?.conservation?.energyApproximate??null
 };
}

export function initializeLiveDiagnostics({getRunReport}){
 const history=new LaboratoryHistory(512),$=id=>document.getElementById(id);let context={};
 function render(){
  const samples=history.samples,data=liveChartData(samples);
  $('live-height').innerHTML=plotSVG([{label:'Disco · plano próprio',points:data.height}],{title:'Espessura do disco × tempo',yLabel:'h50 [kpc]'});
  $('live-energy').innerHTML=plotSVG([{label:'ΔE / |E₀|',points:data.energy}],{title:'Erro relativo de energia × tempo',yLabel:'ΔE / |E₀| [%]'});
  $('live-rotation').innerHTML=componentRotationPlot(data.rotationField);
  const epoch=$('live-epoch');epoch.dataset.timeMyr=data.timeMyr??'';epoch.dataset.measurements=history.totalMeasurements;
  epoch.textContent=samples.length?`Medição em ${data.timeMyr.toLocaleString('pt-BR',{maximumFractionDigits:3})} Myr · ${history.totalMeasurements} ${history.totalMeasurements===1?'estado medido':'estados medidos'} · energia ${data.energyApproximate?'aproximada por Barnes–Hut; erro da árvore não calibrado':'direta por pares Plummer'}${history.failure?' · '+history.failure:''}.`:'Inicie a simulação para medir os gráficos.';
 }
 render();
 return {
  add(sample){context=structuredClone(getRunReport());history.add(sample);render();},
  reset(){history.reset();context={};render();},
  fail(message){history.failure=message;render();},
  cadence:()=>1,
  report:()=>({schema:'live-nbody-diagnostics-v2',configuration:context.configuration,initial:context.initial,samples:history.samples,totalMeasurements:history.totalMeasurements,decimations:history.decimations,chartData:liveChartData(history.samples),qualification:'Measured live diagnostics; component circular speeds from current particle radial fields, azimuthally averaged with Plummer softening; not mean particle velocities or independent observations.'})
 };
}
