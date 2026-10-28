import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {folder,options,makeState,median,hash} from './baseline.mjs';
import {ParallelBH,sharedState} from './parallel-pool.mjs';
import {Leapfrog} from '../../src/physics/integrator.js';
import {directAccelerations} from '../../src/physics/forces.js';
const tests=[{baseN:10000,haloRefinement:1,counts:[1,2,4,8,16]},{baseN:24000,haloRefinement:1,counts:[4,8]},{baseN:80000,haloRefinement:1,counts:[1,2,4,8,16]},{baseN:40000,haloRefinement:32,counts:[4,8,16]}];
const report={createdUTC:new Date().toISOString(),runtime:process.version,method:'Prototype only, original octree/Plummer/traversal arithmetic. Persistent worker_threads, shared Float64 state and read-only published tree, atomic target queue in chunks of 256, barrier before final kick. Original serial KDK and prototype both perform four complete steps from identical copied initial arrays; first step is warmup, following three steps timed. No changes to physical parameters.',options,results:[],transfers:[]};
const save=()=>writeFile(resolve(folder,'parallel.json'),JSON.stringify(report,null,2));await save();
for(const c of tests){
 const initial=makeState(c),serial=structuredClone(initial),old=new Leapfrog(serial,options),t=performance.now();old.initialize();old.step(1);const originalSamples=[];for(let i=0;i<3;i++){const start=performance.now();old.step(1);originalSamples.push(performance.now()-start);}const originalMs=median(originalSamples),serialHashes={positions:hash(serial.positions),velocities:hash(serial.velocities),accelerations:hash(serial.accelerations)};
 for(const count of c.counts){
  const state=sharedState(initial),pool=new ParallelBH(count),startup=performance.now();await pool.ready();const startupMs=performance.now()-startup;
  try{
   await pool.force(state,options);await pool.step(state,options);const samples=[];
   for(let i=0;i<3;i++){const cpu=process.cpuUsage(),start=performance.now(),result=await pool.step(state,options),usage=process.cpuUsage(cpu);samples.push({...result,wallStepMs:performance.now()-start,effectiveProcessCores:(usage.user+usage.system)/1000/result.stepMs});}
   const finalHashes={positions:hash(state.positions),velocities:hash(state.velocities),accelerations:hash(state.accelerations)};assert.deepEqual(finalHashes,serialHashes);
   const ms=median(samples.map(r=>r.stepMs)),row={n:state.n,baseN:c.baseN,haloRefinement:c.haloRefinement,workerCount:count,startupMs,originalStepMs:originalMs,prototypeStepMs:ms,speedup:originalMs/ms,medianEffectiveProcessCores:median(samples.map(r=>r.effectiveProcessCores)),buildMs:median(samples.map(r=>r.buildMs)),publicationMs:median(samples.map(r=>r.publicationMs)),dispatchTraverseMs:median(samples.map(r=>r.dispatchAndTraverseMs)),bitwiseIdenticalAfterFourKDKSteps:true,serialHashes,finalHashes,samples};
   report.results.push(row);await save();console.log(JSON.stringify({n:state.n,workers:count,originalMs,prototypeMs:ms,speedup:row.speedup,cores:row.medianEffectiveProcessCores,bitwise:true}));
   if(count===8){for(const [kind,bytes] of [['visual',16*state.n],['energy-snapshot',57*state.n]]){
    const cloneTimes=[],transferTimes=[];
    for(let k=0;k<3;k++){let data=new Uint8Array(bytes),start=performance.now();await pool.call(pool.workers[0],{type:'ping',data});cloneTimes.push(performance.now()-start);data=new Uint8Array(bytes);start=performance.now();await pool.call(pool.workers[0],{type:'ping',data,transferBack:true},[data.buffer]);transferTimes.push(performance.now()-start);assert.equal(data.byteLength,0);}
    report.transfers.push({n:state.n,kind,bytes,cloneRoundTripMs:median(cloneTimes),transferOwnershipRoundTripMs:median(transferTimes),note:'Node worker_threads round trip; cloned back vs transferred both ways. Not a GPU readback or a browser main-thread rendering cost.'});await save();
   }}
  }finally{await pool.close();}
 }
}
report.completedUTC=new Date().toISOString();await save();
