import {G as DEFAULT_G,KM_S_TO_KPC_MYR} from './constants.js';
import {validateState} from './forces.js';

export const ROTATION_RADII=Object.freeze([.5,...Array.from({length:30},(_,i)=>i+1)]);

/** Direct, component-resolved Plummer field on massless equatorial probes.
 * Average radial acceleration over equally spaced azimuths; no spherical-disk
 * approximation, particle velocities, fitted masses or state transformations.
 * This is a finite angular quadrature, not a certified continuum limit.
 */
export function componentRotationField(state,{G=DEFAULT_G,epsilon=.1,epsilonSquared=epsilon*epsilon,radii=ROTATION_RADII,azimuthSamples=32}={}){
 validateState(state);
 if(!(state.components instanceof Uint8Array)||state.components.length!==state.n||state.components.some(c=>c>2))throw Error('Componentes gravitacionais inválidas.');
 if(!(G>0)||!Number.isFinite(G)||!(epsilonSquared>=0)||!Number.isFinite(epsilonSquared))throw Error('Parâmetros gravitacionais inválidos.');
 if(!Number.isInteger(azimuthSamples)||azimuthSamples<4||!radii.length||radii.some((r,i)=>!Number.isFinite(r)||r<=0||(i&&r<=radii[i-1])))throw Error('Malha de sondas inválida.');
 const counts=[0,0,0],masses=[0,0,0],p=state.positions,m=state.masses,c=state.components;
 for(let j=0;j<state.n;j++){counts[c[j]]++;masses[c[j]]+=m[j];}
 const angles=Array.from({length:azimuthSamples},(_,k)=>{const phi=2*Math.PI*k/azimuthSamples;return[Math.cos(phi),Math.sin(phi)];});
 const speed=v2=>v2>=0?Math.sqrt(v2)/KM_S_TO_KPC_MYR:null;
 const rows=radii.map(R=>{
  const aR=[0,0,0];
  for(const[cos,sin]of angles){const x=R*cos,y=R*sin,local=[0,0,0];
   for(let j=0;j<state.n;j++){const k=3*j,dx=p[k]-x,dy=p[k+1]-y,dz=p[k+2],r2=dx*dx+dy*dy+dz*dz+epsilonSquared;
    if(r2===0&&m[j]>0)throw Error('Sonda coincide com uma partícula: use suavização positiva.');
    if(m[j]>0)local[c[j]]+=G*m[j]*(dx*cos+dy*sin)/(r2*Math.sqrt(r2));
   }
   for(let id=0;id<3;id++)aR[id]+=local[id]/azimuthSamples;
  }
  const[bulgeV2,diskV2,haloV2]=aR.map(a=>a===0?0:-R*a),diskBulgeV2=diskV2+bulgeV2,totalV2=diskBulgeV2+haloV2;
  return{R_kpc:R,aR_kpc_Myr2:{bulge:aR[0],disk:aR[1],halo:aR[2]},v2_kpc2_Myr2:{bulge:bulgeV2,disk:diskV2,halo:haloV2,diskBulge:diskBulgeV2,total:totalV2},vc_km_s:{bulge:speed(bulgeV2),disk:speed(diskV2),halo:speed(haloV2),diskBulge:speed(diskBulgeV2),total:speed(totalV2)}};
 });
 return{schema:'component-radial-field-v1',timeMyr:state.time??0,parameters:{G,epsilonSquared},sourceCounts:counts,sourceMasses1e10Msun:masses,azimuthSamples,planeZKpc:0,originKpc:[0,0,0],rows,method:'Direct Float64 Plummer sum from current massive particles; finite azimuthal average; vc²=-R<ar>; squared contributions add.',qualification:'Axisymmetrised circular-speed diagnostic, not mean particle rotation or an observational curve. Negative inward support is retained as signed v² and shown as a gap in speed. Finite-N noise and angular-quadrature error are not removed.'};
}
