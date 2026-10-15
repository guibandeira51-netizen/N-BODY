import {readFile,writeFile,mkdir,readdir,cp,rm} from 'node:fs/promises';
import {resolve,relative,extname,sep,dirname} from 'node:path';
import {createHash} from 'node:crypto';
async function walk(path){const out=[];for(const e of await readdir(path,{withFileTypes:true})){if(e.name==='__pycache__')continue;const f=resolve(path,e.name);if(e.isDirectory())out.push(...await walk(f));else out.push(f);}return out;}
export async function prepareReviewAssets(root){const downloads=resolve(root,'downloads'),source=resolve(downloads,'source');if(!source.startsWith(resolve(root)+sep))throw Error('Pasta gerada fora do projeto.');await rm(source,{recursive:true,force:true});await mkdir(source,{recursive:true});
  const urls=[];for(const folder of ['src','reports'])for(const file of await walk(resolve(root,folder))){if(folder==='reports'&&!['.json','.csv','.tap','.txt','.md','.svg','.png','.pdf'].includes(extname(file)))continue;urls.push(relative(root,file).replaceAll('\\','/'));}
  for(const folder of ['scripts','tests'])for(const file of await walk(resolve(root,folder))){if(!['.js','.mjs','.html','.txt','.py'].includes(extname(file)))continue;const rel=relative(root,file)+(file.endsWith('.test.mjs')?'.txt':'');await mkdir(dirname(resolve(source,rel)),{recursive:true});await cp(file,resolve(source,rel));urls.push('downloads/source/'+rel.replaceAll('\\','/'));}
  for(const name of await readdir(root))if(name.endsWith('.md'))urls.push(name);urls.push('downloads/code-identity.json','index.html','style.css','package.json','vercel.json','INICIAR_WINDOWS.cmd','assets/uems.png');
  const files=[];for(const url of urls){const data=await readFile(resolve(root,url));let name=url.startsWith('downloads/source/')?url.slice(17):url;if(name.endsWith('.test.mjs.txt'))name=name.slice(0,-4);files.push({url,name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
  await writeFile(resolve(downloads,'review-assets.json'),JSON.stringify({schemaVersion:2,files},null,2));
}
