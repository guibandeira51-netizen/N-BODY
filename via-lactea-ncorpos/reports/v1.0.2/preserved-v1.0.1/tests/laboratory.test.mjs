import test from 'node:test';
import assert from 'node:assert/strict';
import {epicyclic,toomreBin,energyDrift,LaboratoryHistory,laboratorySample} from '../src/physics/laboratory.js';
import {createGalaxy} from '../src/physics/initial.js';
import {createGalaxy as legacy} from '../src/physics/initial-legacy.js';
import {axisymmetricMoments} from '../src/physics/jeans-axisymmetric.js';
import {diagnostics} from '../src/physics/diagnostics.js';
import {Leapfrog} from '../src/physics/integrator.js';
const near=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('epicyclic derivative recovers Kepler, flat rotation, solid-body rotation',()=>{
  const R=2,kepler=epicyclic(R,true,x=>[-8/x**2,0,0]),flat=epicyclic(R,true,x=>[-4/x,0,0]),solid=epicyclic(R,true,x=>[-4*x,0,0]);
  near(kepler.kappa,1);near(kepler.period,2*Math.PI);near(flat.kappa,Math.SQRT2);near(solid.kappa,4);assert.equal(epicyclic(0).kappa,null);
});
test('energy drift keeps sign and refuses singular near-cancelled energy',()=>{
  assert.equal(energyDrift({energy:-9},{energy:-10,kinetic:10,potential:-20}),0.1);
  assert.equal(energyDrift({energy:-11},{energy:-10,kinetic:10,potential:-20}),-0.1);
  assert.equal(energyDrift({energy:1},{energy:0,kinetic:10,potential:-10}),null);
  assert.equal(energyDrift({energy:1},{energy:1e-20,kinetic:10,potential:-10}),null);
});
test('Q reports missing populations and conditional approximation without certification',()=>{
  assert.equal(toomreBin({lower:1,upper:2,mass:0}).Q,null);
  assert.equal(toomreBin({lower:1,upper:2,mass:1,effectiveCount:1,dispersion:[1,1,1]}).Q,null);
  const q=toomreBin({lower:1,upper:2,mass:1,effectiveCount:10,dispersion:[.1,.1,.1],mean:[0,.2,0],h50:.2});assert.ok(q.Q>0);assert.match(q.qualification,/condicional/);
});
test('compact history preserves initial epoch and measured times, deduplicates pause, rejects stale states',()=>{
  const h=new LaboratoryHistory(4);for(let i=0;i<10;i++)h.add({timeMyr:i});assert.equal(h.samples[0].timeMyr,0);assert.equal(h.samples.at(-1).timeMyr,9);assert.ok(h.samples.length<=4);assert.equal(h.totalMeasurements,10);
  h.add({timeMyr:9,updated:true});assert.equal(h.samples.at(-1).updated,true);assert.equal(h.totalMeasurements,10);assert.throws(()=>h.add({timeMyr:8}));assert.equal(h.assessment().state,'Em avaliação');h.failure='NaN';assert.equal(h.assessment().state,'Falha de validação numérica');h.reset();assert.equal(h.assessment().state,'Ainda não avaliado');
});
test('historical realization stays bitwise identical and laboratory does not mutate integrated state',()=>{
  const options={n:101,seed:2026},a=createGalaxy(options),b=legacy(options);for(const key of ['positions','velocities','masses','components'])assert.deepEqual(a[key],b[key]);
  const e=new Leapfrog(a,{dt:.1,epsilon:.1});e.initialize();e.step(3);const p=a.positions.slice(),v=a.velocities.slice(),s=laboratorySample(a,diagnostics(a,{epsilon:.1}),{});assert.equal(s.timeMyr,.30000000000000004);assert.deepEqual(a.positions,p);assert.deepEqual(a.velocities,v);assert.ok(s.virial.W<0);assert.ok(s.components.every(c=>c.r50>=0));
});
test('incompatible two-integral bulge closure is rejected rather than clipping a negative variance',()=>{
  const coarse=axisymmetricMoments(0,1.0824538607953058,-.18893562613780238,true,256),fine=axisymmetricMoments(0,1.0824538607953058,-.18893562613780238,true,2048);
  assert.ok(coarse.azimuthalSecondMoment<0&&fine.azimuthalSecondMoment<0);near(coarse.azimuthalSecondMoment,fine.azimuthalSecondMoment,1e-5);assert.throws(()=>createGalaxy({n:2000,seed:2026,initialization:'axisymmetric-jeans'}),/sem momentos positivos/);
});
