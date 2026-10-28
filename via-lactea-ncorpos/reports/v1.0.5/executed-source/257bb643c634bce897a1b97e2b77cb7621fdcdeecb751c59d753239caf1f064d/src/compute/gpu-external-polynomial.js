import {GPUBackend,FORCE_WGSL,checkedShader} from './gpu.js';
import {assertExternalState} from '../physics/external-grid.js';
import {polynomialGrid} from '../physics/external-grid-polynomial.js';
const FIELD=`
@group(0) @binding(4) var<storage,read> field:array<vec4<f32>>;
fn external_acc(pos:vec3<f32>)->vec3<f32>{
 let dims=field[0];let scales=field[1];let nu=u32(dims.x);let nv=u32(dims.y);let R=length(pos.xy);let z=abs(pos.z);
 let u=log(1+R/scales.x);let v=log(1+z/scales.y);
 if(u>dims.z*f32(nu-1u)||v>dims.w*f32(nv-1u)){let r=length(pos);if(r>0){return -params.gravity*scales.z*pos/(r*r*r);}return vec3<f32>(0);}
 let fu=u/dims.z;let fv=v/dims.w;let i=min(nu-2u,u32(floor(fu)));let j=min(nv-2u,u32(floor(fv)));let a=fu-f32(i);let b=fv-f32(j);let idx=2u+4u*(i*(nv-1u)+j);
 let B=vec4<f32>(1,b,b*b,b*b*b);let DB=vec4<f32>(0,1,2*b,3*b*b);
 let c1=dot(field[idx+1u],B);let c2=dot(field[idx+2u],B);let c3=dot(field[idx+3u],B);
 let dU=(c1+a*(2*c2+3*a*c3))/dims.z;
 let dV=(dot(field[idx],DB)+a*(dot(field[idx+1u],DB)+a*(dot(field[idx+2u],DB)+a*dot(field[idx+3u],DB))))/dims.w;
 let fr=-dU/(R+scales.x);let fz=-sign(pos.z)*dV/(z+scales.y);if(R>0){return vec3<f32>(fr*pos.x/R,fr*pos.y/R,fz);}return vec3<f32>(0,0,fz);
}
`;
/** Experimental v1.0.3 external-field precision correction. Same direct pair
 * shader and KDK; only evaluation form of the fixed scalar field is changed.
 */
export class GPUExternalPolynomialBackend extends GPUBackend{
 async createPipelines(){await super.createPipelines();const d=this.device,marker='  if (validParticle) { accelerations[i] = vec4<f32>(acceleration, 0.0); }';if(!FORCE_WGSL.includes(marker))throw Error('Extensão de campo indisponível');const module=await checkedShader(d,FORCE_WGSL.replace(marker,'if(validParticle){accelerations[i]=vec4<f32>(acceleration+external_acc(own),0.0);}')+FIELD,'v103 fixed Plummer scalar polynomial');this.forceLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}}]});this.forcePipeline=await d.createComputePipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.forceLayout]}),compute:{module,entryPoint:'force'}});}
 async initialize(s,options={}){assertExternalState(s,options.externalGrid);const data=polynomialGrid(options.externalGrid);this.externalGridBuffer?.destroy();this.externalGridBuffer=this.device.createBuffer({label:'v103 stable scalar polynomial coefficients',size:data.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(this.externalGridBuffer,0,data);return super.initialize(s,options);}
 forceEntries(entries){return [...entries,{binding:4,resource:{buffer:this.externalGridBuffer}}];}
 dispose(){this.externalGridBuffer?.destroy();super.dispose();}
}
