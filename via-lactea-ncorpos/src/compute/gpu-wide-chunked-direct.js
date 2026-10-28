import {GPUChunkedDirectBackend} from './gpu-chunked-direct.js';
/** Same shader and source ordering as the validated 8192-target backend.
 * Larger independent target dispatches improve device occupancy. Integration
 * kernels are inherited unchanged. No physical values or sums are modified.
 */
export class GPUWideChunkedDirectBackend extends GPUChunkedDirectBackend {
 forceEntries(entries){
  this.targetDispatches=[];this.targetParameterBuffers=[];const chunk=65536;
  for(let first=0;first<this.n;first+=chunk){
   const count=Math.min(chunk,this.n-first),x=Math.min(Math.ceil(count/64),this.limits.maxComputeWorkgroupsPerDimension),y=Math.ceil(Math.ceil(count/64)/x),data=new ArrayBuffer(32),v=new DataView(data);
   v.setUint32(0,this.n,true);v.setUint32(4,x,true);v.setFloat32(8,this.effectiveParameters.epsilonSquared,true);v.setFloat32(12,this.effectiveParameters.G,true);v.setFloat32(16,this.effectiveParameters.dt,true);v.setUint32(20,first,true);v.setUint32(24,count,true);
   const buffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(buffer,0,data);this.targetParameterBuffers.push(buffer);
   const adjusted=entries.map(e=>e.binding===3?{binding:3,resource:{buffer}}:e),group=this.device.createBindGroup({layout:this.forceLayout,entries:adjusted});this.targetDispatches.push({group,x,y});
  }
  return entries;
 }
}
