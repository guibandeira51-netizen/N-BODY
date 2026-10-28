import {Octree} from './bh-parallel-kernel.js';
import {Leapfrog} from '../physics/integrator.js';
import {validateState} from '../physics/forces.js';
import {physicalEpoch} from '../physics/physical-time.js';
import {cpuWorkerPolicy,forceWorkerBudget} from './cpu-worker-policy.js';
const node=typeof process!=='undefined'&&process.versions?.node?await import('node:worker_threads'):null;
const WorkerClass=node?.Worker??globalThis.Worker;

function sharedState(source){
 const state={...source};
 for(const key of ['positions','velocities','masses','components','accelerations']){
  const a=source[key],b=new a.constructor(new SharedArrayBuffer(a.byteLength));b.set(a);state[key]=b;
 }
 return state;
}

export class BHForcePool{
 constructor(count,{workerFactory=url=>new WorkerClass(url,{type:'module'})}={}){
  if(!Number.isSafeInteger(count)||count<1||count>16)throw new RangeError('Pool CPU requer de 1 a 16 Workers.');
  this.count=count;this.closed=false;this.busy=false;this.shared={};this.waiters=new Set();this.workers=[];
  this.control=new Int32Array(new SharedArrayBuffer(4));
  try{for(let k=0;k<count;k++)this.workers.push(workerFactory(new URL('./bh-force-worker.js',import.meta.url)));}
  catch(error){this.close();throw error;}
 }
 call(worker,message){return new Promise((resolve,reject)=>{
  if(this.closed){reject(Error('Pool CPU encerrado.'));return;}
  let timer;
  const cleanup=()=>{clearTimeout(timer);this.waiters.delete(fail);if(node){worker.off('message',done);worker.off('error',fail);worker.off('exit',exited);}else{worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;}};
  const fail=error=>{cleanup();reject(Error(error?.message??'Falha no Worker de força.'));};
  const done=event=>{const data=node?event:event.data;cleanup();data.type==='error'?reject(Error(data.message)):resolve(data);};
  const exited=()=>fail(Error('Worker CPU encerrou antes de concluir a força.'));
  this.waiters.add(fail);
  if(node){worker.on('message',done);worker.once('error',fail);worker.once('exit',exited);}else{worker.onmessage=done;worker.onerror=fail;worker.onmessageerror=()=>fail(Error('Mensagem de força CPU inválida.'));}
  // Initialization failure can fall back before any integration takes place.
  if(message.type==='ready')timer=setTimeout(()=>fail(Error('Inicialização dos Workers excedeu 15 s.')),15000);
  try{worker.postMessage(message);}catch(error){fail(error);}
 });}
 async ready(){await Promise.all(this.workers.map(w=>this.call(w,{type:'ready'})));}
 async force(state,options,active=this.count){
  if(this.closed)throw Error('Pool CPU encerrado.');if(this.busy)throw Error('Forças CPU concorrentes no mesmo estado são proibidas.');
  this.busy=true;
  try{
   validateState(state);if(!Number.isFinite(options.G)||options.G<=0||!Number.isFinite(options.epsilon)||options.epsilon<0||!Number.isFinite(options.theta)||options.theta<0)throw Error('Parâmetros de força CPU inválidos.');const start=performance.now();this.tree??=new Octree(state.n);this.tree.build(state);const buildMs=performance.now()-start;
   const publish=performance.now(),tree={};
   for(const key of ['cx','cy','cz','half','mass','mx','my','mz','start','count','children','internal','order','rank']){
    const source=this.tree[key],length=key==='order'||key==='rank'?state.n:key==='children'?8*this.tree.nodeCount:this.tree.nodeCount;
    if(!this.shared[key]||this.shared[key].length<length)this.shared[key]=new source.constructor(new SharedArrayBuffer(length*source.BYTES_PER_ELEMENT));
    this.shared[key].set(source.subarray(0,length));tree[key]=this.shared[key];
   }
   const publicationMs=performance.now()-publish;Atomics.store(this.control,0,0);
   const dispatch=performance.now(),view={n:state.n,positions:state.positions,masses:state.masses,accelerations:state.accelerations};
   const activeWorkers=Math.max(1,Math.min(this.count,Math.floor(active)));
   const reports=await Promise.all(this.workers.slice(0,activeWorkers).map(w=>this.call(w,{state:view,tree,options,control:this.control})));
   if(reports.reduce((sum,r)=>sum+r.bodies,0)!==state.n)throw Error('Força CPU incompleta.');
   return {buildMs,publicationMs,dispatchTraverseMs:performance.now()-dispatch,totalMs:performance.now()-start,activeWorkers,workerBodies:reports.map(r=>r.bodies),workerComputeMs:reports.map(r=>r.computeMs),sharedTreeBytes:Object.values(this.shared).reduce((sum,a)=>sum+a.byteLength,0)};
  }catch(error){this.close();throw error;}finally{this.busy=false;}
 }
 close(){if(this.closed)return;this.closed=true;for(const fail of [...this.waiters])fail(Error('Cálculo CPU cancelado.'));for(const w of this.workers)w.terminate();this.workers=[];this.shared={};this.tree=null;}
}

/** Same KDK operations as Leapfrog, with an awaited force barrier at full drift. */
export class ParallelLeapfrog extends Leapfrog{
 constructor(state,options,pool){super(state,{...options,algorithm:'barnes-hut'});this.pool=pool;this.activeWorkers=pool.count;this.lastForce=null;this.busy=false;this.failed=false;}
 async force(){this.lastForce=await this.pool.force(this.state,this.options,this.activeWorkers);return this.state.accelerations;}
 async initialize(){await this.force();this.initialized=true;return this.state;}
 async step(count=1){
  if(this.failed)throw Error('Estado CPU interrompido por falha. Reinicie a realização.');
  if(this.busy)throw Error('Integrações concorrentes no mesmo estado são proibidas.');
  if(!Number.isSafeInteger(count)||count<0)throw new RangeError('Quantidade de passos deve ser um inteiro não negativo.');
  const completedTime=physicalEpoch(this.initialTime,this.steps+count,this.dt);this.busy=true;
  try{
   if(!this.initialized)await this.initialize();const start=performance.now(),{positions:p,velocities:v,accelerations:a}=this.state,dt=this.dt,half=dt*.5;
   for(let s=0;s<count;s++){for(let k=0;k<p.length;k++){v[k]+=half*a[k];p[k]+=dt*v[k];}await this.force();for(let k=0;k<p.length;k++)v[k]+=half*a[k];this.steps++;}
   this.time=completedTime;this.state.time=this.time;this.lastStepMs=count?(performance.now()-start)/count:0;return this.state;
  }catch(error){this.failed=true;this.pool.close();throw Error(error.message+' Reinicie a realização; nenhum estado parcial deve ser exportado.');}finally{this.busy=false;}
 }
 execution(){return {mode:'parallel',precision:'Float64',poolWorkers:this.pool.count,activeForceWorkers:this.lastForce?.activeWorkers??this.activeWorkers,lastForce:this.lastForce,fallbackReason:null};}
 dispose(){this.pool.close();}
}

export async function createCPUEngine(state,options={},capabilities={hardwareConcurrency:globalThis.navigator?.hardwareConcurrency,worker:typeof Worker!=='undefined',sharedArrayBuffer:typeof SharedArrayBuffer!=='undefined',crossOriginIsolated:globalThis.crossOriginIsolated}){
 const policy=cpuWorkerPolicy(options.cpuWorkers??16,capabilities);
 const serial=reason=>{const engine=new Leapfrog(state,options);engine.execution=()=>({mode:'serial',precision:'Float64',poolWorkers:1,activeForceWorkers:1,fallbackReason:reason});engine.dispose=()=>{};return engine;};
 if(options.algorithm==='direct')return serial('Força direta CPU usa o motor serial original.');
 if(!policy.parallel)return serial(options.cpuFallbackReason??policy.reason);
 let pool;
 try{pool=new BHForcePool(policy.workers);await pool.ready();return new ParallelLeapfrog(sharedState(state),options,pool);}
 catch(error){pool?.close();return serial('Pool paralelo indisponível: '+error.message);}
}
export function setEnergyConcurrency(engine,energyWorkers=0){if(engine instanceof ParallelLeapfrog)engine.activeWorkers=forceWorkerBudget(engine.pool.count,energyWorkers);}
