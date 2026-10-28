import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {recommendGPUBase} from '../src/compute/gpu-auto-policy.js';import{liveResolution}from'../src/physics/live-initial.js';
import{PAIR_ENERGY_WGSL,rotationFromGPU}from'../src/compute/gpu-live.js';import{FORCE_WGSL}from'../src/compute/gpu.js';import{gpuEnergy}from'../src/physics/gpu-energy.js';import{directEnergy}from'../src/physics/live-energy.js';import{createLiveGalaxy}from'../src/physics/live-initial.js';import{energyPanelSVG}from'../src/energy-charts.js';import{energyPanelsData}from'../src/energy-chart-data.js';
import{getBarnesHutStats}from'../src/physics/forces.js';
const caps={webgpu:{available:true,limits:{maxBufferSize:2**28,maxStorageBufferBindingSize:2**27,maxComputeWorkgroupSizeX:256,maxComputeInvocationsPerWorkgroup:256,maxComputeWorkgroupStorageSize:16384,maxComputeWorkgroupsPerDimension:65535}}};
test('GPU automatic requires measured GPU data, accounts for halo-only refinement and memory',()=>{
 assert.throws(()=>recommendGPUBase([],caps,{budgetBytes:512*1024**2}),/medição/);
 const samples=[{backend:'gpu',n:30000,stepMs:9}],a=recommendGPUBase(samples,caps,{haloRefinement:32,budgetBytes:512*1024**2}),b=recommendGPUBase(samples,caps,{budgetBytes:2*1024**2});
 assert.deepEqual(a.counts,liveResolution(a.baseN,32).counts);assert(a.n<=a.projectedTotal);assert(a.n>a.baseN*10);assert(b.n<a.n);assert.throws(()=>recommendGPUBase(samples,{},{budgetBytes:512*1024**2}),/Orçamento/);
});
test('energy GPU shader adds no self terms or change to original xyz force operation',()=>{
 assert(PAIR_ENERGY_WGSL.includes('if (base + k != i)'));assert(PAIR_ENERGY_WGSL.includes('0.5 * positions[i].w * phi'));
 const force='acceleration += displacement * (params.gravity * tile[k].w * invR * invR * invR);';assert(FORCE_WGSL.includes(force)&&PAIR_ENERGY_WGSL.includes(force));
});
test('GPU potential diagnostic preserves independent Float64 energy and labels actual precision',()=>{
 const state=createLiveGalaxy({n:16,seed:2026}),o={dt:.1,epsilon:.1,effectiveParameters:{dt:Math.fround(.1),G:Math.fround(.04498502151469553),epsilonSquared:Math.fround(.01)},forceMethod:'GPU direct f32'};const direct=directEnergy(state,o);state.gpuPotentialEnergy=direct.potential;const fast=gpuEnergy(state,o);assert.equal(fast.energy,direct.energy);assert.equal(fast.energyAlgorithm,'gpu-pairs-f32');assert.equal(fast.energyApproximate,true);assert.equal(fast.treeOrder,null);
 const data=energyPanelsData([{timeMyr:0,conservation:fast}]);assert.equal(data.estimator,'gpu');const svg=energyPanelSVG(data,'bh');assert(svg.includes('Energia estimada — GPU Float32'));assert(!svg.includes('Energia estimada — Barnes–Hut'));
 assert.equal(getBarnesHutStats(state),null);delete state.gpuPotentialEnergy;assert.throws(()=>gpuEnergy(state,o),/ausente/);
});
test('radial GPU contributions retain signed v2, sum in quadrature, and identify Float32 method',()=>{
 const s=createLiveGalaxy({n:16,seed:2026}),fields=new Float32Array(4*4);for(let k=0;k<4;k++)fields.set([-1,-2,1,0],4*k);const field=rotationFromGPU(s,fields,{G:.1,epsilonSquared:.01},{radii:[1],azimuthSamples:4}),v=field.rows[0].v2_kpc2_Myr2;assert.equal(v.total,v.disk+v.bulge+v.halo);assert.equal(field.rows[0].vc_km_s.halo,null);assert.match(field.method,/WebGPU Float32/);
});
test('primary page has no BH/CPU integration selectors, starts with unknown N and uses GPU-only controller',async()=>{
 const html=await readFile(new URL('../experimento-ncorpos.html',import.meta.url),'utf8'),controller=await readFile(new URL('../src/ncorpos-live-entry.js',import.meta.url),'utf8');
 assert(!html.includes('Barnes'));assert(!html.includes('value="cpu"'));assert(!html.includes('value="barnes-hut"'));assert(!html.includes('id="theta"'));assert(html.includes('id="n" type="number" value=""'));
 assert(!controller.includes('cpu-bh'));assert(!controller.includes('barnes-hut'));assert(!controller.includes("type:'prepare'"));assert(controller.includes('gpu-diagnostic-worker.js'));assert(controller.includes('detect().then(()=>calibrateAutomatic())'));assert(controller.indexOf('await measureGPU(chosen.n,token,chosen)')<controller.indexOf("$('n').value=chosen.baseN"));
});
