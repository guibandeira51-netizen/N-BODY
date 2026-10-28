import test from 'node:test';import assert from 'node:assert/strict';
import {EnergySnapshotSampler,automaticEnergyPolicy} from '../src/compute/energy-snapshot-sampler.js';
import {AutomaticEnergyReferences} from '../src/automatic-energy.js';
import {LiveEnergyReference} from '../src/compute/live-energy-reference.js';
import {fastEnergy,directEnergy} from '../src/physics/live-energy.js';
const options={epsilon:.1,dt:.1,algorithm:'direct'};
const state=time=>({n:3,time,positions:Float64Array.of(0,0,0,1,0,0,0,1,0),velocities:new Float64Array(9),masses:Float64Array.of(1,2,3),components:Uint8Array.of(0,1,2)});
const payload=time=>{const s=state(time);return {state:s,fast:fastEnergy(s,options),options,requestedTimeMyr:Math.floor(time/200)*200};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
class Pool{
 constructor(){this.count=4;this.rate=1;this.calls=[];}
 estimate(){return 10;}
 evaluate(s,o){return new Promise((resolve,reject)=>this.calls.push({s,o,resolve,reject}));}
 finish(i,cost=20){const c=this.calls[i];c.resolve({...directEnergy(c.s,c.o),diagnosticCostMs:cost});}
 cancel(){this.calls.forEach(c=>c.reject(Error('cancelled')));}
}
test('sampler owns actual t=0 and cadence snapshots, never invents epochs or mutates particles',()=>{
 const gate=new EnergySnapshotSampler(),s=state(0),before=structuredClone(s),zero=gate.capture(s,fastEnergy(s,options),options);
 assert.deepEqual(s,before);s.positions[0]=3;assert.equal(zero.state.positions[0],0);
 assert.equal(gate.capture(state(199.9),{},options),null);
 const p=gate.capture(state(202.3),{},options);assert.equal(p.state.time,202.3);assert.equal(p.requestedTimeMyr,200);
 assert.equal(gate.capture(state(202.3),{},options),null);assert.equal(gate.capture(state(401.1),{},options).requestedTimeMyr,400);
 assert(new EnergySnapshotSampler().capture(state(7),{},options).unavailable);
 assert.equal(automaticEnergyPolicy(80000).cadenceMyr,200);assert.equal(automaticEnergyPolicy(120000).cadenceMyr,200);assert(!automaticEnergyPolicy(1000000).allowed);
});
test('automatic queue starts without manual actions; bounded pending replaces old states and preserves real epochs',async()=>{
 const pool=new Pool(),done=[],q=new AutomaticEnergyReferences({pool,onReference:(job,d)=>done.push([job.state.time,d.time])});
 const first=payload(0);q.enqueue(first,{});first.state.positions[0]=8;
 assert.equal(pool.calls[0].s.positions[0],0);q.enqueue(payload(202.3),{});q.enqueue(payload(400.1),{});
 assert.equal(pool.calls.length,1);assert.equal(q.report().pendingCount,1);assert.equal(q.report().omitted,1);
 pool.finish(0);await flush();assert.equal(pool.calls.length,2);pool.finish(1);await flush();
 assert.deepEqual(done,[[0,0],[400.1,400.1]]);assert.equal(q.report().peakPending,1);assert.equal(q.report().completed,2);
});
test('late snapshots keep cadence anchored to physical thresholds rather than drifting past the next target',async()=>{
 const pool=new Pool(),q=new AutomaticEnergyReferences({pool,onReference:()=>{}});q.enqueue(payload(0),{});pool.finish(0);await flush();
 q.enqueue(payload(202.3),{});pool.finish(1);await flush();q.enqueue(payload(400.1),{});assert.equal(pool.calls.length,3);pool.finish(2);await flush();
});
test('automatic reset discards stale in-flight results and isolates the new realization',async()=>{
 const pool=new Pool(),done=[],q=new AutomaticEnergyReferences({pool,onReference:job=>done.push(job.configuration.seed)});
 q.enqueue(payload(0),{seed:1});q.reset();q.enqueue(payload(0),{seed:2});pool.finish(0);pool.finish(1);await flush();assert.deepEqual(done,[2]);assert.equal(q.completed,1);
});
test('missing E0 and failed baseline never create a direct point; high estimated cost alone cannot reject E0',async()=>{
 const pool=new Pool(),done=[],q=new AutomaticEnergyReferences({pool,onReference:x=>done.push(x)});q.enqueue(payload(200),{});assert(q.disabled);assert.equal(pool.calls.length,0);
 q.reset();q.enqueue(payload(0),{});pool.calls[0].reject(Error('worker unavailable'));await flush();q.enqueue(payload(200),{});assert(q.disabled);assert.equal(done.length,0);
 const expensive=new Pool();expensive.estimate=()=>70000;const slow=new AutomaticEnergyReferences({pool:expensive,onReference:x=>done.push(x)});slow.enqueue(payload(0),{});await flush();assert(!slow.disabled);assert.equal(expensive.calls.length,1);assert.equal(done.length,0);assert.equal(slow.report().estimatedCostMs,70000);assert.equal(slow.policy.maxEvaluationMs,null);expensive.finish(0,70000);await flush();assert.equal(slow.completed,1);assert.equal(done.length,1);assert.equal(slow.nextEligible,200);
});
test('slow work preserves the selected cadence and manual exclusivity prevents parallel reference jobs',async()=>{
 const pool=new Pool();let busy=true;const q=new AutomaticEnergyReferences({pool,onReference:()=>{},isExternallyBusy:()=>busy});q.enqueue(payload(0),{});assert.equal(pool.calls.length,0);
 busy=false;q.pump();pool.finish(0,25000);await flush();assert.equal(q.policy.cadenceMyr,200);q.enqueue(payload(200),{});assert.equal(pool.calls.length,2);
 q.enqueue(payload(400.1),{});q.cancelCurrent();await flush();assert.equal(q.completed,1);assert.equal(pool.calls.length,3);pool.finish(2);await flush();assert.equal(q.completed,2);
});
test('parallel worker cancellation cannot terminate workers belonging to a restarted evaluation',async()=>{
 const previous=globalThis.Worker,workers=[];
 class W{constructor(){this.terminated=false;workers.push(this);}postMessage(message){this.message=message;}terminate(){this.terminated=true;}}
 globalThis.Worker=W;
 try{
  const pool=new LiveEnergyReference(1),a=pool.evaluate(state(0),options).catch(e=>e.message);pool.cancel();const b=pool.evaluate(state(1),options);await flush();
  assert(!workers[1].terminated);const d=directEnergy(state(1),options);workers[1].onmessage({data:{value:d.potential,base:d,ms:1}});await b;assert.match(await a,/cancelada/);assert(!pool.active);
  await assert.rejects(pool.evaluate(state(0),{G:-1}));assert(!pool.active);
 }finally{globalThis.Worker=previous;}
});
