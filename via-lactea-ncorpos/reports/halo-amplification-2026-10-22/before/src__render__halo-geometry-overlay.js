import{createHaloGeometry,haloGeometryAt}from'../physics/halo-geometry.js';
import{checkedShader}from'../compute/gpu.js';
export function geometryMesh(field,{extent=40,segments=64}={}){
 const points=[],phi0=Math.abs(haloGeometryAt(field.center,field).potential),center=field.center;
 const add=(x,y)=>{const phi=haloGeometryAt([center[0]+x,center[1]+y,center[2]],field).potential;points.push(center[0]+x,center[1]+y,center[2],phi/phi0);};
 for(let i=0;i<=segments;i++){const a=-extent+2*extent*i/segments;for(let j=0;j<segments;j++){const b=-extent+2*extent*j/segments,c=-extent+2*extent*(j+1)/segments;add(a,b);add(a,c);add(b,a);add(c,a);}}
 return new Float32Array(points);
}
const SHADER=`struct Camera{matrix:mat4x4<f32>,viewport:vec2<f32>,pointSize:f32,amplification:f32,visible:vec4<f32>,exposure:vec4<f32>};@group(0) @binding(0) var<uniform> camera:Camera;struct Out{@builtin(position)position:vec4<f32>,@location(0)depth:f32};@vertex fn vertex(@location(0) p:vec4<f32>)->Out{var o:Out;var q=camera.matrix*vec4<f32>(p.xy,p.z+camera.amplification*p.w,1.0);q.z=.5*(q.z+q.w);o.position=q;o.depth=-p.w;return o;}@fragment fn fragment(i:Out)->@location(0) vec4<f32>{return vec4<f32>(mix(vec3<f32>(.15,.55,.63),vec3<f32>(.8,.56,.24),i.depth),.25);}`;
export class HaloGeometryOverlay{
 constructor(device,format,cameraBuffer,meta){Object.assign(this,{device,format,cameraBuffer});this.field=meta?.haloField??createHaloGeometry({center:(meta?.centerShift??[0,0,0]).map(x=>-x)});}
 async initialize(){const d=this.device,module=await checkedShader(d,SHADER,'Superfície ilustrativa Φ_NFW');this.pipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex',buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:'float32x4'}]}]},fragment:{module,entryPoint:'fragment',targets:[{format:this.format,blend:{color:{srcFactor:'src-alpha',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}}}]},primitive:{topology:'line-list'}});this.group=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.cameraBuffer}}]});const data=geometryMesh(this.field);this.count=data.length/4;this.buffer=d.createBuffer({size:data.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});d.queue.writeBuffer(this.buffer,0,data);}
 draw(pass){pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.group);pass.setVertexBuffer(0,this.buffer);pass.draw(this.count);}
 dispose(){this.buffer?.destroy();}
}
