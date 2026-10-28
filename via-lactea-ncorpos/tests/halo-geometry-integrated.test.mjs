import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{createHaloGeometry,haloGeometryAt,haloWeakMetric,LIGHT_SPEED,assertGeometryState}from'../src/physics/halo-geometry.js';
import{haloMass,analyticPotential,R200,HALO_OUTER_RADIUS,HALO_TOTAL_MASS}from'../src/physics/models.js';import{G}from'../src/physics/constants.js';
import{createLiveGalaxy,liveResolution}from'../src/physics/live-initial.js';import{createGalaxy}from'../src/physics/initial.js';import{directEnergy}from'../src/physics/live-energy.js';import{gpuEnergy}from'../src/physics/gpu-energy.js';
import{geometryMesh}from'../src/render/halo-geometry-overlay.js';import{recommendGPUBase}from'../src/compute/gpu-auto-policy.js';
test('continuous halo exactly preserves the finite analytical mass, potential normalization and taper before GPU quantization',()=>{
 const field=createHaloGeometry({gpu:false});for(const r of[0,.00001,.01,1,8,100,R200,230,HALO_OUTER_RADIUS,1000]){const q=haloGeometryAt([r,0,0],field),phi=analyticPotential(r,0,0,true)-analyticPotential(r,0,0,false);assert(Math.abs(q.enclosedMass-haloMass(r))<128*Number.EPSILON*Math.max(HALO_TOTAL_MASS,1));assert(Math.abs(q.potential-phi)<128*Number.EPSILON);}
 for(const r of[.01,1,8,100,230,300]){const h=r*1e-4,a=haloGeometryAt([r,0,0],field),grad=(haloGeometryAt([r+h,0,0],field).potential-haloGeometryAt([r-h,0,0],field).potential)/(2*h);assert(Math.abs(grad+a.acceleration[0])/Math.abs(a.acceleration[0])<20*(h/r)**2);}
});
test('weak-field geodesic limit comes from the same metric potential and does not add a second halo force',()=>{
 const f=createHaloGeometry(),p=[8,2,.3],m=haloWeakMetric(p,f),h=.02;assert.deepEqual(m.slowGeodesicAcceleration,haloGeometryAt(p,f).acceleration);
 const lo=p.slice(),hi=p.slice();lo[0]-=h;hi[0]+=h;const geodesic=LIGHT_SPEED**2/2*(haloWeakMetric(hi,f).g00-haloWeakMetric(lo,f).g00)/(2*h);
 assert(Math.abs(geodesic-m.slowGeodesicAcceleration[0])/Math.abs(geodesic)<10*(h/8)**2);assert.equal(m.g11,m.g22);assert(m.absPhiOverC2<1e-5);
});
test('same N0 and seed give bitwise identical baryon phases and masses across halo representations/refinements',()=>{
 for(const baseN of[127,1024]){const live=createLiveGalaxy({baseN,seed:2026,haloRefinement:4}),geometry=createLiveGalaxy({baseN,seed:2026,haloRepresentation:'geometry',haloRefinement:32});
 assert.deepEqual(geometry.positions,live.positions.slice(0,geometry.n*3));assert.deepEqual(geometry.velocities,live.velocities.slice(0,geometry.n*3));assert.deepEqual(geometry.masses,live.masses.slice(0,geometry.n));assert(!geometry.components.includes(2));assert.equal(geometry.meta.haloMode,'fixed');assertGeometryState(geometry);assert.throws(()=>assertGeometryState(live));
 assert.deepEqual(geometry.meta.haloField.center,geometry.meta.centerShift.map(v=>Math.fround(-v)));}
 const old=createGalaxy({n:1024,seed:2026}),current=createLiveGalaxy({baseN:1024,seed:2026});assert.deepEqual(current.positions,old.positions);assert.deepEqual(current.velocities,old.velocities);assert.deepEqual(current.masses,old.masses);
});
test('external energy counts sum m Phi exactly once and has the force-consistent gradient',()=>{
 const s={n:2,time:0,positions:Float64Array.of(8,0,0,9,.2,0),velocities:new Float64Array(6),masses:Float64Array.of(.2,.3),components:Uint8Array.of(0,1)},field=createHaloGeometry(),options={epsilon:.1,haloRepresentation:'geometry',haloField:field},d=directEnergy(s,options),Uext=s.masses.reduce((sum,m,i)=>sum+m*haloGeometryAt(Array.from(s.positions.slice(i*3,i*3+3)),field).potential,0),Uself=-G*.2*.3/Math.sqrt(1+.04+.01);
 assert.equal(d.externalPotential,Uext);assert(Math.abs(d.energy-Uext-Uself)<64*Number.EPSILON);assert.equal(d.conditions.linearMomentum,false);assert.equal(d.conditions.angularVector,true);
 s.gpuPotentialEnergy=Uself;assert.equal(gpuEnergy(s,options).energy,d.energy);
 const h=.001;s.positions[0]+=h;const high=directEnergy(s,options).energy;s.positions[0]-=2*h;const low=directEnergy(s,options).energy;s.positions[0]+=h;const a=G*.3/(1.05**1.5)+haloGeometryAt([8,0,0],field).acceleration[0];assert(Math.abs((high-low)/(2*h)+.2*a)<1e-7);
 assert.throws(()=>directEnergy(createLiveGalaxy({n:16}),options),/macropartículas/);
});
test('geometry visualization has no input to gravity or integration and automatic N uses actual active counts',()=>{
 const f=createHaloGeometry(),before=structuredClone(f),mesh=geometryMesh(f);assert(mesh.every(Number.isFinite));assert.deepEqual(f,before);assert.equal(liveResolution(1024,32,true,'geometry').counts[2],0);
 const caps={limits:{maxBufferSize:2**28,maxStorageBufferBindingSize:2**27,maxComputeWorkgroupSizeX:256,maxComputeInvocationsPerWorkgroup:256,maxComputeWorkgroupStorageSize:16384,maxComputeWorkgroupsPerDimension:65535}},s=[{backend:'gpu',n:10000,stepMs:2}],r=recommendGPUBase(s,caps,{haloRepresentation:'geometry',enforceMemoryBudget:false});assert(r.n<=r.projectedTotal);assert(r.baseN>r.n);assert.equal(r.counts[2],0);
});
test('the original N-body page preserves both calculation modes with a clean continuous-halo indicator',async()=>{
 const html=await readFile(new URL('../experimento-ncorpos.html',import.meta.url),'utf8'),controller=await readFile(new URL('../src/ncorpos-live-entry.js',import.meta.url),'utf8');assert(html.includes('id="halo-representation"'));assert(!html.includes('id="show-geometry"'));assert(html.includes('id="halo-mode-badge"'));assert(!controller.includes('showGeometry:'));assert(!html.includes('laboratorio-geometria.html'));assert(!html.includes('investigation-area'));assert(controller.includes("c.haloRepresentation==='geometry'?GeometryHaloGPUBackend:LiveGPUBackend"));
});
