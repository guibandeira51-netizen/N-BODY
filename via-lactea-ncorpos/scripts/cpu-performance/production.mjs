import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCPUEngine} from '../../src/compute/parallel-cpu.js';
import {makeState,options,median,hash} from './baseline.mjs';
import assert from 'node:assert/strict';
const dir='reports/cpu-parallel-live-2026-10-22/',prior=JSON.parse(await readFile('reports/cpu-performance-2026-10-22/parallel.json','utf8'));
const baseline=JSON.parse(await readFile('reports/cpu-performance-2026-10-22/baseline.json','utf8'));
for(const file of ['src/physics/forces.js','src/physics/integrator.js','src/physics/live-initial.js'])assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),baseline.files[file]);
const caps={hardwareConcurrency:16,worker:true,sharedArrayBuffer:true,crossOriginIsolated:true},report={createdUTC:new Date().toISOString(),options,runtime:process.version,method:'Production module, 16 persistent workers, shared Float64 arrays; original physical modules unchanged. One warmup step and three timed steps. Four final steps compared bitwise with the preserved original serial hashes. Prior original timings are from the earlier audit, not a new paired timing.',results:[]};
for(const c of [{baseN:80000,haloRefinement:1},{baseN:40000,haloRefinement:32}]){
 const engine=await createCPUEngine(makeState(c),{...options,cpuWorkers:16},caps);
 try{
  await engine.initialize();await engine.step();const samples=[];
  for(let k=0;k<3;k++){const usage=process.cpuUsage(),start=performance.now();await engine.step();const cpu=process.cpuUsage(usage),wallMs=performance.now()-start;samples.push({wallMs,logicalCpuEquivalents:(cpu.user+cpu.system)/1000/wallMs,...engine.execution()});}
  const reference=prior.results.find(r=>r.n===engine.state.n),hashes=Object.fromEntries(['positions','velocities','accelerations'].map(k=>[k,hash(engine.state[k])]));assert.deepEqual(hashes,reference.serialHashes);
  const row={...c,n:engine.state.n,poolWorkers:engine.execution().poolWorkers,medianStepMs:median(samples.map(s=>s.wallMs)),medianLogicalCpuEquivalents:median(samples.map(s=>s.logicalCpuEquivalents)),priorOriginalStepMs:reference.originalStepMs,bitwiseEqualPreservedSerial:true,timeMyr:engine.time,steps:engine.steps,hashes,samples};report.results.push(row);await writeFile(dir+'production.json',JSON.stringify(report,null,2));console.log(JSON.stringify({n:row.n,ms:row.medianStepMs,logicalCpuEquivalents:row.medianLogicalCpuEquivalents,bitwise:true}));
 }finally{engine.dispose();}
}
report.completedUTC=new Date().toISOString();await writeFile(dir+'production.json',JSON.stringify(report,null,2));
