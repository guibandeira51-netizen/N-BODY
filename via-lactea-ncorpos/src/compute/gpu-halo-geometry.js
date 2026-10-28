import{LiveGPUBackend,PAIR_ENERGY_WGSL,ROTATION_WGSL}from'./gpu-live.js';
import{checkedShader}from'./gpu.js';
import{assertGeometryState,createHaloGeometry,haloGeometryBuffer}from'../physics/halo-geometry.js';
const SPHERICAL_HALO_WGSL=`
@group(0) @binding(4) var<storage,read> halo:array<vec4<f32>>;
fn halo_spherical_acc(p:vec3<f32>)->vec3<f32>{
 let d=p-halo[1].xyz;let r=length(d);if(r==0.0){return vec3<f32>(0.0);}var mass=0.0;
 if(r<=halo[0].z){let x=r/halo[0].x;var f=0.0;if(x<0.2){f=x*x*(0.5+x*(-0.6666666666667+x*(0.75+x*(-0.8+x*(0.8333333333333+x*(-0.8571428571429+x*(0.875+x*(-0.8888888888889+x*(0.9+x*(-0.9090909090909+x*0.9166666666667))))))))));}else{f=log(1.0+x)-x/(1.0+x);}mass=halo[0].y*f;}
 else if(r>=halo[0].w){mass=halo[1].w;}
 else{var lo=3u;var hi=u32(halo[2].y)+2u;loop{if(hi-lo<=1u){break;}let mid=(lo+hi)/2u;if(halo[mid].x>r){hi=mid;}else{lo=mid;}}let t=(r-halo[lo].x)/(halo[hi].x-halo[lo].x);mass=halo[lo].y+t*(halo[hi].y-halo[lo].y);}
 return d*(-params.gravity*mass/(r*r*r));
}`;

const ELLIPSOID_WGSL=`
fn halo_rho(r:f32)->f32{
 if(r>=halo[0].w||r<=0.0){return 0.0;}
 if(r<=halo[0].z){return halo[0].y/(12.56637061435917*r*(r+halo[0].x)*(r+halo[0].x));}
 var lo=3u;var hi=u32(halo[2].y)+2u;
 loop{if(hi-lo<=1u){break;}let mid=(lo+hi)/2u;if(halo[mid].x>r){hi=mid;}else{lo=mid;}}
 return (halo[hi].y-halo[lo].y)/(halo[hi].x-halo[lo].x)/(12.56637061435917*r*r);
}
fn halo_acc(p:vec3<f32>)->vec3<f32>{
 let base=halo_spherical_acc(p);if(halo[2].w<0.5){return base;}
 let start=u32(halo[2].z);let row0=halo[start+1u].xyz;let row1=halo[start+2u].xyz;let row2=halo[start+3u].xyz;
 let d=p-halo[1].xyz;let x=vec3<f32>(dot(row0,d),dot(row1,d),dot(row2,d));let r=length(x);if(r==0.0){return base;}
 var correction=vec3<f32>(0.0);
 for(var j=0u;j<u32(halo[start].z);j++){
  let a=halo[start+4u+2u*j];let b=halo[start+5u+2u*j];let ratios=vec3<f32>(a.z,a.w,b.x);let m=sqrt(dot(x*x,ratios));
  correction+=a.y*ratios*halo_rho(m)-vec3<f32>(b.y*b.z*halo_rho(r*a.x));
 }
 correction*=-12.56637061435917*params.gravity*x;
 var normalizedBase=base;let radius=length(d);if(radius>halo[0].z){normalizedBase-=params.gravity*halo[start+1u].w*d/(radius*radius*radius);}return halo[start].w*(normalizedBase+row0*correction.x+row1*correction.y+row2*correction.z);
}`;
export const HALO_GEOMETRY_WGSL=SPHERICAL_HALO_WGSL+ELLIPSOID_WGSL;
export const GEOMETRY_FORCE_WGSL=PAIR_ENERGY_WGSL.replace('vec4<f32>(acceleration, 0.5 * positions[i].w * phi)','vec4<f32>(acceleration+halo_acc(own), 0.5 * positions[i].w * phi)')+HALO_GEOMETRY_WGSL;
export const GEOMETRY_ROTATION_WGSL=ROTATION_WGSL.replace('fields[i]=vec4<f32>(radial,0.0);','let h=halo_acc(vec3<f32>(probe.xy,0.0));radial[2]+=dot(h.xy,probe.zw);fields[i]=vec4<f32>(radial,0.0);')+HALO_GEOMETRY_WGSL.replace('@binding(4)','@binding(5)');
// Extra binding is a read-only finite NFW mass table; pair force/KDK unchanged.
export class GeometryHaloGPUBackend extends LiveGPUBackend{
 get rotationShader(){return GEOMETRY_ROTATION_WGSL;}
 rotationBindings(bindings){return[...bindings,this.geometryBuffer];}
 async createPipelines(){
  await super.createPipelines();const d=this.device,module=await checkedShader(d,GEOMETRY_FORCE_WGSL,'Bariões Plummer + halo NFW Newtoniano');
  this.forceLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}}]});
  this.forcePipeline=await d.createComputePipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.forceLayout]}),compute:{module,entryPoint:'force'}});
 }
 async initialize(state,options={}){
  assertGeometryState(state);this.haloField=options.haloField??state.meta?.haloField??createHaloGeometry();const data=haloGeometryBuffer(this.haloField);
  this.geometryBuffer?.destroy();this.geometryBuffer=this.device.createBuffer({label:'NFW contínuo finito · geometria física',size:data.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(this.geometryBuffer,0,data);
  await super.initialize(state,options);this.effectiveParameters.haloField=this.haloField;this.effectiveParameters.haloRepresentation='geometry';return this;
 }
 forceEntries(entries){return[...entries,{binding:4,resource:{buffer:this.geometryBuffer}}];}
 async snapshot(){const state=await super.snapshot();state.gpuRotationField.parameters.haloField=this.haloField;state.gpuRotationField.method+=' Halo: continuous finite Newtonian NFW density source, GPU Float32, no halo macroparticles.';state.gpuRotationField.haloRepresentation='geometry';return state;
 }
 dispose(){this.geometryBuffer?.destroy();super.dispose();}
}
