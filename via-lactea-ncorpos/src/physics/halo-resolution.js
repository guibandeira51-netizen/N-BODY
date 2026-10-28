import {createAllocatedGalaxy} from './initial-allocated.js';
import {analyticPotential} from './models.js';
/** Numerical mass-resolution refinement, not a new distribution function.
 * Existing baryon phase arrays/masses are copied without alteration. Existing
 * halo phases are retained as a prefix; additional phases use the legacy
 * sampler in the SAME target-density centre and bulk frame. No evolution-time
 * recentering, damping, energy corrections or extra physical mass is added.
 */
export function refineLegacyHalo(base,factor=1){
 if(!Number.isSafeInteger(factor)||factor<1||factor>128||(factor&(factor-1)))throw Error('Halo factor must be a power of two from 1 to 128');
 if(factor===1)return base;
 const counts=base.meta?.counts;if(!counts||counts.length!==3||counts[2]<1||base.meta?.withHalo===false||!['legacy',undefined].includes(base.meta?.method))throw Error('Halo refinement requires an existing legacy realization with a live halo');
 const [nb,nd,nh]=counts,baryons=nb+nd,newNh=nh*factor,n=baryons+newNh,seed=base.meta.seed,pool=createAllocatedGalaxy({n,counts:[nb,nd,newNh],seed}),centre=base.meta.centerShift,bulk=[0,1,2].map(k=>-(base.velocities[k]+base.velocities[k+3])/2),poolBulk=[0,1,2].map(k=>-(pool.velocities[k]+pool.velocities[k+3])/2);
 if(nb<2||!centre||counts.reduce((a,b)=>a+b,0)!==base.n)throw Error('Legacy component layout or frame unavailable');
 const s={n,time:0,positions:new Float64Array(3*n),velocities:new Float64Array(3*n),accelerations:new Float64Array(3*n),masses:new Float64Array(n),components:new Uint8Array(n)};
 s.positions.set(base.positions);s.velocities.set(base.velocities);s.masses.set(base.masses);s.components.set(base.components);
 for(let i=baryons;i<n;i++){s.components[i]=2;s.masses[i]=base.masses[baryons]/factor;if(i>=base.n)for(let k=0;k<3;k++){s.positions[3*i+k]=pool.positions[3*i+k]+pool.meta.centerShift[k]-centre[k];s.velocities[3*i+k]=pool.velocities[3*i+k]+poolBulk[k]-bulk[k];}}
 let unbound=0;for(let i=0;i<n;i++){const k=3*i,p=[0,1,2].map(j=>s.positions[k+j]+centre[j]);if(.5*s.velocities.subarray(k,k+3).reduce((a,b)=>a+b*b,0)+analyticPotential(...p,true)>0)unbound++;}
 s.meta={...structuredClone(base.meta),method:'legacy',counts:[nb,nd,newNh],haloRefinement:factor,baseN:base.n,baseCounts:[...counts],unbound,initialization:base.meta.initialization+'; refinamento exclusivo do halo ×'+factor,equilibriumValidated:false,haloResolutionPolicy:'Same baryon arrays and masses, same finite target halo mass; power-of-two smaller individual halo masses and additional legacy phases. Existing phase prefix retained. No phase-space correction during evolution.'};
 return s;
}
