import {GPUBackend} from '../src/compute/gpu.js';
import {directEnergy,relativeEnergy} from '../src/physics/live-energy.js';
import {diskAnalysis} from '../src/physics/disk-analysis.js';
import {structureDiagnostics} from '../src/physics/structure-diagnostics.js';
import {allocation,angular} from '../scripts/resolution-decision/common.js';
self.onmessage=async()=>{let gpu;const runs=[],benchmarks=[];try{
 const manifest=await(await fetch('../reports/resolution-decision/manifest.json')).json(),adapter=await navigator.gpu?.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('No WebGPU adapter');
 const hardware={vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,device:adapter.info?.device,description:adapter.info?.description,logicalProcessors:navigator.hardwareConcurrency};
 let poolKey='',pool;try{const previous=await(await fetch('../reports/resolution-decision/latest-gpu.json')).json(),saved=await(await fetch('../'+previous.file)).json();runs.push(...saved.runs);benchmarks.push(...saved.benchmarks);}catch{}
 for(let index=0;index<manifest.runs.length;index++){
  const config=manifest.runs[index],key=config.generator+config.seed+(config.pool??'');if(runs.some(r=>r.config.id===config.id))continue;
  if(key!==poolKey){const p=manifest.pools.find(p=>p.generator===config.generator&&p.seed===config.seed);pool=await(await fetch('../'+(config.pool??p.file))).json();poolKey=key;}
  const text=`${index+1}/${manifest.runs.length}: ${config.generator}, s=${config.seed}, Nd=${config.counts[1]}, Nh=${config.counts[2]}`;postMessage({type:'progress',text});
  const input=allocation(pool,config.counts),started=performance.now();gpu=await GPUBackend.create();await gpu.initialize(input,{dt:config.dt,epsilon:config.epsilon});const initMs=performance.now()-started,options={G:gpu.effectiveParameters.G,epsilon:Math.sqrt(gpu.effectiveParameters.epsilonSquared)},samples=[];let e0,computeMs=0,diagnosticMs=0;
  for(const epoch of config.epochs){const steps=Math.round(epoch/config.dt)-gpu.steps;if(steps){const t=performance.now();await gpu.step(steps);computeMs+=performance.now()-t;}
   const startDiagnostic=performance.now(),s=await gpu.snapshot(),energy=directEnergy(s,options);e0??=energy;
   samples.push({timeMyr:gpu.time,steps:gpu.steps,energy:energy.energy,kinetic:energy.kinetic,potential:energy.potential,energyError:relativeEnergy(energy,e0),disk:diskAnalysis(s),structure:structureDiagnostics(s,{accelerations:s.accelerations}),angular:angular(s)});diagnosticMs+=performance.now()-startDiagnostic;
   postMessage({type:'progress',text:text+` · ${epoch}/${config.duration} Myr; integração ${(computeMs/1000).toFixed(1)} s`});
  }
  const run={config,n:input.n,effectiveParameters:gpu.effectiveParameters,initMs,computeMs,diagnosticMs,wallMs:performance.now()-started,samples};runs.push(run);benchmarks.push({id:config.id,n:input.n,steps:gpu.steps,computeMs,msPerStep:computeMs/gpu.steps,diagnosticMs,initMs});gpu.dispose();gpu=null;
  // Persist completed runs incrementally. Cancellation never destroys evidence.
  await save({type:'result',schema:'resolution-decision-gpu-v1',createdUTC:new Date().toISOString(),complete:index===manifest.runs.length-1,hardware,runs,benchmarks,qualification:'Short numerical controls; no equilibrium certification. GPU direct f32; Hamiltonian direct CPU f64 at stored epochs; nested samples are correlated.'});
 }
 postMessage({type:'finished',runs:runs.length});
}catch(e){postMessage({type:'failed',reason:String(e.stack??e),completedRuns:runs.length});}finally{gpu?.dispose();}};
async function save(data){const r=await fetch('http://127.0.0.1:4189/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok)throw Error('Could not preserve local evidence: '+await r.text());}
