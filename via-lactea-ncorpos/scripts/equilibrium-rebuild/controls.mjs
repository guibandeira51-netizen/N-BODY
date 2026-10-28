import {Leapfrog} from '../../src/physics/integrator.js';
import {directEnergy} from '../../src/physics/live-energy.js';
import {equilibriumFieldAt} from '../../src/physics/equilibrium-field.js';
import {structureDiagnostics} from '../../src/physics/structure-diagnostics.js';
import {diskAnalysis} from '../../src/physics/disk-analysis.js';
import {componentRotationField} from '../../src/physics/rotation-field.js';
import {verticalFlow} from '../../src/physics/stationarity-105.js';
import {G} from '../../src/physics/constants.js';
export class RebuildControl extends Leapfrog{
 constructor(s,{control,field,epsilon=.1,dt=.1}={}){
  if(!['fixed-total','disk-live','all-live'].includes(control)||field.epsilon!==epsilon)throw Error('Control/field/softening mismatch');
  if(control==='disk-live'&&s.components.some(c=>c!==1))throw Error('Disk-live must not contain live bulge/halo');
  super(s,{epsilon,dt,algorithm:'direct'});this.control=control;this.field=field;
 }
 force(){
  if(this.control==='all-live')return super.force();
  if(this.control==='fixed-total')this.state.accelerations.fill(0);else super.force();
  for(let i=0;i<this.state.n;i++){const k=3*i,a=equilibriumFieldAt(this.field,...this.state.positions.subarray(k,k+3),this.control==='disk-live'?'spheroids':'total').acceleration;for(let j=0;j<3;j++)this.state.accelerations[k+j]+=a[j];}
  return this.state.accelerations;
 }
}
export function measureRebuild(s,engine){
 const started=performance.now(),control=engine.control,phi=new Float64Array(s.n),kin=[0,0,0],pot=[0,0,0],boundMass=[0,0,0],mass=[0,0,0];let pairE=0;
 if(control!=='fixed-total')for(let i=0;i<s.n;i++)for(let j=i+1;j<s.n;j++){
  const r2=[0,1,2].reduce((sum,k)=>sum+(s.positions[3*i+k]-s.positions[3*j+k])**2,engine.options.epsilon**2),inv=-G/Math.sqrt(r2);phi[i]+=inv*s.masses[j];phi[j]+=inv*s.masses[i];
 }
 for(let i=0;i<s.n;i++){
  const c=s.components[i],m=s.masses[i],k=3*i,K=.5*m*(s.velocities[k]**2+s.velocities[k+1]**2+s.velocities[k+2]**2),self=.5*m*phi[i],ext=control==='all-live'?0:equilibriumFieldAt(engine.field,...s.positions.subarray(k,k+3),control==='fixed-total'?'total':'spheroids').potential;
  kin[c]+=K;pot[c]+=self+m*ext;pairE+=self;mass[c]+=m;if(K/m+phi[i]+ext<0)boundMass[c]+=m;phi[i]+=ext;
 }
 const direct=control==='fixed-total'?null:directEnergy(s,{epsilon:engine.options.epsilon}),K=kin.reduce((a,b)=>a+b,0),U=pot.reduce((a,b)=>a+b,0),disk=diskAnalysis(s,{paired:true}),structure=structureDiagnostics(s,{accelerations:s.accelerations});
 const IDs=Array.from(s.components,(_,i)=>i).filter(i=>s.components[i]===1),flow=verticalFlow(IDs.map(i=>s.positions[3*i+2]),IDs.map(i=>s.velocities[3*i+2]),IDs.map(i=>s.masses[i]));
 const angular=[0,0,0];let angularScale=0;for(let i=0;i<s.n;i++){const k=3*i,p=s.positions.subarray(k,k+3),v=s.velocities.subarray(k,k+3),l=[p[1]*v[2]-p[2]*v[1],p[2]*v[0]-p[0]*v[2],p[0]*v[1]-p[1]*v[0]].map(x=>x*s.masses[i]);for(let j=0;j<3;j++)angular[j]+=l[j];angularScale+=Math.hypot(...l);}
 const particleRotation=componentRotationField(s,{epsilon:engine.options.epsilon,radii:[.5,1,2,4,8.2,12,20,30],azimuthSamples:16}),integrationRotation=particleRotation.rows.map(row=>{
  const v2=[row.v2_kpc2_Myr2.bulge,row.v2_kpc2_Myr2.disk,row.v2_kpc2_Myr2.halo];
  if(control!=='all-live')for(const c of(control==='fixed-total'?[0,1,2]:[0,2]))v2[c]=-row.R_kpc*equilibriumFieldAt(engine.field,row.R_kpc,0,0,c).acceleration[0];
  return {R:row.R_kpc,componentV2:v2,totalV2:v2.reduce((a,b)=>a+b,0),units:'kpc^2/Myr^2'};
 });
 return {timeMyr:s.time??0,n:s.n,control,energy:K+U,kinetic:K,potential:U,directSelfPotential:direct?.potential??null,pairAllocationDifference:direct?pairE-direct.potential:null,componentEnergy:kin.map((k,c)=>({component:c,kinetic:k,allocatedPotential:pot[c],energy:k+pot[c],mass:mass[c],boundMassFraction:mass[c]>0?boundMass[c]/mass[c]:null})),angularMomentum:angular,angularScale,disk,structure,flow,particleRotation,integrationRotation,measurementMs:performance.now()-started,qualification:'Per-component self U allocated by half pair energy, external U counted once; individual component energies exchange. For fixed axisymmetric field only Lz is invariant. Specific binding signs are instantaneous diagnostics, not asymptotic escape proofs. Structure energy is omitted to avoid a false half external factor; use componentEnergy.'};
}
