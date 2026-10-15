import {createHash} from 'node:crypto';
import {cp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {prepareReviewAssets} from './review-assets.mjs';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
async function sourceFiles(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())files.push(...await sourceFiles(p));else files.push(p);}return files.sort();}
const hashes={};for(const p of [...await sourceFiles(resolve(root,'src')),resolve(root,'index.html'),resolve(root,'style.css')])hashes[p.slice(root.length+1).replaceAll('\\','/')]=createHash('sha256').update(await readFile(p)).digest('hex');
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
await mkdir(resolve(root,'downloads'),{recursive:true});
await writeFile(resolve(root,'downloads/code-identity.json'),JSON.stringify({version:pkg.version,builtUTC:new Date().toISOString(),sha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),files:hashes},null,2));
await prepareReviewAssets(root);
// Fixed build output contained in this project. No user files are removed.
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const item of ['index.html','style.css','src','assets','downloads','README.md','reports','PARAMETROS_E_FONTES.md','VALIDACAO.md','VALIDACAO_ATUAL.md','VALIDACAO_08.md','AUDITORIA_MOTOR.md','ESTABILIDADE_GALACTICA.md','AUDITORIA_MASSAS.md','EQUILIBRIO_INICIAL.md','COMPARACAO_07_08.md','package.json','vercel.json','INICIAR_WINDOWS.cmd','tests/browser-gpu.html','tests/browser-laboratory.html','tests/browser-mass.html','tests/browser-equilibrium-08.html','tests/browser-equilibrium-refinement-08.html'])await cp(resolve(root,item),resolve(dist,item),{recursive:true});
console.log('Build estático concluído: dist/index.html. A gravitação roda no navegador.');
