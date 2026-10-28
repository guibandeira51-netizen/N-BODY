import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {ENERGY_AUDIT_CADENCES,requireEnergyAuditCadence,energyAuditCadenceView} from '../src/energy-audit-cadence.js';
import {EnergySnapshotSampler,automaticEnergyPolicy} from '../src/compute/energy-snapshot-sampler.js';
import {AutomaticEnergyReferences} from '../src/automatic-energy.js';import {fastEnergy,directEnergy} from '../src/physics/live-energy.js';
const state=t=>({n:3,time:t,positions:Float64Array.of(0,0,0,1,0,0,0,1,0),velocities:new Float64Array(9),masses:Float64Array.of(1,2,3),components:Uint8Array.of(0,1,2)});
const opts=energyAuditCadenceMyr=>({epsilon:.1,dt:.1,algorithm:'direct',energyAuditCadenceMyr});
const payload=(t,c)=>{let s=state(t),options=opts(c);return {state:s,fast:fastEnergy(s,options),options,requestedTimeMyr:Math.floor(t/c)*c};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
class Pool{constructor(){this.count=4;this.rate=1;this.calls=[];}estimate(){return 10;}evaluate(s,o){return new Promise((resolve,reject)=>this.calls.push({s,o,resolve,reject}));}finish(index,cost=20){let c=this.calls[index];c.resolve({...directEnergy(c.s,c.o),diagnosticCostMs:cost});}cancel(){this.calls.forEach(c=>c.reject(Error('cancelled')));}}

test('audit interval is an explicit required choice with exactly four supported values',()=>{
 assert.deepEqual(ENERGY_AUDIT_CADENCES,[50,100,150,200]);for(const c of ENERGY_AUDIT_CADENCES){assert.equal(requireEnergyAuditCadence(c),c);assert.equal(requireEnergyAuditCadence(String(c)),c);}
 for(const c of ['',null,undefined,0,25,75,250,NaN,Infinity,[],[50]])assert.throws(()=>requireEnergyAuditCadence(c));
 const view=energyAuditCadenceView();assert(view.includes(' required '));assert(view.includes('value="" selected disabled'));for(const c of ENERGY_AUDIT_CADENCES)assert(view.includes(`value="${c}"`));
});
test('each selected interval schedules only actual snapshots at its own physical thresholds',()=>{
 for(const cadence of ENERGY_AUDIT_CADENCES){const gate=new EnergySnapshotSampler(),options=opts(cadence),zero=state(0),before=structuredClone(zero);let capture=gate.capture(zero,fastEnergy(zero,options),options);assert.equal(capture.nextCaptureMyr,cadence);assert.deepEqual(zero,before);assert(!gate.due(cadence-.01,3));assert(gate.due(cadence+.1,3));assert.equal(gate.capture(state(cadence-.01),{},options),null);capture=gate.capture(state(cadence+.1),{},options);assert.equal(capture.state.time,cadence+.1);assert.equal(capture.requestedTimeMyr,cadence);assert.equal(capture.nextCaptureMyr,2*cadence);assert.equal(capture.options.energyAuditCadenceMyr,cadence);}
});
test('automatic completion keeps the selected cadence and never silently restores 200 Myr',async()=>{
 for(const cadence of ENERGY_AUDIT_CADENCES){const pool=new Pool(),done=[],q=new AutomaticEnergyReferences({pool,onReference:job=>done.push(job.state.time)});q.enqueue(payload(0,cadence),{energyAuditCadenceMyr:cadence});pool.finish(0);await flush();assert.equal(q.report().requestedCadenceMyr,cadence);assert.equal(q.report().cadenceMyr,cadence);q.enqueue(payload(cadence+.1,cadence),{energyAuditCadenceMyr:cadence});pool.finish(1);await flush();assert.deepEqual(done,[0,cadence+.1]);assert.equal(q.report().peakPending,1);assert.equal(q.report().cadenceMyr,cadence);}
});
test('cost and resolution do not silently change the selected physical cadence; overload is a bounded explicit omission',async()=>{
 const policy=automaticEnergyPolicy(120000,4,50);assert.equal(policy.requestedCadenceMyr,50);assert.equal(policy.resolutionCadenceMyr,50);
 const pool=new Pool(),done=[],q=new AutomaticEnergyReferences({pool,onReference:job=>done.push(job.state.time)});q.enqueue(payload(0,50),{energyAuditCadenceMyr:50});q.enqueue(payload(50,50),{});q.enqueue(payload(100,50),{});assert.equal(pool.calls.length,1);assert.equal(q.omitted,1);pool.finish(0,75000);await flush();assert.equal(q.report().cadenceMyr,50);assert.equal(pool.calls.length,2);pool.finish(1);await flush();assert.deepEqual(done,[0,100]);assert.equal(q.report().pendingCount,0);
});
test('cadence changes require a fresh realization and reset accepts the new choice',async()=>{
 const gate=new EnergySnapshotSampler();gate.capture(state(0),{},opts(50));assert.throws(()=>gate.capture(state(100),{},opts(100)),/Reinicie/);
 const pool=new Pool(),q=new AutomaticEnergyReferences({pool,onReference:()=>{}});q.enqueue(payload(0,50),{});pool.finish(0);await flush();q.enqueue(payload(100,100),{});assert(q.disabled);q.reset();q.enqueue(payload(0,100),{});pool.finish(1);await flush();assert.equal(q.report().requestedCadenceMyr,100);assert.equal(q.completed,1);
});
test('cadence is a diagnostic option and does not change particle energy evaluation',()=>{
 const s=state(0),before=structuredClone(s),reference=directEnergy(s,opts(200));for(const c of ENERGY_AUDIT_CADENCES){const energy=directEnergy(s,opts(c));assert.equal(energy.kinetic,reference.kinetic);assert.equal(energy.potential,reference.potential);assert.equal(energy.energy,reference.energy);}assert.deepEqual(s,before);
});
test('generated CPU/GPU controller requires the field before preparation and passes it to GPU diagnostics',async()=>{
 const root=new URL('../',import.meta.url),html=await readFile(new URL('experimento-ncorpos.html',root),'utf8'),controller=await readFile(new URL('src/ncorpos-live-entry.js',root),'utf8');assert(html.includes(energyAuditCadenceView()));assert(html.includes('id="start" disabled'));assert(html.includes('id="reset" disabled'));assert(controller.includes("import {requireEnergyAuditCadence} from './energy-audit-cadence.js'"));assert(controller.indexOf("try{requireEnergyAuditCadence($('energy-audit-cadence').value)")<controller.indexOf('cancel();const token=generation;creating=true'));assert(controller.includes('energyAuditCadenceMyr:c.energyAuditCadenceMyr'));assert(controller.includes("'epsilon','energy-audit-cadence'"));
});
