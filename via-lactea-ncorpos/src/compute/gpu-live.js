import {GPUBackend,FORCE_WGSL,checkedShader} from './gpu.js';
import {ROTATION_RADII} from '../physics/rotation-field.js';
import {KM_S_TO_KPC_MYR} from '../physics/constants.js';
import {assessResources} from './capability.js';
import{GPUObservationalProbes}from'./gpu-observational-probes.js';

// Same xyz force operations and KDK as the preserved GPU backend. The unused
// acceleration.w stores each particle's half-weighted pair potential energy.
export const PAIR_ENERGY_WGSL=FORCE_WGSL
 .replace('var acceleration = vec3<f32>(0.0);','var acceleration = vec3<f32>(0.0);\n  var phi = 0.0;')
 .replace('acceleration += displacement * (params.gravity * tile[k].w * invR * invR * invR);','acceleration += displacement * (params.gravity * tile[k].w * invR * invR * invR);\n          phi -= params.gravity * tile[k].w * invR;')
 .replace('vec4<f32>(acceleration, 0.0)','vec4<f32>(acceleration, 0.5 * positions[i].w * phi)');

export const ROTATION_WGSL=`
struct Params { n:u32, groupsX:u32, epsilon2:f32, gravity:f32, dt:f32, pad0:f32, pad1:f32, pad2:f32 }
@group(0) @binding(0) var<storage,read> positions:array<vec4<f32>>;
@group(0) @binding(1) var<storage,read> velocities:array<vec4<f32>>;
@group(0) @binding(2) var<storage,read> probes:array<vec4<f32>>;
@group(0) @binding(3) var<storage,read_write> fields:array<vec4<f32>>;
@group(0) @binding(4) var<uniform> params:Params;
@compute @workgroup_size(64)
fn rotation(@builtin(global_invocation_id) id:vec3<u32>){
 let i=id.x;if(i>=arrayLength(&probes)){return;}let probe=probes[i];var radial=vec3<f32>(0.0);
 for(var j=0u;j<params.n;j++){
  let source=positions[j];let d=source.xyz-vec3<f32>(probe.xy,0.0);let invR=inverseSqrt(dot(d,d)+params.epsilon2);
  let f=params.gravity*source.w*(d.x*probe.z+d.y*probe.w)*invR*invR*invR;
  let component=u32(velocities[j].w);radial[component]+=f;
 }
 fields[i]=vec4<f32>(radial,0.0);
}`;

export function rotationFromGPU(state,fields,parameters,{radii=ROTATION_RADII,azimuthSamples=32}={}){
 if(fields.length!==4*radii.length*azimuthSamples||!fields.every(Number.isFinite))throw Error('Campo radial GPU incompleto ou não finito.');
 const counts=[0,0,0],masses=[0,0,0];for(let i=0;i<state.n;i++){counts[state.components[i]]++;masses[state.components[i]]+=state.masses[i];}
 const speed=x=>x>=0?Math.sqrt(x)/KM_S_TO_KPC_MYR:null;
 const rows=radii.map((R,k)=>{const ar=[0,0,0];for(let a=0;a<azimuthSamples;a++)for(let c=0;c<3;c++)ar[c]+=fields[4*(k*azimuthSamples+a)+c]/azimuthSamples;
  const [bulge,disk,halo]=ar.map(v=>v===0?0:-R*v),diskBulge=disk+bulge,total=diskBulge+halo,v2={bulge,disk,halo,diskBulge,total};
  return{R_kpc:R,aR_kpc_Myr2:{bulge:ar[0],disk:ar[1],halo:ar[2]},v2_kpc2_Myr2:v2,vc_km_s:Object.fromEntries(Object.entries(v2).map(([k,v])=>[k,speed(v)]))};});
 return{schema:'component-radial-field-v1',timeMyr:state.time,parameters:{G:parameters.G,epsilonSquared:parameters.epsilonSquared},sourceCounts:counts,sourceMasses1e10Msun:masses,azimuthSamples,planeZKpc:0,originKpc:[0,0,0],rows,method:'Direct WebGPU Float32 Plummer probe sums; Float64 azimuthal reduction; vc²=-R<ar>; squared contributions add.',qualification:'Finite-N and angular-quadrature noise retained; Float32 force diagnostic, not observed particle rotation.'};
}

export class LiveGPUBackend extends GPUBackend{
 get rotationShader(){return ROTATION_WGSL;}
 rotationBindings(bindings){return bindings;}
 async initialize(state,options={}){const admission=assessResources(state.n,{limits:this.limits},{...options,backend:'gpu',gpuDiagnostics:true});if(!admission.admissible)throw Error(admission.reasons.join(' '));this.observationalProbes?.dispose();this.observationalProbes=null;await super.initialize(state,options);this.scienceEnabled=options.observationalDiagnostics===true;this.resourceEstimate=admission;return this;}
 get forceShader(){return PAIR_ENERGY_WGSL;}
 snapshotAuxiliary(state,p,v,a){
  let sum=0,correction=0;for(let i=0;i<state.n;i++){const x=a[4*i+3],t=sum+x;correction+=Math.abs(sum)>=Math.abs(x)?(sum-t)+x:(x-t)+sum;sum=t;}
  state.gpuPotentialEnergy=sum+correction;if(!Number.isFinite(state.gpuPotentialEnergy))throw Error('Energia potencial GPU não finita.');
 }
 async snapshot(){const state=await super.snapshot(),start=performance.now();const fields=await this.rotationFields();state.gpuRotationField=rotationFromGPU(state,fields,this.effectiveParameters);state.gpuRotationField.diagnosticCostMs=performance.now()-start;if(this.scienceEnabled){if(!this.observationalProbes){this.observationalProbes=new GPUObservationalProbes(this);await this.observationalProbes.initialize();}state.observationalProbes=await this.observationalProbes.sample();}return state;}
 async rotationFields(){
  this.assertReady();const device=this.device,count=ROTATION_RADII.length*32;let staging;
  if(!this.rotationPipeline){
   const module=await checkedShader(device,this.rotationShader,'Campo radial das componentes GPU');
   this.rotationPipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'rotation'}});
   const probes=new Float32Array(4*count);let k=0;for(const R of ROTATION_RADII)for(let a=0;a<32;a++){const phi=2*Math.PI*a/32;probes.set([R*Math.cos(phi),R*Math.sin(phi),Math.cos(phi),Math.sin(phi)],4*k++);}
   this.probeBuffer=device.createBuffer({size:probes.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(this.probeBuffer,0,probes);
   this.fieldBuffer=device.createBuffer({size:probes.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
  }
  try{
   const bindings=this.rotationBindings([this.positionBuffer,this.velocityBuffer,this.probeBuffer,this.fieldBuffer,this.paramsBuffer]);
   const group=device.createBindGroup({layout:this.rotationPipeline.getBindGroupLayout(0),entries:bindings.map((buffer,binding)=>({binding,resource:{buffer}}))});
   const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(this.rotationPipeline);pass.setBindGroup(0,group);pass.dispatchWorkgroups(Math.ceil(count/64));pass.end();
   staging=device.createBuffer({size:16*count,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});encoder.copyBufferToBuffer(this.fieldBuffer,0,staging,0,16*count);device.queue.submit([encoder.finish()]);await staging.mapAsync(GPUMapMode.READ);return new Float32Array(staging.getMappedRange()).slice();
  }finally{if(staging?.mapState==='mapped')staging.unmap();staging?.destroy();}
 }
 dispose(){this.observationalProbes?.dispose();this.probeBuffer?.destroy();this.fieldBuffer?.destroy();super.dispose();}
}

export async function benchmarkLiveGPU(state,options={}){
 let backend;try{backend=await LiveGPUBackend.create();await backend.initialize(state,options);await backend.step(2);const samples=[];for(let k=0;k<3;k++)samples.push((await backend.step(1)).lastStepMs);const final=await backend.snapshot();return{backend:'gpu',algorithm:'direct',precision:'f32',status:'measured',n:state.n,stepMs:samples.slice().sort((a,b)=>a-b)[1],samples,warmupSteps:2,measuredSteps:3,finite:final.positions.every(Number.isFinite),effectiveParameters:backend.effectiveParameters,timing:'Live GPU kernel; median three full steps, readback/diagnostics/render excluded'};}finally{backend?.dispose();}
}
