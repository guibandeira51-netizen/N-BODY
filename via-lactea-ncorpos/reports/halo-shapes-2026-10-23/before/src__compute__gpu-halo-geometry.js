import{LiveGPUBackend,PAIR_ENERGY_WGSL,ROTATION_WGSL}from'./gpu-live.js';
import{checkedShader}from'./gpu.js';
import{assertGeometryState,createHaloGeometry,haloGeometryBuffer}from'../physics/halo-geometry.js';
export const HALO_GEOMETRY_WGSL=`
@group(0) @binding(4) var<storage,read> halo:array<vec4<f32>>;
fn halo_acc(p:vec3<f32>)->vec3<f32>{
 let d=p-halo[1].xyz;let r=length(d);if(r==0.0){return vec3<f32>(0.0);}var mass=0.0;
 if(r<=halo[0].z){let x=r/halo[0].x;var f=0.0;if(x<0.2){f=x*x*(0.5+x*(-0.6666666666667+x*(0.75+x*(-0.8+x*(0.8333333333333+x*(-0.8571428571429+x*(0.875+x*(-0.8888888888889+x*(0.9+x*(-0.9090909090909+x*0.9166666666667))))))))));}else{f=log(1.0+x)-x/(1.0+x);}mass=halo[0].y*f;}
 else if(r>=halo[0].w){mass=halo[1].w;}
 else{var lo=3u;var hi=u32(halo[2].y)+2u;loop{if(hi-lo<=1u){break;}let mid=(lo+hi)/2u;if(halo[mid].x>r){hi=mid;}else{lo=mid;}}let t=(r-halo[lo].x)/(halo[hi].x-halo[lo].x);mass=halo[lo].y+t*(halo[hi].y-halo[lo].y);}
 return d*(-params.gravity*mass/(r*r*r));
}`;
export const GEOMETRY_FORCE_WGSL=PAIR_ENERGY_WGSL.replace('vec4<f32>(acceleration, 0.5 * positions[i].w * phi)','vec4<f32>(acceleration+halo_acc(own), 0.5 * positions[i].w * phi)')+HALO_GEOMETRY_WGSL;
export const GEOMETRY_ROTATION_WGSL=ROTATION_WGSL.replace('fields[i]=vec4<f32>(radial,0.0);','let h=halo_acc(vec3<f32>(probe.xy,0.0));radial[2]+=dot(h.xy,probe.zw);fields[i]=vec4<f32>(radial,0.0);')+HALO_GEOMETRY_WGSL.replace('@binding(4)','@binding(5)');
// Extra binding is a read-only finite NFW mass table; pair force/KDK unchanged.
export class GeometryHaloGPUBackend extends LiveGPUBackend{
 get rotationShader(){return GEOMETRY_ROTATION_WGSL;}
 rotationBindings(bindings){return[...bindings,this.geometryBuffer];}
 async createPipelines(){
  await super.createPipelines();const d=this.device,module=await checkedShader(d,GEOMETRY_FORCE_WGSL,'Bariões Plummer + geodésicas lentas NFW');
  this.forceLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}}]});
  this.forcePipeline=await d.createComputePipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.forceLayout]}),compute:{module,entryPoint:'force'}});
 }
 async initialize(state,options={}){
  assertGeometryState(state);this.haloField=options.haloField??state.meta?.haloField??createHaloGeometry();const data=haloGeometryBuffer(this.haloField);
  this.geometryBuffer?.destroy();this.geometryBuffer=this.device.createBuffer({label:'NFW contínuo finito · fonte da métrica',size:data.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(this.geometryBuffer,0,data);
  await super.initialize(state,options);this.effectiveParameters.haloField=this.haloField;this.effectiveParameters.haloRepresentation='geometry';return this;
 }
 forceEntries(entries){return[...entries,{binding:4,resource:{buffer:this.geometryBuffer}}];}
 async snapshot(){const state=await super.snapshot();state.gpuRotationField.parameters.haloField=this.haloField;state.gpuRotationField.method+=' Halo: continuous finite NFW weak-field source, GPU Float32, no halo macroparticles.';state.gpuRotationField.haloRepresentation='geometry';return state;
 }
 dispose(){this.geometryBuffer?.destroy();super.dispose();}
}
