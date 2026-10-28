import test from 'node:test';import assert from 'node:assert/strict';
import {liveInputResolution} from '../src/live-particle-input.js';
import {liveResolution,createLiveGalaxy} from '../src/physics/live-initial.js';
import {MODEL} from '../src/physics/constants.js';
import {createHaloGeometry} from '../src/physics/halo-geometry.js';
import {continuousHaloDensity,projectedHaloDensity,continuousHaloProfile} from '../src/render/continuous-halo-density.js';

test('continuous-mode input is the exact active baryonic count, including odd sizes and 80000',()=>{
 for(const requested of [3,4,5,7,127,1024,4096,80000,133333]){
  const layout=liveInputResolution(requested,32,true,'geometry');assert.equal(layout.n,requested);assert.equal(layout.counts[0]+layout.counts[1],requested);assert.equal(layout.counts[2],0);assert.equal(layout.requestedN,requested);assert.equal(layout.particleCountConvention,'active-baryons-v1');
 }
 assert.deepEqual(liveInputResolution(80000,1,true,'geometry').counts,[19999,60001,0]);
 for(const factor of [1,2,4,8,16,32]){const ui=liveInputResolution(80000,factor,true,'particles'),old=liveResolution(80000,factor);for(const k of Object.keys(old))assert.deepEqual(ui[k],old[k]);}
 for(const n of [0,-1,NaN,2.5,Number.MAX_SAFE_INTEGER])assert.throws(()=>liveInputResolution(n,1,true,'geometry'));
});

test('mapped input generates the requested arrays without changing total component masses or legacy sampling',()=>{
 const layout=liveInputResolution(4096,1,true,'geometry'),state=createLiveGalaxy({...layout,seed:2026}),original=createLiveGalaxy({baseN:layout.baseN,haloRepresentation:'geometry',seed:2026});
 assert.equal(state.n,4096);assert.equal(state.positions.length,3*4096);assert.equal(state.masses.length,4096);assert(!state.components.includes(2));
 for(const key of ['positions','velocities','masses','components'])assert.deepEqual(state[key],original[key]);
 for(const c of [0,1]){const total=state.masses.reduce((s,m,i)=>s+(state.components[i]===c?m:0),0);assert(Math.abs(total-[MODEL.bulgeMass,MODEL.diskMass][c])<1e-10);}
 assert.deepEqual(state.meta.haloField,original.meta.haloField);
});

test('density display uses the finite NFW source and projects it without mutating the gravitational field',()=>{
 const field=createHaloGeometry(),before=structuredClone(field),r=8;
 assert.equal(continuousHaloDensity(r,field),field.massScale/(4*Math.PI*r*(r+field.rs)**2));assert.equal(continuousHaloDensity(field.outerRadius+1,field),0);
 const profile=continuousHaloProfile(field);assert(profile.density.every(Number.isFinite));assert(profile.intensity.every(x=>x>=0&&x<=1));assert.equal(profile.intensity[0],1);
 for(let i=1;i<profile.density.length;i++)assert(profile.density[i]<=profile.density[i-1]*(1+1e-5));
 const a=projectedHaloDensity(8,field,256),b=projectedHaloDensity(8,field,512);assert(Math.abs(a-b)/b<1e-5);assert.equal(projectedHaloDensity(field.outerRadius,field),0);assert.deepEqual(field,before);
});
