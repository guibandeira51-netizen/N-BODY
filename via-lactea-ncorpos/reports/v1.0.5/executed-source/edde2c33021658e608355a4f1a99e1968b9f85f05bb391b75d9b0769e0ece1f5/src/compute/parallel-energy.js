import {pairRowPartitions,compensatedTotal} from '../physics/pair-energy-partition.js';
import {validationSnapshot} from '../physics/validation-101.js';
export class ParallelEnergy {
 constructor(count=6){this.workers=Array.from({length:count},()=>new Worker(new URL('./pair-energy-worker.js',import.meta.url),{type:'module'}));}
 async snapshot(s,options){
  const d=validationSnapshot(s,{...options,selfGravity:false}),parts=pairRowPartitions(s.n,this.workers.length),values=await Promise.all(this.workers.map((w,k)=>new Promise((resolve,reject)=>{w.onmessage=({data:r})=>r.error?reject(Error(r.error)):resolve(r.value);w.onerror=e=>reject(Error(e.message));w.postMessage({positions:s.positions,masses:s.masses,n:s.n,first:parts[k][0],last:parts[k][1],G:d.G,eps2:d.epsilon*d.epsilon});}))),selfPotential=compensatedTotal(values),potential=selfPotential+d.externalPotential;
  return {...d,selfGravity:true,selfPotential,potential,energy:d.kinetic+potential,energyScale:Math.abs(d.kinetic)+Math.abs(selfPotential)+Math.abs(d.externalPotential),energyMethod:'direct-pairs-float64-compensated-parallel',energyApproximate:false,parallelWorkers:this.workers.length};
 }
 dispose(){this.workers.forEach(w=>w.terminate());}
}
