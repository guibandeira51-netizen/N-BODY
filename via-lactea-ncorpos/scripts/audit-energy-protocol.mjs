import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {energyPanelsCSV} from '../src/energy-chart-data.js';
const root=resolve(import.meta.dirname,'..'),folder=resolve(root,'reports/halo-ui');
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const measurements=[];
for(const name of ['energy-protocol-recovered-user']){
 const svg=await readFile(resolve(folder,name+'.svg'),'utf8'),data=JSON.parse(decode(svg.match(/<metadata id="energy-direct-data">([\s\S]*?)<\/metadata>/)[1]));
 const initial=data.direct.find(r=>r.timeMyr===0);assert(initial);assert(data.direct.length>=2);
 assert.equal((svg.match(/data-series="direct"/g)??[]).length,data.direct.length);
 assert.deepEqual(data.plot.plottedTimes,data.direct.map(r=>r.timeMyr));
 for(const row of data.direct){assert.equal(row.relative.denominator,Math.abs(initial.E));assert.equal(row.relative.percent,100*((row.E-initial.E)/Math.abs(initial.E)));}
 const evidence={source:'SVG actually displayed in browser, same DOM serialized by Save chart',svg:name+'.svg',sha256:createHash('sha256').update(svg).digest('hex'),realizationId:data.realizationId,configuration:data.configuration,direct:data.direct,plot:data.plot,normalization:data.normalization};
 await writeFile(resolve(folder,name+'.json'),JSON.stringify(evidence,null,2));await writeFile(resolve(folder,name+'.csv'),energyPanelsCSV(data));measurements.push({name,points:data.direct.map(r=>({t:r.timeMyr,n:r.n,E:r.E,errorPercent:r.relative.percent,costMs:r.diagnosticCostMs,dt:r.effectiveDt}))});
}
const freshUI=await readFile(resolve(folder,'energy-protocol-fresh-page-ui.txt'),'utf8');
assert(freshUI.includes('Referência direta Float64: automática · última avaliação em 7.704 Myr'));
assert(freshUI.includes('CPU Worker · f64'));assert(freshUI.includes('156 estados medidos'));
measurements.push({name:'energy-protocol-fresh-page',source:'Rendered UI accessibility snapshot',purpose:'Reduced-N UI/protocol stress test only, not physical equilibrium or accuracy validation',n:1000,dtMyr:1,lastIntegratedTimeMyr:7724,lastAutomaticReferenceTimeMyr:7704,diagnosticStatesMeasured:156,fullReferenceTableRetained:false});
const historical=JSON.parse(await readFile(resolve(root,'reports/halo-5gyr/manifest.json'),'utf8')),physical=[];
for(const [path,expected] of Object.entries(historical.sources)){const actual=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');assert.equal(actual,expected);physical.push({path,sha256:actual});}
const diagnostics={};for(const path of ['src/compute/energy-reference-worker.js','src/compute/live-energy-reference.js','tests/energy-reference-progress.test.mjs'])diagnostics[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
await writeFile(resolve(folder,'energy-protocol-integrity.json'),JSON.stringify({createdUTC:new Date().toISOString(),historicalPhysicsUnchanged:true,physical,diagnostics,measurements},null,2));console.log(JSON.stringify(measurements,null,2));
