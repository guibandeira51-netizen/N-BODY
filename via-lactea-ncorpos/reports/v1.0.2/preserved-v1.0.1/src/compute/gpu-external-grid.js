import {GPUBackend,FORCE_WGSL,checkedShader} from './gpu.js';
import {assertExternalState} from '../physics/external-grid.js';

const FIELD=`
@group(0) @binding(4) var<storage,read> field:array<vec4<f32>>;
fn H(t:f32)->vec4<f32>{return vec4<f32>(2*t*t*t-3*t*t+1,-2*t*t*t+3*t*t,t*t*t-2*t*t+t,t*t*t-t*t);}
fn D(t:f32)->vec4<f32>{return vec4<f32>(6*t*t-6*t,-6*t*t+6*t,3*t*t-4*t+1,3*t*t-2*t);}
fn external_acc(pos:vec3<f32>)->vec3<f32>{
 let dims=field[0];let scales=field[1];let nu=u32(dims.x);let nv=u32(dims.y);let R=length(pos.xy);let z=abs(pos.z);
 let u=log(1+R/scales.x);let v=log(1+z/scales.y);
 if(u>dims.z*f32(nu-1u)||v>dims.w*f32(nv-1u)){let r=length(pos);if(r>0){return -params.gravity*scales.z*pos/(r*r*r);}return vec3<f32>(0);}
 let fu=u/dims.z;let fv=v/dims.w;let i=min(nu-2u,u32(floor(fu)));let j=min(nv-2u,u32(floor(fv)));
 let a=H(fu-f32(i));let b=H(fv-f32(j));let da=D(fu-f32(i));let db=D(fv-f32(j));var dU=0.0;var dV=0.0;
 for(var p=0u;p<4u;p++){for(var q=0u;q<4u;q++){
  let index=select(0u,1u,p>=2u)+select(0u,2u,q>=2u);let value=field[2u+(i+p%2u)*nv+j+q%2u][index]*select(1.0,dims.z,p>=2u)*select(1.0,dims.w,q>=2u);
  dU+=da[p]*b[q]*value/dims.z;dV+=a[p]*db[q]*value/dims.w;
 }}
 let fr=-dU/(R+scales.x);let fz=-sign(pos.z)*dV/(z+scales.y);if(R>0){return vec3<f32>(fr*pos.x/R,fr*pos.y/R,fz);}return vec3<f32>(0,0,fz);
}
`;
/** Diagnostic extension; production force and KDK shaders remain unchanged. */
export class GPUExternalGridBackend extends GPUBackend {
 async createPipelines(){
  await super.createPipelines();const d=this.device,marker='  if (validParticle) { accelerations[i] = vec4<f32>(acceleration, 0.0); }';
  if(!FORCE_WGSL.includes(marker))throw Error('Extensão de força indisponível.');
  const module=await checkedShader(d,FORCE_WGSL.replace(marker,'if(validParticle){accelerations[i]=vec4<f32>(acceleration+external_acc(own),0.0);}')+FIELD,'live baryons + frozen AGAMA halo');
  this.forceLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}}]});
  this.forcePipeline=await d.createComputePipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.forceLayout]}),compute:{module,entryPoint:'force'}});
 }
 async initialize(s,options={}){
  const t=options.externalGrid;assertExternalState(s,t);const data=new Float32Array(t.values.length+8);data.set([t.nu,t.nv,t.du,t.dv,t.rscale,t.zscale,t.massInternal,0]);data.set(t.values,8);
  this.externalGridBuffer?.destroy();this.externalGridBuffer=this.device.createBuffer({label:'AGAMA halo potential Hermite grid',size:data.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(this.externalGridBuffer,0,data);return super.initialize(s,options);
 }
 forceEntries(entries){return [...entries,{binding:4,resource:{buffer:this.externalGridBuffer}}];}
 dispose(){this.externalGridBuffer?.destroy();super.dispose();}
}
