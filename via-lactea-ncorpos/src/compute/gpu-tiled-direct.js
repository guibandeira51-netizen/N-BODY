import {GPUChunkedDirectBackend} from './gpu-chunked-direct.js';
import {FORCE_WGSL,checkedShader} from './gpu.js';
/** Experimental scheduling variant only. Sources retain increasing j order.
 * No force/integrator change; must pass actual GPU equivalence before use.
 */
export class GPUTiledDirectBackend extends GPUChunkedDirectBackend {
 async createPipelines(){
  await super.createPipelines();this.forceTileSize=128;
  if(this.limits.maxComputeWorkgroupSizeX<128||this.limits.maxComputeInvocationsPerWorkgroup<128||this.limits.maxComputeWorkgroupStorageSize<2048)throw Error('GPU cannot support the 128-lane scheduling variant');
  const code=FORCE_WGSL.replaceAll('64','128').replace('pad0: f32, pad1: f32','pad0: u32, pad1: u32').replace('let i = (group.y * params.groupsX + group.x) * 128u + lane;','let i = params.pad0 + (group.y * params.groupsX + group.x) * 128u + lane;').replace('let validParticle = i < params.n;','let validParticle = i < params.n && i < params.pad0 + params.pad1;');
  const module=await checkedShader(this.device,code,'direct f32; 128 target lanes; same ordered source sum');
  this.forcePipeline=await this.device.createComputePipelineAsync({layout:this.device.createPipelineLayout({bindGroupLayouts:[this.forceLayout]}),compute:{module,entryPoint:'force'}});
 }
 forceEntries(entries){
  this.targetDispatches=[];this.targetParameterBuffers=[];const chunk=8192;
  for(let first=0;first<this.n;first+=chunk){
   const count=Math.min(chunk,this.n-first),x=Math.min(Math.ceil(count/128),this.limits.maxComputeWorkgroupsPerDimension),y=Math.ceil(Math.ceil(count/128)/x),data=new ArrayBuffer(32),v=new DataView(data);
   v.setUint32(0,this.n,true);v.setUint32(4,x,true);v.setFloat32(8,this.effectiveParameters.epsilonSquared,true);v.setFloat32(12,this.effectiveParameters.G,true);v.setFloat32(16,this.effectiveParameters.dt,true);v.setUint32(20,first,true);v.setUint32(24,count,true);
   const buffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(buffer,0,data);this.targetParameterBuffers.push(buffer);
   const adjusted=entries.map(e=>e.binding===3?{binding:3,resource:{buffer}}:e),group=this.device.createBindGroup({layout:this.forceLayout,entries:adjusted});this.targetDispatches.push({group,x,y});
  }
  return entries;
 }
}
