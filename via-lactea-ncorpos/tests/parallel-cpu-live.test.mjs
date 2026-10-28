import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BHForcePool,ParallelLeapfrog,createCPUEngine,setEnergyConcurrency} from '../src/compute/parallel-cpu.js';
import {cpuWorkerPolicy,forceWorkerBudget} from '../src/compute/cpu-worker-policy.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {createLiveGalaxy} from '../src/physics/live-initial.js';
import {copyState,stateTransfers} from '../src/export/state.js';
import {estimateResources} from '../src/compute/capability.js';

const caps={hardwareConcurrency:16,worker:true,sharedArrayBuffer:true,crossOriginIsolated:true};
test('parallel CPU uses all 16 logical workers when isolated; explicit serial fallback and energy budget',()=>{
 assert.equal(cpuWorkerPolicy(16,caps).workers,16);assert.equal(cpuWorkerPolicy(16,{...caps,hardwareConcurrency:8}).workers,8);
 for(const flag of ['worker','sharedArrayBuffer','crossOriginIsolated'])assert.equal(cpuWorkerPolicy(16,{...caps,[flag]:false}).parallel,false);
 assert.equal(forceWorkerBudget(16,0),16);assert.equal(forceWorkerBudget(16,4),12);assert.equal(forceWorkerBudget(16,50),1);
 const serial=estimateResources(80000,{backend:'cpu-bh'}),parallel=estimateResources(80000,{backend:'cpu-bh',cpuWorkers:16});
 assert(parallel.estimatedBytes>serial.estimatedBytes);assert.equal(parallel.parallelTreeBytes,384*80000);
});

test('production kernel keeps original octree and each target arithmetic, with only bounded target iteration',async()=>{
 const original=await readFile(new URL('../src/physics/forces.js',import.meta.url),'utf8'),kernel=await readFile(new URL('../src/compute/bh-parallel-kernel.js',import.meta.url),'utf8');
 const tree=original.slice(original.indexOf('class Octree {'),original.indexOf('function buildTree(')).replace('class Octree {','export class Octree {');
 assert.equal(kernel.match(/const LEAF_BUCKET = \d+;/)[0],original.match(/const LEAF_BUCKET = \d+;/)[0]);
 const traversal=original.slice(original.indexOf('function traverse('),original.indexOf('/** Real monopole')).replace('function traverse(','export function traverseTargets(').replace('out, potentialOnly)','out, potentialOnly, first=0, last=state.n)').replace('for (let i = 0; i < n; i++)','for (let i = first; i < last; i++)');
 assert(kernel.endsWith(tree+traversal));
});

test('production 16-worker KDK, clocks, unequal masses and snapshots stay bitwise equal to serial across energy scheduling',async()=>{
 const initial=createLiveGalaxy({n:1024,seed:2026});initial.time=3.7;initial.masses[9]=0;initial.masses[11]*=1.3;
 for(const theta of [0,.5]){
  const options={algorithm:'barnes-hut',cpuWorkers:16,dt:.1,epsilon:.1,theta},serial=new Leapfrog(structuredClone(initial),options),parallel=await createCPUEngine(structuredClone(initial),options,caps);
  assert(parallel instanceof ParallelLeapfrog);
  try{serial.initialize();await parallel.initialize();assert.deepEqual(parallel.state.accelerations,serial.state.accelerations);
   for(let k=0;k<12;k++){setEnergyConcurrency(parallel,k%2?4:0);serial.step();await parallel.step();assert.equal(parallel.time,serial.time);assert.equal(parallel.execution().activeForceWorkers,k%2?12:16);}
   for(const key of ['positions','velocities','accelerations','masses','components'])assert.deepEqual(parallel.state[key],serial.state[key]);
   const snapshot=copyState(parallel.state);assert(snapshot.positions.buffer instanceof ArrayBuffer);const buffers=stateTransfers(snapshot);assert(buffers.every(b=>b instanceof ArrayBuffer));assert.deepEqual(snapshot.positions,serial.state.positions);
   const copy=structuredClone(snapshot,{transfer:buffers});assert.deepEqual(copy.velocities,serial.state.velocities);
   await assert.rejects(parallel.step(-1),RangeError);assert.equal(parallel.failed,false);
  }finally{parallel.dispose();}
 }
});

test('unsupported shared memory and explicit direct CPU retain the serial engine',async()=>{
 const state=createLiveGalaxy({n:16,seed:2026}),options={algorithm:'barnes-hut',cpuWorkers:16,dt:.1,epsilon:.1,theta:.5};
 const serial=await createCPUEngine(state,options,{...caps,crossOriginIsolated:false});assert.equal(serial.execution().mode,'serial');assert.match(serial.execution().fallbackReason,/indisponíveis/);serial.initialize();serial.step();
 const direct=await createCPUEngine(structuredClone(state),{...options,algorithm:'direct'},caps);assert.equal(direct.algorithm,'direct');assert.equal(direct.execution().poolWorkers,1);
});

test('pool initialization failure terminates already-created Workers',()=>{
 let calls=0,terminated=0;
 assert.throws(()=>new BHForcePool(16,{workerFactory:()=>{if(++calls===3)throw Error('creation failure');return{terminate(){terminated++;}};}}),/creation failure/);
 assert.equal(terminated,2);
});

test('force failure stops the run instead of accepting a partial KDK state',async()=>{
 const initial=createLiveGalaxy({n:16,seed:2026}),engine=await createCPUEngine(initial,{algorithm:'barnes-hut',cpuWorkers:16,dt:.1,epsilon:0,theta:.5},caps);
 try{await engine.initialize();engine.state.positions.fill(0);engine.state.velocities.fill(0);engine.state.accelerations.fill(0);await assert.rejects(engine.step(),/Reinicie/);assert.equal(engine.failed,true);assert.equal(engine.pool.closed,true);assert.equal(engine.steps,0);await assert.rejects(engine.step(),/Reinicie/);}finally{engine.dispose();}
});
