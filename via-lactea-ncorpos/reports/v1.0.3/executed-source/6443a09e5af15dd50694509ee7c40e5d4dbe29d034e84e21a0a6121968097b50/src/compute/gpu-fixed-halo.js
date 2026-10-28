import {GPUBackend,FORCE_WGSL,checkedShader} from './gpu.js';
import {fixedHaloTable,validateFixedHaloState} from '../physics/fixed-halo.js';
import {G} from '../physics/constants.js';

const EXTERNAL_WGSL=`
@group(0) @binding(4) var<storage,read> halo: array<vec4<f32>>;
fn fixed_halo_mass(r:f32)->f32 {
 if(r<=0.0){return 0.0;}
 let last=arrayLength(&halo)-1u;
 if(r<halo[1u].x){let ratio=r/halo[1u].x;var exponent=2.0;if(halo[0u].w>0.0){exponent=3.0;}return halo[1u].y*pow(ratio,exponent);}
 if(r>=halo[last].x){return halo[last].y;}
 var lo=1u;var hi=last;
 loop {if(hi-lo<=1u){break;}let mid=(lo+hi)/2u;if(halo[mid].x>r){hi=mid;}else{lo=mid;}}
 let u=(r-halo[lo].x)/(halo[hi].x-halo[lo].x);
 return mix(halo[lo].y,halo[hi].y,u);
}
`;
/** Diagnostic backend only. The production live-halo kernel remains unmodified. */
export class GPUFixedHaloBackend extends GPUBackend {
  async createPipelines(){
    await super.createPipelines();const d=this.device;d.pushErrorScope('validation');
    try{
      const marker='  if (validParticle) { accelerations[i] = vec4<f32>(acceleration, 0.0); }';
      if(!FORCE_WGSL.includes(marker))throw Error('Ponto de extensão do kernel não encontrado.');
      const source=FORCE_WGSL.replace(marker,`if(validParticle){let r=length(own);if(r>0.0){acceleration-=params.gravity*fixed_halo_mass(r)*own/(r*r*r);}accelerations[i]=vec4<f32>(acceleration,0.0);}`)+EXTERNAL_WGSL;
      const module=await checkedShader(d,source,'Plummer baryons + finite fixed NFW');
      this.forceLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}}]});
      this.forcePipeline=await d.createComputePipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.forceLayout]}),compute:{module,entryPoint:'force'}});
    }catch(e){await d.popErrorScope();throw e;}
    const error=await d.popErrorScope();if(error)throw Error(error.message);
  }
  async initialize(state,options={}){
    validateFixedHaloState(state);if(options.G!==undefined&&options.G!==G)throw Error('Halo fixo usa G físico do modelo.');
    this.haloTable=options.haloTable??fixedHaloTable();const t=this.haloTable,data=new Float32Array(4*t.radius.length);
    for(let i=0;i<t.radius.length;i++)data.set([t.radius[i],t.mass[i],t.potential[i],t.softening],4*i);
    this.fixedHaloBuffer?.destroy();this.fixedHaloBuffer=this.device.createBuffer({label:'NFW finite spherical field',size:data.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(this.fixedHaloBuffer,0,data);
    return super.initialize(state,options);
  }
  forceEntries(entries){return [...entries,{binding:4,resource:{buffer:this.fixedHaloBuffer}}];}
  dispose(){this.fixedHaloBuffer?.destroy();super.dispose();}
}
