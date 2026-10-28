import {cleanSiteDocumentLinks} from './interface-106/clean-document-links.mjs';
import {createHash} from 'node:crypto';
import {cp,mkdir,rm,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {resolve,sep,dirname,extname,basename} from 'node:path';
import {prepareReviewAssets} from './review-assets.mjs';
import {prepareInvestigationAssets} from './investigation-assets.mjs';
import {prepareEquilibriumAssets} from './equilibrium-assets.mjs';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
async function sourceFiles(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())files.push(...await sourceFiles(p));else files.push(p);}return files.sort();}
await cleanSiteDocumentLinks(root);
const hashes={};for(const p of [...await sourceFiles(resolve(root,'src')),resolve(root,'index.html'),resolve(root,'equilibrio.html'),resolve(root,'correcao102.html'),resolve(root,'granularidade103.html'),resolve(root,'refinamento104.html'),resolve(root,'equilibrio105.html'),resolve(root,'style.css')])hashes[p.slice(root.length+1).replaceAll('\\','/')]=createHash('sha256').update(await readFile(p)).digest('hex');
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
await mkdir(resolve(root,'downloads'),{recursive:true});
// 1.0.6 keeps every historical download and manifest byte-identical.
if(!pkg.version.startsWith('1.0.6')){
await writeFile(resolve(root,'downloads/code-identity.json'),JSON.stringify({version:pkg.version,builtUTC:new Date().toISOString(),sha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),files:hashes},null,2));
await prepareInvestigationAssets(root);
await prepareEquilibriumAssets(root);
await prepareReviewAssets(root);
}
// Fixed build output contained in this project. No user files are removed.
if(!dist.startsWith(root+sep)||basename(dist)!=='dist')throw Error('Destino de build fora da pasta esperada.');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const item of ['index.html','experimento-ncorpos.html','materia-escura.html','validacao106.html','arquivo-cientifico.html','simulador-tecnico.html','darkmatter106.css','interface106.css','ncorpos-navigation.css','live-diagnostics.css','equilibrio.html','correcao102.html','granularidade103.html','refinamento104.html','equilibrio105.html','style.css','src','assets','downloads','tests','scripts','package.json','vercel.json','INICIAR_WINDOWS.cmd',...(await readdir(root)).filter(n=>n.endsWith('.md'))])await cp(resolve(root,item),resolve(dist,item),{recursive:true});
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
// 1.0.2 stage-1 public evidence and opt-in snapshots. Raw runs/source backups
// stay in the new archive; historical packages are never regenerated.
for(const file of await sourceFiles(resolve(root,'reports/v1.0.2'))){const name=file.slice(root.length+1).replaceAll('\\','/'),sub=name.slice('reports/v1.0.2/'.length);if(!sub.includes('/')&&['.md','.json','.csv','.tap','.txt'].includes(extname(file))||/^(figures|field-validation|df-validation)\//.test(sub)&&['.json','.csv','.png','.svg'].includes(extname(file))||sub.startsWith('corrected/')&&extname(file)==='.json')loose.add(name);}
for(const file of await sourceFiles(resolve(root,'reports/v1.0.3'))){const name=file.slice(root.length+1).replaceAll('\\','/'),sub=name.slice('reports/v1.0.3/'.length);if(!sub.includes('/')&&['.md','.json','.csv','.tap','.txt'].includes(extname(file))||sub.startsWith('figures/')&&['.png','.svg','.csv','.json'].includes(extname(file))||sub.startsWith('initial/')&&extname(file)==='.json')loose.add(name);}
for(const file of await sourceFiles(resolve(root,'reports/v1.0.4'))){const name=file.slice(root.length+1).replaceAll('\\','/'),sub=name.slice('reports/v1.0.4/'.length);if(!sub.includes('/')&&['.md','.json','.csv','.tap','.txt'].includes(extname(file))||sub.startsWith('figures/')&&['.png','.svg','.csv','.json'].includes(extname(file))||sub.startsWith('initial/')&&extname(file)==='.json')loose.add(name);}
for(const file of await sourceFiles(resolve(root,'reports/v1.0.5'))){const name=file.slice(root.length+1).replaceAll('\\','/'),sub=name.slice('reports/v1.0.5/'.length);if(!sub.includes('/')&&['.md','.json','.csv','.tap','.txt'].includes(extname(file))||/^(figures|playback|initial)\//.test(sub)&&['.png','.svg','.csv','.json','.bin'].includes(extname(file)))loose.add(name);}
for(const file of await sourceFiles(resolve(root,'reports/v1.0.6'))){const name=file.slice(root.length+1).replaceAll('\\','/'),sub=name.slice('reports/v1.0.6/'.length);if(!sub.includes('/')&&['.md','.json','.csv','.tap','.txt'].includes(extname(file))||/^(figures|observations|potentials)\//.test(sub)&&['.png','.svg','.csv','.json','.ini'].includes(extname(file)))loose.add(name);}
const inventory=JSON.parse(await readFile(resolve(root,'reports/v1.0.6/graph-inventory.json'),'utf8'));for(const row of inventory.figures){if(!row.source.startsWith('reports/'))continue;loose.add(row.source);for(const suffix of['.png','.svg','.pdf','.csv']){const path=row.source.replace(/\.[^.]+$/,suffix);try{await stat(resolve(root,path));loose.add(path);}catch(e){if(e.code!=='ENOENT')throw e;}}}
for(const name of loose){await mkdir(dirname(resolve(dist,name)),{recursive:true});await cp(resolve(root,name),resolve(dist,name));}
await cp(resolve(root,'reports/interface-106'),resolve(dist,'reports/interface-106'),{recursive:true});
await cp(resolve(root,'reports/energy-audit'),resolve(dist,'reports/energy-audit'),{recursive:true});
await cp(resolve(root,'reports/energy-reference-restoration'),resolve(dist,'reports/energy-reference-restoration'),{recursive:true});
await cp(resolve(root,'reports/automatic-energy'),resolve(dist,'reports/automatic-energy'),{recursive:true});
await cp(resolve(root,'reports/energy-charts'),resolve(dist,'reports/energy-charts'),{recursive:true});
await cp(resolve(root,'reports/interface-text-links'),resolve(dist,'reports/interface-text-links'),{recursive:true});
await cp(resolve(root,'reports/energy-direct-guide'),resolve(dist,'reports/energy-direct-guide'),{recursive:true});
await cp(resolve(root,'reports/energy-audit-cadence'),resolve(dist,'reports/energy-audit-cadence'),{recursive:true});
// Current audit is additive. Before/ source copies remain preserved locally;
// published reports only contain measured tables, figures and audit identities.
for(const file of await sourceFiles(resolve(root,'reports/disk-audit-current'))){const name=file.slice(root.length+1).replaceAll('\\','/');if(!name.includes('/before/')&&['.json','.csv','.svg','.html'].includes(extname(file))){await mkdir(dirname(resolve(dist,name)),{recursive:true});await cp(file,resolve(dist,name));}}
console.log('Build estático concluído: dist/index.html. A gravitação roda no navegador.');


