import {readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {root,out,walk,hash,save,read} from './common.mjs';
const verify=process.argv.includes('--verify'),files={};
for(const folder of ['reports/v0.9.0','reports/v1.0.0'])for(const p of await walk(resolve(root,folder)))files[relative(root,p).replaceAll('\\','/')]=hash(await readFile(p));
for(const name of ['src/physics/constants.js','src/physics/integrator.js','src/physics/forces.js','scripts/equilibrium/model-c20.json','scripts/equilibrium/model-c20-calibrated.json'])files[name]=hash(await readFile(resolve(root,name)));
if(verify){const before=await read('reports/v1.0.1/historical-preservation.json'),changed=Object.keys(before.files).filter(p=>before.files[p]!==files[p]);if(changed.length)throw Error('Historical changes: '+changed.join(','));await save('historical-verification.json',{verifiedUTC:new Date().toISOString(),unchangedFiles:Object.keys(before.files).length,changed,addedHistoricalFiles:Object.keys(files).filter(p=>!before.files[p])});console.log('Historical files/physical constants/engines unchanged:',Object.keys(before.files).length);}
else {await save('historical-preservation.json',{createdUTC:new Date().toISOString(),files});console.log('Preservation baseline:',Object.keys(files).length);}
