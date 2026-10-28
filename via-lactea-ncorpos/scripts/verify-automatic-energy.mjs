import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {directEnergy,energyBase,relativeEnergy} from '../src/physics/live-energy.js';
const folder=new URL('../reports/automatic-energy/',import.meta.url),results=[];
for(const [name,n,precision] of [['cpu-512',512,'Float64'],['gpu-80000',80000,'Float32']]){
 const report=JSON.parse(await readFile(new URL(name+'-auditoria.json',folder),'utf8')),refs=report.references,d0=refs.find(r=>r.timeMyr===0)?.direct;
 assert(d0);assert.equal(report.automatic.mode,'automatic');assert.equal(report.automatic.peakPending,1);assert(report.automatic.pendingCount<=1);
 assert(report.automatic.policy.estimatedWorkingBytes<=report.automatic.policy.memoryBudgetBytes);
 assert(refs.length>=2);assert(refs.every(r=>r.origin==='automatic'));assert(refs.every(r=>r.snapshot.n===n&&r.direct.trajectoryPrecision===precision));
 assert(report.fastSamples.every(s=>!s.automaticEnergy));
 const retained=refs.filter(r=>r.snapshot.positions);assert(retained.length<=3);assert(retained.some(r=>r.timeMyr===0));
 const rows=[];
 for(const r of refs){
  assert.equal(r.timeMyr,r.direct.time);assert.equal(r.timeMyr,r.snapshot.time);assert(r.timeMyr>=r.requestedTimeMyr);
  const relative=relativeEnergy(r.direct,d0);assert.equal(relative.denominator,Math.abs(d0.energy));
  if(r.snapshot.positions){const raw=r.snapshot,state={...raw,positions:Float64Array.from(raw.positions),velocities:Float64Array.from(raw.velocities),masses:Float64Array.from(raw.masses),components:Uint8Array.from(raw.components)},p=raw.parameters;
   const options={G:p.G,epsilonSquared:p.epsilonSquared,epsilon:p.epsilon,dt:p.effectiveDt,forceMethod:p.forceAlgorithm,...(precision==='Float32'?{effectiveParameters:{G:p.G,epsilonSquared:p.epsilonSquared,dt:p.effectiveDt}}:{})};
   const before=createHash('sha256').update(state.positions).update(state.velocities).update(state.masses).digest('hex');
   const d=n<=2048?directEnergy(state,options):energyBase(state,options);
   assert(Math.abs(d.kinetic-r.direct.kinetic)<1e-12);if(n<=2048)assert(Math.abs(d.energy-r.direct.energy)<1e-12);
   assert.equal(before,createHash('sha256').update(state.positions).update(state.velocities).update(state.masses).digest('hex'));
  }
  rows.push({timeMyr:r.timeMyr,requestedTimeMyr:r.requestedTimeMyr,n,backend:r.snapshot.backend,trajectoryPrecision:r.direct.trajectoryPrecision,energy:r.direct.energy,signedPercent:relative.percent,denominator:relative.denominator,costMs:r.direct.diagnosticCostMs,rawArraysRetained:Boolean(r.snapshot.positions)});
 }
 const svg=await readFile(new URL(name+'-baixado.svg',folder),'utf8'),path=svg.match(/<path d="([^"]*)" fill="none" stroke="#c07b25"/)[1];
 assert(!path.includes('L'));assert.equal((svg.match(/<circle[^>]*fill="#c07b25"/g)??[]).length,refs.length);assert(svg.includes('Estimada · Barnes–Hut')&&svg.includes('Direta · Float64'));
 const mean=rows.reduce((s,r)=>s+r.costMs,0)/rows.length;
 const result={name,status:'passed',codeIdentity:report.codeIdentity.sha256,automatic:report.automatic,referenceCount:rows.length,initialEnergy:d0.energy,meanReferenceCostMs:mean,maxAbsoluteSignedPercent:Math.max(...rows.map(r=>Math.abs(r.signedPercent))),rows};
 results.push(result);
 await writeFile(new URL(name+'-referencias.csv',folder),['time_Myr,requested_time_Myr,n,trajectory_precision,E_direct,deltaE_signed_percent,denominator,cost_ms,raw_arrays_retained',...rows.map(r=>[r.timeMyr,r.requestedTimeMyr,r.n,r.trajectoryPrecision,r.energy,r.signedPercent,r.denominator,r.costMs,r.rawArraysRetained].join(','))].join('\n')+'\n');
}
await writeFile(new URL('verification.json',folder),JSON.stringify({status:'passed',scope:'Automatic energy diagnostic workflow and actual performance; not a structural equilibrium certificate',results},null,2));
console.log(JSON.stringify(results.map(r=>({name:r.name,points:r.referenceCount,times:r.rows.map(x=>x.timeMyr),meanCostMs:r.meanReferenceCostMs,maxAbsoluteSignedPercent:r.maxAbsoluteSignedPercent,omitted:r.automatic.omitted,peakPending:r.automatic.peakPending})),null,2));
