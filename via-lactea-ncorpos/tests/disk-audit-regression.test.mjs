import test from 'node:test';
import assert from 'node:assert/strict';
import {physicalEpoch} from '../src/physics/physical-time.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {analyticPotential,analyticAcceleration,haloTable,haloMass,HALO_TOTAL_MASS,HALO_OUTER_RADIUS,R200} from '../src/physics/models.js';
import {G} from '../src/physics/constants.js';
import {makeControl,controlEnergy,selectDisk,AuditEngine} from '../scripts/disk-audit/controls.mjs';

test('physical clock uses represented dt and preserves nonzero origin independently of batching',()=>{
 assert.equal(physicalEpoch(0,352000,Math.fround(.1)),35200.000524520874);
 assert.equal(physicalEpoch(12.5,5,.1),13);
 for(const args of [[NaN,0,.1],[0,-1,.1],[0,Number.MAX_SAFE_INTEGER+1,.1],[0,1,0],[0,1,Infinity]])assert.throws(()=>physicalEpoch(...args));
 const config={control:'all-live',n:40,seed:2026,dt:.1,epsilon:.1},s=makeControl(config).state;s.time=12.5;
 const e=new Leapfrog(s,config);e.step(17);assert.equal(e.time,14.2);assert.equal(s.time,14.2);
});
test('tapered halo potential gradient agrees with unchanged mass force at Richardson/roundoff precision',()=>{
 for(const r of [R200*1.001,220,230,HALO_OUTER_RADIUS*1.1]){
  const expected=analyticAcceleration(r,0,0,true)[0],h=1e-3;
  const d=step=>-(analyticPotential(r+step,0,0,true)-analyticPotential(r-step,0,0,true))/(2*step);
  const coarse=d(h),fine=d(h/2),richardson=Math.abs(fine-coarse)/3,roundoff=64*Number.EPSILON*Math.abs(analyticPotential(r,0,0,true))/(h/2);
  assert(Math.abs(expected-fine)<=2*richardson+roundoff,`${r}: ${Math.abs(expected-fine)} > ${2*richardson+roundoff}`);
 }
 // Physical mass profile is retained; far exterior is the finite-mass Kepler field.
 assert.equal(HALO_TOTAL_MASS,97.6315764173288);
 assert.equal(haloMass(2*HALO_OUTER_RADIUS),HALO_TOTAL_MASS);
 const r=2*HALO_OUTER_RADIUS,haloPhi=analyticPotential(r,0,0,true)-analyticPotential(r,0,0,false);
 assert(Math.abs(haloPhi+G*HALO_TOTAL_MASS/r)<8*Number.EPSILON*Math.abs(haloPhi));
});
test('three controls share exact disk phase arrays and fixed components are never duplicated as live particles',()=>{
 const config={n:80,seed:2026,dt:.1,epsilon:.1},a=makeControl({...config,control:'fixed-total'}),b=makeControl({...config,control:'disk-live'}),c=makeControl({...config,control:'all-live'}),disk=selectDisk(c.state);
 for(const key of ['positions','velocities','masses']){assert.deepEqual(a.state[key],b.state[key]);assert.deepEqual(a.state[key],disk[key]);}
 assert.throws(()=>new AuditEngine(c.state,{...config,control:'disk-live'}).initialize(),/duplicate mass/);
});
test('fixed control energy differentiates to the actual force without external one-half or double count',()=>{
 for(const control of ['fixed-total','disk-live']){
  const config={control,n:40,seed:2026,dt:.1,epsilon:.1},{state,engine}=makeControl(config),i=2,k=3*i,h=1e-5,original=state.positions[k];
  const acceleration=state.accelerations[k];state.positions[k]=original+h;const plus=controlEnergy(state,config).energy;state.positions[k]=original-h;const minus=controlEnergy(state,config).energy;state.positions[k]=original;
  const derivative=-(plus-minus)/(2*h)/state.masses[i];
  assert(Math.abs(derivative-acceleration)<1e-8,`${control}: ${derivative} vs ${acceleration}`);
 }
});
