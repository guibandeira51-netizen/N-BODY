import {GPUBackend,FORCE_WGSL,checkedShader} from './gpu.js';
/** Same direct Plummer sum, same source ordering per particle, same KDK.
 * Splits TARGET particles across compute passes to bound individual dispatch
 * duration at large N. No tree, force approximation or changed softening.
 * This backend is opt-in; the existing production backend is unchanged.
 */
export class GPUChunkedDirectBackend extends GPUBackend{
 async createPipelines(){await super.createPipelines();const index='let i = (group.y * params.groupsX + group.x) * 64u + lane;',guard='let validParticle = i < params.n;';if(!FORCE_WGSL.includes(index)||!FORCE_WGSL.includes(guard))throw Error('Direct shader extension marker changed');
  const code=FORCE_WGSL.replace('pad0: f32, pad1: f32','pad0: u32, pad1: u32').replace(index,'let i = params.pad0 + (group.y * params.groupsX + group.x) * 64u + lane;').replace(guard,'let validParticle = i < params.n && i < params.pad0 + params.pad1;'),module=await checkedShader(this.device,code,'direct f32; bounded target dispatch');
  this.forcePipeline=await this.device.createComputePipelineAsync({layout:this.device.createPipelineLayout({bindGroupLayouts:[this.forceLayout]}),compute:{module,entryPoint:'force'}});
 }
 forceEntries(entries){this.targetDispatches=[];this.targetParameterBuffers=[];const chunk=8192;for(let first=0;first<this.n;first+=chunk){const count=Math.min(chunk,this.n-first),x=Math.min(Math.ceil(count/64),this.limits.maxComputeWorkgroupsPerDimension),y=Math.ceil(Math.ceil(count/64)/x),data=new ArrayBuffer(32),v=new DataView(data);v.setUint32(0,this.n,true);v.setUint32(4,x,true);v.setFloat32(8,this.effectiveParameters.epsilonSquared,true);v.setFloat32(12,this.effectiveParameters.G,true);v.setFloat32(16,this.effectiveParameters.dt,true);v.setUint32(20,first,true);v.setUint32(24,count,true);const buffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(buffer,0,data);this.targetParameterBuffers.push(buffer);const adjusted=entries.map(e=>e.binding===3?{binding:3,resource:{buffer}}:e),group=this.device.createBindGroup({layout:this.forceLayout,entries:adjusted});this.targetDispatches.push({group,x,y});}return entries;}
 encodePass(encoder,pipeline,bindGroup){if(pipeline!==this.forcePipeline)return super.encodePass(encoder,pipeline,bindGroup);for(const {group,x,y}of this.targetDispatches){const pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.dispatchWorkgroups(x,y);pass.end();}}
 releaseBuffers(){for(const buffer of this.targetParameterBuffers??[])buffer.destroy();this.targetParameterBuffers=[];this.targetDispatches=[];super.releaseBuffers();}
}
