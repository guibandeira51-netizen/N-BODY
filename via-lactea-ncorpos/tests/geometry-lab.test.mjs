import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{G,MODEL,KM_S_TO_KPC_MYR}from'../src/physics/constants.js';
import{analyticAcceleration,analyticPotential}from'../src/physics/models.js';
import{C,C_SI,rotationAt,sourceCheck,lightDeflection,vacuumControl,integrateOrbit,runInvestigation}from'../src/geometry-lab/physics.js';
import{chartSVG,figureData,figureCSV}from'../src/geometry-lab/plots.js';

test('GR laboratory uses the exact SI light speed and leading scalar GR field, without an added acceleration',()=>{
 assert.equal(C_SI,299792458);assert.equal(C/KM_S_TO_KPC_MYR,C_SI/1000);
 for(const R of[.5,8,25]){const r=rotationAt(R);assert.equal(r.baryons_km_s,r.grLeading_km_s);assert(Math.abs((r.total_km_s**2-r.baryons_km_s**2)/r.halo_km_s**2-1)<20*Number.EPSILON);assert(r.absPhiBaryons_over_c2<1e-5);}
 assert.throws(()=>rotationAt(0));
});
test('force is the derivative of the imported continuous profiles and source residual converges spatially at second order',()=>{
 const p=[8,0,.5],h=.001,a=analyticAcceleration(...p,false);
 const derivative=(analyticPotential(8+h,0,.5,false)-analyticPotential(8-h,0,.5,false))/(2*h);
 // Central first derivative truncation scales as (h/r)^2; allow its geometric coefficient.
 assert(Math.abs(a[0]+derivative)/Math.abs(a[0])<10*(h/Math.hypot(...p))**2);
 const checks=[.04,.02,.01].map(h=>sourceCheck(p,h));
 const ratio=Math.abs(checks[0].residual_baryons/checks[1].residual_baryons);
 assert(ratio>3.9&&ratio<4.1);assert(Math.abs(checks[2].extra_source_relative_residual)<Math.abs(checks[1].extra_source_relative_residual));
 const extrapolated=(4*checks[2].extra_source_if_halo_field-checks[1].extra_source_if_halo_field)/3;
 // Richardson remainder is O(h^4), using the change between refinements as its local scale.
 assert(Math.abs(extrapolated-checks[2].rho_halo)<Math.abs(checks[2].extra_source_if_halo_field-checks[1].extra_source_if_halo_field)/100);
});
test('light deflection recovers the relativistic point-mass factor four and vanishes with its source',()=>{
 const b=8,M=MODEL.bulgeMass+MODEL.diskMass;
 const point=(x,y,z)=>{const r=Math.hypot(x,y,z);return[-G*M*x/r**3,-G*M*y/r**3,-G*M*z/r**3];};
 const expected=4*G*M/(b*C**2),errors=[32,64,128].map(n=>Math.abs(lightDeflection(b,point,n)-expected));
 assert(errors[0]/errors[1]>15&&errors[0]/errors[1]<17);assert(errors[2]<errors[1]);assert.equal(lightDeflection(b,()=>[0,0,0]),0);
 assert.throws(()=>lightDeflection(b,point,3));
});
test('spherical exact vacuum control distinguishes Ricci-flat spacetime from zero curvature',()=>{
 const a=vacuumControl(100),b=vacuumControl(200);assert.equal(a.ricciScalar,0);assert(a.kretschmann_kpc_minus4>0);assert.equal(a.additionalDensity,0);
 assert.equal(a.kretschmann_kpc_minus4/b.kretschmann_kpc_minus4,64);assert(a.localCircularSpeed_km_s>a.newtonSpeed_km_s);
 assert.equal(vacuumControl(100,0).kretschmann_kpc_minus4,0);assert.throws(()=>vacuumControl(1e-10));
});
test('test-particle trajectories use identical initial states and KDK convergence rather than a fabricated GR correction',()=>{
 const a=integrateOrbit({duration:120,dt:1}),b=integrateOrbit({duration:120,dt:1,withHalo:true});assert.deepEqual(a.initial,b.initial);assert.notDeepEqual(a.final,b.final);
 const runs=[1,.5,.25].map(dt=>integrateOrbit({duration:120,dt,withHalo:true}));
 const d=(a,b)=>Math.hypot(...a.final.position.map((x,k)=>x-b.final.position[k])),ratio=d(runs[0],runs[1])/d(runs[1],runs[2]);assert(ratio>3.95&&ratio<4.05);
 assert(runs[2].maxRelativeEnergyError_everyStep<runs[1].maxRelativeEnergyError_everyStep);assert(runs[1].maxRelativeEnergyError_everyStep<runs[0].maxRelativeEnergyError_everyStep);
 assert.equal(b.rows[0].time_Myr,0);assert.equal(b.rows.at(-1).time_Myr,120);assert(b.rows.every(r=>r.z_kpc===0));assert.throws(()=>integrateOrbit({dt:0}));
});
test('exports retain calculated samples, units, sources, assumptions and separated model identities',()=>{
 const r=runInvestigation({duration:20});for(const kind of['rotation','lensing','orbits']){const svg=chartSVG(figureData(r,kind));assert(svg.includes('<metadata>'));assert(svg.includes('https://arxiv.org/abs/2207.09736'));assert(svg.includes('data-series="baryons"'));assert(svg.includes('data-series="total"'));const csv=figureCSV(r,kind);assert(csv.includes('kpc'));assert(csv.split('\n').length>2);}
 assert(r.conclusion.includes('No full nonlinear Einstein'));assert.equal(r.parameters.model,MODEL);assert.equal(r.precision,'CPU JavaScript Float64');
});
test('halo representation is integrated in the original panel without navigation to a separate laboratory',async()=>{
 const html=await readFile(new URL('../experimento-ncorpos.html',import.meta.url),'utf8');assert(html.includes('id="halo-representation"'));assert(html.includes('Halo NFW — contínuo'));assert(html.includes('id="halo-mode-badge"'));assert(!html.includes('id="show-geometry"'));assert(!html.includes('id="geometry-amplification"'));assert(!html.includes('investigation-area'));assert(!html.includes('laboratorio-geometria.html'));
});
