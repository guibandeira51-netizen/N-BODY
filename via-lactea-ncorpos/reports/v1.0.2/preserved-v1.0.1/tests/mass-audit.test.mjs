import test from 'node:test';
import assert from 'node:assert/strict';
import {createGalaxy} from '../src/physics/initial.js';
import {massAudit,UNIT_CONVERSIONS as U,G_SI,MASS_UNIT_KG} from '../src/physics/mass-audit.js';
import {directAccelerations,barnesHutAccelerations} from '../src/physics/forces.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {G} from '../src/physics/constants.js';
const near=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1e-20,Math.abs(b)),`${a} vs ${b}`);
const fixture=()=>({n:3,positions:new Float64Array([-2,0,0,1,0,0,0,4,0]),velocities:new Float64Array(9),accelerations:new Float64Array(9),masses:new Float64Array([.5,6.8,97.6315764173288]),components:new Uint8Array([0,1,2])});
test('A/B: N=10000 and 50000 preserve all physical masses and divide particle mass by five',()=>{
  const a=massAudit(createGalaxy({n:10000})),b=massAudit(createGalaxy({n:50000}));
  assert.deepEqual(a.components.map(c=>c.count),[1500,4500,4000]);assert.deepEqual(b.components.map(c=>c.count),[7500,22500,20000]);
  for(let c=0;c<3;c++){near(a.components[c].sumMsun,a.components[c].targetMsun);near(b.components[c].sumMsun,a.components[c].sumMsun);near(b.components[c].particleMsun.mean*5,a.components[c].particleMsun.mean);assert.equal(a.components[c].uniform,true);}
});
test('C/D/G: three unequal component masses give analytic Plummer acceleration with no extra background',()=>{
 const s=fixture(),eps=.3,ref=new Float64Array(9);
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(i!==j){const d=[0,1,2].map(k=>s.positions[3*j+k]-s.positions[3*i+k]);const f=G*s.masses[j]/(d.reduce((v,x)=>v+x*x,eps*eps))**1.5;d.forEach((x,k)=>ref[3*i+k]+=f*x);}
 new Leapfrog(s,{epsilon:eps}).initialize();ref.forEach((x,i)=>near(s.accelerations[i],x));
 const one={n:1,positions:new Float64Array([8,1,2]),velocities:new Float64Array(3),accelerations:new Float64Array(3),masses:new Float64Array([100]),components:new Uint8Array([2])};new Leapfrog(one).initialize();assert.deepEqual(Array.from(one.accelerations),[0,0,0]);
});
test('F: distant unequal mass cluster uses weighted center and aggregated mass in Barnes-Hut',()=>{
 const n=40,s={n,positions:new Float64Array(3*n),masses:new Float64Array(n),accelerations:new Float64Array(3*n)};s.positions.set([-1000,0,0]);s.masses[0]=1;let M=0,x=0,y=0,z=0;
 for(let i=1;i<n;i++){const m=i*i;s.masses[i]=m;s.positions.set([i/100,1,1],3*i);M+=m;x+=m*s.positions[3*i];y+=m*s.positions[3*i+1];z+=m*s.positions[3*i+2];}
 barnesHutAccelerations(s,{epsilon:.1,theta:.5});const d=[x/M+1000,y/M,z/M],f=G*M/(d.reduce((s,x)=>s+x*x,.01))**1.5;d.forEach((v,k)=>near(s.accelerations[k],f*v,1e-7));
 const exact=directAccelerations(s,{},new Float64Array(3*n));const tree=barnesHutAccelerations(s,{theta:0},new Float64Array(3*n));exact.forEach((x,k)=>near(tree[k],x,1e-11));
});
test('H: SI force, position, velocity, acceleration, energy and Gyr conversions close dimensionally',()=>{
 near(G,G_SI*MASS_UNIT_KG*U.timeSeconds**2/U.lengthMeters**3);
 near(U.kmSToInternal*U.velocityMetersPerSecond,1000);near(U.gyrToMyr*U.timeSeconds,1e9*365.25*86400);
 const s=fixture();directAccelerations(s,{epsilon:.3});let si=0;for(let j=1;j<3;j++){const dx=(s.positions[3*j]+2)*U.lengthMeters,dy=s.positions[3*j+1]*U.lengthMeters;si+=G_SI*s.masses[j]*MASS_UNIT_KG*dx/(dx*dx+dy*dy+(.3*U.lengthMeters)**2)**1.5;}
 near(s.accelerations[0]*U.accelerationMetersPerSecondSquared,si);near(U.energyJoules,MASS_UNIT_KG*U.velocityMetersPerSecond**2);
});
