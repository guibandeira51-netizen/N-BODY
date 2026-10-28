import{createLiveGalaxy}from'../physics/live-initial.js';import{LiveGPUBackend}from'./gpu-live.js';import{GeometryHaloGPUBackend}from'./gpu-halo-geometry.js';
import{directEnergy,relativeEnergy}from'../physics/live-energy.js';import{gpuEnergy}from'../physics/gpu-energy.js';import{haloGeometryAt,haloWeakMetric,createHaloGeometry}from'../physics/halo-geometry.js';
import{diskAnalysis}from'../physics/disk-analysis.js';import{structureDiagnostics}from'../physics/structure-diagnostics.js';
import{compareCPUvsGPU}from'./gpu.js';
import{validateHaloGeometryProbes}from'./halo-geometry-probes.js';
const progress=data=>postMessage({type:'progress',...data});
async function digest(array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',array.buffer.slice(array.byteOffset,array.byteOffset+array.byteLength))),b=>b.toString(16).padStart(2,'0')).join('');}
function forceAudit(s,parameters,mode){let e2=0,a2=0,maxAbsolute=0;const epsilon2=parameters.epsilonSquared,G=parameters.G;
 for(let q=0;q<32;q++){const i=Math.min(s.n-1,Math.floor(q*s.n/32)),p=Array.from(s.positions.subarray(3*i,3*i+3)),a=[0,0,0];for(let j=0;j<s.n;j++)if(i!==j){const d=[0,1,2].map(k=>s.positions[3*j+k]-p[k]),inv=1/Math.sqrt(d.reduce((v,x)=>v+x*x,epsilon2));for(let k=0;k<3;k++)a[k]+=G*s.masses[j]*d[k]*inv**3;}if(mode==='geometry'){const ext=haloGeometryAt(p,parameters.haloField,G).acceleration;for(let k=0;k<3;k++)a[k]+=ext[k];}for(let k=0;k<3;k++){const error=s.accelerations[3*i+k]-a[k];e2+=error*error;a2+=a[k]*a[k];maxAbsolute=Math.max(maxAbsolute,Math.abs(error));}}
 const rmsRelative=Math.sqrt(e2/a2),nOps=s.n+64,roundoffScreeningEnvelope=64*nOps*2**-24/(1-nOps*2**-24);
 return{rmsRelative,maxAbsolute,targets:32,roundoffScreeningEnvelope,passed:Number.isFinite(rmsRelative)&&rmsRelative<roundoffScreeningEnvelope,qualification:'Screening envelope scales with Float32 summation length, not a certified error interval; actual measured residual reported.'};
}
async function run(mode,{baseN,haloRefinement,seed,epsilon},dt,end,keepBackend=false){
 const initial=createLiveGalaxy({baseN,haloRefinement,seed,haloRepresentation:mode}),Backend=mode==='geometry'?GeometryHaloGPUBackend:LiveGPUBackend,backend=await Backend.create();let returned=false;
 try{await backend.initialize(initial,{dt,epsilon,enforceMemoryBudget:false});const options={dt,epsilon,haloRepresentation:mode,effectiveParameters:backend.effectiveParameters,haloMode:mode==='geometry'?'fixed':'live',forceMethod:'GPU direct f32'};
 const rows=[];let initialE=null,computeMs=0,diagnosticMs=0,wallStart=performance.now(),audit;
 const sample=async()=>{const start=performance.now(),s=await backend.snapshot(),energy=directEnergy(s,options),fast=gpuEnergy(s,options),disk=diskAnalysis(s),structure=structureDiagnostics(s),component=structure.components.find(c=>c.id===1);initialE??=energy;if(!audit)audit=forceAudit(s,backend.effectiveParameters,mode);
 const row={timeMyr:s.time,n:s.n,mass:energy.mass,energy:energy.energy,selfPotential:energy.selfPotential,externalPotential:energy.externalPotential,relativeEnergy:relativeEnergy(energy,initialE),fastRelativeEnergyDifference:(fast.energy-energy.energy)/Math.abs(energy.energy),angularMomentum:energy.angularMomentum,momentum:energy.momentum,h50_kpc:disk.instant.h50,sigmaNormal_kpc_Myr:disk.instant.sigmaNormal,R50_kpc:component.R50,diskRings:disk.rings.map(r=>({lower:r.lower,upper:r.upper,h50:r.globalPlane.h50,sigmaNormal:r.globalPlane.sigmaNormal,count:r.count})),rotation:s.gpuRotationField};rows.push(row);diagnosticMs+=performance.now()-start;progress({mode,dt,timeMyr:s.time,stage:end===200?'controle 200 Myr':'até 1.200 Myr'});};
 await sample();const advance=async target=>{const targetSteps=Math.ceil(target/backend.effectiveParameters.dt);while(backend.steps<targetSteps){const count=Math.min(32,targetSteps-backend.steps),timing=await backend.step(count);computeMs+=timing.lastStepMs*count;if(backend.steps%512===0)progress({mode,dt,timeMyr:backend.time,stage:'integrando'});}await sample();};
 for(const target of[50,100,150,200])await advance(target);
 const result={mode,baseN,haloRefinement,seed,epsilon,n:initial.n,counts:initial.meta.counts,dt,parameters:backend.effectiveParameters,forceAudit:audit,rows,computeMs,diagnosticMs,wallMs:performance.now()-wallStart,initialHash:{positions:await digest(initial.positions.slice(0,3*(initial.meta.counts[0]+initial.meta.counts[1]))),velocities:await digest(initial.velocities.slice(0,3*(initial.meta.counts[0]+initial.meta.counts[1]))),masses:await digest(initial.masses.slice(0,initial.meta.counts[0]+initial.meta.counts[1]))}};
 if(keepBackend){returned=true;return{result,backend,advance,finish:()=>{result.computeMs=computeMs;result.diagnosticMs=diagnosticMs;result.wallMs=performance.now()-wallStart;}};}
 return result;
 }finally{if(!returned)backend.dispose();}
}
self.onmessage=async({data})=>{let active;try{
 const config={baseN:4096,haloRefinement:4,seed:2026,epsilon:.1,...data.config},started=performance.now();progress({stage:'regressão GPU anterior × CPU Float64'});
 const regression=await compareCPUvsGPU(undefined,{n:512,steps:4});if(regression.status!=='passed')throw Error('Regressão do modo por partículas não aprovada: '+regression.reason);
 const geometryProbes=await validateHaloGeometryProbes();if(!geometryProbes.passed)throw Error('Sondas de força do halo geométrico fora da escala de arredondamento examinada.');
 const runs=[];for(const mode of['particles','geometry']){
  active=await run(mode,config,.1,200,true);const fine=await run(mode,config,.05,200);const max=r=>Math.max(...r.rows.map(x=>x.relativeEnergy.absolute));
  const convergence={coarseMaxSampled:max(active.result),fineMaxSampled:max(fine),reduction:max(active.result)/max(fine),observed:max(fine)<max(active.result),qualification:'Same realization, epochs and Hamiltonian; sampled energy convergence, not proof of equilibrium or full Einstein accuracy.'};
  active.result.shortFine=fine;active.result.convergence200=convergence;
  if(!active.result.forceAudit.passed||!fine.forceAudit.passed||!convergence.observed){active.finish();runs.push(active.result);active.backend.dispose();active=null;postMessage({type:'result',result:{config,regression,runs,completed1200:false,reason:'Controle de força ou redução do erro com dt/2 não demonstrado; continuação longa não executada.',costMs:performance.now()-started}});return;}
  for(const target of[400,600,800,1000,1200])await active.advance(target);active.finish();runs.push(active.result);active.backend.dispose();active=null;
 }
 const matching=JSON.stringify(runs[0].initialHash)===JSON.stringify(runs[1].initialHash);if(!matching)throw Error('As condições iniciais bariônicas diferem.');
 postMessage({type:'result',result:{schema:'integrated-halo-representation-validation-v1',computedUTC:new Date().toISOString(),config,regression,geometryProbes,runs,completed1200:true,matchingInitialBaryons:matching,gpuComputeSpeedup:runs[0].computeMs/runs[1].computeMs,costMs:performance.now()-started,qualification:'Finite-resolution numerical comparison. Static halo has no live response or halo particle relaxation; pair Plummer softening differs from unsoftened continuum NFW. Differences are not evidence of new relativistic physics or certified galaxy equilibrium.'}});
 }catch(e){active?.backend.dispose();postMessage({type:'error',message:e.message});}};
