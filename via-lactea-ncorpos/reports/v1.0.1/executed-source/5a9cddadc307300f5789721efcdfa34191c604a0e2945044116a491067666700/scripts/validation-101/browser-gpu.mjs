import {GPUBackend} from '../../src/compute/gpu.js';
import {deserializeModelSnapshot} from '../../src/physics/snapshot-model.js';
import {validationSnapshot,conservationSample,summarizeConservationSeries} from '../../src/physics/validation-101.js';
import {equilibriumSample} from '../../src/physics/equilibrium-analysis.js';
const $=id=>document.getElementById(id),sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
const plans=[{id:'GPU-1000-dt0.1',n:1000,dt:.1,duration:20,cadence:.1},{id:'GPU-1000-dt0.05',n:1000,dt:.05,duration:20,cadence:.05},{id:'GPU-1000-dt0.025',n:1000,dt:.025,duration:20,cadence:.025},{id:'GPU-10000-200Myr',n:10000,dt:.1,duration:200,cadence:1},{id:'GPU-50000-200Myr',n:50000,dt:.1,duration:200,cadence:2}];
async function store(r){const response=await fetch('http://localhost:4183/results/'+r.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r)});if(!response.ok)throw Error('Falha de gravação local: '+await response.text());return response.json();}
$('run').onclick=async()=>{$('run').disabled=true;let g;const completed=[];try{
 if(!navigator.gpu)throw Error('WebGPU unavailable; no GPU experiment executed');
 for(const p of plans){const existing=await fetch('../reports/v1.0.1/gpu/'+p.id+'.json');if(existing.ok){const previous=await existing.json();if(previous.status==='completed'&&previous.config.dt===p.dt&&previous.config.duration===p.duration){completed.push({id:previous.id,...previous.conservation,resumedFromSaved:true});continue;}throw Error('Existing incompatible record');}
 const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter unavailable');const started=performance.now(),folder='../../reports/v1.0.0/agama-calibrated/',manifest=await(await fetch(folder+'snapshots.json')).json(),row=manifest.find(x=>x.n===p.n),bytes=await(await fetch(folder+row.file)).arrayBuffer();if(await sha(bytes)!==row.sha256)throw Error('Initial snapshot hash mismatch');const data=JSON.parse(new TextDecoder().decode(bytes)),s=deserializeModelSnapshot(data),energy=[],samples=[],states=[];
 const options={dt:p.dt,epsilon:.1,algorithm:'gpu-f32',energyAlgorithm:p.n<=1000?'direct':'barnes-hut',theta:.5};
 g=await GPUBackend.create(adapter);await g.initialize(s,options);let initial;
 for(let step=0;step<=Math.round(p.duration/p.dt);step+=Math.round(p.cadence/p.dt)){
  if(step)await g.step(Math.round(p.cadence/p.dt));const q=await g.snapshot();q.time=step*p.dt;const d=validationSnapshot(q,options);initial??=d;energy.push(d);
  if(p.n>1000||step%Math.round(.5/p.dt)===0)samples.push(equilibriumSample(q,{diagnostic:d}));
  if([0,20,200].includes(q.time))states.push({timeMyr:q.time,positions:Array.from(q.positions),velocities:Array.from(q.velocities),accelerations:Array.from(q.accelerations)});
  $('status').textContent=p.id+' · '+q.time+' / '+p.duration+' Myr';
 }
 const r={schema:'validation-101-gpu',id:p.id,status:'completed',origin:'new-integration-1.0.1',config:{...p,epsilon:.1,theta:.5,precision:'Float32',algorithm:'gpu-f32',seed:2026},source:'reports/v1.0.0/agama-calibrated/'+row.file,sourceSHA256:row.sha256,sourceHashes:{harness:await sha(await(await fetch('../scripts/validation-101/browser-gpu.mjs')).arrayBuffer()),kernel:await sha(await(await fetch('../../src/compute/gpu.js')).arrayBuffer())},adapter:{info:adapter.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null},energySeries:energy.map(d=>conservationSample(d,initial)),conservation:summarizeConservationSeries(energy),samples,particleConstants:{masses:Array.from((await g.snapshot()).masses),components:data.components,subpopulations:data.subpopulations,meta:s.meta},particleStates:states,wallSeconds:(performance.now()-started)/1000,qualification:p.n<=1000?'Direct Float64 Hamiltonian measured each GPU step; initial baseline is actual Float32 upload.':'Dense BH energy is approximate; direct Float64 energy will be recalculated at saved snapshots, not inferred between them.'};
 await store(r);g.dispose();g=null;completed.push({id:r.id,...r.conservation});$('output').textContent=JSON.stringify({status:'running',completed},null,2);
 }
 $('status').textContent='Concluído: '+completed.length+' ensaios reais gravados em reports/v1.0.1/gpu';$('output').textContent=JSON.stringify({status:'completed',completed},null,2);
 }catch(e){$('status').textContent='Falha: '+e.message;$('output').textContent=JSON.stringify({status:'failed',error:e.message,completed},null,2);await store({schema:'validation-101-gpu',id:'attempt',status:'failed',error:e.message,completed}).catch(()=>{});}finally{g?.dispose();$('run').disabled=false;}};
