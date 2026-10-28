import {liveResolution} from '../physics/live-initial.js';
import {assessResources} from './capability.js';
export const GPU_AUTO_TARGET_MS=20;
export function recommendGPUBase(samples,capabilities,{haloRefinement=1,withHalo=true,haloRepresentation='particles',budgetBytes,enforceMemoryBudget=true,targetMs=GPU_AUTO_TARGET_MS}={}){
 const valid=samples.filter(s=>s.backend==='gpu'&&s.n>0&&Number.isFinite(s.stepMs)&&s.stepMs>0).sort((a,b)=>a.n-b.n);
 if(!valid.length)throw Error('N automático requer uma medição válida de GPU.');
 const s=valid.at(-1),projected=Math.max(3,Math.floor(s.n*Math.sqrt(targetMs/s.stepMs)*.9));
 // Invert the actual component allocation, including halo refinement. Never
 // mistake base N0 for the integrated total or silently drop halo particles.
 let low=3,high=Math.max(3,haloRepresentation==='geometry'?Math.ceil(projected/.6)+4:projected),best=null;
 while(low<=high){const baseN=Math.floor((low+high)/2);let layout;try{layout=liveResolution(baseN,haloRefinement,withHalo,haloRepresentation);}catch{low=baseN+1;continue;}
  const allowed=layout.n<=projected&&assessResources(layout.n,capabilities,{backend:'gpu',budgetBytes,enforceMemoryBudget,gpuDiagnostics:true}).admissible;
  if(allowed){best=layout;low=baseN+1;}else high=baseN-1;
 }
 if(!best)throw Error('Orçamento ou limites GPU não admitem a realização mínima solicitada.');
 return{...best,targetMs,headroomFactor:.9,projectedTotal:projected,sourceMeasurement:{n:s.n,stepMs:s.stepMs},status:'projected; requires requested-total GPU measurement'};
}
