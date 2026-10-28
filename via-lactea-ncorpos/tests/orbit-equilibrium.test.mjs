import test from 'node:test';
import assert from 'node:assert/strict';
import {gaussLegendre,plummerKernel,buildEquilibriumField,equilibriumFieldAt,COMPONENT_MASSES} from '../src/physics/equilibrium-field.js';
import {fitOrbitWeights,occupationCell,sampleOrbitCandidate,serializeOrbitCandidate,deserializeOrbitCandidate} from '../src/physics/orbit-equilibrium.js';
import {RebuildControl,measureRebuild} from '../scripts/equilibrium-rebuild/controls.mjs';
import {directAccelerations} from '../src/physics/forces.js';
test('continuous Plummer kernel has unit mass without changing source component masses',()=>{
 for(const n of [8,16,32]){const q=gaussLegendre(n);for(let power=0;power<6;power++){const exact=power%2?0:2/(power+1),sum=q.x.reduce((s,x,i)=>s+q.w[i]*x**power,0);assert.ok(Math.abs(sum-exact)<64*n*Number.EPSILON);}}
 for(const orders of [[8,4,8],[16,8,16]])assert.ok(Math.abs(plummerKernel(.1,orders).rawWeightSum-1)<1e-12);
 assert.throws(()=>plummerKernel(-.1));assert.throws(()=>plummerKernel(.1,[8,4,7]));
});
const field=buildEquilibriumField({orders:[8,4,8],nu:12,nv:12,Rmax:30,zmax:20});
test('all fixed-field components derive from one scalar; superposition and rotational/reflection symmetries close',()=>{
 const p=[3.7,1.2,.21],q=equilibriumFieldAt(field,...p),parts=[0,1,2].map(c=>equilibriumFieldAt(field,...p,c));
 assert.ok(Math.abs(q.potential-parts.reduce((s,a)=>s+a.potential,0))<1e-14);
 for(let k=0;k<3;k++){const h=1e-4,a=p.slice(),b=p.slice();a[k]+=h;b[k]-=h;const fd=-(equilibriumFieldAt(field,...a).potential-equilibriumFieldAt(field,...b).potential)/(2*h);assert.ok(Math.abs(fd-q.acceleration[k])<1e-9);}
 const reflected=equilibriumFieldAt(field,p[0],p[1],-p[2]);assert.equal(reflected.potential,q.potential);assert.equal(reflected.acceleration[2],-q.acceleration[2]);
 assert.ok(Math.abs(q.acceleration[0]*p[1]-q.acceleration[1]*p[0])<1e-16);
});
test('positive orbit weights recover a solvable density and expose a failed independent temporal half',()=>{
 const orbits=[{first:[1,0],second:[0,1]},{first:[0,1],second:[1,0]}],fit=fitOrbitWeights(orbits,[.25,.75],{iterations:50});
 assert.deepEqual(fit.weights,[.25,.75]);assert.equal(fit.history.at(-1).trainingL1,0);assert.equal(fit.history.at(-1).validationL1,1);assert.equal(fit.equilibriumValidated,false);
 const unsupported=fitOrbitWeights([{first:[1,0],second:[1,0]}],[.5,.5]);assert.equal(unsupported.unreachableTargetMass,.5);
});
const library={schema:'legacy-orbit-library-v1',id:'regression',seed:42,epsilon:.1,potentialSHA256:'a'.repeat(64),components:[0,1,2].map(c=>({fit:{weights:[1]},orbits:[{states:[[1+c,0,.1,0,.2,.03]]}]}))};
test('candidate samples reproducible physical phases with unchanged total masses and antipodal pairs',()=>{
 const a=sampleOrbitCandidate(library,{n:400,seed:2026}),b=sampleOrbitCandidate(library,{n:400,seed:2026});assert.deepEqual(a,b);
 for(let c=0;c<3;c++){const m=a.masses.reduce((s,x,i)=>s+(a.components[i]===c?x:0),0);assert.ok(Math.abs(m/COMPONENT_MASSES[c]-1)<400*Number.EPSILON);}
 for(let i=0;i<a.n;i+=2)for(let k=0;k<3;k++){assert.equal(a.positions[3*i+k],-a.positions[3*i+3+k]);assert.equal(a.velocities[3*i+k],-a.velocities[3*i+3+k]);}
 assert.equal(a.meta.equilibriumValidated,false);
});
test('candidate import cannot certify equilibrium or alter masses, model, precision arrays or preparation epsilon',()=>{
 const a=sampleOrbitCandidate(library,{n:400}),data=serializeOrbitCandidate(a);data.meta.equilibriumValidated=true;
 const copy=deserializeOrbitCandidate(data,{epsilon:.1});assert.deepEqual(copy.positions,a.positions);assert.equal(copy.meta.equilibriumValidated,false);assert.equal(copy.meta.importedEquilibriumClaim,true);
 assert.throws(()=>deserializeOrbitCandidate(data,{epsilon:.2}));const bad=structuredClone(data);bad.masses[0]*=2;assert.throws(()=>deserializeOrbitCandidate(bad));bad.masses[0]=NaN;assert.throws(()=>deserializeOrbitCandidate(bad));
 assert.throws(()=>sampleOrbitCandidate(library,{n:10,counts:[3,3,4]}));
});
test('density occupation keeps radial/vertical tails in explicit overflow cells',()=>{
 assert.equal(occupationCell([1e6,0,1e6]),120);assert.notEqual(occupationCell([0,0,0]),occupationCell([8,0,.4]));
 assert.throws(()=>occupationCell([NaN,0,0]));
});
test('independent halo refinement preserves exact baryonic phases while reducing individual halo mass',()=>{
 const a=sampleOrbitCandidate(library,{n:400,counts:[60,180,160],seed:2026}),b=sampleOrbitCandidate(library,{n:880,counts:[60,180,640],seed:2026});
 for(const k of ['positions','velocities'])assert.deepEqual(a[k].subarray(0,720),b[k].subarray(0,720));assert.deepEqual(a.masses.subarray(0,240),b.masses.subarray(0,240));assert.equal(b.masses[240],a.masses[240]/4);
 const invalid=structuredClone(library);invalid.components[0].fit.weights=[NaN];assert.throws(()=>sampleOrbitCandidate(invalid,{n:400}));
});
test('experimental live evolution adds no analytic field; disk-live rejects duplicated massive components',()=>{
 const s=sampleOrbitCandidate(library,{n:12,counts:[4,4,4]}),expected=directAccelerations(s,{epsilon:.1},new Float64Array(3*s.n)),engine=new RebuildControl(s,{control:'all-live',field});engine.initialize();assert.deepEqual(s.accelerations,expected);
 assert.throws(()=>new RebuildControl(s,{control:'disk-live',field}));assert.throws(()=>new RebuildControl(s,{control:'all-live',field,epsilon:.2}));
});
test('fixed orbital control uses sum m Phi without half; force is its independent energy gradient',()=>{
 const s=sampleOrbitCandidate(library,{n:12,counts:[4,4,4]}),engine=new RebuildControl(s,{control:'fixed-total',field});engine.initialize();
 const e=measureRebuild(s,engine);let expected=0;for(let i=0;i<s.n;i++)expected+=s.masses[i]*equilibriumFieldAt(field,...s.positions.subarray(3*i,3*i+3)).potential;assert.ok(Math.abs(e.potential-expected)<1e-13);
 const h=1e-4,initial=s.positions[0];s.positions[0]=initial+h;const ep=measureRebuild(s,engine).energy;s.positions[0]=initial-h;const em=measureRebuild(s,engine).energy;s.positions[0]=initial;assert.ok(Math.abs(-(ep-em)/(2*h*s.masses[0])-s.accelerations[0])<1e-8);
});
