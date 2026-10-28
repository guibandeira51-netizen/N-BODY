import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
export async function writeFalcon(path,s){
 const b=Buffer.alloc(16+57*s.n);b.write('TCCF6401');b.writeBigUInt64LE(BigInt(s.n),8);let o=16;
 for(const key of ['positions','velocities','masses'])for(const x of s[key]){b.writeDoubleLE(x,o);o+=8;}
 for(const x of s.components)b[o++]=x;await writeFile(path,b);
}
export async function readFalcon(path){
 const b=await readFile(path);if(b.toString('ascii',0,8)!=='TCCF6401')throw Error('Invalid falcON state');const n=Number(b.readBigUInt64LE(8));
 if(![16+57*n,16+89*n].includes(b.length))throw Error('Truncated falcON state');const s={n,time:0};let o=16;
 for(const [key,len]of [['positions',3*n],['velocities',3*n],['masses',n]]){s[key]=new Float64Array(len);for(let j=0;j<len;j++,o+=8)s[key][j]=b.readDoubleLE(o);}
 s.components=Uint8Array.from(b.subarray(o,o+n));o+=n;s.accelerations=new Float64Array(3*n);
 if(o<b.length)for(const [key,len]of [['accelerations',3*n],['potentials',n]]){s[key]=new Float64Array(len);for(let j=0;j<len;j++,o+=8)s[key][j]=b.readDoubleLE(o);}
 return s;
}
export function runFalcon(input,output,{G,epsilon,theta,steps=0,dt=.1}){return new Promise((resolve,reject)=>{
 const p=spawn('tools/pyfalcon/falcon-reference.exe',[input,output,G,epsilon,theta,steps,dt].map(String),{windowsHide:true});let stdout='',stderr='';p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.on('error',reject);p.on('close',code=>{if(code)reject(Error(`falcON ${code}: ${stderr}`));else try{resolve({...JSON.parse(stdout.trim()),stderr});}catch(e){reject(Error(stdout+'\n'+stderr));}});
 });}
