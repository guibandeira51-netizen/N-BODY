import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {energyPanelsData} from '../../src/energy-chart-data.js';
import {energyPanelSVG} from '../../src/energy-charts.js';
const folder='reports/energy-charts/';
const meta=svg=>JSON.parse(svg.match(/<metadata[^>]*>([\s\S]*?)<\/metadata>/)[1].replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'));
const record=JSON.parse(await readFile(folder+'recorded-80000.json','utf8')),expected=energyPanelsData(record.samples,record.references,record.context),exports=[];
for(const [file,kind,mode] of [['browser-bh.svg','bh','relative'],['browser-direct.svg','direct','relative'],['browser-bias-common.svg','bias','common'],['browser-direct-total.svg','direct','total']]){
 const svg=await readFile(folder+file,'utf8'),d=meta(svg),exp=meta(energyPanelSVG(expected,kind,{directMode:mode,biasMode:mode}));
 // Frozen pre-guide SVGs retain their original metadata; compare their original axes and measurements.
 const {guide:currentVisualGuide,...archivedPlot}=exp.plot;assert.deepEqual(d.plot,archivedPlot);assert.equal(d.realizationId,expected.realizationId);
 assert.deepEqual(d.direct.map(r=>[r.timeMyr,r.K,r.U,r.E,r.relative]),expected.direct.map(r=>[r.timeMyr,r.K,r.U,r.E,r.relative]));
 assert.deepEqual(d.comparison.map(r=>[r.timeMyr,r.B,r.epsilonPercent,r.deltaB,r.etaPercent]),expected.comparison.map(r=>[r.timeMyr,r.B,r.epsilonPercent,r.deltaB,r.etaPercent]));
 if(kind!=='bh')assert(!svg.includes('<path data-series'));
 const markers=(svg.match(/<circle /g)||[]).length;assert.equal(markers,d.plot.plottedTimes.length);
 exports.push({file,kind,mode,markers,xDomain:d.plot.xDomain,yDomain:d.plot.yDomain,axisOffset:d.plot.axisOffset,passed:true});
}
const live=JSON.parse(await readFile(folder+'live-cpu-512.json','utf8'));
assert.equal(live.configuration.seed,2026);assert(live.references.length>=3);assert(live.references.every(r=>r.origin==='automatic'));assert.equal(live.panels.comparison.length,live.references.length);
for(const r of live.references)assert.equal(r.direct.forceAlgorithm,'direct');
const reset=JSON.parse(await readFile(folder+'live-reset.json','utf8'));assert.notEqual(reset.realizationId,live.realizationId);assert.equal(reset.configuration.seed,2027);assert.deepEqual(reset.references.map(r=>r.timeMyr),[0]);assert.equal(reset.panels.direct[0].relative.percent,0);assert.notEqual(reset.references[0].direct.energy,live.references[0].direct.energy);
const reload=JSON.parse(await readFile(folder+'live-cpu-512-reload.json','utf8'));assert(reload.references.length>=2);assert.equal(reload.panels.comparison.length,reload.references.length);assert(reload.references.every(r=>r.origin==='automatic'));assert(reload.automatic.peakPending<=1);
const result={reload:{realizationId:reload.realizationId,codeIdentity:reload.codeIdentity.sha256,points:reload.references.map(r=>({timeMyr:r.timeMyr,E:r.direct.energy,errorPercent:reload.panels.direct.find(d=>d.timeMyr===r.timeMyr).relative.percent})),summary:reload.panels.summary,peakPending:reload.automatic.peakPending,lastError:reload.automatic.lastError},status:'passed',UTC:new Date().toISOString(),archivedSource:record.source,archivedSourceSHA256:record.sourceSHA256,exports,live:{realizationId:live.realizationId,n:live.configuration.n,seed:live.configuration.seed,codeIdentity:live.codeIdentity.sha256,points:live.references.map(r=>({timeMyr:r.timeMyr,E:r.direct.energy,errorPercent:live.panels.direct.find(d=>d.timeMyr===r.timeMyr).relative.percent})),automatic:live.automatic},reset:{realizationId:reset.realizationId,seed:reset.configuration.seed,points:reset.references.map(r=>({timeMyr:r.timeMyr,E:r.direct.energy})),isolated:true},responsive:{availableWidthPx:390,stacked:true,noPanelHorizontalOverflow:true,mechanism:'CSS container query verified in browser; narrow content surface, not device emulation'}};
await writeFile(folder+'browser-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,exports:exports.length,livePoints:result.live.points,reset:result.reset}));
