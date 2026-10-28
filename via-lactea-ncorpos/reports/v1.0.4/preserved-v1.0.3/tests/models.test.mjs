import test from 'node:test';import assert from 'node:assert/strict';
import {G,MODEL as P,KM_S_TO_KPC_MYR,RHO_CRITICAL} from '../src/physics/constants.js';
import {analyticAcceleration,analyticPotential,diskDensity,nfwFunction,R200,HALO_TOTAL_MASS,haloDensity,haloMass,HALO_OUTER_RADIUS} from '../src/physics/models.js';
import {seededRandom,sampleDisk,sampleHernquist,sampleHalo,createGalaxy} from '../src/physics/initial.js';
const near=(a,b,t)=>assert.ok(Math.abs(a-b)<=t,`${a} vs ${b} tolerance ${t}`);
test('unit conversion and nominal solar GM remain consistent',()=>{near(G,0.04498502151469553,1e-15);near(KM_S_TO_KPC_MYR,0.0010227121650456948,1e-16);});
test('analytic acceleration is the negative potential gradient in full 3D',()=>{
  const p=[8.2,3.1,1.3],h=1e-4,a=analyticAcceleration(...p);
  for(let k=0;k<3;k++){const u=[...p],v=[...p];u[k]+=h;v[k]-=h;near(-(analyticPotential(...u)-analyticPotential(...v))/(2*h),a[k],2e-7);}
});
test('rotation contributions add as v squared and disk formula is axisymmetric',()=>{
  const R=8.2,d=-analyticAcceleration(R,0,0,false,1)[0]*R;
  near(d,G*P.diskMass*R*R/(R*R+(P.diskA+P.diskB)**2)**1.5,1e-15);
  const a=analyticAcceleration(R,0,0,true),b=analyticAcceleration(0,R,0,true);near(a[0],b[1],1e-15);
});
test('r200 is a derived mean density and NFW outer taper is finite and smooth',()=>{
  near(haloMass(R200)/(4*Math.PI/3*R200**3),200*RHO_CRITICAL,1e-14);
  assert.ok(HALO_TOTAL_MASS>haloMass(R200));near(haloMass(2*HALO_OUTER_RADIUS),HALO_TOTAL_MASS,1e-12);near(haloDensity(HALO_OUTER_RADIUS),0,0);
  assert.ok(haloDensity(HALO_OUTER_RADIUS*0.999)>0);
});
test('NFW stable central series preserves small positive enclosed mass',()=>{near(nfwFunction(1e-8)/1e-16,0.5,1e-8);assert.ok(nfwFunction(1e-12)>0);});
test('exact MN radial integration reproduces its vertical marginal',()=>{
  for(const z of [0,0.28,1,4]){let sum=0;const n=20000,A=P.diskA+Math.hypot(z,P.diskB);for(let i=0;i<n;i++){const t=(i+0.5)/n,R=A*t/(1-t);sum+=2*Math.PI*R*diskDensity(R,z)*A/(1-t)**2/n;}near(sum,P.diskMass*P.diskB**2/(2*Math.hypot(z,P.diskB)**3),0.00002);}
});
test('spatial samplers follow cumulative profiles statistically',()=>{
  const rng=seededRandom(1975),n=40000;let disk=0,bulge=0,halo=0;
  for(let i=0;i<n;i++){if(Math.abs(sampleDisk(rng)[2])<P.diskB)disk++;if(Math.hypot(...sampleHernquist(rng))<P.bulgeScale)bulge++;if(Math.hypot(...sampleHalo(rng))<P.haloScale)halo++;}
  near(disk/n,1/Math.sqrt(2),0.01);near(bulge/n,0.25,0.01);near(halo/n,haloMass(P.haloScale)/HALO_TOTAL_MASS,0.01);
});
test('seed and masses are reproducible and remain fixed when N changes',()=>{
  const a=createGalaxy({n:1000}),b=createGalaxy({n:1000}),c=createGalaxy({n:10000}),d=createGalaxy({n:1000,withHalo:false});
  assert.deepEqual(a.positions,b.positions);assert.deepEqual(a.velocities,b.velocities);
  for(let k=0;k<3;k++){let ma=0,mc=0;for(let i=0;i<a.n;i++)if(a.components[i]===k)ma+=a.masses[i];for(let i=0;i<c.n;i++)if(c.components[i]===k)mc+=c.masses[i];near(ma,mc,1e-10);}
  assert.ok(!d.components.includes(2));assert.ok(a.positions.every(Number.isFinite)&&a.velocities.every(Number.isFinite));
});
