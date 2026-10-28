import {createLiveGalaxy,liveResolution} from '../src/physics/live-initial.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {getBarnesHutStats} from '../src/physics/forces.js';
import {ParallelBH,sharedState} from '../scripts/cpu-performance/parallel-pool.mjs';
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
const same=(a,b)=>a.length===b.length&&a.every((v,k)=>Object.is(v,b[k]));
self.onmessage=async({data})=>{try{
 const options={seed:2026,withHalo:true,dt:.1,epsilon:.1,theta:.5,algorithm:'barnes-hut'},n=data.n;
 const initial=createLiveGalaxy({...options,...liveResolution(n,1)}),serial=structuredClone(initial),engine=new Leapfrog(serial,options),oldForce=engine.force.bind(engine);let active=null;
 engine.force=()=>{const t=performance.now(),a=oldForce();if(active){active.forceMs+=performance.now()-t;active.buildMs+=getBarnesHutStats(serial).buildMs;}return a;};engine.initialize();engine.step(1);const samples=[];
 for(let k=0;k<3;k++){active={forceMs:0,buildMs:0};const t=performance.now();engine.step();samples.push({...active,stepMs:performance.now()-t});active=null;}
 const result={n,options,serial:{samples,medianStepMs:median(samples.map(s=>s.stepMs))},parallel:[],capabilities:{hardwareConcurrency:navigator.hardwareConcurrency,crossOriginIsolated,sharedArrayBuffer:typeof SharedArrayBuffer!=='undefined'}};
 if(crossOriginIsolated&&typeof SharedArrayBuffer!=='undefined')for(const count of [4,8]){
  const s=sharedState(initial),pool=new ParallelBH(count);try{await pool.ready();await pool.force(s,options);await pool.step(s,options);const samples=[];for(let k=0;k<3;k++)samples.push(await pool.step(s,options));
   const bitwise=same(s.positions,serial.positions)&&same(s.velocities,serial.velocities)&&same(s.accelerations,serial.accelerations);if(!bitwise)throw Error('Divergência do protótipo frente ao serial.');
   const stepMs=median(samples.map(r=>r.stepMs));result.parallel.push({workers:count,medianStepMs:stepMs,speedup:result.serial.medianStepMs/stepMs,bitwiseIdentical:true,samples});
  }finally{await pool.close();}
 }
 postMessage({type:'result',result});
 }catch(error){postMessage({type:'error',message:error.message,stack:error.stack});}};
