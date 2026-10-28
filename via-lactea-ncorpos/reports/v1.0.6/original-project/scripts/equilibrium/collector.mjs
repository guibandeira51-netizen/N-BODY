/** Research-only loopback artifact sink. Not part of the static production app.
 * Accepts complete runs from the local test origin into a fixed, whitelisted folder.
 */
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),folder=resolve(root,'reports/v1.0.0/runs'),repeat=resolve(root,'reports/v1.0.0/run-repetitions'),allowed=new Map();
for(const name of ['protocol.json','protocol-calibrated.json'])for(const r of JSON.parse(await readFile(resolve(import.meta.dirname,name),'utf8')).runs)allowed.set(r.id,r);
await mkdir(folder,{recursive:true});const origins=new Set(['http://localhost:4180','http://127.0.0.1:4180']),hash=b=>createHash('sha256').update(b).digest('hex');
createServer(async(req,res)=>{
 const origin=req.headers.origin;if(!origins.has(origin)||!['localhost:4181','127.0.0.1:4181'].includes(req.headers.host)){res.writeHead(403);res.end();return;}
 const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
 if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
 try{
  const match=/^\/runs\/([a-zA-Z0-9-]+)$/.exec(req.url??'');if(req.method!=='POST'||!match||!allowed.has(match[1])||!req.headers['content-type']?.startsWith('application/json'))throw Error('Requisição não admitida.');
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>256*1024**2)throw Error('Registro excede 256 MiB.');chunks.push(chunk);}const bytes=Buffer.concat(chunks),r=JSON.parse(bytes),plan=allowed.get(match[1]);
  if(r.id!==match[1]||r.schema!=='equilibrium-run-v1'||r.status!=='completed'||r.config.duration!==plan.duration||r.samples?.at(-1)?.timeMyr!==plan.duration||r.samples?.[0]?.timeMyr!==0)throw Error('Somente ensaio completo do protocolo é aceito.');
  const file=resolve(folder,r.id+'.json');try{const old=await readFile(file);if(hash(old)!==hash(bytes)){await mkdir(repeat,{recursive:true});await writeFile(resolve(repeat,r.id+'-'+hash(old).slice(0,16)+'.json'),old);}}catch(e){if(e.code!=='ENOENT')throw e;}
  const temp=resolve(folder,'.'+r.id+'.pending');await writeFile(temp,bytes);await rename(temp,file);res.writeHead(200,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify({saved:true,id:r.id,sha256:hash(bytes),bytes:size}));console.log('Saved',r.id,size,hash(bytes));
 }catch(e){res.writeHead(400,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify({saved:false,error:e.message}));}
}).listen(4181,'127.0.0.1',()=>console.log('Research artifact collector: 127.0.0.1:4181; fixed protocol run folder only.'));
