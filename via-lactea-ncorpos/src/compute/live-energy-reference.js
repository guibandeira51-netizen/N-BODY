import {compensatedTotal,pairRowPartitions} from '../physics/pair-energy-partition.js';
import {energyParameters,finishDirect} from '../physics/live-energy.js';

// Independent workers; cancellation terminates the outstanding arithmetic.
// The fixed snapshot is never sent to an integrator or modified.
export class LiveEnergyReference{
 constructor(count=Math.max(1,Math.min(4,(globalThis.navigator?.hardwareConcurrency??4)-1))){this.count=count;this.active=false;this.workers=[];this.rejects=[];this.rate=null;this.session=0;}
 cancel(){this.session++;this.workers.forEach(w=>w.terminate());this.workers=[];this.rejects.splice(0).forEach(r=>r(Error('Referência cancelada; nenhum ponto incompleto registrado.')));this.active=false;}
 async evaluate(s,options={},progress=()=>{}){
  if(this.active)throw Error('Uma referência já está em andamento.');this.active=true;
  const session=++this.session,workers=[],rejects=[];this.workers=workers;this.rejects=rejects;
  const start=performance.now(),pairs=s.n*(s.n-1)/2;
  const input={n:s.n,time:s.time??0,positions:s.positions,velocities:s.velocities,masses:s.masses,components:s.components};
  const completedByWorker=new Array(this.count).fill(0);
  let base=null,maxWorkerMs=0;progress(0);
  try{
   const p=energyParameters(options),parts=pairRowPartitions(s.n,this.count);
   const values=await Promise.all(parts.map(([first,last],k)=>new Promise((resolve,reject)=>{
    const w=new Worker(new URL('./energy-reference-worker.js',import.meta.url),{type:'module'});workers.push(w);rejects.push(reject);
    w.onerror=e=>reject(Error(e.message));w.onmessage=({data:d})=>{
     if(session!==this.session)return;
     if(d.error){reject(Error(d.error));return;}
     const partitionPairs=(last-first)*(2*s.n-first-last-1)/2;
     if(d.type==='progress'){
      completedByWorker[k]=Math.max(completedByWorker[k],Math.min(partitionPairs,d.done));
      progress(pairs?completedByWorker.reduce((a,b)=>a+b,0)/pairs:1);return;
     }
     if((d.type&&d.type!=='result')||!Number.isFinite(d.value)||!Number.isFinite(d.ms)){
      reject(Error('Resposta inválida do Worker de energia; nenhum ponto incompleto foi registrado.'));return;
     }
     if(d.base)base=d.base;maxWorkerMs=Math.max(maxWorkerMs,d.ms);completedByWorker[k]=partitionPairs;
     progress(pairs?completedByWorker.reduce((a,b)=>a+b,0)/pairs:1);w.terminate();resolve(d.value);
    };
    w.postMessage({state:input,options,first,last,base:k===0,G:p.G,epsilonSquared:p.epsilonSquared,progressProtocol:1});
   })));
   if(!base||!Number.isFinite(base.kinetic))throw Error('Referência direta incompleta: energia cinética do snapshot ausente. Nenhum ponto foi registrado.');
   const ms=performance.now()-start;this.rate=pairs/Math.max(maxWorkerMs,1);return {...finishDirect(base,compensatedTotal(values),ms),maximumWorkerComputeMs:maxWorkerMs,parallelWorkers:this.count,pairCount:pairs};
  }finally{workers.forEach(w=>w.terminate());if(session===this.session){this.workers=[];this.rejects=[];this.active=false;}}
 }
 estimate(n){return this.rate?n*(n-1)/2/this.rate:null;}
}
