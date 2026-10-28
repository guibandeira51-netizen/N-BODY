import {diskAnalysis,weightedQuantile,DISK_RINGS} from './disk-analysis.js';
import {equilibriumSample,ringMembership} from './equilibrium-analysis.js';
const dot=(a,b)=>a.reduce((s,x,k)=>s+x*b[k],0);
const position=(s,i)=>Array.from(s.positions.subarray(3*i,3*i+3));
function radius(s,i,plane){const p=position(s,i).map((x,k)=>x-plane.center[k]);return Math.hypot(dot(p,plane.u),dot(p,plane.v));}
export function granularityContext(s,tags){
 if(tags.length!==s.n||Array.from(tags).some(x=>!Number.isInteger(x)||x<0||x>3))throw Error('Etiquetas populacionais incompatíveis.');
 const global=ringMembership(s),populations={};
 for(const [id,name]of [[1,'thin'],[2,'thick']]){const ids=Array.from(tags,(_,i)=>i).filter(i=>tags[i]===id),a=diskAnalysis({...s,components:Uint8Array.from(tags,t=>t===id?1:0)});if(!a.available)throw Error('População sem plano mensurável.');populations[name]={ids,initialPlane:a.plane,initialRings:ids.map(i=>{const R=radius(s,i,a.plane);return DISK_RINGS.findIndex((x,k)=>k<DISK_RINGS.length-1&&R>=x&&R<DISK_RINGS[k+1]);})};}
 return {tags:Uint8Array.from(tags),global,populations};
}
function cohort(s,ids,plane,initialPlane){
 const count=ids.length;if(!count)return {count:0,sufficientSampling:false,h50:null,sigmaNormal:null,sigmaR:null};
 const weights=ids.map(i=>s.masses[i]),M=weights.reduce((a,b)=>a+b,0),h=[],hInitial=[],vn=[],vR=[],radii=[];
 for(const i of ids){const p=position(s,i).map((x,k)=>x-plane.center[k]),v=Array.from(s.velocities.subarray(3*i,3*i+3)),x=dot(p,plane.u),y=dot(p,plane.v),R=Math.hypot(x,y);radii.push(R);h.push(dot(p,plane.normal));hInitial.push(dot(position(s,i).map((x,k)=>x-initialPlane.center[k]),initialPlane.normal));vn.push(dot(v,plane.normal));vR.push(R?(x*dot(v,plane.u)+y*dot(v,plane.v))/R:0);}
 const average=x=>x.reduce((t,v,i)=>t+v*weights[i]/M,0),dispersion=x=>{const m=average(x);return Math.sqrt(x.reduce((t,v,i)=>t+(v-m)**2*weights[i]/M,0));};
 return {count,independentPairsAtMost:Math.ceil(count/2),sufficientSampling:count>=60,mass:M,h50:weightedQuantile(h.map(Math.abs),weights),h50InitialPlane:weightedQuantile(hInitial.map(Math.abs),weights),meanHeight:average(h),meanNormalVelocity:average(vn),sigmaNormal:dispersion(vn),sigmaR:dispersion(vR),R50:weightedQuantile(radii,weights)};
}
export function granularitySample(s,context,diagnostic){
 const e=equilibriumSample(s,{diagnostic,initialMembership:context.global}),populations={};
 for(const [name,c]of Object.entries(context.populations)){
  const id=name==='thin'?1:2,a=diskAnalysis({...s,components:Uint8Array.from(context.tags,t=>t===id?1:0)});if(!a.available)throw Error('Plano populacional indisponível.');
  const cohorts=DISK_RINGS.slice(0,-1).map((lo,k)=>({initialLower:lo,initialUpper:DISK_RINGS[k+1],...cohort(s,c.ids.filter((_,j)=>c.initialRings[j]===k),a.plane,c.initialPlane)}));
  populations[name]={...a,wholePopulation:cohort(s,c.ids,a.plane,c.initialPlane),fixedInitialCohorts:cohorts};
 }
 return {...e,populations,qualification:'Fixed original physical population tags and initial radial cohorts; independent population planes. count<60 is a sampling flag, not a stability threshold. Antipodal start suppresses odd modes.'};
}
