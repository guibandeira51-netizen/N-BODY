import {liveResolution} from './physics/live-initial.js';

/** UI convention only. The legacy initializer and its scientific controls keep N0. */
export function liveInputResolution(requestedN,haloRefinement=1,withHalo=true,haloRepresentation='particles') {
  if(!Number.isSafeInteger(requestedN)||requestedN<3)throw Error('Informe um número inteiro de ao menos três partículas.');
  if(haloRepresentation!=='geometry')return {...liveResolution(requestedN,haloRefinement,withHalo,haloRepresentation),requestedN,particleCountConvention:'legacy-base-v1'};
  // Baryonic count = N0 - floor(.4*N0), with the legacy small-N safeguards.
  // Invert the actual allocator, rather than approximating by division by .6.
  let low=requestedN,high=Math.ceil(requestedN/.6)+4,best;
  if(!Number.isSafeInteger(high))throw Error('Contagem de referência excede a faixa de inteiros seguros.');
  while(low<=high){const baseN=low+Math.floor((high-low)/2),layout=liveResolution(baseN,haloRefinement,withHalo,haloRepresentation);if(layout.n<=requestedN){best=layout;low=baseN+1;}else high=baseN-1;}
  if(best?.n!==requestedN)throw Error('Não foi possível representar a contagem bariônica solicitada.');
  return {...best,requestedN,particleCountConvention:'active-baryons-v1'};
}
