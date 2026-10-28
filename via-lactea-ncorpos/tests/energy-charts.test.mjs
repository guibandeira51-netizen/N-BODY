import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EnergyTimeline,energyPanelsData,energyDenominator,energyPanelsCSV,numericFormat,zoomDomain,sameEnergySnapshot} from '../src/energy-chart-data.js';
import {energyPanelSVG,energyChartsView} from '../src/energy-charts.js';
const base={n:2,mass:3,time:0,kinetic:1,potential:-3,energy:-2,G:1,epsilonSquared:.01,forceAlgorithm:'direct',trajectoryPrecision:'Float64',precision:'Float64 compensated',externalPotential:0};
const row=(t,shift,bias)=>{const direct={...base,time:t,energy:-2+shift,potential:-3+shift},fast={...direct,energy:direct.energy+bias,potential:direct.potential+bias};return {timeMyr:t,fast,direct,snapshot:{time:t,n:2,parameters:{G:1,epsilonSquared:.01},backend:'CPU'}};};
const refs=[row(0,0,.01),row(2,-2e-8,.012),row(5,4e-8,.009)],samples=refs.map(r=>({timeMyr:r.timeMyr,conservation:r.fast}));
const data=()=>energyPanelsData(samples,refs,{realizationId:'test-only',configuration:{n:2}});
const meta=svg=>JSON.parse(svg.match(/<metadata[^>]*>([\s\S]*?)<\/metadata>/)[1].replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'));
test('energy panels use independent negative initial denominators and common bias normalization',()=>{
 const d=data();assert.equal(d.direct[1].relative.percent,100*(refs[1].direct.energy-refs[0].direct.energy)/Math.abs(refs[0].direct.energy));
 assert.equal(d.estimated[1].relative.denominator,1.99);assert.equal(d.direct[1].relative.denominator,2);
 for(const r of d.comparison){assert(Math.abs(r.etaPercent-(r.bhChangeCommonPercent-r.directChangeCommonPercent))<1e-12);assert.equal(r.B,r.BH.E-r.direct.E);}
 assert.notEqual(d.comparison[1].etaPercent,d.estimated[1].relative.percent-d.direct[1].relative.percent);
});
test('no direct states means no markers; absent initial direct energy never reuses BH initial',()=>{
 const d=energyPanelsData(samples,[]);assert.equal(d.direct.length,0);const svg=energyPanelSVG(d,'direct');assert(svg.includes('Aguardando referência direta Float64.'));assert(!svg.includes('<circle'));
 const late=energyPanelsData(samples,refs.slice(1));assert(late.direct.every(r=>r.relative===null));assert(late.comparison.every(r=>r.etaPercent===null));
});
test('normalization refuses cancellation while absolute total energy remains available',()=>{
 const zero={...base,energy:1e-16,potential:-1};assert.equal(energyDenominator(zero).value,null);
 const d=energyPanelsData([{timeMyr:0,conservation:zero}],[{...row(0,0,0),direct:zero}]);assert.equal(d.direct[0].relative,null);
 assert(energyPanelSVG(d,'direct').includes('Normalização relativa indisponível'));assert.equal(meta(energyPanelSVG(d,'direct',{directMode:'total'})).plot.plottedTimes.length,1);
});
test('comparison rejects mismatched epochs, K, mass, G, softening, N and external terms',()=>{
 assert(sameEnergySnapshot(refs[1]));for(const [key,value] of [['time',3],['kinetic',2],['mass',4],['G',2],['epsilonSquared',.02],['n',3],['externalPotential',1],['forceAlgorithm','other'],['trajectoryPrecision','Float32'],['velocityEpoch','half-step'],['effectiveDt',.5]]){const bad={...refs[1],fast:{...refs[1].fast,[key]:value}};assert(!sameEnergySnapshot(bad),key);assert.equal(energyPanelsData(samples,[bad]).comparison.length,0);}
});
test('independent energy axes retain a common time interval, direct guide and unchanged isolated historical bias markers',()=>{
 const d=data(),bh=meta(energyPanelSVG(d,'bh')),di=meta(energyPanelSVG(d,'direct')),bi=meta(energyPanelSVG(d,'bias'));
 assert.deepEqual(bh.plot.xDomain,di.plot.xDomain);assert.deepEqual(di.plot.xDomain,bi.plot.xDomain);assert(di.plot.yDomain.max-di.plot.yDomain.min<.001);assert(bh.plot.yDomain.max-di.plot.yDomain.max>.01);
 for(const kind of ['direct','bias']){const svg=energyPanelSVG(d,kind);assert.equal(svg.includes('<path data-series="direct-guide"'),kind==='direct');assert(svg.includes('data-reference="zero"'));assert.equal((svg.match(/<circle /g)||[]).length,3);}
 assert(energyPanelSVG(d,'bh').includes('<path data-series="bh"'));
});
test('small signed values and flat scales remain readable without pretending numerical certainty',()=>{
 for(const v of [-.00013656,.0000024,-.0000008])assert.notEqual(numericFormat(v,true),'0');assert(numericFormat(2.4e-6,true).startsWith('+'));assert(numericFormat(-8e-7).startsWith('-'));
 assert(zoomDomain([0,0]).minimal);assert(zoomDomain([0,0]).max>0);const flat=energyPanelsData([samples[0]],[refs[0]]);assert(energyPanelSVG(flat,'direct').includes('não é incerteza'));
 const svg=energyPanelSVG(data(),'direct',{directMode:'total'}),m=meta(svg);assert.equal(m.plot.axisOffset,-2);assert(svg.includes('Zero absoluto fora do zoom'));assert.deepEqual(m.plot.plottedTimes,[0,2,5]);
});
test('same-state bias modes and CSV retain exact measured values and realization',()=>{
 const d=data();for(const [mode,key] of [['absolute','B'],['instant','epsilonPercent'],['change','deltaB'],['common','etaPercent']]){const m=meta(energyPanelSVG(d,'bias',{biasMode:mode}));assert.equal(m.plot.mode,mode);assert.equal(m.comparison[1][key],d.comparison[1][key]);}
 const csv=energyPanelsCSV(d);assert(csv.includes('test-only'));assert(csv.includes(String(refs[1].direct.energy)));assert.equal(csv.split('\n').length,10);assert.equal((energyChartsView().match(/data-save-chart=/g)||[]).length,2);
});
test('existing 80000-particle observations keep all six exact reference epochs and source values',async()=>{
 const r=JSON.parse(await readFile(new URL('../reports/energy-charts/recorded-80000.json',import.meta.url),'utf8')),before=JSON.stringify(r),d=energyPanelsData(r.samples,r.references,r.context);
 assert.equal(d.direct.length,6);assert.equal(d.comparison.length,6);assert.deepEqual(d.rejectedComparisonTimes,[]);assert.equal(d.direct.at(-1).relative.percent,-0.00013374506901292645);assert.equal(d.direct.at(-1).E,-1.860141593462449);
 assert.equal(meta(energyPanelSVG(d,'direct')).plot.plottedTimes[1],200.09999999999292);assert.equal(JSON.stringify(r),before);
});

test('energy timeline preserves every measured epoch beyond structural history retention and resets',()=>{
 const timeline=new EnergyTimeline();for(let t=0;t<1200;t++)timeline.add({timeMyr:t,conservation:{...base,time:t},positions:new Float64Array(12)});
 assert.equal(timeline.samples.length,1200);assert.equal(timeline.samples[0].timeMyr,0);assert(!('positions' in timeline.samples[0]));assert.throws(()=>timeline.add({timeMyr:2,conservation:base}));timeline.reset();assert.equal(timeline.samples.length,0);
});

test('exact zero total energy still has a finite display domain without relative normalization',()=>{
 const z=zoomDomain([0],{includeZero:false,absoluteEnergy:true});assert(z.max>z.min);assert(Number.isFinite(z.max-z.min));
 const zero={...base,energy:0,potential:-1},d=energyPanelsData([{timeMyr:0,conservation:zero}],[{...row(0,0,0),direct:zero}]);const svg=energyPanelSVG(d,'direct',{directMode:'total'});assert(!svg.includes('NaN'));assert.equal(d.direct[0].relative,null);assert(svg.includes('não é incerteza'));
});
