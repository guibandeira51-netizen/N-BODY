import {GPUBackend} from '../src/compute/gpu.js';
import {createGalaxy} from '../src/physics/initial.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {directEnergy,relativeEnergy} from '../src/physics/live-energy.js';
import {diskAnalysis} from '../src/physics/disk-analysis.js';
function errors(a,b,components,id){let error=0,scale=0,max=0,n=0;for(let i=0;i<components.length;i++)if(components[i]===id){n++;for(let k=0;k<3;k++){const d=a[3*i+k]-b[3*i+k];error+=d*d;scale+=a[3*i+k]**2;max=Math.max(max,Math.abs(d));}}return {count:n,rmsAbsolute:Math.sqrt(error/n),rmsRelative:Math.sqrt(error/scale),maxCoordinateAbsolute:max};}
self.onmessage=async()=>{let gpu;try{
 if(!navigator.gpu){postMessage({type:'unavailable',reason:'WebGPU não disponível neste Worker; nenhum resultado GPU calculado.'});return;}
 const runs=[];for(const dt of [.1,.05]){
  postMessage({type:'progress',text:`Comparando N=800, dt solicitado=${dt} Myr…`});
  gpu=await GPUBackend.create();await gpu.initialize(createGalaxy({n:800,seed:2026}),{dt,epsilon:.1});
  const initial=await gpu.snapshot(),options={G:gpu.effectiveParameters.G,dt:gpu.effectiveParameters.dt,epsilon:Math.sqrt(gpu.effectiveParameters.epsilonSquared),effectiveParameters:gpu.effectiveParameters};
  const cpuState={...initial,positions:initial.positions.slice(),velocities:initial.velocities.slice(),masses:initial.masses.slice(),components:initial.components.slice(),accelerations:initial.accelerations.slice()},cpu=new Leapfrog(cpuState,options);cpu.initialize();
  const initialE=directEnergy(initial,options),initialCPU=directEnergy(cpuState,options),samples=[],stride=Math.round(2/dt);
  for(let j=0;j<=20;j++){
   if(j){cpu.step(stride);await gpu.step(stride);}const snapshot=await gpu.snapshot(),ec=directEnergy(cpuState,options),eg=directEnergy(snapshot,options),dc=diskAnalysis(cpuState),dg=diskAnalysis(snapshot);
   samples.push({step:gpu.steps,requestedMyr:j*2,cpuTimeMyr:cpu.time,gpuTimeMyr:gpu.time,cpuEnergy:ec.energy,gpuEnergy:eg.energy,cpuErrorPercent:relativeEnergy(ec,initialCPU).percent,gpuErrorPercent:relativeEnergy(eg,initialE).percent,h50CPU:dc.instant.h50,h50GPU:dg.instant.h50,diskPositionErrors:errors(cpuState.positions,snapshot.positions,snapshot.components,1),diskVelocityErrors:errors(cpuState.velocities,snapshot.velocities,snapshot.components,1),diskForceErrors:errors(cpuState.accelerations,snapshot.accelerations,snapshot.components,1)});
  }
  runs.push({n:800,seed:2026,requestedDt:dt,effectiveParameters:gpu.effectiveParameters,initialPolicy:'Exact same rounded particle snapshot, masses and effective gravitational parameters; only arithmetic trajectory precision differs.',samples});gpu.dispose();gpu=null;
 }
 postMessage({type:'result',schema:'disk-audit-cpu-gpu-v1',createdUTC:new Date().toISOString(),runs,scope:'Short 40-Myr comparison at N=800, not a long-duration N=50k validation; direct energy is sampled every 2 requested Myr with effective physical epochs retained. No empirical percentage threshold certifies equilibrium.'});
}catch(e){postMessage({type:'failed',reason:String(e.stack??e)});}finally{gpu?.dispose();}};
