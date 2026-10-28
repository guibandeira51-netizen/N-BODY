const $=id=>document.getElementById(id);let worker=null,result=null;
const fmt=x=>Number.isFinite(x)?x.toLocaleString('pt-BR',{maximumSignificantDigits:6}):'—';
function download(name,text,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('halo-comparison-run').onclick=async()=>{try{await new Promise((resolve,reject)=>window.dispatchEvent(new CustomEvent('halo-validation-start',{detail:{resolve,reject}})));worker?.terminate();worker=new Worker(new URL('./compute/halo-representation-validation-worker.js',import.meta.url),{type:'module'});$('halo-comparison-run').disabled=true;$('halo-comparison-cancel').disabled=false;$('halo-comparison-status').textContent='Preparando controles de 200 Myr e continuação até 1.200 Myr…';
 const finish=()=>{worker?.terminate();worker=null;$('halo-comparison-run').disabled=false;$('halo-comparison-cancel').disabled=true;};
 worker.onmessage=({data})=>{if(data.type==='progress'){$('halo-comparison-status').textContent=`${data.stage??''} · ${data.mode??''} · dt=${data.dt??'—'} Myr · t=${fmt(data.timeMyr)} Myr`;return;}
 if(data.type==='error'){$('halo-comparison-status').textContent=data.message;finish();return;}
 showResult(data.result);finish();};
 worker.onerror=e=>{$('halo-comparison-status').textContent=e.message;finish();};worker.postMessage({config:{baseN:Number($('halo-comparison-n').value)}});
 }catch(e){$('halo-comparison-status').textContent=e.message;}};
$('halo-comparison-cancel').onclick=()=>{worker?.terminate();worker=null;$('halo-comparison-run').disabled=false;$('halo-comparison-cancel').disabled=true;$('halo-comparison-status').textContent='Comparação cancelada; nenhum estado parcial foi certificado.';};
$('halo-comparison-json').onclick=()=>result&&download('comparacao-halo-representacoes.json',JSON.stringify(result,null,2),'application/json');
$('halo-comparison-csv').onclick=()=>{if(!result)return;const rows=result.runs.flatMap(r=>r.rows.map(x=>[r.mode,r.n,r.dt,x.timeMyr,x.mass,x.h50_kpc,x.sigmaNormal_kpc_Myr,x.R50_kpc,x.energy,x.selfPotential,x.externalPotential,x.relativeEnergy.percent,r.computeMs,r.diagnosticMs]));download('comparacao-halo-representacoes.csv','mode,N,dt_Myr,time_Myr,particle_mass_1e10Msun,h50_kpc,sigmaNormal_kpc_Myr,R50_kpc,E,Uself,Uexternal,deltaE_percent,gpu_compute_ms,diagnostic_ms\n'+rows.map(r=>r.join(',')).join('\n'),'text/csv');};

function showResult(data,preserved=false){
 result=data;$('halo-comparison-status').textContent=result.completed1200?`Comparação concluída até 1.200 Myr. Mesmos bariões iniciais: ${result.matchingInitialBaryons?'sim':'não'}. Ganho medido no cálculo GPU: ${fmt(result.gpuComputeSpeedup)}×. Não certifica equilíbrio.`:result.reason;
 $('halo-comparison-rows').innerHTML=result.runs.map(r=>{const last=r.rows.at(-1),at200=r.rows.find(x=>x.timeMyr>=200);return`<tr><td>${r.mode==='geometry'?'Geometria NFW':'Partículas NFW'}</td><td>${r.n}</td><td>${fmt(r.rows[0].h50_kpc)}</td><td>${fmt(at200?.h50_kpc)}</td><td>${fmt(last.h50_kpc)}</td><td>${fmt(Math.max(...r.rows.map(x=>x.relativeEnergy.absolute))*100)}</td><td>${fmt(r.computeMs/1000)}</td></tr>`;}).join('');$('halo-comparison-json').disabled=false;$('halo-comparison-csv').disabled=false;
 if(preserved)$('halo-comparison-status').textContent='Ensaio preservado de '+new Date(result.computedUTC).toLocaleDateString('pt-BR')+' · N₀='+result.config.baseN+'. '+$('halo-comparison-status').textContent;
}

fetch('./reports/halo-geometry-integrated-2026-10-22/comparison-4096.json').then(r=>r.ok?r.json():null).then(data=>{if(!result&&!worker&&data?.schema==='integrated-halo-representation-validation-v1')showResult(data,true);}).catch(()=>{});
