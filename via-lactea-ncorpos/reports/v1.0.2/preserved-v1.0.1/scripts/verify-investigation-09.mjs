import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {FORCE_WGSL,INTEGRATE_WGSL} from '../src/compute/gpu.js';
const root=new URL('../',import.meta.url),r=new URL('reports/v0.9.0/',root),read=async p=>readFile(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(await read('reports/v0.9.0/baseline-identity.json')),preserved=[],changed=[];
for(const [path,hash] of Object.entries(baseline.identity.files)){const actual=sha(await read(path));(actual===hash?preserved:changed).push({path,baseline:hash,current:actual});}
for(const path of ['src/physics/constants.js','src/physics/models.js','src/physics/initial-legacy.js','src/physics/initial.js','src/physics/forces.js','src/physics/integrator.js','src/render/particle-style.js'])if(changed.some(c=>c.path===path))throw Error('Physical baseline unexpectedly changed: '+path);
const oldGPU=await readFile(new URL('reports/history/v0.8.0/source/src/compute/gpu.js',root),'utf8');
for(const [name,value] of Object.entries({FORCE_WGSL,INTEGRATE_WGSL})){
 const source=oldGPU.match(new RegExp('export const '+name+' = /\\* wgsl \\*/`([\\s\\S]*?)`;'))?.[1];if(source!==value)throw Error('Default WGSL changed: '+name);
}
const provenance=JSON.parse(await read('reports/v0.9.0/campaign-provenance.json')),archiveChecks=[];
for(const [path,hash] of Object.entries(provenance.sourceHashes)){const actual=sha(await read('reports/v0.9.0/executed-source-campaign/'+path.replaceAll('/','__')+'.txt'));if(actual!==hash)throw Error('Campaign archive mismatch: '+path);archiveChecks.push({path,sha256:actual});}
const fixture=JSON.parse(await read('reports/v0.9.0/fixed-halo-gpu-validation.json')),lab=JSON.parse(await read('reports/v0.9.0/laboratory-gpu-validation.json'));
if(lab.status!=='completed'||lab.runs.length!==3)throw Error('CPU/GPU validation incomplete');
const comparisons=lab.runs.map(run=>{const samples=run.samples;return {seed:run.config.seed,energy:run.energy,epochs:samples.map(s=>({timeMyr:s.timeMyr,positionFrameHeightDifference:s.gpu.diskFrame.instant.h50-s.cpu.diskFrame.instant.h50,normalSigmaDifference:s.gpu.diskFrame.instant.sigmaNormal-s.cpu.diskFrame.instant.sigmaNormal}))};});
const result={createdUTC:new Date().toISOString(),baselineVersion:baseline.version,preserved,changed,defaultWGSLIdentical:true,archiveChecks,fixture,comparisons};await writeFile(new URL('source-and-regression-validation.json',r),JSON.stringify(result,null,2));console.log(JSON.stringify({preserved:preserved.length,changed:changed.map(p=>p.path),defaultWGSLIdentical:true,archiveVerified:archiveChecks.length}));
