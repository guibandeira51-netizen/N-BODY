import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessResources} from '../src/compute/capability.js';
import {recommendGPUBase} from '../src/compute/gpu-auto-policy.js';
import {EnergySnapshotSampler,automaticEnergyPolicy} from '../src/compute/energy-snapshot-sampler.js';
import {AutomaticEnergyReferences} from '../src/automatic-energy.js';
import {createLiveGalaxy} from '../src/physics/live-initial.js';
import {directEnergy} from '../src/physics/live-energy.js';
const limits={maxBufferSize:2**28,maxStorageBufferBindingSize:2**27,maxComputeWorkgroupSizeX:256,maxComputeInvocationsPerWorkgroup:256,maxComputeWorkgroupStorageSize:16384,maxComputeWorkgroupsPerDimension:65535};
const caps={limits,safetyBudgetBytes:1};

test('unrestricted GPU admission ignores configured and default budgets, retains actual adapter limits',()=>{
 assert(!assessResources(2000000,caps).admissible);
 const free=assessResources(2000000,caps,{budgetBytes:1,enforceMemoryBudget:false});
 assert(free.admissible);assert(free.estimate.estimatedBytes>512*1024**2);assert.equal(free.budgetBytes,null);assert.equal(free.memoryPolicy,'adapter-limits-only');
 assert(assessResources(9000000,caps,{enforceMemoryBudget:false}).reasons.some(r=>r.includes('maxStorageBufferBindingSize')));
 assert(!assessResources(16,{}, {enforceMemoryBudget:false}).admissible);
});

test('automatic recommendation can ignore budget while still deriving N from GPU measurements',()=>{
 const samples=[{backend:'gpu',n:30000,stepMs:9}];
 assert.throws(()=>recommendGPUBase(samples,caps,{budgetBytes:1}));
 const recommendation=recommendGPUBase(samples,caps,{budgetBytes:1,enforceMemoryBudget:false,haloRefinement:32});
 assert(recommendation.n<=recommendation.projectedTotal);assert(recommendation.n>30000);assert.equal(recommendation.targetMs,20);
});

test('unrestricted reference policy reaches snapshot sampler and asynchronous queue without a hidden memory ceiling',async()=>{
 assert(!automaticEnergyPolicy(2000000).allowed);
 assert(automaticEnergyPolicy(2000000,4,150,1,{enforceMemoryBudget:false}).allowed);
 const s=createLiveGalaxy({n:16,seed:2026});s.time=0;
 const options={epsilon:.1,dt:.1,energyAuditCadenceMyr:150,energyReferenceBudgetBytes:1,enforceEnergyReferenceBudget:false};
 const sampler=new EnergySnapshotSampler(),payload=sampler.capture(s,directEnergy(s,options),options);
 assert(!payload.unavailable);assert.equal(payload.policy.memoryBudgetBytes,null);assert(sampler.due(150,s.n));
 let resolveEvaluation;const pool={count:4,rate:1,estimate:()=>1,cancel(){},evaluate:()=>new Promise(r=>resolveEvaluation=r)};
 let completed=0;const queue=new AutomaticEnergyReferences({pool,onReference:()=>completed++});queue.enqueue(payload,{});
 assert.equal(queue.phase,'calculating');assert.equal(queue.disabled,false);assert.equal(queue.policy.enforceMemoryBudget,false);
 resolveEvaluation({diagnosticCostMs:1});await new Promise(r=>setImmediate(r));assert.equal(completed,1);
});

test('active page exposes no buffer budget and applies no projected two-second manual cutoff',async()=>{
 const root=new URL('../',import.meta.url),html=await readFile(new URL('experimento-ncorpos.html',root),'utf8'),js=await readFile(new URL('src/ncorpos-live-entry.js',root),'utf8');
 assert(!html.includes('id="budget"'));assert(!html.includes('Orçamento de buffers'));
 assert(!js.includes("$('budget')"));assert(!js.includes('prediction>2000'));assert(!js.includes('Custo GPU projetado acima'));
 assert(js.includes('enforceMemoryBudget:false'));assert(js.includes('enforceEnergyReferenceBudget:false'));
});
