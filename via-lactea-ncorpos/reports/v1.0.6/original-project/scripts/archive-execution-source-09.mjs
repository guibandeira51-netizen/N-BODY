import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [harness,name]=process.argv.slice(2);if(!harness||!name||!/^[a-z0-9-]+$/.test(name))throw Error('Supply harness path and safe archive name');
const root=new URL('../',import.meta.url),prefix=JSON.parse(await readFile(new URL('reports/v0.9.0/halo-campaign-prefix.json',root),'utf8')),files=Object.keys(prefix.sourceHashes).filter(p=>!p.startsWith('tests/'));files.push(harness);
const target=new URL(`reports/v0.9.0/executed-source-${name}/`,root);await mkdir(target,{recursive:true});const sourceHashes={};for(const path of files){const data=await readFile(new URL(path,root));sourceHashes[path]=createHash('sha256').update(data).digest('hex');await writeFile(new URL(path.replaceAll('/','__')+'.txt',target),data);}
await writeFile(new URL(`reports/v0.9.0/${name}-provenance.json`,root),JSON.stringify({archivedUTC:new Date().toISOString(),harness,sourceHashes},null,2));console.log(`${files.length} source files archived.`);
