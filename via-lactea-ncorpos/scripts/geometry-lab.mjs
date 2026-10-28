import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {runInvestigation} from '../src/geometry-lab/physics.js';
import {chartSVG,figureData,figureCSV} from '../src/geometry-lab/plots.js';
const root=resolve(import.meta.dirname,'..'),folder=resolve(root,'reports/geometry-lab-2026-10-22');await mkdir(folder,{recursive:true});
const files=['laboratorio-geometria.html','geometry-lab.css','experimento-ncorpos.html','ncorpos-navigation.css','src/laboratory-selector.js','src/geometry-lab/physics.js','src/geometry-lab/worker.js','src/geometry-lab/plots.js','src/geometry-lab/entry.js','src/physics/constants.js','src/physics/models.js','tests/geometry-lab.test.mjs','scripts/geometry-lab.mjs','INVESTIGACAO_GEOMETRIA_ESPACO_TEMPO.md'];
const hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await readFile(resolve(root,file))).digest('hex');
const codeIdentity={version:'geometry-lab-v1',builtUTC:new Date().toISOString(),sha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),files:hashes};
await writeFile(resolve(folder,'code-identity.json'),JSON.stringify(codeIdentity,null,2));
const result=runInvestigation();result.codeIdentity=codeIdentity;
await writeFile(resolve(folder,'reference.json'),JSON.stringify(result,null,2));
for(const kind of ['rotation','orbits','lensing']){await writeFile(resolve(folder,kind+'.svg'),chartSVG(figureData(result,kind)));await writeFile(resolve(folder,kind+'.csv'),figureCSV(result,kind));}
await writeFile(resolve(folder,'source.csv'),figureCSV(result,'source'));
const before=JSON.parse(await readFile(resolve(folder,'main-before.json'),'utf8'));const unchanged={};for(const [file,hash] of Object.entries(before.files)){
 unchanged[file]=createHash('sha256').update(await readFile(resolve(root,file))).digest('hex')===hash;if(!unchanged[file])throw Error('Main physics/controller changed: '+file);
}
await writeFile(resolve(folder,'main-preservation.json'),JSON.stringify({checkedUTC:new Date().toISOString(),unchanged},null,2));
console.log(JSON.stringify({folder,near8:result.rotation.find(r=>r.R_kpc===8),convergence:result.convergence,costMs:result.costMs,mainPhysicsAndControllerUnchanged:true},null,2));
