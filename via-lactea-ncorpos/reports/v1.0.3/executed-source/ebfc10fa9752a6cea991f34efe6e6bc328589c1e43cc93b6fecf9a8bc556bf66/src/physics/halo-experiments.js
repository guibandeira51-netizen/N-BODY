import {createGalaxy,componentCounts} from './initial-legacy.js';
import {createAllocatedGalaxy} from './initial-allocated.js';
import {HALO_TOTAL_MASS,analyticPotential} from './models.js';

export function createHaloExperiment({baseN=10000,baryonSeed=2026,haloSeed=baryonSeed,haloCount,haloMode='live'}={}){
 if(!['live','fixed'].includes(haloMode))throw Error('Modelo de halo desconhecido.');
 const original=createGalaxy({n:baseN,seed:baryonSeed}),[nb,nd,nh]=componentCounts(baseN),counts=[nb,nd,haloMode==='fixed'?0:haloCount??nh];
 if([nb,nd,nh].some(n=>n%2)||!Number.isSafeInteger(counts[2])||counts[2]<0||(haloMode==='live'&&counts[2]<2)||counts[2]%2)throw Error('Experimentos pareados requerem quantidades pares por componente.');
 const n=counts.reduce((a,b)=>a+b,0),s={n,positions:new Float64Array(3*n),velocities:new Float64Array(3*n),accelerations:new Float64Array(3*n),masses:new Float64Array(n),components:new Uint8Array(n),time:0};
 for(const key of ['positions','velocities'])s[key].set(original[key].subarray(0,3*(nb+nd)));
 for(const key of ['masses','components'])s[key].set(original[key].subarray(0,nb+nd));
 if(haloMode==='live'){
  const source=haloSeed===baryonSeed&&counts[2]===nh?original:createAllocatedGalaxy({n,counts,seed:haloSeed,withHalo:true});
  for(const key of ['positions','velocities'])s[key].set(source[key].subarray(3*(nb+nd)),3*(nb+nd));
  for(const key of ['masses','components'])s[key].set(source[key].subarray(nb+nd),nb+nd);
 }
 // Base metadata counts the original halo. Recount the actual experimental
 // population; this flag refers to the initial analytic unsoftened escape energy.
 let unbound=0;for(let i=0;i<n;i++){const k=3*i;if(.5*(s.velocities[k]**2+s.velocities[k+1]**2+s.velocities[k+2]**2)+analyticPotential(s.positions[k],s.positions[k+1],s.positions[k+2],true)>0)unbound++;}
 s.meta={...original.meta,unbound,unboundScope:'actual experimental population in initial unsoftened analytic full potential; not instantaneous discrete escape classification',baseRealizationUnbound:original.meta.unbound,counts,masses:[original.meta.masses[0],original.meta.masses[1],haloMode==='fixed'?0:HALO_TOTAL_MASS],haloMode,externalHaloMass:haloMode==='fixed'?HALO_TOTAL_MASS:0,baryonSeed,haloSeed,baseN,initialization:original.meta.initialization+'; controlled halo experiment',qualification:haloMode==='fixed'?'Baryons live in fixed finite halo; no halo response; external energy counted once':'All components live; original baryonic positions/velocities/masses held fixed'};
 return s;
}
