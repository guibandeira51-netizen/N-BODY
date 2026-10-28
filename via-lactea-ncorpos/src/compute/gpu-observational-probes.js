import{checkedShader}from'./gpu.js';
import{scienceProbePlan}from'../physics/observational-diagnostics.js';
export const OBSERVATIONAL_PROBE_WGSL=`
struct Params{n:u32,groupsX:u32,epsilon2:f32,gravity:f32,dt:f32,pad0:f32,pad1:f32,pad2:f32}
@group(0)@binding(0)var<storage,read>positions:array<vec4<f32>>;
@group(0)@binding(1)var<storage,read>velocities:array<vec4<f32>>;
@group(0)@binding(2)var<storage,read>probes:array<vec4<f32>>;
@group(0)@binding(3)var<storage,read_write>fields:array<vec4<f32>>;
@group(0)@binding(4)var<uniform>params:Params;
@compute @workgroup_size(64)
fn observe(@builtin(global_invocation_id)id:vec3<u32>){
 let i=id.x;if(i>=arrayLength(&probes)){return;}let point=probes[i].xyz;
 var total=vec4<f32>(0.0);var baryons=vec4<f32>(0.0);
 for(var j=0u;j<params.n;j++){
  let source=positions[j];let d=source.xyz-point;let inv=inverseSqrt(dot(d,d)+params.epsilon2);
  let gm=params.gravity*source.w;let value=vec4<f32>(d*(gm*inv*inv*inv),-gm*inv);
  total+=value;if(velocities[j].w<1.5){baryons+=value;}
 }
 fields[2u*i]=total;fields[2u*i+1u]=baryons;
}`;
/** Read-only massless probes. No writes or bindings to the integration acceleration buffer. */
export class GPUObservationalProbes{
 constructor(backend){this.backend=backend;this.plan=scienceProbePlan();}
 async initialize(){const b=this.backend,d=b.device,module=await checkedShader(d,OBSERVATIONAL_PROBE_WGSL,'Sondas observacionais passivas');this.pipeline=await d.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'observe'}});const input=this.plan.probes;this.input=d.createBuffer({size:input.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});d.queue.writeBuffer(this.input,0,input);this.size=input.byteLength*2;this.output=d.createBuffer({size:this.size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});this.group=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[b.positionBuffer,b.velocityBuffer,this.input,this.output,b.paramsBuffer].map((buffer,binding)=>({binding,resource:{buffer}}))});}
 async sample(){const d=this.backend.device,start=performance.now();let staging;try{const encoder=d.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.group);pass.dispatchWorkgroups(Math.ceil(this.plan.probes.length/4/64));pass.end();staging=d.createBuffer({size:this.size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});encoder.copyBufferToBuffer(this.output,0,staging,0,this.size);d.queue.submit([encoder.finish()]);await staging.mapAsync(GPUMapMode.READ);return{values:new Float32Array(staging.getMappedRange()).slice(),timeMyr:this.backend.time,gpuCostMs:performance.now()-start,probeCount:this.plan.probes.length/4,precision:'GPU Float32 particle force and potential; CPU Float64 continuous external field and reduction'};}finally{if(staging?.mapState==='mapped')staging.unmap();staging?.destroy();}}
 dispose(){this.input?.destroy();this.output?.destroy();}
}
