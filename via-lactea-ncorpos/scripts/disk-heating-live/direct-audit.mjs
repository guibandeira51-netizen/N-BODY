import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {serialize} from 'node:v8';import {Worker} from 'node:worker_threads';import {resolve} from 'node:path';
const folder=resolve('reports/disk-heating-live'),raw=await readFile(resolve(folder,'observed-session.json')),a=JSON.parse(raw),lab=a.laboratory,e=lab.energyAudit;
const selected=e.references.filter(r=>r.snapshot?.positions),snapshots=[];
for(let index=0;index<selected.length;index++){
 const r=selected[index],s=r.snapshot,toArray=x=>ArrayBuffer.isView(x)||Array.isArray(x)?x:Object.values(x);
 const state={n:s.n,time:s.time,positions:Float64Array.from(toArray(s.positions)),velocities:Float64Array.from(toArray(s.velocities)),masses:Float64Array.from(toArray(s.masses)),components:Uint8Array.from(toArray(s.components))};
 if(state.positions.length!==3*state.n||state.velocities.length!==3*state.n||state.masses.length!==state.n)throw Error('Snapshot dimensions');
 const file=resolve(folder,`snapshot-${index}.bin`);await writeFile(file,serialize(state));snapshots.push({index,file,timeMyr:s.time,n:s.n,parameters:s.parameters});
}
await writeFile(resolve(folder,'snapshot-manifest.json'),JSON.stringify({sourceSHA256:createHash('sha256').update(raw).digest('hex'),realizationId:lab.realizationId,codeIdentity:e.codeIdentity,configuration:lab.configuration,initial:lab.initial,snapshots},null,2));
for(const item of snapshots){
 const source=selected[item.index].snapshot,ids=Array.from({length:source.n},(_,i)=>i).filter(i=>Number(source.components[i])===1),jobs=4,results=[],started=performance.now();
 console.log(`Starting direct disk audit t=${item.timeMyr} Myr, ${ids.length} targets x ${item.n-1} sources, 4 CPU workers`);
 await Promise.all(Array.from({length:jobs},(_,j)=>new Promise((res,rej)=>{const part=ids.slice(Math.floor(j*ids.length/jobs),Math.floor((j+1)*ids.length/jobs)),worker=new Worker(new URL('./field-worker.mjs',import.meta.url),{workerData:{file:item.file,ids:part,parameters:{G:item.parameters.G,epsilonSquared:item.parameters.epsilonSquared,unsoftenedControl:item.index===0}}});worker.on('error',rej);worker.on('message',message=>{if(message.result){results.push(...message.result);worker.terminate();res();}});})));results.sort((a,b)=>a.id-b.id);
 const report={timeMyr:item.timeMyr,method:'direct per-target Plummer potential, compensated Float64 sum, self excluded',G:item.parameters.G,epsilonSquared:item.parameters.epsilonSquared,targets:ids.length,interactions:ids.length*(item.n-1),elapsedMs:performance.now()-started,unsoftenedControl:item.index===0,rows:results};await writeFile(resolve(folder,`direct-disk-${item.index}.json`),JSON.stringify(report));console.log(`Completed t=${item.timeMyr}: ${report.elapsedMs.toFixed(1)} ms`);
}
