import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {directEnergyGuide} from '../src/energy-direct-guide.js';import {energyPanelSVG,energyChartsView} from '../src/energy-charts.js';import {energyPanelsData} from '../src/energy-chart-data.js';
const points=(times)=>times.map((t,i)=>({timeMyr:t,value:i*1e-5}));
test('Float64 guide orders measured snapshots without changing their values or times',()=>{
 const rows=points([400.00000000002245,0,200.09999999999292]),before=structuredClone(rows),g=directEnergyGuide(rows,{cadenceMyr:200});assert.deepEqual(rows,before);assert.equal(g.segments.length,2);assert.equal(g.segments[0].fromTimeMyr,0);assert.equal(g.segments[0].toTimeMyr,200.09999999999292);assert.equal(g.segments[0].toValue,rows[2].value);assert.equal(g.interpolatedMeasurements,false);
});
test('large sampling intervals break the guide and retain both bounding markers',()=>{
 const rows=points([0,200,400,1200]),g=directEnergyGuide(rows,{cadenceMyr:200});assert.equal(g.segments.length,2);assert.equal(g.gaps.length,1);assert.equal(g.gaps[0].fromTimeMyr,400);assert.equal(g.gaps[0].toTimeMyr,1200);
});
test('invalid intermediate energy, failures, cancellations and omitted evaluations interrupt segments',()=>{
 const rows=points([0,100,200]);rows[1].value=null;assert.equal(directEnergyGuide(rows,{cadenceMyr:200}).segments.length,0);
 for(const type of ['failed','cancelled','omitted','unavailable']){const g=directEnergyGuide(points([0,200]),{cadenceMyr:200,events:[{type,timeMyr:100,reason:'test fixture'}]});assert.equal(g.segments.length,0,type);assert.equal(g.gaps.length,1);}
 const recovered=directEnergyGuide(points([0,100,200]),{cadenceMyr:200,events:[{type:'failed',timeMyr:100}]});assert.equal(recovered.gaps.length,0);
});
test('trailing missing audits are labelled and no line is extended beyond the final measured point',()=>{
 const g=directEnergyGuide(points([0,200]),{cadenceMyr:200,xDomain:[0,1000]});assert.equal(g.segments.length,1);assert.equal(g.segments[0].toTimeMyr,200);assert.equal(g.gaps[0].trailing,true);assert.equal(g.gaps[0].toTimeMyr,1000);
});
test('cadence inference is explicit and per-snapshot adaptive cadence is respected',()=>{
 const inferred=directEnergyGuide(points([0,200,400,1200]));assert.equal(inferred.nominalCadenceMyr,200);assert.equal(inferred.cadenceSource,'inferred lower median of measured intervals');assert.equal(inferred.gaps.length,1);
 const adaptive=points([0,200,1000]);adaptive[2].samplingCadenceMyr=800;assert.equal(directEnergyGuide(adaptive,{cadenceMyr:200}).gaps.length,0);
 assert.equal(directEnergyGuide([]).segments.length,0);assert.equal(directEnergyGuide(points([0])).segments.length,0);assert.equal(directEnergyGuide(points([0,0])).segments.length,0);
});
test('actual 80000-particle SVG has only original markers, an orange dashed guide and unchanged zoom',async()=>{
 const r=JSON.parse(await readFile(new URL('../reports/energy-charts/recorded-80000.json',import.meta.url),'utf8')),before=JSON.stringify(r),d=energyPanelsData(r.samples,r.references,r.context),svg=energyPanelSVG(d,'direct');
 assert.equal((svg.match(/<circle /g)||[]).length,6);assert(svg.includes('data-series="direct-guide"'));assert(svg.includes('stroke-dasharray="4 4"'));assert(svg.includes('pointer-events="none"'));assert(svg.includes('data-reference="zero"'));assert(svg.includes('Marcadores: medições diretas Float64. Linha tracejada: guia visual entre snapshots.'));
 const raw=svg.match(/<metadata[^>]*>([\s\S]*?)<\/metadata>/)[1].replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'),m=JSON.parse(raw);assert.equal(m.plot.guide.segments.length,5);assert.equal(m.plot.guide.gaps.length,0);assert(m.plot.yDomain.max-m.plot.yDomain.min<.001);assert.deepEqual(m.plot.plottedTimes,r.references.map(x=>x.timeMyr));assert.equal(m.direct.at(-1).relative.percent,-.00013374506901292645);assert.equal(JSON.stringify(r),before);
 const gapData=structuredClone(d);gapData.directSampling={cadenceMyr:200,events:[{type:'failed',timeMyr:300,reason:'fixture failure'}]};assert(energyPanelSVG(gapData,'direct').includes('data-energy-gap="true"'));
});
test('active page exposes only two energy panels and keeps the save controls',()=>{
 const view=energyChartsView();assert.equal((view.match(/data-save-chart=/g)||[]).length,2);assert(!view.includes('live-energy-bias'));assert(!view.includes('energy-bias-mode'));assert(!view.includes('Comparação no mesmo snapshot'));assert(view.includes('live-energy-direct'));assert(view.includes('live-energy-bh'));
});
