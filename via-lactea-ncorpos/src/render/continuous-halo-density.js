import {checkedShader} from '../compute/gpu.js';
import{fromPrincipal}from'../physics/halo-ellipsoid.js';

export function haloIsodensityVertices(field,segments=96){const radius=field.rs,p=field.shape?.p??1,q=field.shape?.q??1,shape=field.shape??{rotation:[[1,0,0],[0,1,0],[0,0,1]]},vertices=[];for(let plane=0;plane<3;plane++)for(let i=0;i<segments;i++)for(const j of[i,i+1]){const a=2*Math.PI*j/segments,x=plane===0?[radius*Math.cos(a),radius*p*Math.sin(a),0]:plane===1?[radius*Math.cos(a),0,radius*q*Math.sin(a)]:[0,radius*p*Math.cos(a),radius*q*Math.sin(a)],world=fromPrincipal(x,shape);vertices.push(...world.map((v,k)=>v+field.center[k]));}return new Float32Array(vertices);}

/** Density of the actual finite spherical field: rho = M'(r)/(4 pi r²). */
export function continuousHaloDensity(r,field){
  if(r>=field.outerRadius)return 0;
  if(r<=0)return Infinity;
  if(r<=field.r200)return field.massScale/(4*Math.PI*r*(r+field.rs)**2);
  let lo=0,hi=field.radius.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>>1;if(field.radius[mid]>r)hi=mid;else lo=mid;}
  return Math.max(0,(field.mass[hi]-field.mass[lo])/(field.radius[hi]-field.radius[lo]))/(4*Math.PI*r*r);
}

/** Sigma(b) = 2 integral rho(sqrt(b²+s²)) ds. Sinh mapping resolves the cusp. */
export function projectedHaloDensity(b,field,quadrature=256){
  if(!(b>0))throw new RangeError('Raio projetado deve ser positivo.');
  if(b>=field.outerRadius)return 0;
  const umax=Math.asinh(Math.sqrt(field.outerRadius**2-b*b)/b);let sum=0;
  for(let i=0;i<quadrature;i++){const u=(i+.5)*umax/quadrature;sum+=continuousHaloDensity(b*Math.cosh(u),field)*b*Math.cosh(u);}
  return 2*sum*umax/quadrature;
}

export function continuousHaloProfile(field,{samples=384,quadrature=256}={}){
  // Only the illustrative central pixel is capped; never an input to gravity.
  const minRadius=field.rs*1e-4,logRange=Math.log(field.outerRadius/minRadius),sigmaRef=projectedHaloDensity(field.r200,field,quadrature),density=new Float32Array(samples),intensity=new Float32Array(samples);
  for(let i=0;i<samples;i++)density[i]=projectedHaloDensity(minRadius*Math.exp(logRange*i/(samples-1)),field,quadrature);
  const logMax=Math.log1p(density[0]/sigmaRef);
  for(let i=0;i<samples;i++)intensity[i]=Math.log1p(density[i]/sigmaRef)/logMax;
  return {minRadius,logRange,sigmaRef,density,intensity,logMax};
}

const WGSL=/*wgsl*/`
struct Camera {matrix:mat4x4<f32>,viewport:vec2<f32>,pointSize:f32,pad:f32,visible:vec4<f32>,exposure:vec4<f32>,eyeDepth:vec4<f32>};
struct Halo {centerRadius:vec4<f32>,scale:vec4<f32>,row0:vec4<f32>,row1:vec4<f32>,row2:vec4<f32>,axes:vec4<f32>,display:vec4<f32>};
@group(0)@binding(0)var<uniform>camera:Camera;
@group(0)@binding(1)var<uniform>halo:Halo;
@group(0)@binding(2)var<storage,read>profile:array<f32>;
struct Out{@builtin(position)position:vec4<f32>,@location(0)uv:vec2<f32>};
@vertex fn vertex(@builtin(vertex_index)i:u32)->Out{
 var corners=array<vec2<f32>,6>(vec2<f32>(-1.,-1.),vec2<f32>(1.,-1.),vec2<f32>(-1.,1.),vec2<f32>(-1.,1.),vec2<f32>(1.,-1.),vec2<f32>(1.,1.));
 let normal=normalize(-camera.eyeDepth.xyz);var right=vec3<f32>(1.,0.,0.);
 if(length(normal.xy)>1e-6){right=normalize(vec3<f32>(-normal.y,normal.x,0.));}
 let up=cross(normal,right);let uv=corners[i];
 let world=halo.centerRadius.xyz+halo.centerRadius.w*(right*uv.x+up*uv.y);
 var clip=camera.matrix*vec4<f32>(world,1.);clip.z=.5*(clip.z+clip.w);
 var o:Out;o.position=clip;o.uv=uv;return o;
}
@fragment fn fragment(i:Out)->@location(0)vec4<f32>{
 let normal=normalize(-camera.eyeDepth.xyz);var right=vec3<f32>(1.,0.,0.);if(length(normal.xy)>1e-6){right=normalize(vec3<f32>(-normal.y,normal.x,0.));}let up=cross(normal,right);
 let offset=halo.centerRadius.w*(right*i.uv.x+up*i.uv.y);
 let x=vec3<f32>(dot(halo.row0.xyz,offset),dot(halo.row1.xyz,offset),dot(halo.row2.xyz,offset));let n=vec3<f32>(dot(halo.row0.xyz,normal),dot(halo.row1.xyz,normal),dot(halo.row2.xyz,normal));
 let A=dot(n*n,halo.axes.xyz);let B=dot(x*n,halo.axes.xyz);let r=sqrt(max(0.,dot(x*x,halo.axes.xyz)-B*B/A));
 if(r>=halo.display.y){discard;}
 let count=arrayLength(&profile);let index=clamp(log(max(r,halo.scale.x)/halo.scale.x)*halo.scale.y,0.,1.)*f32(count-1u);
 let lo=min(u32(index),count-2u);let sigma=mix(profile[lo],profile[lo+1u],index-f32(lo))*halo.axes.w/sqrt(A);let value=clamp(log(1.+sigma/halo.scale.w)/halo.display.x,0.,1.);
 let color=mix(vec3<f32>(.08,.19,.36),vec3<f32>(.16,.65,.68),value);
 return vec4<f32>(color,halo.scale.z*sqrt(max(0.,value)));
}
@vertex fn isoVertex(@location(0)p:vec3<f32>)->@builtin(position)vec4<f32>{var c=camera.matrix*vec4<f32>(p,1.);c.z=.5*(c.z+c.w);return c;}
@fragment fn isoFragment()->@location(0)vec4<f32>{return vec4<f32>(.25,.8,.8,.3);}`;

/** A camera-facing projected density map, not an emitting volume or new bodies. */
export class ContinuousHaloDensity {
  constructor(device,format,cameraBuffer,field){Object.assign(this,{device,format,cameraBuffer,field});}
  async initialize(){
    const {device:d,field}=this,p=continuousHaloProfile(field);this.profile=p;
    const shape=field.shape??{p:1,q:1,rotation:[[1,0,0],[0,1,0],[0,0,1]]};
    this.params=Float32Array.of(...field.center,field.outerRadius*Math.max(1,shape.p,shape.q),p.minRadius,1/p.logRange,0,p.sigmaRef,...shape.rotation.flatMap(row=>[...row,0]),1,1/shape.p**2,1/shape.q**2,(shape.active?shape.radialNormalization:1)/(shape.p*shape.q),p.logMax,field.outerRadius,0,0);
    this.uniform=d.createBuffer({size:this.params.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.buffer=d.createBuffer({size:p.density.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    d.queue.writeBuffer(this.buffer,0,p.density);
    const module=await checkedShader(d,WGSL,'Densidade projetada do halo contínuo');
    // Auto-generated layouts are exclusive to their creating pipeline. Both
    // visual layers deliberately share this explicit resource layout instead.
    const groupLayout=d.createBindGroupLayout({entries:[
      {binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
      {binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
      {binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'read-only-storage'}}
    ]});
    const layout=d.createPipelineLayout({bindGroupLayouts:[groupLayout]});
    this.pipeline=await d.createRenderPipelineAsync({layout,vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format:this.format,blend:{color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
    this.group=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[this.cameraBuffer,this.uniform,this.buffer].map((buffer,binding)=>({binding,resource:{buffer}}))});
    this.surfacePipeline=await d.createRenderPipelineAsync({layout,vertex:{module,entryPoint:'isoVertex',buffers:[{arrayStride:12,attributes:[{shaderLocation:0,offset:0,format:'float32x3'}]}]},fragment:{module,entryPoint:'isoFragment',targets:[{format:this.format,blend:{color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'line-list'}});
    const vertices=haloIsodensityVertices(field);this.surfaceCount=vertices.length/3;this.surfaceBuffer=d.createBuffer({size:vertices.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});d.queue.writeBuffer(this.surfaceBuffer,0,vertices);
  }
  draw(pass,opacity,{density=true,surface=false}={}){this.params[6]=Math.max(0,Math.min(.8,Number.isFinite(opacity)?opacity:0));this.device.queue.writeBuffer(this.uniform,0,this.params);if(density){pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.group);pass.draw(6);}if(surface){pass.setPipeline(this.surfacePipeline);pass.setBindGroup(0,this.group);pass.setVertexBuffer(0,this.surfaceBuffer);pass.draw(this.surfaceCount);}}
  dispose(){this.buffer?.destroy();this.uniform?.destroy();this.surfaceBuffer?.destroy();}
}
