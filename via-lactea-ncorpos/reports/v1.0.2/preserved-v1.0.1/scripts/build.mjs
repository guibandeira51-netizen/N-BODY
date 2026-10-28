import {createHash} from 'node:crypto';
import {cp,mkdir,rm,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {resolve,sep,dirname,extname,basename} from 'node:path';
import {prepareReviewAssets} from './review-assets.mjs';
import {prepareInvestigationAssets} from './investigation-assets.mjs';
import {prepareEquilibriumAssets} from './equilibrium-assets.mjs';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
async function sourceFiles(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())files.push(...await sourceFiles(p));else files.push(p);}return files.sort();}
const hashes={};for(const p of [...await sourceFiles(resolve(root,'src')),resolve(root,'index.html'),resolve(root,'equilibrio.html'),resolve(root,'style.css')])hashes[p.slice(root.length+1).replaceAll('\\','/')]=createHash('sha256').update(await readFile(p)).digest('hex');
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
await mkdir(resolve(root,'downloads'),{recursive:true});
await writeFile(resolve(root,'downloads/code-identity.json'),JSON.stringify({version:pkg.version,builtUTC:new Date().toISOString(),sha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),files:hashes},null,2));
await prepareInvestigationAssets(root);
await prepareEquilibriumAssets(root);
await prepareReviewAssets(root);
// Fixed build output contained in this project. No user files are removed.
if(!dist.startsWith(root+sep)||basename(dist)!=='dist')throw Error('Destino de build fora da pasta esperada.');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const item of ['index.html','equilibrio.html','style.css','src','assets','downloads','tests','scripts','package.json','vercel.json','INICIAR_WINDOWS.cmd',...(await readdir(root)).filter(n=>n.endsWith('.md'))])await cp(resolve(root,item),resolve(dist,item),{recursive:true});
// Large raw scientific records stay downloadable in compressed archives. Copy
// every manifest-referenced loose report plus the actual snapshots used by UI/tests.
const review=JSON.parse(await readFile(resolve(root,'downloads/review-assets.json'),'utf8'));
const loose=new Set(review.files.filter(f=>f.url.startsWith('reports/')).map(f=>f.url));
for(const dataset of ['agama','agama-calibrated']){
 const folder=resolve(root,'reports/v1.0.0',dataset),manifest=resolve(folder,'snapshots.json');
 try{const records=JSON.parse(await readFile(manifest,'utf8'));loose.add('reports/v1.0.0/'+dataset+'/snapshots.json');for(const row of records){if(basename(row.file)!==row.file)throw Error('Snapshot fora da pasta do modelo.');loose.add('reports/v1.0.0/'+dataset+'/'+row.file);}for(const file of ['halo-fixed-grid.json','halo-grid-validation-points.json','c20-agama-n10000-nb1500-nd4500-nh4000-s2026-h2026-gaussian.json']){try{await stat(resolve(folder,file));loose.add('reports/v1.0.0/'+dataset+'/'+file);}catch{}}}catch(e){if(e.code!=='ENOENT')throw e;}
}
for(const file of await readdir(resolve(root,'reports/v1.0.0')))if(['.png','.pdf'].includes(extname(file)))loose.add('reports/v1.0.0/'+file);
try{for(const file of await sourceFiles(resolve(root,'reports/v1.0.1'))){const name=file.slice(root.length+1).replaceAll('\\','/');if(!name.includes('/executed-source/')&&!name.includes('/attempts/')&&!name.includes('/continuum/')&&!name.includes('/runs/')&&!name.includes('/gpu/')&&!name.includes('/snapshots/')&&['.md','.csv','.json','.png','.svg','.tap'].includes(extname(file)))loose.add(name);}}catch(e){if(e.code!=='ENOENT')throw e;}
for(const name of loose){await mkdir(dirname(resolve(dist,name)),{recursive:true});await cp(resolve(root,name),resolve(dist,name));}
console.log('Build estático concluído: dist/index.html. A gravitação roda no navegador.');
