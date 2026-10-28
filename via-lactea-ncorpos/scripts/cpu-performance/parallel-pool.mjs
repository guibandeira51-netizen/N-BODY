import {Octree} from '../../reports/cpu-performance-2026-10-22/range-kernel.mjs';
import {G as DEFAULT_G} from '../../src/physics/constants.js';
import {validateState} from '../../src/physics/forces.js';
import {physicalEpoch} from '../../src/physics/physical-time.js';
const node=typeof process!=='undefined'&&process.versions?.node?await import('node:worker_threads'):null;
const WorkerClass=node?.Worker??globalThis.Worker;
export function sharedState(s){const state={n:s.n,time:s.time??0,meta:structuredClone(s.meta)};for(const key of ['positions','velocities','masses','components','accelerations']){const source=s[key],dest=new source.constructor(new SharedArrayBuffer(source.byteLength));dest.set(source);state[key]=dest;}return state;}
export class ParallelBH{
 constructor(count){this.count=count;this.clocks=new WeakMap();this.workers=Array.from({length:count},()=>new WorkerClass(new URL('./range-worker.mjs',import.meta.url),{type:'module'}));this.tree=null;this.shared={};this.control=new Int32Array(new SharedArrayBuffer(4));}
 call(worker,message,transfer=[]){return new Promise((resolve,reject)=>{
  if(node){const complete=data=>{worker.off('message',complete);worker.off('error',fail);data.type==='error'?reject(Error(data.message)):resolve(data);},fail=e=>{worker.off('message',complete);worker.off('error',fail);reject(e);};worker.on('message',complete);worker.once('error',fail);}
  else{worker.onmessage=({data})=>data.type==='error'?reject(Error(data.message)):resolve(data);worker.onerror=e=>reject(Error(e.message));}
  worker.postMessage(message,transfer);
 });}
 async ready(){await Promise.all(this.workers.map(w=>this.call(w,{type:'ping'})));}
 async force(state,options){
  validateState(state);options={epsilon:.1,theta:.5,...options,G:options.G??DEFAULT_G};
  if(!(options.G>0)||!(options.epsilon>=0)||!(options.theta>=0))throw Error('Parâmetros de força inválidos.');
  let start=performance.now();this.tree??=new Octree(state.n);this.tree.build(state);const buildMs=performance.now()-start;
  start=performance.now();const tree={};
  for(const key of ['cx','cy','cz','half','mass','mx','my','mz','start','count','children','internal','order','rank']){
   const source=this.tree[key],length=key==='order'||key==='rank'?state.n:key==='children'?8*this.tree.nodeCount:this.tree.nodeCount;
   if(!this.shared[key]||this.shared[key].length<length)this.shared[key]=new source.constructor(new SharedArrayBuffer(source.BYTES_PER_ELEMENT*length));
   this.shared[key].set(source.subarray(0,length));tree[key]=this.shared[key];
  }
  const publicationMs=performance.now()-start;Atomics.store(this.control,0,0);state.accelerations.fill(0);
  start=performance.now();const workers=await Promise.all(this.workers.map(w=>this.call(w,{state,tree,options,control:this.control,chunkSize:256})));const dispatchAndTraverseMs=performance.now()-start;
  if(workers.reduce((sum,r)=>sum+r.bodies,0)!==state.n)throw Error('Partição incompleta.');
  return {buildMs,publicationMs,dispatchAndTraverseMs,totalForceMs:buildMs+publicationMs+dispatchAndTraverseMs,sharedTreeBytes:Object.values(this.shared).reduce((s,a)=>s+a.byteLength,0),workers};
 }
 async step(s,options){const start=performance.now(),dt=options.dt,half=.5*dt,p=s.positions,v=s.velocities,a=s.accelerations;const clock=this.clocks.get(s)??{initialTime:s.time??0,steps:0};this.clocks.set(s,clock);for(let k=0;k<p.length;k++){v[k]+=half*a[k];p[k]+=dt*v[k];}const force=await this.force(s,options);for(let k=0;k<p.length;k++)v[k]+=half*a[k];s.time=physicalEpoch(clock.initialTime,++clock.steps,dt);return {...force,stepMs:performance.now()-start};}
 async close(){await Promise.all(this.workers.map(w=>w.terminate()));}
}
