import {G, MODEL as P, RHO_CRITICAL, KM_S_TO_KPC_MYR} from './constants.js';
export function nfwFunction(x) {
  if (x < 1e-3) return x*x*(0.5+x*(-2/3+x*(0.75+x*(-0.8+x*5/6))));
  return Math.log1p(x)-x/(1+x);
}
export function hernquistDensity(r) {return P.bulgeMass*P.bulgeScale/(2*Math.PI*Math.max(r,1e-30)*(r+P.bulgeScale)**3);}
export function diskDensity(R,z) {
  const q=Math.hypot(z,P.diskB), A=P.diskA+q;
  return P.diskB**2*P.diskMass/(4*Math.PI)*(P.diskA*R*R+(P.diskA+3*q)*A*A)/((R*R+A*A)**2.5*q**3);
}
export function diskAcceleration(x,y,z) {
  const q=Math.hypot(z,P.diskB), A=P.diskA+q, c=-G*P.diskMass/(x*x+y*y+A*A)**1.5;
  return [c*x,c*y,c*A*z/q];
}
let lo=10,hi=1000;
for(let k=0;k<100;k++) {const r=(lo+hi)/2; if(P.haloMassScale*nfwFunction(r/P.haloScale)>4*Math.PI/3*200*RHO_CRITICAL*r**3)lo=r;else hi=r;}
export const R200=(lo+hi)/2;
export const HALO_OUTER_RADIUS=1.2*R200;
export function haloDensity(r) {
  if(r>=HALO_OUTER_RADIUS)return 0;
  const x=Math.max(r,1e-30)/P.haloScale;
  let taper=1;
  if(r>R200) {const u=(r-R200)/(HALO_OUTER_RADIUS-R200); taper=1-10*u**3+15*u**4-6*u**5;}
  return P.haloMassScale/(4*Math.PI*P.haloScale**3*x*(1+x)**2)*Math.max(0,taper);
}
const samples=4096, minRadius=1e-6;
export const haloTable={r:new Float64Array(samples),mass:new Float64Array(samples),shell:new Float64Array(samples)};
for(let i=0;i<samples;i++) haloTable.r[i]=minRadius*(HALO_OUTER_RADIUS/minRadius)**(i/(samples-1));
haloTable.mass[0]=P.haloMassScale*nfwFunction(minRadius/P.haloScale);
for(let i=1;i<samples;i++) {
  const a=haloTable.r[i-1],b=haloTable.r[i];
  haloTable.mass[i]=haloTable.mass[i-1]+2*Math.PI*(b-a)*(haloDensity(a)*a*a+haloDensity(b)*b*b);
}
for(let i=samples-2;i>=0;i--) {
  const a=haloTable.r[i],b=haloTable.r[i+1];
  haloTable.shell[i]=haloTable.shell[i+1]+2*Math.PI*(b-a)*(haloDensity(a)*a+haloDensity(b)*b);
}
export const HALO_TOTAL_MASS=haloTable.mass[samples-1];
export function interpolate(xs,ys,x) {
  if(x<=xs[0])return ys[0]; if(x>=xs[xs.length-1])return ys[ys.length-1];
  let a=0,b=xs.length-1;while(b-a>1){const m=(a+b)>>>1;if(xs[m]>x)b=m;else a=m;}
  const t=(x-xs[a])/(xs[b]-xs[a]);return ys[a]+t*(ys[b]-ys[a]);
}
export function haloMass(r) {return r<=R200?P.haloMassScale*nfwFunction(r/P.haloScale):interpolate(haloTable.r,haloTable.mass,r);}
export function analyticAcceleration(x,y,z,withHalo=true,component=-1) {
  const r=Math.hypot(x,y,z), out=[0,0,0];
  if(r>0&&(component<0||component===0)) {const f=-G*P.bulgeMass/(r*(r+P.bulgeScale)**2);out[0]+=f*x;out[1]+=f*y;out[2]+=f*z;}
  if(component<0||component===1){const a=diskAcceleration(x,y,z);for(let k=0;k<3;k++)out[k]+=a[k];}
  if(r>0&&withHalo&&(component<0||component===2)){const f=-G*haloMass(r)/r**3;out[0]+=f*x;out[1]+=f*y;out[2]+=f*z;}
  return out;
}
export function analyticPotential(x,y,z,withHalo=true) {
  const r=Math.hypot(x,y,z);let phi=-G*P.bulgeMass/(r+P.bulgeScale)-G*P.diskMass/Math.hypot(x,y,P.diskA+Math.hypot(z,P.diskB));
  if(withHalo) {
    if(r<=R200) {
      const raw=r>0?P.haloMassScale*Math.log1p(r/P.haloScale)/r:P.haloMassScale/P.haloScale;
      const offset=P.haloMassScale/(P.haloScale+R200)-interpolate(haloTable.r,haloTable.shell,R200);
      phi+=G*(offset-raw);
    } else phi-=G*(haloMass(r)/r+interpolate(haloTable.r,haloTable.shell,r));
  }
  return phi;
}
export function rotationCurve(withHalo=true) {
  return Array.from({length:120},(_,i)=>{const r=0.2+i*0.25;const v=[0,1,2].map(c=>Math.sqrt(Math.max(0,-r*analyticAcceleration(r,0,0,true,c)[0]))/KM_S_TO_KPC_MYR);return {r,bulge:v[0],disk:v[1],halo:v[2],baryons:Math.hypot(v[0],v[1]),total:Math.hypot(v[0],v[1],withHalo?v[2]:0)};});
}
