/** Snapshot the supplied 1.0.1 before adding the softened-mean model. */
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'reports/v1.0.2');
async function walk(dir){const a=[];for(const e of await readdir(dir,{withFileTypes:true})){if(['__pycache__','node_modules'].includes(e.name))continue;const p=resolve(dir,e.name);if(e.isDirectory())a.push(...await walk(p));else a.push(p);}return a.sort();}
const digest=b=>createHash('sha256').update(b).digest('hex'),verify=process.argv.includes('--verify');
await mkdir(out,{recursive:true});const files={};
for(const folder of ['reports/v0.9.0','reports/v1.0.0','reports/v1.0.1'])for(const p of await walk(resolve(root,folder)))files[relative(root,p).replaceAll('\\','/')]=digest(await readFile(p));
for(const p of (await readdir(resolve(root,'downloads'))).filter(n=>/\.(zip|sha256)$/.test(n)))files['downloads/'+p]=digest(await readFile(resolve(root,'downloads',p)));
const path=resolve(out,'preservation.json');
if(verify){const old=JSON.parse(await readFile(path,'utf8'));const changed=Object.keys(old.files).filter(p=>files[p]!==old.files[p]);if(changed.length)throw Error('Historical changes: '+changed.join(','));await writeFile(resolve(out,'preservation-verification.json'),JSON.stringify({status:'passed',verifiedUTC:new Date().toISOString(),unchangedFiles:Object.keys(old.files).length,changed},null,2));console.log('Preserved historical files:',Object.keys(old.files).length);}
else {try{await readFile(path);throw Error('Baseline already exists; use --verify.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const source=[...await walk(resolve(root,'src')),...await walk(resolve(root,'scripts')),...await walk(resolve(root,'tests')),...(await readdir(root)).filter(n=>/\.(html|md|css|json|cmd)$/.test(n)).map(n=>resolve(root,n))];const code={};for(const p of source){const name=relative(root,p).replaceAll('\\','/');if(name.startsWith('scripts/equilibrium-102/'))continue;const b=await readFile(p);code[name]=digest(b);const dest=resolve(out,'preserved-v1.0.1',name);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,b);}await writeFile(path,JSON.stringify({createdUTC:new Date().toISOString(),files,code},null,2));console.log('Preservation baseline:',Object.keys(files).length,'historical files,',Object.keys(code).length,'source files');}
