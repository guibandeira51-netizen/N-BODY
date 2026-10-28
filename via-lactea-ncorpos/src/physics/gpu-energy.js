import {energyBase} from './live-energy.js';
export function gpuEnergy(state,options){
 const start=performance.now();if(!Number.isFinite(state.gpuPotentialEnergy))throw Error('Potencial direto GPU ausente; nenhum estimador de árvore é usado como fallback.');
 const d=energyBase(state,options),selfPotential=state.gpuPotentialEnergy,potential=selfPotential+d.externalPotential;
 return{...d,potential,selfPotential,energy:d.kinetic+potential,energyScale:Math.abs(d.kinetic)+Math.abs(potential),energyApproximate:true,algorithm:'gpu-pairs-f32',energyAlgorithm:'gpu-pairs-f32',energyMethod:d.haloRepresentation==='geometry'?'Energia estimada — GPU Float32 + NFW estático':'Energia estimada — GPU direta Float32',precision:'GPU Float32 pair potential; compensated CPU Float64 reduction, kinetic and static external energy',treeOrder:null,treeLeafBucket:null,theta:null,diagnosticCostMs:performance.now()-start,arithmeticUncertainty:'Float32 pair/field force arithmetic, not a certified error interval; compare independent Float64 Hamiltonian on snapshots.'};
}
