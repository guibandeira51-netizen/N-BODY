import{G as DEFAULT_G,KM_S_TO_KPC_MYR}from'./constants.js';
import{R200}from'./models.js';
import{haloGeometryAt,sphericalHaloAt}from'./halo-geometry.js';
import{fromPrincipal}from'./halo-ellipsoid.js';
import{gaussLegendre}from'./equilibrium-field.js';
import{EILERS_2019}from'../observations/eilers2019.js';
export const SCIENCE_AZIMUTHS=16;
export const SCIENCE_MASS_RADII=Object.freeze([.5,1,2,3,4,5,6,8,10,12,15,20,25,30,40,60,80,120,160,210,260,350,500]);
const rule=gaussLegendre(24);
/** Passive probes only. Fixed initial origin/axes match the existing live rotation diagnostic. */
export function scienceProbePlan(){
 const groups=[],probes=[];
 function add(kind,R,z=0){const start=probes.length/4;for(let a=0;a<SCIENCE_AZIMUTHS;a++){const phi=2*Math.PI*a/SCIENCE_AZIMUTHS;probes.push(R*Math.cos(phi),R*Math.sin(phi),z,0);}groups.push({kind,R,z,start,count:SCIENCE_AZIMUTHS});}
 for(const row of EILERS_2019.rows)add('rotation',row.R_kpc);
 for(let i=0;i<=18;i++){const R=4.5+.25*i;add('vertical+',R,1.1);add('vertical-',R,-1.1);}
 for(let i=0;i<=16;i++)add('escape',4+.5*i);
 add('boundary',2*R200);
 return{groups,probes:new Float32Array(probes),azimuthSamples:SCIENCE_AZIMUTHS,boundaryKpc:2*R200};
}
export function directProbeValues(state,probes,{G=DEFAULT_G,epsilonSquared=.01}={}){
 const out=new Float64Array(probes.length*2);
 for(let i=0;i<probes.length/4;i++)for(let j=0;j<state.n;j++){
  const d=[0,1,2].map(k=>state.positions[3*j+k]-probes[4*i+k]),r2=d.reduce((s,v)=>s+v*v,epsilonSquared),inv=1/Math.sqrt(r2),mass=state.masses[j],f=G*mass*inv**3;
  for(const offset of state.components[j]===2?[0]:[0,4]){for(let k=0;k<3;k++)out[8*i+offset+k]+=f*d[k];out[8*i+offset+3]-=G*mass*inv;}
 }
 return out;
}
function lowerBound(array,x){let lo=0,hi=array.length;while(lo<hi){const m=(lo+hi)>>>1;if(array[m]<x)lo=m+1;else hi=m;}return lo;}
function sphericalMass(field,r){const d=sphericalHaloAt([field.center[0]+r,field.center[1],field.center[2]],field,1);return d.enclosedMass;}
/** Density in true spheres about the fixed initial origin, including an off-centre ellipsoid.
 * Transform to principal spherical shells, then integrate only the volume inside r.
 * Radial integration uses mass-table differences, not noisy density derivatives. */
export function continuousMassInSpheres(field,radii){
 const s=field.shape??{p:1,q:1,rotation:[[1,0,0],[0,1,0],[0,0,1]]},norm=s.active?s.radialNormalization:1,delta=s.active?s.tableJoinMassDifference:0;
 const c=field.center,cc=c.reduce((v,x)=>v+x*x,0),result=radii.map(()=>0),azimuth=48;
 for(let j=0;j<rule.x.length;j++)for(let a=0;a<azimuth;a++){
  const mu=rule.x[j],phi=2*Math.PI*(a+.5)/azimuth,t=Math.sqrt(1-mu*mu),v=fromPrincipal([t*Math.cos(phi),s.p*t*Math.sin(phi),s.q*mu],s),A=v.reduce((z,x)=>z+x*x,0),B=v.reduce((z,x,k)=>z+x*c[k],0),weight=rule.w[j]/(2*azimuth);
  const mass=m=>{if(m<=0)return 0;const base=sphericalMass(field,m);return norm*(base+(m<=field.r200?0:delta));};
  for(let i=0;i<radii.length;i++){const disc=B*B-A*(cc-radii[i]**2);if(disc<=0)continue;const root=Math.sqrt(disc),lo=Math.max(0,(-B-root)/A),hi=Math.max(0,(-B+root)/A);result[i]+=weight*(mass(hi)-mass(lo));}
 }
 return result;
}
export function enclosedMassProfile(state,field=null,radii=SCIENCE_MASS_RADII){
 const bins=Array.from({length:3},()=>new Float64Array(radii.length+1)),totals=[0,0,0];
 for(let j=0;j<state.n;j++){const r=Math.hypot(...state.positions.subarray(3*j,3*j+3)),c=state.components[j],m=state.masses[j];bins[c][lowerBound(radii,r)]+=m;totals[c]+=m;}
 for(const b of bins)for(let i=1;i<b.length;i++)b[i]+=b[i-1];
 const external=field?continuousMassInSpheres(field,radii):radii.map(()=>0);
 return{originKpc:[0,0,0],geometry:'true enclosed spheres; not R vc²/G; ellipsoidal halo integrated over sphere',continuousHaloQuadrature:field?{polarOrder:24,azimuthSamples:48,qualification:'finite angular quadrature, not a certified continuum error bar'}:null,totalSourceMass:totals.reduce((a,b)=>a+b,0)+(field?.totalMass??0),rows:radii.map((r,i)=>({R_kpc:r,bulge:bins[0][i],disk:bins[1][i],halo:bins[2][i]+external[i],baryons:bins[0][i]+bins[1][i],total:bins[0][i]+bins[1][i]+bins[2][i]+external[i]}))};
}
export function observationalDiagnostics(state,raw,parameters,plan=scienceProbePlan()){
 const start=performance.now(),values=Float64Array.from(raw),field=parameters.haloField??null,G=parameters.G;
 if(!(G>0)||!Number.isFinite(G)||!Number.isFinite(state.time))throw Error('G e época física inválidos no diagnóstico observacional.');
 if(raw.length!==plan.probes.length*2||!values.every(Number.isFinite))throw Error('Sondas observacionais incompletas ou não finitas.');
 if(field)for(let i=0;i<plan.probes.length/4;i++){const x=Array.from(plan.probes.subarray(4*i,4*i+3)),h=haloGeometryAt(x,field,G);for(let k=0;k<3;k++)values[8*i+k]+=h.acceleration[k];values[8*i+3]+=h.potential;}
 const average=(group,offset,fn)=>{let sum=0;for(let a=0;a<group.count;a++){const i=group.start+a;sum+=fn(Array.from(values.subarray(8*i+offset,8*i+offset+4)),Array.from(plan.probes.subarray(4*i,4*i+3)));}return sum/group.count;};
 const rotation=[],vertical=[],escape=[];
 const bound=plan.groups.find(g=>g.kind==='boundary'),boundPhi=[0,4].map(offset=>average(bound,offset,v=>v[3]));
 for(const g of plan.groups){
  if(g.kind==='rotation'){const row={R_kpc:g.R};for(const[key,offset]of[['total',0],['baryons',4]]){const ar=average(g,offset,(v,p)=>(v[0]*p[0]+v[1]*p[1])/Math.hypot(p[0],p[1])),v2=-g.R*ar;row[key]=v2>=0?Math.sqrt(v2)/KM_S_TO_KPC_MYR:null;}rotation.push(row);}
  if(g.kind==='vertical+'){const minus=plan.groups.find(s=>s.kind==='vertical-'&&s.R===g.R),row={R_kpc:g.R};for(const[key,offset]of[['total',0],['baryons',4]])row[key]=(-average(g,offset,v=>v[2])+average(minus,offset,v=>v[2]))/2/(2*Math.PI*G)*1e4;vertical.push(row);}
  if(g.kind==='escape'){const row={R_kpc:g.R};for(const[key,offset,index]of[['total',0,0],['baryons',4,1]]){const diff=2*(boundPhi[index]-average(g,offset,v=>v[3]));row[key]=diff>=0?Math.sqrt(diff)/KM_S_TO_KPC_MYR:null;}escape.push(row);}
 }
 const residuals=EILERS_2019.rows.map((o,i)=>({R_kpc:o.R_kpc,observed:o.vc_km_s,minus:o.stat_minus_km_s,plus:o.stat_plus_km_s,total:rotation[i].total===null?null:o.vc_km_s-rotation[i].total,baryons:rotation[i].baryons===null?null:o.vc_km_s-rotation[i].baryons}));
 const rms=key=>{const p=residuals.map(r=>r[key]).filter(Number.isFinite);return p.length?Math.sqrt(p.reduce((s,x)=>s+x*x,0)/p.length):null;};
 return{schema:'live-observational-diagnostics-v1',codeVersion:'live-observational-v6',timeMyr:state.time,n:state.n,parameters,azimuthSamples:plan.azimuthSamples,rotation,residuals,residualRMS:{total:rms('total'),baryons:rms('baryons')},vertical,escape,mass:enclosedMassProfile(state,field),boundaryKpc:plan.boundaryKpc,workerCostMs:performance.now()-start,methods:{rotation:'direct probes at exact Eilers radii; no interpolation of observations',vertical:'signed restoring acceleration averaged at z=+/-1.1 kpc and azimuth; Kz/(2πG) in Msun/pc², not actual surface density',escape:'sqrt(2*(mean Phi at 2 R200 - mean local Phi)); instantaneous frozen-potential depth proxy, not an escape invariant in an evolving field',mass:'component masses inside true spheres, instantaneous particles plus static halo density',comparison:'Same-snapshot removal of halo contribution only; not a separate re-equilibrated baryon-only trajectory. Fixed initial origin/axes. Baryonic parameters not fitted; gas absent; observational systematics not calibrated. No invented uncertainty band or significance.'}};
}
