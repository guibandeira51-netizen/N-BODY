import test from 'node:test';import assert from 'node:assert/strict';
import {createGalaxy} from '../src/physics/initial-legacy.js';
import {createHaloExperiment} from '../src/physics/halo-experiments.js';
import {fixedHaloTable,tableValue,haloPotential,FixedHaloLeapfrog,fixedHaloDiagnostics,validateFixedHaloState} from '../src/physics/fixed-halo.js';
import {haloMass,HALO_TOTAL_MASS,HALO_OUTER_RADIUS} from '../src/physics/models.js';
import {G} from '../src/physics/constants.js';
const near=(a,b,tol=1e-4)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1e-14,Math.abs(b)),`${a} vs ${b}`);
test('A/B/C preserve exactly the same initial baryonic particles; halo mass is not duplicated',()=>{
 const a=createGalaxy({n:10000,seed:2026});for(const opts of [{haloSeed:2027},{haloCount:20000,haloSeed:2027},{haloMode:'fixed'}]){const s=createHaloExperiment(opts);for(const key of ['positions','velocities'])assert.deepEqual(s[key].slice(0,18000),a[key].slice(0,18000));assert.deepEqual(s.masses.slice(0,6000),a.masses.slice(0,6000));if(opts.haloMode==='fixed'){assert.equal(s.n,6000);validateFixedHaloState(s);}else near(s.masses.slice(6000).reduce((s,m)=>s+m,0),HALO_TOTAL_MASS,1e-12);}
 assert.throws(()=>validateFixedHaloState(a),/massivas/);
});
test('fixed finite NFW table follows original enclosed mass, potential gradient and exterior Kepler field',()=>{
 const t=fixedHaloTable();for(const r of [.01,.1,1,4,8,20,100,220,300,1000]){near(tableValue(t,r,'mass'),haloMass(r),5e-5);const h=r*1e-4,grad=(haloPotential(r+h)-haloPotential(r-h))/(2*h);near(G*tableValue(t,r,'mass')/r**2,grad,r>200&&r<250?2e-3:2e-4);}
 near(tableValue(t,1000,'mass'),HALO_TOTAL_MASS);assert.equal(tableValue(t,0,'mass'),0);
});
test('external energy counts sum m Phi once, and KDK conserves a circular orbit in static field',()=>{
 const r=8,m=2,v=Math.sqrt(G*haloMass(r)/r),s={n:1,positions:new Float64Array([r,0,0]),velocities:new Float64Array([0,v,0]),accelerations:new Float64Array(3),masses:new Float64Array([m]),components:new Uint8Array([1])},opts={dt:.1,epsilon:.1},e=new FixedHaloLeapfrog(s,opts);e.initialize();const d0=fixedHaloDiagnostics(s,opts);near(d0.externalPotential,m*tableValue(e.haloTable,r,'potential'),1e-14);assert.equal(d0.selfPotential,0);e.step(10000);const d=fixedHaloDiagnostics(s,opts);assert.ok(Math.abs((d.energy-d0.energy)/d0.energy)<2e-5);near(d.angularMomentum[2],d0.angularMomentum[2],1e-12);
});
test('softened continuous halo quadrature converges and matches its potential derivative',()=>{
 const a=fixedHaloTable({softening:.1,radialPoints:1024,shellPoints:4096}),b=fixedHaloTable({softening:.1,radialPoints:2048,shellPoints:8192});for(const r of [.05,.1,.3,1,4,8,20,100]){near(tableValue(a,r,'mass'),tableValue(b,r,'mass'),4e-4);const h=r*.02,grad=(tableValue(b,r+h,'potential')-tableValue(b,r-h,'potential'))/(2*h);near(grad,G*tableValue(b,r,'mass')/r**2,4e-3);}assert.ok(tableValue(b,.1,'mass')<haloMass(.1));
});
