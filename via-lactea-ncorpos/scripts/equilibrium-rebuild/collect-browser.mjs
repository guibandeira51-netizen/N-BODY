// Explicit local scientific test collector: localhost only, fixed new output.
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
const origin='http://localhost:4180',folder='reports/equilibrium-rebuild';await mkdir(folder,{recursive:true});
createServer(async(req,res)=>{
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json','Cross-Origin-Resource-Policy':'cross-origin','Access-Control-Allow-Private-Network':'true'};
 if(req.headers.origin!==origin||req.url!=='/save'){res.writeHead(403,headers);res.end('{}');return;}
 if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
 if(req.method!=='POST'){res.writeHead(405,headers);res.end('{}');return;}
 try{let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>32*1024*1024)throw Error('Result exceeds local budget');chunks.push(b);}const data=JSON.parse(Buffer.concat(chunks).toString());if(data.schema!=='equilibrium-rebuild-gpu-v1'||data.type!=='result'||!Array.isArray(data.runs))throw Error('Invalid scientific result schema');const file='gpu-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';await writeFile(folder+'/'+file,JSON.stringify(data),{flag:'wx'});await writeFile(folder+'/latest-gpu.json',JSON.stringify({file:folder+'/'+file},null,2));res.writeHead(201,headers);res.end(JSON.stringify({file}));console.log('Scientific GPU evidence saved: '+file);}catch(e){res.writeHead(400,headers);res.end(JSON.stringify({error:e.message}));}
}).listen(4188,'127.0.0.1',()=>console.log('Test collector on 127.0.0.1:4188; PID '+process.pid+'; close with Ctrl+C after collecting evidence.'));
