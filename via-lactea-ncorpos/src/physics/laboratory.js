import {structureDiagnostics} from './structure-diagnostics.js';
import {analyticAcceleration,haloMass,HALO_TOTAL_MASS,HALO_OUTER_RADIUS} from './models.js';
import {G, KM_S_TO_KPC_MYR,MODEL} from './constants.js';
import {massAudit} from './mass-audit.js';
import {diskAnalysis,spiralGeometry} from './disk-analysis.js';

export const LAB_RADII = [0, 1, 2, 4, 8, 12, 20, 30, 60, 120, 240, 480];
export const relativeChange = (value, initial) => Number.isFinite(value) && Number.isFinite(initial) && initial !== 0 ? (value-initial)/Math.abs(initial) : null;
export function diskMassInCylinder(R,zLower=0,zUpper=Infinity,points=512){
  const {diskA:a,diskB:b,diskMass:M}=MODEL,lo=zLower/Math.hypot(zLower,b),hi=zUpper===Infinity?1:zUpper/Math.hypot(zUpper,b);let sum=0;
  for(let i=0;i<points;i++){const u=lo+(hi-lo)*(i+.5)/points,z=b*u/Math.sqrt(1-u*u),q=Math.hypot(z,b),A=a+q,S=R*R+A*A;sum+=(1-a/Math.sqrt(S)-q*A*A/S**1.5)*(hi-lo)/points;}
  return M*sum;
}
function analyticProfiles(c){
  const radial=c.id===1?c.profiles.cylindrical:c.profiles.spherical;
  const cdf=r=>c.id===0?MODEL.bulgeMass*(r/(r+MODEL.bulgeScale))**2:c.id===1?diskMassInCylinder(r):r>=HALO_OUTER_RADIUS?HALO_TOTAL_MASS:haloMass(r);
  return {radial:radial.bins.map(b=>({...b,mass:null,count:null,density:b.upper==null?null:(cdf(b.upper)-cdf(b.lower))/b.measure})),
    vertical:c.id===1?c.profiles.vertical.bins.map(b=>({...b,mass:null,count:null,density:b.upper==null?null:diskMassInCylinder(30,b.lower,b.upper)/b.measure})):null,
    method:'Analytic initial density integrated over matching bins; disk midpoint quadrature 512 in u=z/sqrt(z²+b²); halo cumulative production table.'};
}
export function epicyclic(R, withHalo=true, acceleration=analyticAcceleration) {
  if (!(R>0) || !Number.isFinite(R)) return {vc:null,kappa:null,period:null};
  const omega2 = r => -acceleration(r,0,0,withHalo)[0]/r;
  const h=R*1e-3, w=omega2(R), k2=4*w+R*(omega2(R+h)-omega2(R-h))/(2*h);
  return {vc:w>0?R*Math.sqrt(w):null,kappa:k2>0?Math.sqrt(k2):null,period:w>0?2*Math.PI/Math.sqrt(w):null};
}
export function toomreBin(bin, withHalo=true, orbitAt=null) {
  const radius=bin.upper==null?null:(bin.lower+bin.upper)/2, orbit=orbitAt?orbitAt(radius):epicyclic(radius,withHalo);
  const surfaceDensity=bin.upper==null?null:bin.mass/(Math.PI*(bin.upper**2-bin.lower**2));
  const sigma=bin.dispersion?.[0], effectiveCount=bin.effectiveCount??0;
  // A sample variance requires at least two effective observations. No arbitrary
  // Q or particle-count threshold certifies the epicyclic approximation.
  const Q=effectiveCount>1&&surfaceDensity>0&&orbit.kappa>0&&Number.isFinite(sigma)?sigma*orbit.kappa/(3.36*G*surfaceDensity):null;
  return {radius,...orbit,surfaceDensity,Q,effectiveCount,
    sigmaROverVc:orbit.vc>0&&Number.isFinite(sigma)?sigma/orbit.vc:null,
    thicknessOverRadius:radius>0&&bin.h50!=null?bin.h50/radius:null,
    meanRotationOverVc:orbit.vc>0&&bin.mean?bin.mean[1]/orbit.vc:null,
    qualification:Q==null?'indisponível: população ou frequência insuficiente':'estimativa condicional: disco fino, campo inicial axisimétrico e órbitas quase circulares; hipóteses não certificadas'};
}
export function laboratorySample(state, diagnostic, options={}) {
  const start=performance.now();
  const structure=structureDiagnostics(state,{cylindricalEdges:LAB_RADII,accelerations:state.accelerations});
  const disk=structure.components.find(c=>c.id===1);
  const physical=state.meta?.physicalModel,table=physical?.initialOrbitTable;
  const orbitAt=physical?R=>{
    if(!table||!(R>=table.radiusKpc[0]&&R<=table.radiusKpc.at(-1)))return {vc:null,kappa:null,period:null};
    let i=0;while(i<table.radiusKpc.length-2&&table.radiusKpc[i+1]<R)i++;
    const u=Math.log(R/table.radiusKpc[i])/Math.log(table.radiusKpc[i+1]/table.radiusKpc[i]),mix=key=>table[key][i]*(1-u)+table[key][i+1]*u,vc=mix('vcInternal');
    return {vc,kappa:mix('kappaPerMyr'),period:vc>0?2*Math.PI*R/vc:null,reference:'initial converged AGAMA potential, unsoftened'};
  }:null;
  const components=structure.components.map(c=>({ ...c, analyticProfiles:physical?{radial:[],vertical:null,method:'Historical analytic profiles do not apply to imported model; final DF profiles are in its preparation report.'}:analyticProfiles(c),orbital:orbitAt?orbitAt(c.id===1?c.R50:c.r50):epicyclic(c.id===1?c.R50:c.r50,options.withHalo!==false) }));
  const W=components.reduce((s,c)=>s+(c.virial.W??0),0), mass=diagnostic.mass;
  const diskL=disk?.angularMomentum, L=diskL?Math.hypot(...diskL):0;
  const sigma=disk?.velocity.dispersion;
  // Measurement only: never recenter or rotate the integrated particle arrays.
  const diskFrame=diskAnalysis(state,{edges:LAB_RADII});
  if(diskFrame.available){diskFrame.toomre=diskFrame.rings.map(b=>toomreBin({...b,effectiveCount:b.count,dispersion:[b.sigmaR,b.sigmaPhi,b.globalPlane.sigmaNormal],mean:[b.meanRadialVelocity,b.meanAzimuthalVelocity],h50:b.globalPlane.h50},options.withHalo!==false,orbitAt));diskFrame.geometry=[1,2,3,4].map(m=>spiralGeometry(diskFrame,m));}
  return {timeMyr:state.time??0,n:state.n,components,conservation:diagnostic,massAudit:massAudit(state,options),
    diskFrame,
    centerVelocity:mass>0?diagnostic.momentum.map(p=>p/mass):null,
    virial:{W,ratio:W<0?2*diagnostic.kinetic/-W:null,method:options.forceMethod??options.algorithm??'caller supplied force'},
    diskTiltDegrees:L>0?Math.acos(Math.min(1,Math.max(-1,diskL[2]/L)))*180/Math.PI:null,
    anisotropy: sigma?.[0]>0?{sigmaZOverSigmaR:sigma[2]/sigma[0],sigmaPhiOverSigmaR:sigma[1]/sigma[0]}:null,
    toomre:disk?.profiles.velocity.map(bin=>toomreBin(bin,options.withHalo!==false,orbitAt))??[],
    measurementMs:performance.now()-start,velocityKmSFactor:1/KM_S_TO_KPC_MYR,
    conventions:{origin:'fixed initial galactic center (0,0,0); inertial axes; no recentering during integration',
      plane:'legacy components use fixed z=0; diskFrame adds robust instantaneous global and local planes without changing state; geometric tilt differs from angular-momentum tilt',
      virial:'W=sum m r.a from current forces, not potential U; surface terms unmeasured',
      orbit:physical?'initial converged AGAMA unsoftened field from imported model; spherical-component radii used as equatorial proxy':'initial unsoftened axisymmetric analytic model; spherical-component radii used as equatorial proxy',
      Q:'conditional thin stellar disk diagnostic; finite thickness, non-axisymmetry and velocity-shape corrections not applied'}};
}
export function energyDrift(current, initial) {
  const scale=Math.abs(initial.kinetic)+Math.abs(initial.potential);
  return Number.isFinite(current.energy)&&Math.abs(initial.energy)>64*Number.EPSILON*scale ? (current.energy-initial.energy)/Math.abs(initial.energy):null;
}
export class LaboratoryHistory {
  constructor(limit=512) { if(!Number.isInteger(limit)||limit<4)throw Error('History capacity must be >=4');this.limit=limit;this.reset(); }
  reset(){this.samples=[];this.totalMeasurements=0;this.decimations=0;this.failure=null;this.createdUTC=new Date().toISOString();}
  add(sample){
    if(!Number.isFinite(sample.timeMyr)||sample.timeMyr<0)throw Error('Invalid diagnostic epoch');
    const last=this.samples.at(-1);if(last&&sample.timeMyr<last.timeMyr)throw Error('Diagnostic time moved backwards');
    if(last&&sample.timeMyr===last.timeMyr){this.samples[this.samples.length-1]=sample;return;}
    if(this.samples.length>=this.limit){this.samples=this.samples.filter((_,i)=>i%2===0);this.decimations++;}
    this.samples.push(sample);this.totalMeasurements++;
  }
  assessment(){
    if(this.failure)return {state:'Falha de validação numérica',reason:this.failure};
    if(this.samples.length<2)return {state:'Ainda não avaliado',reason:'São necessários estados em tempos físicos distintos.'};
    return {state:'Em avaliação',reason:'Uma realização não demonstra convergência. Compare sementes, N, dt, ε, algoritmo e precisão nos relatórios. Não há limiar percentual universal nem certificação automática de equilíbrio.'};
  }
}
