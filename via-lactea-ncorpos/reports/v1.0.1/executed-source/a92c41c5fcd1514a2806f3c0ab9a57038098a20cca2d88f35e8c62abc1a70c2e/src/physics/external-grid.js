import {Leapfrog} from './integrator.js';
import {diagnostics} from './diagnostics.js';
import {G} from './constants.js';

export function validateExternalGrid(t){
 if(t?.schema!=='axisymmetric-potential-hermite-v1'||!Number.isInteger(t.nu)||!Number.isInteger(t.nv)||t.nu<3||t.nv<3||t.values?.length!==t.nu*t.nv*4||![t.du,t.dv,t.rscale,t.zscale,t.massInternal].every(x=>Number.isFinite(x)&&x>0)||!Array.from(t.values).every(Number.isFinite))throw Error('Tabela de potencial externo inválida.');
 return t;
}
const basis=t=>[2*t*t*t-3*t*t+1,-2*t*t*t+3*t*t,t*t*t-2*t*t+t,t*t*t-t*t];
const deriv=t=>[6*t*t-6*t,-6*t*t+6*t,3*t*t-4*t+1,3*t*t-2*t];
/** Phi and both forces derive from ONE interpolated scalar potential.
 * Tensor Hermite interpolation in u=log1p(R/rscale),v=log1p(|z|/zscale).
 */
export function externalGridAt(t,x,y,z){
 const R=Math.hypot(x,y),az=Math.abs(z),u=Math.log1p(R/t.rscale),v=Math.log1p(az/t.zscale);
 if(u>t.du*(t.nu-1)||v>t.dv*(t.nv-1)){
  const r=Math.hypot(R,z),f=r?-G*t.massInternal/r**3:0;
  return {potential:r?-G*t.massInternal/r:0,acceleration:[f*x,f*y,f*z],extrapolated:true};
 }
 const fu=u/t.du,fv=v/t.dv,i=Math.min(t.nu-2,Math.floor(fu)),j=Math.min(t.nv-2,Math.floor(fv)),a=basis(fu-i),b=basis(fv-j),da=deriv(fu-i),db=deriv(fv-j);
 let phi=0,dU=0,dV=0;
 for(let p=0;p<4;p++)for(let q=0;q<4;q++){
  const idx=4*((i+p%2)*t.nv+j+q%2)+(p>=2?1:0)+(q>=2?2:0),val=t.values[idx]*(p>=2?t.du:1)*(q>=2?t.dv:1);
  phi+=a[p]*b[q]*val;dU+=da[p]*b[q]*val/t.du;dV+=a[p]*db[q]*val/t.dv;
 }
 const fR=-dU/(R+t.rscale),fz=z===0?0:-Math.sign(z)*dV/(az+t.zscale);
 return {potential:phi,acceleration:[R?fR*x/R:0,R?fR*y/R:0,fz],extrapolated:false};
}
export function assertExternalState(s,t){validateExternalGrid(t);if(s.components.some((c,i)=>c===2&&s.masses[i]>0))throw Error('Halo externo exige ausência de partículas massivas de halo.');if(s.meta?.physicalModel?.id!==t.modelId)throw Error('Tabela de halo pertence a outro modelo físico.');}
export function addExternalGrid(s,t){for(let i=0;i<s.n;i++){const k=3*i,a=externalGridAt(t,...s.positions.subarray(k,k+3)).acceleration;for(let j=0;j<3;j++)s.accelerations[k+j]+=a[j];}return s.accelerations;}
export function externalGridDiagnostics(s,options,t){
 assertExternalState(s,t);const d=diagnostics(s,options);let externalPotential=0,extrapolated=0;
 for(let i=0;i<s.n;i++){const q=externalGridAt(t,...s.positions.subarray(3*i,3*i+3));externalPotential+=s.masses[i]*q.potential;extrapolated+=q.extrapolated?1:0;}
 return {...d,selfPotential:d.potential,externalPotential,potential:d.potential+externalPotential,energy:d.kinetic+d.potential+externalPotential,externalField:{modelId:t.modelId,type:'frozen converged AGAMA halo, axisymmetric scalar potential',interpolation:t.validation,softening:0,extrapolated,energy:'self potential + sum m Phi_ext, no half factor',momentumConserved:false,angularMomentumConserved:'Lz only in the ideal axisymmetric field'}};
}
export class ExternalGridLeapfrog extends Leapfrog {
 constructor(s,options={}){super(s,options);assertExternalState(s,options.externalGrid);this.externalGrid=options.externalGrid;}
 force(){super.force();return addExternalGrid(this.state,this.externalGrid);}
}
