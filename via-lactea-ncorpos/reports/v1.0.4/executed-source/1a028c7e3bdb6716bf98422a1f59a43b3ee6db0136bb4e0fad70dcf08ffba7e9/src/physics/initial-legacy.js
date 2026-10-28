import {MODEL as P, DEFAULT_NUMERICS, G} from './constants.js';
import {haloTable, HALO_TOTAL_MASS, HALO_OUTER_RADIUS, haloDensity, haloMass, diskDensity, analyticAcceleration, analyticPotential, hernquistDensity, interpolate} from './models.js';
export function seededRandom(seed) {
  let a=Number(seed)>>>0;
  return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function normal(rng) {return Math.sqrt(-2*Math.log(Math.max(1e-15,rng())))*Math.cos(2*Math.PI*rng());}
function direction(rng) {const z=2*rng()-1,t=2*Math.PI*rng(),s=Math.sqrt(1-z*z);return [s*Math.cos(t),s*Math.sin(t),z];}
export function sampleHernquist(rng) {const s=Math.sqrt(rng());const r=P.bulgeScale*s/(1-s);return direction(rng).map(x=>x*r);}
export function sampleDisk(rng) {
  const u=2*rng()-1,z=P.diskB*u/Math.sqrt(1-u*u),q=Math.hypot(z,P.diskB),A=P.diskA+q;
  const exponent=rng()<P.diskA/A?2:2/3,R=A*Math.sqrt((1-rng())**(-exponent)-1),phi=2*Math.PI*rng();
  return [R*Math.cos(phi),R*Math.sin(phi),z];
}
export function sampleHalo(rng) {
  const r=interpolate(haloTable.mass,haloTable.r,rng()*HALO_TOTAL_MASS);return direction(rng).map(x=>x*r);
}
function radialField(r,withHalo) {
  // Angular quadrature of the flattened disk: monopole approximation for spherical Jeans.
  let g=G*P.bulgeMass/(r+P.bulgeScale)**2+(withHalo?G*haloMass(r)/(r*r):0);
  for(let k=0;k<32;k++){const mu=(k+0.5)/32,s=Math.sqrt(1-mu*mu),a=analyticAcceleration(r*s,0,r*mu,false,1);g-= (a[0]*s+a[2]*mu)/32;}
  return g;
}
const cache=new Map();
function sphericalJeans(component,withHalo) {
  const n=2048,r=new Float64Array(n),pressure=new Float64Array(n),sigma=new Float64Array(n),rmax=component===0?1e6:HALO_OUTER_RADIUS;
  const density=component===0?hernquistDensity:haloDensity;
  const integrand=new Float64Array(n);
  for(let i=0;i<n;i++){r[i]=1e-5*(rmax/1e-5)**(i/(n-1));integrand[i]=density(r[i])*radialField(r[i],withHalo);}
  for(let i=n-2;i>=0;i--)pressure[i]=pressure[i+1]+(r[i+1]-r[i])*(integrand[i]+integrand[i+1])/2;
  for(let i=0;i<n;i++)sigma[i]=density(r[i])>0?pressure[i]/density(r[i]):0;
  return {r,sigma};
}
function verticalPressure(R,z,withHalo) {
  let sum=0;
  // Midpoint quadrature after mapping [z,infinity) to t in [0,1).
  const n=160,scale=Math.max(P.diskB,z*0.2);
  for(let i=0;i<n;i++){const t=(i+0.5)/n,zz=z+scale*t/(1-t),az=analyticAcceleration(R,0,zz,withHalo)[2];sum+=diskDensity(R,zz)*(-az)*scale/(1-t)**2/n;}
  return sum;
}
function diskJeans(withHalo) {
  const nr=160,nz=112,logR0=Math.log(0.001),logR1=Math.log(1e5),zmax=Math.log1p(1e5/P.diskB),pressure=new Float64Array(nr*nz);
  for(let i=0;i<nr;i++)for(let j=0;j<nz;j++){const R=Math.exp(logR0+(logR1-logR0)*i/(nr-1)),z=P.diskB*Math.expm1(zmax*j/(nz-1));pressure[i*nz+j]=verticalPressure(R,z,withHalo);}
  function at(R,z) {
    const x=Math.max(0,Math.min(nr-1.000001,(Math.log(Math.max(0.001,R))-logR0)/(logR1-logR0)*(nr-1))),y=Math.max(0,Math.min(nz-1.000001,Math.log1p(Math.abs(z)/P.diskB)/zmax*(nz-1)));
    const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j;
    // Pressure spans many decades. Interpolation of log pressure avoids the
    // several-percent positive bias produced by linear interpolation in P.
    return Math.exp((1-u)*((1-v)*Math.log(pressure[i*nz+j])+v*Math.log(pressure[i*nz+j+1]))+u*((1-v)*Math.log(pressure[(i+1)*nz+j])+v*Math.log(pressure[(i+1)*nz+j+1])));
  }
  return (R,z)=>{const rho=diskDensity(R,z),sig2=at(R,z)/rho,h=Math.max(R*0.08,0.0005),grad=(at(R+h,z)-at(Math.max(0.00001,R-h),z))/(R+h-Math.max(0.00001,R-h)),vc2=-R*analyticAcceleration(R,0,z,withHalo)[0];return {sig2,stream2:vc2+R*grad/rho};};
}
function jeansTables(withHalo) {
  if(!cache.has(withHalo))cache.set(withHalo,{bulge:sphericalJeans(0,withHalo),halo:withHalo?sphericalJeans(2,true):null,disk:diskJeans(withHalo)});
  return cache.get(withHalo);
}
export function componentCounts(n,withHalo=true) {
  if(!Number.isSafeInteger(n)||n<(withHalo?3:2))throw Error('N precisa ser um inteiro seguro com ao menos uma partícula por componente.');
  // Resolution allocation, not physical mass fractions. Component masses are independent of N.
  const w=withHalo?[0.15,0.45,0.40]:[0.25,0.75,0];
  const counts=w.map(x=>x>0?Math.max(1,Math.floor(x*n)):0);counts[1]+=n-counts.reduce((a,b)=>a+b,0);return counts;
}
export function createGalaxy({n=1000,seed=DEFAULT_NUMERICS.seed,withHalo=true}={}) {
  const counts=componentCounts(n,withHalo),rng=seededRandom(seed),tables=jeansTables(withHalo);
  const state={n,positions:new Float64Array(3*n),velocities:new Float64Array(3*n),masses:new Float64Array(n),components:new Uint8Array(n),accelerations:new Float64Array(3*n)};
  const totals=[P.bulgeMass,P.diskMass,HALO_TOTAL_MASS];let offset=0,clippedStreaming=0,unbound=0;
  for(let c=0;c<3;c++) {
    const sample=[sampleHernquist,sampleDisk,sampleHalo][c],table=c===0?tables.bulge:tables.halo;
    for(let j=0;j<counts[c];j++) {
      const i=offset+j;let pos,vel;
      if(j%2===1){pos=Array.from(state.positions.slice(3*(i-1),3*i),x=>-x);vel=Array.from(state.velocities.slice(3*(i-1),3*i),x=>-x);}
      else {
        pos=sample(rng);
        if(c===1){const R=Math.hypot(pos[0],pos[1]),phi=Math.atan2(pos[1],pos[0]),mom=tables.disk(R,pos[2]),sig=Math.sqrt(Math.max(0,mom.sig2)),vR=sig*normal(rng),vphi=Math.sqrt(Math.max(0,mom.stream2))+sig*normal(rng);if(mom.stream2<0)clippedStreaming++;vel=[vR*Math.cos(phi)-vphi*Math.sin(phi),vR*Math.sin(phi)+vphi*Math.cos(phi),sig*normal(rng)];}
        else{const sig=Math.sqrt(Math.max(0,interpolate(table.r,table.sigma,Math.hypot(...pos))));vel=[normal(rng)*sig,normal(rng)*sig,normal(rng)*sig];}
      }
      state.positions.set(pos,3*i);state.velocities.set(vel,3*i);state.masses[i]=totals[c]/counts[c];state.components[i]=c;
      if(0.5*vel.reduce((s,x)=>s+x*x,0)+analyticPotential(...pos,withHalo)>0)unbound++;
    }
    offset+=counts[c];
  }
  // Put each realization in its inertial center-of-mass frame, including odd counts.
  const cm=[0,0,0],cv=[0,0,0],mass=state.masses.reduce((a,b)=>a+b,0);
  for(let i=0;i<n;i++)for(let k=0;k<3;k++){cm[k]+=state.masses[i]*state.positions[3*i+k]/mass;cv[k]+=state.masses[i]*state.velocities[3*i+k]/mass;}
  for(let i=0;i<n;i++)for(let k=0;k<3;k++){state.positions[3*i+k]-=cm[k];state.velocities[3*i+k]-=cv[k];}
  state.meta={seed,withHalo,counts,masses:totals.map((m,c)=>counts[c]?m:0),initialization:'Jeans + Satoh k=1, Gaussiana aproximada; pares antipodais',clippedStreaming,unbound,centerShift:cm};
  return state;
}
