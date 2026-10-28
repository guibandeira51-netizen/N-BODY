// Isolated leading-order GR investigation. No imports from the live N-body engine.
import {G,MODEL,KM_S_TO_KPC_MYR,KPC_METERS,MYR_SECONDS} from '../physics/constants.js';
import {analyticAcceleration,analyticPotential,hernquistDensity,diskDensity,haloDensity,HALO_TOTAL_MASS,R200,HALO_OUTER_RADIUS} from '../physics/models.js';
export const C_SI=299792458;
export const C=C_SI*MYR_SECONDS/KPC_METERS;
export const SOURCES=Object.freeze([
 {name:'Carroll (1997), cap. 6: equações linearizadas e campo fraco',url:'https://preposterousuniverse.com/wp-content/uploads/grnotes-six.pdf'},
 {name:'Carroll (1997), cap. 7: vácuo e Schwarzschild',url:'https://preposterousuniverse.com/wp-content/uploads/grnotes-seven.pdf'},
 {name:'Ciotti (2022): discos, RG e gravitomagnetismo',url:'https://arxiv.org/abs/2207.09736'},
 {name:'Lasenby, Hobson e Barker (2023): revisão crítica do gravitomagnetismo galáctico',url:'https://www.repository.cam.ac.uk/handle/1810/358049'},
 {name:'Bartelmann e Maturi (2017): lenteamento fraco',url:'https://arxiv.org/abs/1612.06535'},
 {name:'Cooperstock e Tieu (2005): proposta de interpretação relativística',url:'https://arxiv.org/abs/astro-ph/0507619'},
 {name:'Korzyński (2005): fonte singular na proposta acima',url:'https://arxiv.org/abs/astro-ph/0508377'},
 {name:'BIPM: velocidade da luz exata no SI',url:'https://www.bipm.org/en/si-base-units/metre'}
]);
export const ASSUMPTIONS=Object.freeze({
 theory:'Einstein GR, Lambda=0 local isolated approximation; no extra fields',
 metric:'ds2=-(1+2Phi/c2)c2dt2+(1-2Psi/c2)(dx2+dy2+dz2), Phi=Psi at leading scalar order',
 source:'Nonrelativistic baryonic rest-mass density; pressure, mass-current and nonlinear metric terms not computed',
 boundary:'Regular field away from the central cusp, isolated potential tending to zero at infinity; no imposed incoming radiation',
 dynamics:'Slow test particles: d2x/dt2=-grad(Phi), leading Newtonian order of GR, not a full geodesic/Einstein solver',
 lensing:'Born approximation, line of sight along z, face-on disk; physical deflection at infinity, not image positions, shear or an observed lens',
 comparison:'Additional material NFW halo from existing models.js; not an emergent vacuum solution',
 excluded:'No self-gravitating particle evolution, backreaction, equilibrium/stability certification or full 1PN solution'
});
export function rotationAt(R){
 if(!Number.isFinite(R)||R<=0)throw Error('Raio positivo e finito necessário.');
 const v2=[0,1,2].map(c=>-R*analyticAcceleration(R,0,0,true,c)[0]);
 const baryonV2=v2[0]+v2[1],totalV2=baryonV2+v2[2];
 return{R_kpc:R,bulge_km_s:Math.sqrt(v2[0])/KM_S_TO_KPC_MYR,disk_km_s:Math.sqrt(v2[1])/KM_S_TO_KPC_MYR,halo_km_s:Math.sqrt(v2[2])/KM_S_TO_KPC_MYR,
  baryons_km_s:Math.sqrt(baryonV2)/KM_S_TO_KPC_MYR,grLeading_km_s:Math.sqrt(baryonV2)/KM_S_TO_KPC_MYR,total_km_s:Math.sqrt(totalV2)/KM_S_TO_KPC_MYR,
  absPhiBaryons_over_c2:Math.abs(analyticPotential(R,0,0,false))/C**2,vBaryons2_over_c2:baryonV2/C**2,halo_over_baryonic_acceleration:v2[2]/baryonV2};
}
export function inferredDensity(position,withHalo=false,h=.02){
 if(!Number.isFinite(h)||h<=0||position.length!==3||!position.every(Number.isFinite))throw Error('Posição e passo espacial inválidos.');
 const center=analyticPotential(...position,withHalo);let lap=0;
 for(let k=0;k<3;k++){const lo=position.slice(),hi=position.slice();lo[k]-=h;hi[k]+=h;lap+=(analyticPotential(...lo,withHalo)-2*center+analyticPotential(...hi,withHalo))/h**2;}
 return lap/(4*Math.PI*G);
}
export function sourceCheck(position,h){
 const [x,y,z]=position,r=Math.hypot(x,y,z),baryons=hernquistDensity(r)+diskDensity(Math.hypot(x,y),z),halo=haloDensity(r);
 const inferredBaryons=inferredDensity(position,false,h),inferredTotal=inferredDensity(position,true,h);
 return{x_kpc:x,y_kpc:y,z_kpc:z,h_kpc:h,rho_baryons:baryons,rho_halo:halo,rho_inferred_baryons:inferredBaryons,rho_inferred_total:inferredTotal,
  residual_baryons:inferredBaryons-baryons,extra_source_if_halo_field:inferredTotal-baryons,extra_source_relative_residual:(inferredTotal-baryons-halo)/halo,halo_laplacian_relative_residual:(inferredTotal-inferredBaryons-halo)/halo};
}
// Simpson integration maps z=b*tan(theta) from [0,infinity) to [0,pi/2].
// At infinity the transformed transverse acceleration tends to zero for finite mass.
export function lightDeflection(b,acceleration,intervals=512,breakRadii=[]){
 if(!Number.isFinite(b)||b<=0||!Number.isSafeInteger(intervals)||intervals<2||intervals%2)throw Error('Impacto positivo e número par de intervalos necessários.');
 const cuts=[0,...breakRadii.filter(r=>r>b).map(r=>Math.acos(b/r)),Math.PI/2].sort((a,b)=>a-b);let integral=0;
 for(let k=1;k<cuts.length;k++){
  const step=(cuts[k]-cuts[k-1])/intervals;let sum=0,compensation=0;
  for(let i=0;i<=intervals;i++){const theta=cuts[k-1]+i*step,cos=Math.cos(theta),value=theta>=Math.PI/2?0:-acceleration(b,0,b*Math.tan(theta))[0]*b/cos**2,term=value*(i===0||i===intervals?1:i%2?4:2),y=term-compensation,t=sum+y;compensation=(t-sum)-y;sum=t;}
  integral+=sum*step/3;
 }
 return 4*integral/C**2;
}
export function lensingAt(b,intervals=512){
 const baryons=lightDeflection(b,(x,y,z)=>analyticAcceleration(x,y,z,false),intervals),total=lightDeflection(b,(x,y,z)=>analyticAcceleration(x,y,z,true),intervals,[R200,HALO_OUTER_RADIUS]),toArcsec=180/Math.PI*3600;
 return{b_kpc:b,baryons_rad:baryons,total_rad:total,baryons_arcsec:baryons*toArcsec,total_arcsec:total*toArcsec};
}
export function vacuumControl(r=100,mass=MODEL.bulgeMass+MODEL.diskMass){
 if(!Number.isFinite(r)||!Number.isFinite(mass)||mass<0||r<=6*G*mass/C**2)throw Error('Controle circular estável requer r > 6GM/c² e massa não negativa.');
 const mu=G*mass/C**2,u=mu/r,newtonV2=G*mass/r;
 return{r_areal_kpc:r,mass_1e10Msun:mass,ricciScalar:0,kretschmann_kpc_minus4:48*mu**2/r**6,schwarzschildRadius_kpc:2*mu,
  newtonSpeed_km_s:Math.sqrt(newtonV2)/KM_S_TO_KPC_MYR,localCircularSpeed_km_s:Math.sqrt(newtonV2/(1-2*u))/KM_S_TO_KPC_MYR,
  fractionalV2Correction:2*u/(1-2*u),additionalDensity:0,
  scope:'Exact spherical vacuum control for a hypothetical compact central mass, not the extended Hernquist+Miyamoto-Nagai galaxy. Local speed measured by a static observer, areal radius.'};
}
export function integrateOrbit({radius=8,duration=1000,dt=.25,withHalo=false,sampleCadence=5}={},progress=()=>{}){
 if(![radius,duration,dt,sampleCadence].every(Number.isFinite)||radius<=0||duration<=0||dt<=0||sampleCadence<=0)throw Error('Raio, duração e passos devem ser positivos e finitos.');
 const steps=Math.ceil(duration/dt);if(!Number.isSafeInteger(steps))throw Error('Contagem de passos fora da faixa representável.');
 // Identical initial phase-space point for both cases; circular for baryons only.
 const p=[radius,0,0],v=[0,Math.sqrt(-radius*analyticAcceleration(radius,0,0,false)[0]),0],initial={position:p.slice(),velocity:v.slice()};
 const energy=()=>.5*v.reduce((a,b)=>a+b*b,0)+analyticPotential(...p,withHalo),E0=energy(),L0=radius*v[1],rows=[];
 let maxEnergyError=0,maxLzError=0,next=0,time=0;
 const record=()=>rows.push({time_Myr:time,x_kpc:p[0],y_kpc:p[1],z_kpc:p[2],vx_kpc_Myr:v[0],vy_kpc_Myr:v[1],vz_kpc_Myr:v[2],energy_specific:energy(),relative_energy_error:(energy()-E0)/Math.abs(E0)});
 record();next=sampleCadence;let a=analyticAcceleration(...p,withHalo);
 for(let s=0;s<steps;s++){
  const t0=s*dt,h=Math.min(dt,duration-t0);for(let k=0;k<3;k++){v[k]+=.5*h*a[k];p[k]+=h*v[k];}
  a=analyticAcceleration(...p,withHalo);for(let k=0;k<3;k++)v[k]+=.5*h*a[k];time=Math.min(duration,(s+1)*dt);
  const e=energy(),lz=p[0]*v[1]-p[1]*v[0];if(![...p,...v,e].every(Number.isFinite))throw Error('Estado orbital não finito; reduza dt e examine o domínio.');
  maxEnergyError=Math.max(maxEnergyError,Math.abs((e-E0)/E0));maxLzError=Math.max(maxLzError,Math.abs((lz-L0)/L0));
  if(time>=next||s===steps-1){record();next=(Math.floor(time/sampleCadence)+1)*sampleCadence;}
  if(s%512===0)progress((s+1)/steps);
 }
 progress(1);return{initial,withHalo,dt_Myr:dt,duration_Myr:time,steps,sampleCadenceRequested_Myr:sampleCadence,E0_specific:E0,Efinal_specific:energy(),maxRelativeEnergyError_everyStep:maxEnergyError,maxRelativeLzError_everyStep:maxLzError,final:{position:p.slice(),velocity:v.slice()},rows};
}
export function runInvestigation(config={},progress=()=>{}){
 const started=performance.now(),settings={radius:8,duration:1000,dt:.25,...config};
 const rotation=Array.from({length:119},(_,i)=>rotationAt(.5+i*.25));
 const sourceChecks=[8,15,25].flatMap(R=>[.04,.02,.01].map(h=>sourceCheck([R,0,.5],h)));
 const lensing=Array.from({length:40},(_,i)=>lensingAt(.5+i*.75));
 const lensingConvergence=[.5,2,8,20].map(b=>({b_kpc:b,at256:lensingAt(b,256),at512:lensingAt(b,512),at1024:lensingAt(b,1024)}));
 const orbits=[false,true].map((withHalo,i)=>integrateOrbit({...settings,withHalo},p=>progress((i+p)/2)));
 const orbitConvergence=[settings.dt,settings.dt/2,settings.dt/4].map(dt=>{const run=dt===settings.dt?orbits[1]:integrateOrbit({...settings,dt,withHalo:true});return{dt_Myr:dt,final:run.final,maxRelativeEnergyError_everyStep:run.maxRelativeEnergyError_everyStep,maxRelativeLzError_everyStep:run.maxRelativeLzError_everyStep};});
 const d=(a,b)=>Math.hypot(...a.final.position.map((v,k)=>v-b.final.position[k]));
 const coarseDifference=d(orbitConvergence[0],orbitConvergence[1]),fineDifference=d(orbitConvergence[1],orbitConvergence[2]);
 return{schema:'geometry-lab-v1',computedUTC:new Date().toISOString(),configuration:settings,precision:'CPU JavaScript Float64',assumptions:ASSUMPTIONS,sources:SOURCES,
  parameters:{G,c_kpc_Myr:C,c_m_s:C_SI,model:MODEL,haloTotalMass_1e10Msun:HALO_TOTAL_MASS,R200_kpc:R200,haloOuterRadius_kpc:HALO_OUTER_RADIUS,particleSoftening:'Not applied: unsoftened continuous analytical profiles; not compared directly to a softened live snapshot'},
  rotation,sourceChecks,lensing,lensingConvergence,vacuum:vacuumControl(),orbits,orbitConvergence,
  convergence:{finalPositionDifference_dt_dt2_kpc:coarseDifference,finalPositionDifference_dt2_dt4_kpc:fineDifference,ratio:coarseDifference/fineDifference,interpretation:'Second-order KDK suggests ratio approaching 4 in its asymptotic regime; this measured ratio is not an equilibrium criterion or an exact GR accuracy certificate.'},
  conclusion:'No additional halo-like field has been derived from baryons in this leading-order isolated GR calculation. No full nonlinear Einstein solution or galaxy equilibrium has been certified.',costMs:performance.now()-started};
}
