import{createHaloGeometry,haloGeometryAt}from'../physics/halo-geometry.js';
import{checkedShader}from'../compute/gpu.js';
export function geometryMesh(field,{extent=40,segments=64}={}){
 const points=[],phi0=Math.abs(haloGeometryAt(field.center,field).potential),center=field.center;
 const add=(x,y)=>{const phi=haloGeometryAt([center[0]+x,center[1]+y,center[2]],field).potential;points.push(center[0]+x,center[1]+y,center[2],phi/phi0);};
 for(let i=0;i<=segments;i++){const a=-extent+2*extent*i/segments;for(let j=0;j<segments;j++){const b=-extent+2*extent*j/segments,c=-extent+2*extent*(j+1)/segments;add(a,b);add(a,c);add(b,a);add(c,a);}}
 return new Float32Array(points);
}
// The base buffer is uploaded once. A changes only world z; color uses base p.w.
export const HALO_MESH_POSITION_WGSL=`fn halo_mesh_position(p:vec4<f32>,amplification:f32)->vec3<f32>{return vec3<f32>(p.xy,p.z+amplification*p.w);}`;
export function displacedGeometryVertices(base,amplification){
 if(!Number.isFinite(amplification)||amplification<0)throw Error('Amplificação visual inválida.');
 const out=new Float64Array(base.length/4*3);for(let i=0;i<base.length/4;i++)out.set([base[4*i],base[4*i+1],base[4*i+2]+amplification*base[4*i+3]],3*i);return out;
}
export function geometryBounds(vertices,stride=3){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<vertices.length;i+=stride)for(let k=0;k<3;k++){min[k]=Math.min(min[k],vertices[i+k]);max[k]=Math.max(max[k],vertices[i+k]);}return{min,max};}
const SHADER=HALO_MESH_POSITION_WGSL+`struct Camera{matrix:mat4x4<f32>,viewport:vec2<f32>,pointSize:f32,amplification:f32,visible:vec4<f32>,exposure:vec4<f32>,eyeDepth:vec4<f32>};@group(0) @binding(0) var<uniform> camera:Camera;struct Out{@builtin(position)position:vec4<f32>,@location(0)depth:f32};@vertex fn vertex(@location(0) p:vec4<f32>)->Out{var o:Out;var q=camera.matrix*vec4<f32>(halo_mesh_position(p,camera.amplification),1.0);q.z=.5*(q.z+q.w);o.position=q;o.depth=-p.w;return o;}@fragment fn fragment(i:Out)->@location(0) vec4<f32>{return vec4<f32>(mix(vec3<f32>(.15,.55,.63),vec3<f32>(.8,.56,.24),i.depth),.25);}`;
export class HaloGeometryOverlay{
 #baseVertices;
 constructor(device,format,cameraBuffer,meta){Object.assign(this,{device,format,cameraBuffer});this.field=meta?.haloField??createHaloGeometry({center:(meta?.centerShift??[0,0,0]).map(x=>-x)});}
 async initialize(){const d=this.device,module=await checkedShader(d,SHADER,'Superfície ilustrativa Φ_NFW');this.pipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex',buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:'float32x4'}]}]},fragment:{module,entryPoint:'fragment',targets:[{format:this.format,blend:{color:{srcFactor:'src-alpha',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}}}]},primitive:{topology:'line-list'}});this.group=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.cameraBuffer}}]});const data=geometryMesh(this.field);this.#baseVertices=data;this.count=data.length/4;this.buffer=d.createBuffer({size:data.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC});d.queue.writeBuffer(this.buffer,0,data);}
 baseVerticesSnapshot(){return this.#baseVertices.slice();}
 draw(pass){pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.group);pass.setVertexBuffer(0,this.buffer);pass.draw(this.count);}
 dispose(){this.buffer?.destroy();}
}
