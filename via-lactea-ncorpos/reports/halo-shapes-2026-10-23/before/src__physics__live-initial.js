import {createGalaxy,componentCounts} from './initial.js';
import {refineLegacyHalo} from './halo-resolution.js';
import {createHaloGeometry} from './halo-geometry.js';
import {analyticPotential} from './models.js';

export const LIVE_HALO_FACTORS=Object.freeze([1,2,4,8,16,32]);

/** N0 controls the original component allocation. Only Nh is multiplied. */
export function liveResolution(baseN,haloRefinement=1,withHalo=true,haloRepresentation='particles'){
 if(!['particles','geometry'].includes(haloRepresentation))throw Error('Representação do halo desconhecida.');
 if(!withHalo&&haloRepresentation==='geometry')throw Error('O halo geométrico requer o modelo com halo.');
 if(!LIVE_HALO_FACTORS.includes(haloRefinement))throw Error('Refinamento do halo deve ser ×1, ×2, ×4, ×8, ×16 ou ×32.');
 if(!withHalo&&haloRefinement!==1)throw Error('Refinamento requer um halo vivo.');
 const baseCounts=componentCounts(baseN,withHalo);
 if(haloRepresentation==='particles'&&haloRefinement>1&&baseCounts[0]<2)throw Error('A resolução de base precisa de ao menos duas partículas no bojo para preservar o referencial do refinamento.');
 const counts=[baseCounts[0],baseCounts[1],haloRepresentation==='geometry'?0:baseCounts[2]*haloRefinement],n=counts.reduce((a,b)=>a+b,0);
 if(!Number.isSafeInteger(n))throw Error('Contagem refinada excede a faixa de inteiros seguros.');
 return {baseN,baseCounts,counts,n,haloRefinement,haloRepresentation,haloRefinementApplied:haloRepresentation==='geometry'?null:haloRefinement};
}

/** Both live CPU and GPU paths use this same unmodified legacy realization
 * followed by the already tested halo-only refinement. Integrators unchanged. */
export function createLiveGalaxy(config={}){
 const {baseN=config.n??1000,haloRefinement=1,withHalo=true,haloRepresentation='particles'}=config;
 const layout=liveResolution(baseN,haloRefinement,withHalo,haloRepresentation);
 if(config.baseN!==undefined&&config.n!==undefined&&config.n!==layout.n)throw Error('N total configurado não corresponde ao refinamento do halo.');
 const base=createGalaxy({...config,n:baseN,withHalo});
 if(haloRepresentation==='geometry'){
  const n=layout.n,field=createHaloGeometry({center:base.meta.centerShift.map(x=>-x)});
  let unbound=0;for(let i=0;i<n;i++){const p=[0,1,2].map(k=>base.positions[3*i+k]+base.meta.centerShift[k]),v=base.velocities.slice(3*i,3*i+3);if(.5*v.reduce((sum,x)=>sum+x*x,0)+analyticPotential(...p,true)>0)unbound++;}
  return{n,time:0,positions:base.positions.slice(0,3*n),velocities:base.velocities.slice(0,3*n),accelerations:new Float64Array(3*n),masses:base.masses.slice(0,n),components:base.components.slice(0,n),meta:{...structuredClone(base.meta),unbound,counts:layout.counts,masses:[...base.meta.masses.slice(0,2),0],baseN,baseCounts:layout.baseCounts,haloRepresentation:'geometry',haloMode:'fixed',haloField:field,haloRefinementApplied:null,initialization:base.meta.initialization+'; mesmos bariões da realização com halo; NFW contínuo estático',comparison:'Exact baryonic phase-array prefix of the same legacy seed/N0; no velocity rescaling; continuous halo centered at negative original centerShift, fixed in this inertial frame',equilibriumValidated:false}};
 }
 return refineLegacyHalo(base,haloRefinement);
}
