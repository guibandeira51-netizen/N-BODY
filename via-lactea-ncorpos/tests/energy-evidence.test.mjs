import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile(new URL('../reports/energy-audit/'+name,import.meta.url),'utf8'));
test('preserved legacy replay reproduces the observed aggregates and decomposes the signed energy without correction',async()=>{
 const r=await read('replay-80000-analysis.json'),old=await read('observed-run-before.json');assert.equal(r.rows.length,8);assert.equal(r.aggregateReproductionExact,true);assert.equal(r.configuration.n,80000);assert.equal(r.effectiveParameters.G,Math.fround(.04498502151469553));
 for(let i=0;i<r.rows.length;i++){const x=r.rows[i];assert.equal(x.kinetic_difference_original,0);assert.equal(x.potential_difference_original,0);assert.equal(x.E_direct,x.K+x.U_direct);assert(Math.abs(x.fast_change_common_scale_percent-x.delta_direct_percent-x.estimator_change_common_scale_percent)<1e-12);assert(Math.abs(x.delta_BH_historical_percent-100*(old.laboratory.samples[i].conservation.energy-old.laboratory.samples[0].conservation.energy)/Math.abs(old.laboratory.samples[0].conservation.energy))<1e-15);assert.match(x.stateSHA256,/^[a-f0-9]{64}$/);}
 assert(r.rows.at(-1).delta_direct_percent<0);assert(r.rows.at(-1).delta_BH_effective_percent>0);assert(r.limitations.some(x=>x.includes('Eight')));
});
test('resolved eccentric control demonstrates temporal convergence while precision calibration states its scope',async()=>{
 const r=await read('resolved-controls.json'),a=r.summaries.filter(s=>s.kind==='eccentric');assert.deepEqual(a.map(s=>s.dt),[.1,.05,.025]);for(let i=0;i<2;i++){const ratio=a[i].maxAbsDirectEveryStep/a[i+1].maxAbsDirectEveryStep;assert(ratio>3.8&&ratio<4.2);assert(a[i].maxTrajectoryErrorFirst100Myr/a[i+1].maxTrajectoryErrorFirst100Myr>3.8);}
 const p=await read('precision-calibration.json');assert.equal(p.decimalDigits,80);assert(p.errors.energy.relative<1e-15);assert.match(p.scope,/not a formal/);
});
