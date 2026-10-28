import {GPUBackend} from '../../src/compute/gpu.js';
import {GPUExternalGridBackend} from '../../src/compute/gpu-external-grid.js';
import {deserializeModelSnapshot} from '../../src/physics/snapshot-model.js';
import {assertPreparedForce} from '../../src/physics/softened-model.js';
import {validateState} from '../../src/physics/forces.js';
import {validationSnapshot,conservationSample,summarizeConservationSeries} from '../../src/physics/validation-101.js';
import {granularityContext,granularitySample} from '../../src/physics/granularity-analysis.js';
const $=id=>document.getElementById(id),hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join(''),query=new URLSearchParams(location.search),stage=query.get('stage')??'halo20';
const base='../reports/v1.0.3/';
async function json(path){const r=await fetch(path);if(!r.ok)throw Error('Arquivo indisponível '+path);return r.json();}
async function save(r,type='results'){const q=await fetch('http://localhost:4185/'+type+'/'+r.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r)});if(!q.ok)throw Error(await q.text());}
function importState(d){if(d.schema==='nbody-initial-v2')return deserializeModelSnapshot(d);if(d.schema!=='nbody-baryons-external-v103')throw Error('Snapshot de controle desconhecido');const s={n:d.n,positions:Float64Array.from(d.positions),velocities:Float64Array.from(d.velocities),accelerations:new Float64Array(3*d.n),masses:Float64Array.from(d.masses),components:Uint8Array.from(d.components),meta:structuredClone(d.meta),time:0};validateState(s);if(s.components.includes(2))throw Error('Halo fixo com partículas de halo');return s;}
$('run').onclick=async()=>{let g;const completed=[];$('run').disabled=true;try{
 const campaign=await json(base+'campaign.json'),plan=campaign.runs.filter(r=>r.stage===stage);if(!plan.length)throw Error('Etapa sem protocolo registrado');
 const codePaths=['scripts/granularity-103/browser-runner.mjs','src/compute/gpu.js','src/compute/gpu-external-grid.js','src/physics/granularity-analysis.js','src/physics/validation-101.js','src/physics/equilibrium-analysis.js','src/physics/disk-analysis.js','src/physics/external-grid.js'];const sourceHashes={};for(const path of codePaths){const r=await fetch('../'+path);sourceHashes[path]=await hash(await r.arrayBuffer());}
 for(const p of plan){
  const cached=await fetch(base+'runs/'+p.id+'.json');if(cached.ok){const r=await cached.json();if(r.status!=='completed'||r.sourceSHA256!==p.sourceSHA256||r.config.durationMyr!==p.durationMyr)throw Error('Registro preservado incompatível');completed.push({id:r.id,resumed:true});continue;}
  const input=await fetch('../'+p.source),bytes=await input.arrayBuffer();if(await hash(bytes)!==p.sourceSHA256)throw Error('Hash inicial diverge');const data=JSON.parse(new TextDecoder().decode(bytes)),s=importState(data);assertPreparedForce(s,p.epsilon);const context=granularityContext(s,data.subpopulations),external=p.model==='B'?await json(base+'halo-fixed-grid.json'):null;
  const started=performance.now();g=external?await GPUExternalGridBackend.create():await GPUBackend.create();const initStart=performance.now();await g.initialize(s,{...p,...external?{externalGrid:external}:{}});const initSeconds=(performance.now()-initStart)/1000;
  const energies=[],samples=[],states=[],timing={initializeSeconds:initSeconds,stepSeconds:0,readbackSeconds:0,diagnosticSeconds:0},sampleCount=Math.round(p.durationMyr/p.cadenceMyr);let initial,constants;
  for(let i=0;i<=sampleCount;i++){
   if(i){const t=performance.now();await g.step(Math.round(p.cadenceMyr/p.dt));timing.stepSeconds+=(performance.now()-t)/1000;}
   let t=performance.now();const q=await g.snapshot();q.time=i*p.cadenceMyr;q.subpopulations=context.tags;timing.readbackSeconds+=(performance.now()-t)/1000;t=performance.now();
   const d=validationSnapshot(q,{...p,algorithm:'gpu-f32',energyAlgorithm:'direct',...external?{externalGrid:external}:{}});initial??=d;energies.push(d);samples.push(granularitySample(q,context,d));timing.diagnosticSeconds+=(performance.now()-t)/1000;
   constants??={masses:Array.from(q.masses),components:data.components,subpopulations:data.subpopulations,meta:s.meta};
   if(i===0||i===sampleCount)states.push({timeMyr:q.time,positions:Array.from(q.positions),velocities:Array.from(q.velocities),accelerations:Array.from(q.accelerations)});
   $('status').textContent=p.id+' · '+q.time+' / '+p.durationMyr+' Myr';$('output').textContent=JSON.stringify({completed,current:{id:p.id,timeMyr:q.time,h50:samples.at(-1).disk.instant.h50,thin:samples.at(-1).populations.thin.instant.h50,thick:samples.at(-1).populations.thick.instant.h50,stepSeconds:timing.stepSeconds,diagnosticSeconds:timing.diagnosticSeconds}},null,2);
   if(i>0&&i<sampleCount&&q.time%5===0)await save({id:p.id,status:'partial',sourceSHA256:p.sourceSHA256,config:p,lastTimeMyr:q.time,latestMeasurement:samples.at(-1),particleConstants:constants,currentState:{positions:Array.from(q.positions),velocities:Array.from(q.velocities),accelerations:Array.from(q.accelerations)},timing},'checkpoints');
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  const result={schema:'granularity-controlled-run-v103',id:p.id,status:'completed',model:p.model,config:p,source:p.source,sourceSHA256:p.sourceSHA256,sourceHashes,effectiveParameters:g.effectiveParameters,externalGridSHA256:external?campaign.externalGridSHA256:null,energySeries:energies.map(d=>conservationSample(d,initial)),conservation:summarizeConservationSeries(energies),samples,particleStates:states,particleConstants:constants,timing,wallSeconds:(performance.now()-started)/1000,qualification:'Float32 GPU direct Plummer KDK; direct Float64 Hamiltonian of actual readback every recorded cadence. Paired unvaried populations copied exactly. Maxima only at sampled times. No cooling or recentering.'};await save(result);completed.push({id:p.id,wallSeconds:result.wallSeconds,h0:samples[0].disk.instant.h50,hFinal:samples.at(-1).disk.instant.h50});g.dispose();g=null;
 }
 $('status').textContent='Concluído: '+completed.length+' experimentos da etapa '+stage;$('output').textContent=JSON.stringify({status:'completed',stage,completed},null,2);
 }catch(e){$('status').textContent='Interrompido: '+e.message;$('output').textContent=JSON.stringify({status:'failed',stage,completed,error:e.message},null,2);}finally{g?.dispose();$('run').disabled=false;}};
