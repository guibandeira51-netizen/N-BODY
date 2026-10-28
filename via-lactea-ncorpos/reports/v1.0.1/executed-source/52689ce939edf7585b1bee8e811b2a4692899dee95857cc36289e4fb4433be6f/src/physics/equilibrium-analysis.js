import {diagnostics,conservationError} from './diagnostics.js';
import {structureDiagnostics} from './structure-diagnostics.js';
import {diskAnalysis,DISK_RINGS,weightedQuantile} from './disk-analysis.js';
import {massAudit} from './mass-audit.js';
import {epicyclic} from './laboratory.js';
import {G} from './constants.js';

function interpolate(x,y,value){if(value<x[0]||value>x.at(-1))return null;let i=0;while(i<x.length-2&&x[i+1]<value)i++;const f=Math.log(value/x[i])/Math.log(x[i+1]/x[i]);return y[i]*(1-f)+y[i+1]*f;}
export function initialOrbit(state,R){
 const t=state.meta?.physicalModel?.initialOrbitTable;
 return t?{vc:interpolate(t.radiusKpc,t.vcInternal,R),kappa:interpolate(t.radiusKpc,t.kappaPerMyr,R),reference:'initial converged unsoftened AGAMA potential, frozen reference'}:{...epicyclic(R,state.meta?.withHalo!==false),reference:'historical initial unsoftened analytic potential'};
}
export function ringMembership(s){const a=new Int16Array(s.n).fill(-1);for(let i=0;i<s.n;i++)if(s.components[i]===1){const R=Math.hypot(s.positions[3*i],s.positions[3*i+1]);a[i]=DISK_RINGS.findIndex((lo,j)=>j<DISK_RINGS.length-1&&R>=lo&&R<DISK_RINGS[j+1]);}return a;}
export function equilibriumSample(s,{options={},baseline=null,initialMembership=null,diagnostic=null}={}){
 const d=diagnostic??diagnostics(s,options),structure=structureDiagnostics(s,{cylindricalEdges:DISK_RINGS,accelerations:s.accelerations}),disk=diskAnalysis(s);
 if(disk.available)for(const ring of disk.rings){const orbit=initialOrbit(s,ring.radius);ring.orbit=orbit;ring.Qconditional=ring.surfaceDensity>0&&orbit.kappa!=null?ring.sigmaR*orbit.kappa/(3.36*G*ring.surfaceDensity):null;ring.Qqualification='conditional single collisionless thin-disk proxy, initial unsoftened frequencies; thin+thick mixture, finite thickness and changing potential limit interpretation';ring.sigmaROverVc=orbit.vc>0?ring.sigmaR/orbit.vc:null;}
 let cohorts=null;
 if(initialMembership){
  if(initialMembership.length!==s.n)throw Error('Rótulos iniciais não correspondem ao estado.');
  const now=ringMembership(s),matrix=DISK_RINGS.slice(1).map(()=>Array(DISK_RINGS.length).fill(0)),stats=[];
  for(let i=0;i<s.n;i++)if(initialMembership[i]>=0)matrix[initialMembership[i]][now[i]<0?DISK_RINGS.length-1:now[i]]+=s.masses[i];
  for(let b=0;b<DISK_RINGS.length-1;b++){
   const ids=Array.from(initialMembership,(_,i)=>i).filter(i=>initialMembership[i]===b),w=ids.map(i=>s.masses[i]),heights=ids.map(i=>Math.abs(s.positions[3*i+2])),M=w.reduce((a,b)=>a+b,0),mean=M?ids.reduce((a,i)=>a+s.masses[i]*s.velocities[3*i+2]/M,0):null;
   stats.push({initialLower:DISK_RINGS[b],initialUpper:DISK_RINGS[b+1],count:ids.length,mass:M,h50Fixed:weightedQuantile(heights,w),sigmaZFixed:M?Math.sqrt(ids.reduce((a,i)=>a+s.masses[i]*(s.velocities[3*i+2]-mean)**2/M,0)):null,retainedMass:matrix[b][b],fractionRemainingInOriginalRing:M?matrix[b][b]/M:null});
  }
  cohorts={initialRingToCurrentRingMass:matrix,cohortStats:stats,overflowColumn:DISK_RINGS.length-1,qualification:'fixed initial cylindrical labels; complements instantaneous rings, no particle remapping'};
 }
 return {timeMyr:s.time??0,n:s.n,modelId:s.meta?.physicalModel?.id??'legacy-09',massAudit:massAudit(s),conservation:d,errors:baseline?conservationError(d,baseline):null,structure,disk,cohorts,qualification:'measurement, no automatic equilibrium certification'};
}
