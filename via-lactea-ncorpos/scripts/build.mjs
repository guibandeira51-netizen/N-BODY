import {cp,mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
// Fixed build output contained in this project. No user files are removed.
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const item of ['index.html','style.css','src','PARAMETROS_E_FONTES.md'])await cp(resolve(root,item),resolve(dist,item),{recursive:true});
console.log('Build estático concluído: dist/index.html. A gravitação roda no navegador.');
