import {compensatedTotal,pairRowPartitions} from '../physics/pair-energy-partition.js';
import {energyParameters,finishDirect} from '../physics/live-energy.js';

// Independent workers; cancellation terminates the outstanding arithmetic.
// The fixed snapshot is never sent to an integrator or modified.
export class LiveEnergyReference{
 constructor(count=Math.max(1,Math.min(4,(globalThis.navigator?.hardwareConcurrency??4)-1))){this.count=count;this.active=false;this.workers=[];this.rejects=[];this.rate=null;}
 cancel(){this.workers.forEach(w=>w.terminate());this.workers=[];this.rejects.splice(0).forEach(r=>r(Error('Referência cancelada; nenhum ponto incompleto registrado.')));this.active=false;}
 async evaluate(s,options={},progress=()=>{}){
  if(this.active)throw Error('Uma referência já está em andamento.');this.active=true;
  const start=performance.now(),p=energyParameters(options),parts=pairRowPartitions(s.n,this.count),pairs=s.n*(s.n-1)/2;
  const input={n:s.n,time:s.time??0,positions:s.positions,velocities:s.velocities,masses:s.masses,components:s.components};
  let done=0,base=null,maxWorkerMs=0;progress(0);
  try{
   const values=await Promise.all(parts.map(([first,last],k)=>new Promise((resolve,reject)=>{
    const w=new Worker(new URL('./energy-reference-worker.js',import.meta.url),{type:'module'});this.workers.push(w);this.rejects.push(reject);
    w.onerror=e=>reject(Error(e.message));w.onmessage=({data:d})=>{if(d.error){reject(Error(d.error));return;}if(d.base)base=d.base;maxWorkerMs=Math.max(maxWorkerMs,d.ms);done+=(last-first)*(2*s.n-first-last-1)/2;progress(done/pairs);w.terminate();resolve(d.value);};
    w.postMessage({state:input,options,first,last,base:k===0,G:p.G,epsilonSquared:p.epsilonSquared});
   })));
   const ms=performance.now()-start;this.rate=pairs/Math.max(maxWorkerMs,1);return {...finishDirect(base,compensatedTotal(values),ms),maximumWorkerComputeMs:maxWorkerMs,parallelWorkers:this.count,pairCount:pairs};
  }finally{this.workers.forEach(w=>w.terminate());this.workers=[];this.rejects=[];this.active=false;}
 }
 estimate(n){return this.rate?n*(n-1)/2/this.rate:null;}
}
