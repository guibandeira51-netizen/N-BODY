import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {energyPanelsCSV} from '../src/energy-chart-data.js';

const root=resolve(import.meta.dirname,'..'),folder=resolve(root,'reports/halo-ui');
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const results=[];
for(const name of ['energy-recovered-user','energy-automatic-refined']){
 let svg;
 try{svg=await readFile(resolve(folder,name+'.svg'),'utf8');}catch(error){if(error.code==='ENOENT')continue;throw error;}
 const metadata=svg.match(/<metadata id="energy-direct-data">([\s\S]*?)<\/metadata>/);
 assert(metadata,'Missing actual exported chart metadata');
 const data=JSON.parse(decode(metadata[1])),initial=data.direct.find(r=>r.timeMyr===0);
 assert(initial&&data.direct.length>=2,'Need baseline and actual later reference');
 assert.deepEqual(data.plot.plottedTimes,data.direct.map(r=>r.timeMyr));
 assert.equal((svg.match(/data-series="direct"/g)??[]).length,data.direct.length);
 for(const row of data.direct){
  assert.equal(row.relative.denominator,Math.abs(initial.E));
  assert.equal(row.relative.percent,100*((row.E-initial.E)/Math.abs(initial.E)));
  assert.equal(row.evaluationPrecision,'Float64 compensated CPU evaluation');
 }
 await writeFile(resolve(folder,name+'.csv'),energyPanelsCSV(data));
 const evidence={source:'Actual browser Save chart SVG, not reconstructed particle data',svg:name+'.svg',sha256:createHash('sha256').update(svg).digest('hex'),realizationId:data.realizationId,configuration:data.configuration,direct:data.direct,summary:data.summary,plot:data.plot,directSampling:data.directSampling,normalization:data.normalization};
 await writeFile(resolve(folder,name+'.json'),JSON.stringify(evidence,null,2));results.push(evidence);
}
const manifest=JSON.parse(await readFile(resolve(root,'reports/halo-5gyr/manifest.json'),'utf8'));
const identities=[];
for(const [path,expected] of Object.entries(manifest.sources)){
 const actual=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');identities.push({path,expected,actual,unchanged:actual===expected});
}
assert(identities.every(r=>r.unchanged),'Historical physical source changed');
await writeFile(resolve(folder,'energy-physical-integrity.json'),JSON.stringify({historicalManifest:'reports/halo-5gyr/manifest.json',allUnchanged:true,files:identities},null,2));
const diagnosticFiles=['src/automatic-energy.js','src/compute/energy-snapshot-sampler.js','src/compute/energy-reference-worker.js','src/compute/live-energy-reference.js','src/physics/pair-energy-partition.js','src/live-diagnostics.js','src/energy-audit-cadence.js','experimento-ncorpos.html','scripts/build.mjs','scripts/audit-energy-reference-ui.mjs'];
const diagnosticHashes={};for(const path of diagnosticFiles)diagnosticHashes[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
await writeFile(resolve(folder,'energy-code-identity.json'),JSON.stringify({description:'Final diagnostic implementation, separate from unchanged physical-source identity',createdUTC:new Date().toISOString(),files:diagnosticHashes},null,2));
console.log(JSON.stringify(results.map(r=>({realization:r.realizationId,points:r.direct.map(p=>({t:p.timeMyr,n:p.n,E:p.E,percent:p.relative.percent,costMs:p.diagnosticCostMs,dt:p.effectiveDt})),guide:r.plot.guide})),null,2));
