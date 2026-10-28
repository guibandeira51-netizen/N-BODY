// Audit-only controls. Production initial conditions, forces and KDK are reused.
import {createGalaxy} from '../../src/physics/initial.js';
import {createHaloExperiment} from '../../src/physics/halo-experiments.js';
import {Leapfrog} from '../../src/physics/integrator.js';
import {analyticAcceleration,analyticPotential} from '../../src/physics/models.js';
import {G,MODEL} from '../../src/physics/constants.js';
import {directEnergy} from '../../src/physics/live-energy.js';
import {diskAnalysis} from '../../src/physics/disk-analysis.js';
import {structureDiagnostics} from '../../src/physics/structure-diagnostics.js';

export const CONTROL_TYPES=['fixed-total','disk-live','all-live'];
export function selectDisk(source){
 const ids=Array.from({length:source.n},(_,i)=>i).filter(i=>source.components[i]===1),n=ids.length;
 const state={n,time:0,positions:new Float64Array(3*n),velocities:new Float64Array(3*n),accelerations:new Float64Array(3*n),masses:new Float64Array(n),components:new Uint8Array(n).fill(1),meta:{...structuredClone(source.meta),auditDiskOnly:true,originalParticleIDs:ids}};
 for(let j=0;j<n;j++){const i=ids[j];state.positions.set(source.positions.subarray(3*i,3*i+3),3*j);state.velocities.set(source.velocities.subarray(3*i,3*i+3),3*j);state.masses[j]=source.masses[i];}
 return state;
}
export function externalPotential(type,x,y,z){
 if(type==='fixed-total')return analyticPotential(x,y,z,true);
 if(type==='disk-live')return analyticPotential(x,y,z,true)+G*MODEL.diskMass/Math.hypot(x,y,MODEL.diskA+Math.hypot(z,MODEL.diskB));
 return 0;
}
export class AuditEngine extends Leapfrog {
 constructor(state,{control='all-live',...options}={}){if(!CONTROL_TYPES.includes(control))throw Error('Unknown audit control');super(state,{...options,algorithm:options.algorithm??'direct'});this.control=control;}
 force(){
  if(this.control==='all-live')return super.force();
  if(this.state.components.some(c=>c!==1))throw Error('Fixed bulge/halo controls must contain only disk particles, avoiding duplicate mass.');
  if(this.control==='fixed-total')this.state.accelerations.fill(0);else super.force();
  for(let i=0;i<this.state.n;i++){
   const k=3*i,p=this.state.positions.subarray(k,k+3),a=this.control==='fixed-total'?analyticAcceleration(...p,true):analyticAcceleration(...p,true,0).map((x,j)=>x+analyticAcceleration(...p,true,2)[j]);
   for(let j=0;j<3;j++)this.state.accelerations[k+j]+=a[j];
  }
  return this.state.accelerations;
 }
}
export function makeControl(config){
 const source=config.haloFactor?createHaloExperiment({baseN:config.n,baryonSeed:config.seed,haloCount:Math.round(config.n*.4)*config.haloFactor,haloMode:'live'}):createGalaxy({n:config.n,seed:config.seed,withHalo:true});
 const state=config.control==='all-live'?source:selectDisk(source),engine=new AuditEngine(state,config);engine.initialize();
 return {state,engine,original:source};
}
export function controlEnergy(state,config){
 if(config.control!=='fixed-total'){
  const d=directEnergy(state,config);if(config.control==='all-live')return {...d,external:0};
  let external=0;for(let i=0;i<state.n;i++){const k=3*i;external+=state.masses[i]*externalPotential(config.control,...state.positions.subarray(k,k+3));}
  return {...d,selfPotential:d.potential,external,potential:d.potential+external,energy:d.energy+external};
 }
 let kinetic=0,external=0;for(let i=0;i<state.n;i++){const k=3*i;kinetic+=.5*state.masses[i]*(state.velocities[k]**2+state.velocities[k+1]**2+state.velocities[k+2]**2);external+=state.masses[i]*externalPotential(config.control,...state.positions.subarray(k,k+3));}
 return {kinetic,potential:external,selfPotential:0,external,energy:kinetic+external,energyMethod:'K + sum m Phi_total; noninteracting tracers, no half factor'};
}
export function measureControl(state,config){
 const e=controlEnergy(state,config),disk=diskAnalysis(state),st=structureDiagnostics(state,{accelerations:state.accelerations}),d=st.components.find(c=>c.id===1);
 const angular=[0,0,0],momentum=[0,0,0];let momentumScale=0,angularScale=0,mass=0;
 for(let i=0;i<state.n;i++){
  const k=3*i,p=state.positions.subarray(k,k+3),v=state.velocities.subarray(k,k+3),m=state.masses[i],l=[m*(p[1]*v[2]-p[2]*v[1]),m*(p[2]*v[0]-p[0]*v[2]),m*(p[0]*v[1]-p[1]*v[0])];mass+=m;
  for(let j=0;j<3;j++){angular[j]+=l[j];momentum[j]+=m*v[j];}angularScale+=Math.hypot(...l);momentumScale+=m*Math.hypot(...v);
 }
 let Kz=0,Wz=0;for(let i=0;i<state.n;i++)if(state.components[i]===1){Kz+=.5*state.masses[i]*state.velocities[3*i+2]**2;Wz+=state.masses[i]*state.positions[3*i+2]*state.accelerations[3*i+2];}
 return {timeMyr:state.time??0,n:state.n,energy:e.energy,kinetic:e.kinetic,potential:e.potential,selfPotential:e.selfPotential,externalPotential:e.external,mass,
  angularMomentum:angular,angularScale,momentum,momentumScale,diskMass:d.mass,R50Kpc:d.R50,h50Kpc:disk.available?disk.instant.h50:null,h50InitialPlaneKpc:disk.available?disk.fixed.h50:null,
  sigmaNormalKpcMyr:disk.available?disk.instant.sigmaNormal:null,sigmaRKpcMyr:d.velocity.cylindrical?.dispersion?.[0]??null,
  planeTiltDegrees:disk.available?disk.plane.tiltDegrees:null,verticalVirial:{Kz,Wz,ratio:Wz<0?2*Kz/-Wz:null,secondDerivativeIz:4*Kz+2*Wz},
  radialProfile:d.profiles.cylindrical,rings:disk.available?disk.rings.map(r=>({lower:r.lower,upper:r.upper,count:r.count,mass:r.mass,h50GlobalKpc:r.globalPlane.h50,h50LocalKpc:r.localPlane?.h50??null,sigmaRKpcMyr:r.sigmaR,sigmaZKpcMyr:r.globalPlane.sigmaNormal})):[]};
}
