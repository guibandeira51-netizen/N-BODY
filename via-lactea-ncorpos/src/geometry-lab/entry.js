import {SOURCES} from './physics.js';
import {chartSVG,figureData,figureCSV,escape} from './plots.js';
const $=id=>document.getElementById(id),format=x=>Number.isFinite(x)?Math.abs(x)>0&&(Math.abs(x)<.001||Math.abs(x)>=1e8)?x.toExponential(5).replace('.',','):x.toLocaleString('pt-BR',{maximumSignificantDigits:6}):'indisponível';
let worker=null,result=null,codeIdentity=null;
fetch('./reports/geometry-lab-2026-10-22/code-identity.json').then(r=>r.ok?r.json():null).then(r=>{codeIdentity=r;if(result)result.codeIdentity=r;}).catch(()=>{});
$('sources').innerHTML=SOURCES.map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escape(s.name)}</a></li>`).join('');
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function render(){
 if(!result)return;const focus=$('focus').value;
 for(const kind of ['rotation','orbits','lensing'])$(kind).innerHTML=chartSVG(figureData(result,kind,focus));
 const near=result.rotation.reduce((a,b)=>Math.abs(a.R_kpc-8)<Math.abs(b.R_kpc-8)?a:b);
 $('scale-phi').textContent=format(near.absPhiBaryons_over_c2);$('scale-v').textContent=format(near.vBaryons2_over_c2);$('halo-ratio').textContent=format(near.halo_over_baryonic_acceleration);
 $('scale-note').textContent=`Em R=${near.R_kpc} kpc: v bariônica=${format(near.baryons_km_s)} km/s; com halo=${format(near.total_km_s)} km/s. Os parâmetros de campo fraco indicam uma escala de expansão, não uma correção pós-newtoniana calculada ou uma barra de incerteza.`;
 $('source-rows').innerHTML=result.sourceChecks.map(r=>`<tr><td>${format(r.x_kpc)}</td><td>${format(r.h_kpc)}</td><td>${format(r.rho_baryons)}</td><td>${format(r.rho_halo)}</td><td>${format(r.extra_source_if_halo_field)}</td><td>${format(r.extra_source_relative_residual)}</td></tr>`).join('');
 $('vacuum-result').textContent=`Controle pontual: M=${format(result.vacuum.mass_1e10Msun)} × 10¹⁰ M☉; r=${result.vacuum.r_areal_kpc} kpc. R=0, mas K=${format(result.vacuum.kretschmann_kpc_minus4)} kpc⁻⁴. Correção relativa de v² local: ${format(result.vacuum.fractionalV2Correction)}. Não se aplica essa fórmula esférica à galáxia estendida.`;
 $('orbit-results').innerHTML=result.orbits.map(o=>`<tr><td>${o.withHalo?'Bariônica + halo':'Bariônica'}</td><td>${format(o.duration_Myr)}</td><td>${o.steps}</td><td>${format(o.maxRelativeEnergyError_everyStep)}</td><td>${format(o.maxRelativeLzError_everyStep)}</td></tr>`).join('');
 $('convergence').textContent=`dt, dt/2 e dt/4 = ${result.orbitConvergence.map(o=>format(o.dt_Myr)).join('; ')} Myr. Diferenças de posição final: ${format(result.convergence.finalPositionDifference_dt_dt2_kpc)} e ${format(result.convergence.finalPositionDifference_dt2_dt4_kpc)} kpc; razão medida ${format(result.convergence.ratio)}. Espera-se aproximação a 4 no regime assintótico de segunda ordem. Não é um certificado de equilíbrio nem da precisão da RG completa.`;
 const lensDifference=Math.max(...result.lensingConvergence.map(r=>Math.abs(r.at512.total_arcsec-r.at1024.total_arcsec)));
 $('lensing-numerics').textContent=`Quadratura Simpson após z=b tan(θ), com 512 intervalos por trecho e separação nas fronteiras do halo. Nos impactos auditados ${result.lensingConvergence.map(r=>r.b_kpc).join(', ')} kpc, a maior diferença entre 512 e 1.024 intervalos foi ${format(lensDifference)} arcsec. É uma comparação numérica pontual, sem intervalo de incerteza certificado. O relatório inclui os resultados com 256, 512 e 1.024 intervalos.`;
 $('run-details').textContent=`Configuração calculada: R₀=${format(result.configuration.radius)} kpc, T=${format(result.configuration.duration)} Myr e dt=${format(result.configuration.dt)} Myr. Cálculo Float64 concluído em ${format(result.costMs)} ms. Órbitas retêm estados reais aproximadamente a cada 5 Myr e no fim; os máximos de energia e Lz são avaliados em todos os passos. Perfis contínuos sem suavização de partículas. R₂₀₀=${format(result.parameters.R200_kpc)} kpc; fim do halo suavemente truncado=${format(result.parameters.haloOuterRadius_kpc)} kpc; massa total integrada do halo=${format(result.parameters.haloTotalMass_1e10Msun)} × 10¹⁰ M☉. Nenhum parâmetro físico foi ajustado.`;
 document.querySelectorAll('[data-export]').forEach(b=>b.disabled=false);$('results').hidden=false;
}
function run(){
 const config={radius:Number($('radius').value),duration:Number($('duration').value),dt:Number($('orbit-dt').value)};
 if(!Object.values(config).every(x=>Number.isFinite(x)&&x>0)){$('job').textContent='Informe raio, duração e dt positivos e finitos.';return;}
 worker?.terminate();worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});$('run').disabled=true;$('cancel').disabled=false;$('progress').value=0;$('job').textContent='Calculando os campos e integrando órbitas de teste no Worker…';
 const active=worker;const finish=()=>{active.terminate();if(worker===active)worker=null;$('run').disabled=false;$('cancel').disabled=true;};
 active.onmessage=({data})=>{if(worker!==active)return;if(data.type==='progress')$('progress').value=data.progress;
  else if(data.type==='result'){result=data.result;result.codeIdentity=codeIdentity;render();$('progress').value=1;$('job').textContent='Comparação concluída. A hipótese de um halo emergente não foi demonstrada neste regime.';finish();}
  else if(data.type==='error'){$('job').textContent='Cálculo interrompido: '+data.message;finish();}};
 active.onerror=e=>{$('job').textContent='Falha no Worker: '+e.message;finish();};active.postMessage({config});
}
$('run').onclick=run;$('cancel').onclick=()=>{worker?.terminate();worker=null;$('run').disabled=false;$('cancel').disabled=true;$('job').textContent='Cálculo cancelado. Nenhuma saída parcial foi apresentada como resultado concluído.';};
$('focus').onchange=render;
document.querySelectorAll('[data-export]').forEach(button=>button.onclick=()=>{if(!result)return;const kind=button.dataset.kind,type=button.dataset.export;
 if(type==='svg')download(`geometria-${kind}.svg`,chartSVG(figureData(result,kind,$('focus').value)),'image/svg+xml');
 else if(type==='csv')download(`geometria-${kind}.csv`,figureCSV(result,kind),'text/csv;charset=utf-8');
 else download('geometria-relatorio.json',JSON.stringify(result,null,2),'application/json');
});
run();
