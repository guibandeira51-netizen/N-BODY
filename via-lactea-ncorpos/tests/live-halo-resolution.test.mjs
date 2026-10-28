import test from 'node:test';
import assert from 'node:assert/strict';
import {createGalaxy} from '../src/physics/initial.js';
import {createLiveGalaxy,liveResolution,LIVE_HALO_FACTORS} from '../src/physics/live-initial.js';
import {automaticEnergyPolicy,EnergySnapshotSampler,energyCadenceForCost} from '../src/compute/energy-snapshot-sampler.js';
import {AutomaticEnergyReferences} from '../src/automatic-energy.js';

test('live refinement computes actual resource N without changing base component counts',()=>{
 for(const factor of LIVE_HALO_FACTORS){
  const r=liveResolution(33148,factor);
  assert.deepEqual(r.baseCounts,[4972,14917,13259]);
  assert.deepEqual(r.counts,[4972,14917,13259*factor]);
  assert.equal(r.n,19889+13259*factor);
 }
 assert.equal(liveResolution(33148,16).n,232033);
 assert.equal(liveResolution(33148,32).n,444177);
});
test('live CPU/GPU initializer preserves baryon phase/mass arrays and physical halo mass for every exposed factor',()=>{
 const base=createGalaxy({n:64,seed:2026}),baryons=base.meta.counts[0]+base.meta.counts[1],originalPositions=base.positions.slice();
 for(const haloRefinement of LIVE_HALO_FACTORS){
  const layout=liveResolution(64,haloRefinement),s=createLiveGalaxy({...layout,seed:2026,withHalo:true});
  assert.equal(s.n,layout.n);assert.equal(s.time??0,0);
  for(const key of ['positions','velocities'])assert.deepEqual(s[key].subarray(0,3*base.n),base[key]);
  assert.deepEqual(s.masses.subarray(0,baryons),base.masses.subarray(0,baryons));
  assert.equal(s.masses[baryons]*s.meta.counts[2],base.masses[baryons]*base.meta.counts[2]);
  assert.equal(Math.fround(s.masses[baryons])*s.meta.counts[2],Math.fround(base.masses[baryons])*base.meta.counts[2]);
  assert.deepEqual(s.meta.counts,layout.counts);
 }
 assert.deepEqual(base.positions,originalPositions);
});
test('original live mode is unchanged, and invalid or inconsistent refinement fails before allocation',()=>{
 assert.deepEqual(createLiveGalaxy({n:64,seed:2026}),createGalaxy({n:64,seed:2026}));
 assert.throws(()=>liveResolution(64,3));assert.throws(()=>liveResolution(64,64));
 assert.throws(()=>liveResolution(64,2,false));assert.throws(()=>liveResolution(3,2));
 assert.throws(()=>createLiveGalaxy({baseN:64,n:64,haloRefinement:16}));
 assert.deepEqual(createLiveGalaxy({n:64,withHalo:false}),createGalaxy({n:64,withHalo:false}));
});
test('refined references use only their assigned remaining memory; zero budget disables both queues',()=>{
 assert.equal(automaticEnergyPolicy(232033).allowed,false);
 assert.equal(automaticEnergyPolicy(232033,4,200,200*1024**2).allowed,true);
 assert.equal(automaticEnergyPolicy(232033,4,200,0).allowed,false);
 assert.throws(()=>automaticEnergyPolicy(232033,4,200,-1));
 const state=createGalaxy({n:64}),options={energyAuditCadenceMyr:200,energyReferenceBudgetBytes:0};
 const gate=new EnergySnapshotSampler();assert.equal(gate.capture(state,{},options).unavailable,true);assert.equal(gate.due(200,state.n),false);
 const q=new AutomaticEnergyReferences({pool:{count:4,cancel(){},evaluate(){throw Error('No evaluation allowed');}},onReference(){throw Error('No point allowed');}});
 q.enqueue({state:{...state,time:0},fast:{},options},{});assert.equal(q.disabled,true);assert.equal(q.completed,0);
});
test('large-N reference cadence stays physical; cost never replaces the selected interval',()=>{
 const p=automaticEnergyPolicy(232033,4,200,200*1024**2);
 assert.equal(p.resolutionCadenceMyr,200);
 assert.equal(energyCadenceForCost(p,45000),200);
 assert.equal(energyCadenceForCost(p,100000),200);
 assert.equal(energyCadenceForCost(automaticEnergyPolicy(1000,4,50),25000),50);
});
