import test from'node:test';import assert from'node:assert/strict';
import{scienceProbePlan,directProbeValues,observationalDiagnostics,enclosedMassProfile,continuousMassInSpheres}from'../src/physics/observational-diagnostics.js';
import{createHaloGeometry,sphericalHaloAt}from'../src/physics/halo-geometry.js';
import{observationalPlots,observationalChartsView}from'../src/observational-plots.js';
import{EILERS_2019}from'../src/observations/eilers2019.js';import{BOVY_RIX_2013,ROCHE_2024}from'../src/observations/vertical-escape.js';
import{G,KM_S_TO_KPC_MYR}from'../src/physics/constants.js';
const state=()=>({n:2,time:125,positions:Float64Array.of(0,0,0,0,0,0),masses:Float64Array.of(2,3),components:Uint8Array.of(0,2)});
test('passive probes recover analytic softened point forces, potentials and component separation',()=>{
 const s=state(),probes=Float32Array.of(3,4,2,0),before=structuredClone(s),out=directProbeValues(s,probes,{G,epsilonSquared:.04}),r2=29.04;
 for(const[offset,mass]of[[0,5],[4,2]]){for(let k=0;k<3;k++)assert(Math.abs(out[offset+k]+G*mass*probes[k]/r2**1.5)<1e-15);assert(Math.abs(out[offset+3]+G*mass/Math.sqrt(r2))<1e-15);}assert.deepEqual(s,before);
});
test('residuals use exact published radii and synchronous physical epochs without fitting observations',()=>{
 const s=state(),plan=scienceProbePlan(),before=structuredClone(s),raw=directProbeValues(s,plan.probes,{G,epsilonSquared:.01}),d=observationalDiagnostics(s,raw,{G,epsilonSquared:.01},plan);
 assert.equal(d.timeMyr,125);assert.deepEqual(d.rotation.map(r=>r.R_kpc),EILERS_2019.rows.map(r=>r.R_kpc));assert.equal(d.residuals.length,38);for(let i=0;i<38;i++)assert.equal(d.residuals[i].total,EILERS_2019.rows[i].vc_km_s-d.rotation[i].total);
 const r=d.vertical.find(r=>r.R_kpc===8),expected=G*5*1.1/(8**2+1.1**2+.01)**1.5/(2*Math.PI*G)*1e4;assert(Math.abs(r.total/expected-1)<1e-6);const e=d.escape.find(r=>r.R_kpc===8),v=Math.sqrt(2*G*5*(1/Math.sqrt(64.01)-1/Math.sqrt(plan.boundaryKpc**2+.01)))/KM_S_TO_KPC_MYR;assert(Math.abs(e.total/v-1)<1e-6);assert.deepEqual(s,before);
});
test('enclosed masses are true spherical particle sums and ellipsoidal mass integrals, not rotation proxies',()=>{
 const s=state();s.positions=Float64Array.of(1,0,0,4,0,0);const m=enclosedMassProfile(s,null,[.5,2,5]);assert.deepEqual(m.rows.map(r=>r.total),[0,2,5]);assert.deepEqual(m.rows.map(r=>r.baryons),[0,2,2]);
 const sphere=createHaloGeometry({gpu:false,shape:{type:'spherical'}}),radii=[1,8,50,500],mass=continuousMassInSpheres(sphere,radii);for(let i=0;i<radii.length;i++)assert(Math.abs(mass[i]/sphericalHaloAt([radii[i],0,0],sphere).enclosedMass-1)<1e-11);
 const triax=createHaloGeometry({gpu:false,shape:{type:'triaxial',p:.85,q:.7,yaw:25}}),v=continuousMassInSpheres(triax,[1,8,50,500]);assert(v.every((x,i)=>i===0||x>=v[i-1]));assert(Math.abs(v.at(-1)/triax.totalMass-1)<1e-10);
});
test('new plots retain observations, units, epoch and all original-plus-new save controls',()=>{
 assert.equal(BOVY_RIX_2013.rows.length,43);assert.deepEqual(BOVY_RIX_2013.rows[0],{R_kpc:4.63,value:217.6,error:41.5});assert.equal(ROCHE_2024.rows[0].value,486);assert.equal(ROCHE_2024.rows[1].value,539);
 for(const svg of Object.values(observationalPlots()))assert(!/NaN|Infinity/.test(svg));
 const waiting=observationalPlots()['live-escape'];assert(waiting.includes('Aguardando primeira medição.'));assert(!waiting.includes('data-observational-point='));assert(!waiting.includes('data-model-series='));
 const plan=scienceProbePlan(),s=state(),data=observationalDiagnostics(s,directProbeValues(s,plan.probes,{G}),{G,epsilonSquared:.01}),plots=observationalPlots(data);assert.equal(Object.keys(plots).length,4);assert.equal((plots['live-vertical-force'].match(/data-observational-point=/g)||[]).length,43);assert.equal((plots['live-escape'].match(/data-observational-point=/g)||[]).length,2);assert(plots['live-residuals'].includes('data-zero-reference'));assert(plots['live-enclosed-mass'].includes('true enclosed spheres'));assert.equal((observationalChartsView().match(/data-save-chart=/g)||[]).length,4);
 assert(plots['live-enclosed-mass'].includes('data-zero-reference="true" d="M90 320H710"'));assert(plots['live-enclosed-mass'].includes('x="82" y="324" text-anchor="end">0</text>'));
});
