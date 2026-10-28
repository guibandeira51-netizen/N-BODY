import test from 'node:test';
import assert from 'node:assert/strict';
import {deserializeModelSnapshot} from '../src/physics/snapshot-model.js';
import {massAudit} from '../src/physics/mass-audit.js';
import {externalGridAt,assertExternalState,ExternalGridLeapfrog,externalGridDiagnostics} from '../src/physics/external-grid.js';
import {ringMembership,equilibriumSample,initialOrbit} from '../src/physics/equilibrium-analysis.js';
import {laboratorySample} from '../src/physics/laboratory.js';
import {diagnostics} from '../src/physics/diagnostics.js';
import {serializeInitial,deserializeInitial} from '../src/physics/iterative-initial.js';

function fixture(){return {schema:'nbody-initial-v2',units:'kpc,Myr,1e10 nominal Msun',n:6,positions:[1,0,0,-1,0,0,2,0,.1,-2,0,-.1,5,0,0,-5,0,0],velocities:[0,0,0,0,0,0,0,.1,0,0,-.1,0,0,0,0,0,0,0],masses:[.5,.5,1,1,1.5,1.5],components:[0,0,1,1,2,2],meta:{method:'agama-action-df',realizationId:'unit-fixture',equilibriumValidated:true,physicalModel:{id:'unit-test',componentMassesMsun:[1e10,2e10,3e10],componentModels:['test bulge','test disk','test halo'],source:'unit fixture',reference:'test'}}};}
function harmonic(){const nu=65,nv=65,du=3/64,dv=3/64,rs=.1,zs=.1,values=[];for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const R=rs*Math.expm1(i*du),z=zs*Math.expm1(j*dv);values.push(.5*(R*R+z*z),R*(R+rs),z*(z+zs),0);}return {schema:'axisymmetric-potential-hermite-v1',modelId:'unit-test',nu,nv,du,dv,rscale:rs,zscale:zs,massInternal:3,values};}
test('physical snapshot rejects relabelled units, fractional components and mass mismatch; import cannot certify equilibrium',()=>{
 const a=fixture(),s=deserializeModelSnapshot(a);assert.equal(s.meta.equilibriumValidated,false);assert.equal(s.meta.importedEquilibriumClaim,true);assert.deepEqual(massAudit(s).components.map(c=>c.targetMsun),[1e10,2e10,3e10]);
 const saved=serializeInitial(s);assert.equal(saved.schema,'nbody-initial-v2');assert.equal(saved.model,undefined);assert.deepEqual(deserializeInitial(saved).masses,s.masses);
 const wrong=structuredClone(a);wrong.units='kpc,km/s,Msun';assert.throws(()=>deserializeModelSnapshot(wrong),/unidades/);
 wrong.units=a.units;wrong.components[0]=.1;assert.throws(()=>deserializeModelSnapshot(wrong),/componentes/);
 wrong.components=a.components;wrong.masses[1]=.51;assert.throws(()=>deserializeModelSnapshot(wrong),/massa/);
});
test('Hermite external forces are gradients of the same scalar potential, including z reflection and cylindrical axis',()=>{
 const t=harmonic();for(const p of [[.2,.3,.4],[.2,-.3,-.4],[0,0,.3],[.5,0,0]]){
  const q=externalGridAt(t,...p);for(let k=0;k<3;k++){const h=1e-6,a=p.slice(),b=p.slice();a[k]+=h;b[k]-=h;const gradient=(externalGridAt(t,...a).potential-externalGridAt(t,...b).potential)/(2*h);assert.ok(Math.abs(q.acceleration[k]+gradient)<1e-7);assert.ok(Math.abs(q.acceleration[k]+p[k])<2e-5);}
 }
});
test('fixed external halo refuses double mass and another physical model; KDK conserves the external-potential orbit energy',()=>{
 const t=harmonic(),s=deserializeModelSnapshot(fixture());assert.throws(()=>assertExternalState(s,t),/ausência/);
 const orb={n:1,positions:Float64Array.of(.5,0,.1),velocities:Float64Array.of(0,.5,0),masses:Float64Array.of(1e-10),components:Uint8Array.of(1),accelerations:new Float64Array(3),meta:{physicalModel:{id:'unit-test'}}};
 const e=new ExternalGridLeapfrog(orb,{externalGrid:t,dt:.001,epsilon:.1}),d0=externalGridDiagnostics(orb,{},t);e.step(10000);const d=externalGridDiagnostics(orb,{},t);assert.ok(Math.abs(d.energy/d0.energy-1)<3e-7);assert.throws(()=>assertExternalState(orb,{...t,modelId:'other'}),/outro modelo/);
});
test('new-model orbit diagnostic uses its own table and cohort mass stays conserved',()=>{
 const s=deserializeModelSnapshot(fixture());s.meta.physicalModel.initialOrbitTable={radiusKpc:[1,10],vcInternal:[.2,.3],kappaPerMyr:[.1,.02]};assert.equal(initialOrbit(s,1).vc,.2);assert.equal(initialOrbit(s,.01).vc,null);
 const labels=ringMembership(s);s.positions[6]=8;s.positions[9]=-8;const a=equilibriumSample(s,{initialMembership:labels});const cohorts=a.cohorts.cohortStats;assert.equal(cohorts.reduce((M,b)=>M+b.mass,0),2);assert.equal(cohorts.find(b=>b.mass===2).fractionRemainingInOriginalRing,0);
 const lab=laboratorySample(s,diagnostics(s));assert.equal(lab.components[1].analyticProfiles.radial.length,0);assert.ok(lab.conventions.orbit.includes('AGAMA'));assert.ok(lab.components[1].orbital.vc>.2);
});
