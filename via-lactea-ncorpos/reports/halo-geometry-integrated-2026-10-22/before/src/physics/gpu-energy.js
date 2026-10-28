import {energyBase} from './live-energy.js';
export function gpuEnergy(state,options){
 const start=performance.now();if(!Number.isFinite(state.gpuPotentialEnergy))throw Error('Potencial direto GPU ausente; nenhum estimador de árvore é usado como fallback.');
 const d=energyBase(state,options),potential=state.gpuPotentialEnergy;
 return{...d,potential,selfPotential:potential,energy:d.kinetic+potential,energyScale:Math.abs(d.kinetic)+Math.abs(potential),energyApproximate:true,algorithm:'gpu-pairs-f32',energyAlgorithm:'gpu-pairs-f32',energyMethod:'Energia estimada — GPU direta Float32',precision:'GPU Float32 pair potential; compensated CPU Float64 reduction and kinetic energy',treeOrder:null,treeLeafBucket:null,theta:null,diagnosticCostMs:performance.now()-start,arithmeticUncertainty:'Float32 pair accumulation, not a certified error interval; compare independent Float64 snapshots.'};
}
