import {GPUBackend} from '../src/compute/gpu.js';
import {deserializeOrbitCandidate} from '../src/physics/orbit-equilibrium.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {directEnergy,relativeEnergy} from '../src/physics/live-energy.js';
import {diskAnalysis} from '../src/physics/disk-analysis.js';
import {structureDiagnostics} from '../src/physics/structure-diagnostics.js';
self.onmessage=async()=>{let gpu;const runs=[];try{
 if(!navigator.gpu){postMessage({type:'unavailable',reason:'WebGPU indisponível; nenhum valor GPU calculado.'});return;}
 const manifest=await(await fetch('../reports/equilibrium-rebuild/browser-manifest.json')).json();
 for(const config of manifest.runs){
  postMessage({type:'progress',text:`N=${config.n}, semente ${config.seed}, T=${config.duration} Myr…`});const initialData=await(await fetch('../'+config.snapshot)).json(),input=deserializeOrbitCandidate(initialData,{epsilon:.1}),started=performance.now();
  gpu=await GPUBackend.create();await gpu.initialize(input,{dt:config.dt,epsilon:.1});const initial=await gpu.snapshot(),options={G:gpu.effectiveParameters.G,dt:gpu.effectiveParameters.dt,epsilon:Math.sqrt(gpu.effectiveParameters.epsilonSquared),effectiveParameters:gpu.effectiveParameters};
  let cpu,state;if(config.matchCPU){state={...initial,positions:initial.positions.slice(),velocities:initial.velocities.slice(),masses:initial.masses.slice(),components:initial.components.slice(),accelerations:initial.accelerations.slice()};cpu=new Leapfrog(state,options);cpu.initialize();}
  const e0=directEnergy(initial,options),samples=[];for(let j=0;j<=config.duration/config.stride;j++){
   if(j){const steps=Math.round(config.stride/config.dt);cpu?.step(steps);await gpu.step(steps);}
   const s=await gpu.snapshot(),energy=directEnergy(s,options),disk=diskAnalysis(s),structure=structureDiagnostics(s,{accelerations:s.accelerations}),record={timeMyr:gpu.time,steps:gpu.steps,energy:energy.energy,energyError:relativeEnergy(energy,e0),disk,structure};
   if(cpu){const ec=directEnergy(state,options),d=diskAnalysis(state);let err=0,scale=0;for(let i=0;i<s.n;i++)if(s.components[i]===1)for(let k=0;k<3;k++){err+=(s.positions[3*i+k]-state.positions[3*i+k])**2;scale+=state.positions[3*i+k]**2;}record.cpu={timeMyr:cpu.time,energy:ec.energy,energyError:relativeEnergy(ec,e0),h50:d.instant.h50,diskPositionRmsRelative:Math.sqrt(err/scale)};}
   samples.push(record);postMessage({type:'progress',text:`N=${config.n}, semente ${config.seed}: ${gpu.time.toFixed(6)} Myr / ${config.duration} Myr`});
  }
  runs.push({config,effectiveParameters:gpu.effectiveParameters,initialPolicy:'Exact GPU Float32 readback used by matched CPU reference; no velocity/energy rescaling',samples,wallMs:performance.now()-started});gpu.dispose();gpu=null;
 }
 postMessage({type:'result',schema:'equilibrium-rebuild-gpu-v1',createdUTC:new Date().toISOString(),runs,equilibriumValidated:false,qualification:'Three phase-resampling seeds of one fitted orbit library; not three independent DF fits. High halo refinement holds the same baryonic phases. Short low-baryon-N runs cannot certify the collisionless galaxy.'});
}catch(e){postMessage({type:'failed',reason:String(e.stack??e),completedRuns:runs});}finally{gpu?.dispose();}};
