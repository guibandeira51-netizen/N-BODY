import {createLiveGalaxy,liveResolution} from '../src/physics/live-initial.js';
import {GPUBackend} from '../src/compute/gpu.js';
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
self.onmessage=async()=>{let gpu;try{
 const options={seed:2026,withHalo:true,dt:.1,epsilon:.1,theta:.5,budgetBytes:512*1024**2},results=[];
 for(const c of [{baseN:10000,haloRefinement:1},{baseN:80000,haloRefinement:1},{baseN:40000,haloRefinement:32}]){
  const s=createLiveGalaxy({...options,...liveResolution(c.baseN,c.haloRefinement)});gpu=await GPUBackend.create();let start=performance.now();await gpu.initialize(s,options);const initialUploadAndForceMs=performance.now()-start;
  start=performance.now();const initial=await gpu.snapshot(),initialReadbackMs=performance.now()-start,p=gpu.effectiveParameters;
  const ids=[];let offset=0;for(const count of s.meta.counts){for(let k=0;k<32;k++)ids.push(offset+Math.floor(k*count/32));offset+=count;}
  let delta=0,norm=0,max=0;for(const i of ids){const a=[0,0,0],at=3*i;for(let j=0;j<s.n;j++)if(i!==j){const b=3*j,dx=initial.positions[b]-initial.positions[at],dy=initial.positions[b+1]-initial.positions[at+1],dz=initial.positions[b+2]-initial.positions[at+2],r2=dx*dx+dy*dy+dz*dz+p.epsilonSquared,f=p.G*initial.masses[j]/(r2*Math.sqrt(r2));a[0]+=f*dx;a[1]+=f*dy;a[2]+=f*dz;}let d=0,r=0;for(let k=0;k<3;k++){d+=(initial.accelerations[at+k]-a[k])**2;r+=a[k]**2;}delta+=d;norm+=r;if(r>0)max=Math.max(max,Math.sqrt(d/r));}
  await gpu.step(1);const samples=[];for(let k=0;k<3;k++)samples.push((await gpu.step(1)).lastStepMs);start=performance.now();const final=await gpu.snapshot(),finalReadbackMs=performance.now()-start;
  results.push({...c,n:s.n,options,effectiveParameters:p,backend:'WebGPU direct Float32',initialUploadAndForceMs,initialReadbackMs,finalReadbackMs,steps:gpu.steps,timeMyr:gpu.time,samples,medianStepMs:median(samples),finite:final.positions.every(Number.isFinite),forceReference:{targets:ids.length,relativeL2:Math.sqrt(delta/norm),maximumTargetRelative:max,scope:'96 stratified direct Float64 target probes on the same GPU-quantized initial state, effective G and epsilon²; no global bound'},timing:'Warmup one full KDK step; median three steps including submit/queue completion, excluding readback, diagnostics and rendering.'});gpu.dispose();gpu=null;
 }
 postMessage({type:'result',results});
 }catch(error){gpu?.dispose();postMessage({type:'error',message:error.message,stack:error.stack});}};
