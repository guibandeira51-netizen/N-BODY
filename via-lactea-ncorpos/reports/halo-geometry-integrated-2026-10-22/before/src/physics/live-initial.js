import {createGalaxy,componentCounts} from './initial.js';
import {refineLegacyHalo} from './halo-resolution.js';

export const LIVE_HALO_FACTORS=Object.freeze([1,2,4,8,16,32]);

/** N0 controls the original component allocation. Only Nh is multiplied. */
export function liveResolution(baseN,haloRefinement=1,withHalo=true){
 if(!LIVE_HALO_FACTORS.includes(haloRefinement))throw Error('Refinamento do halo deve ser ×1, ×2, ×4, ×8, ×16 ou ×32.');
 if(!withHalo&&haloRefinement!==1)throw Error('Refinamento requer um halo vivo.');
 const baseCounts=componentCounts(baseN,withHalo);
 if(haloRefinement>1&&baseCounts[0]<2)throw Error('A resolução de base precisa de ao menos duas partículas no bojo para preservar o referencial do refinamento.');
 const counts=[baseCounts[0],baseCounts[1],baseCounts[2]*haloRefinement],n=counts.reduce((a,b)=>a+b,0);
 if(!Number.isSafeInteger(n))throw Error('Contagem refinada excede a faixa de inteiros seguros.');
 return {baseN,baseCounts,counts,n,haloRefinement};
}

/** Both live CPU and GPU paths use this same unmodified legacy realization
 * followed by the already tested halo-only refinement. Integrators unchanged. */
export function createLiveGalaxy(config={}){
 const {baseN=config.n??1000,haloRefinement=1,withHalo=true}=config;
 const layout=liveResolution(baseN,haloRefinement,withHalo);
 if(config.baseN!==undefined&&config.n!==undefined&&config.n!==layout.n)throw Error('N total configurado não corresponde ao refinamento do halo.');
 const base=createGalaxy({...config,n:baseN,withHalo});
 return refineLegacyHalo(base,haloRefinement);
}
