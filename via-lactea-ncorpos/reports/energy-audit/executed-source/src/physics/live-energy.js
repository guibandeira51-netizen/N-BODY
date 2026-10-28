import {G as DEFAULT_G} from './constants.js';
import {barnesHutPotentialEnergy} from './forces.js';
import {validationSnapshot} from './validation-101.js';
import {pairEnergyRange} from './pair-energy-partition.js';

// Read-only legacy particle Hamiltonian. No changes to forces or state arrays.
export function energyParameters(options={}){
 const actual=options.effectiveParameters??options.rotationParameters??options;
 const G=actual.G??DEFAULT_G,epsilonSquared=actual.epsilonSquared??(options.epsilon??.1)**2;
 if(!(G>0)||!Number.isFinite(G)||!(epsilonSquared>=0)||!Number.isFinite(epsilonSquared))throw Error('Parâmetros energéticos inválidos.');
 return {G,epsilonSquared,epsilon:Math.sqrt(epsilonSquared),theta:options.theta??.5,
  forceAlgorithm:options.forceMethod??options.algorithm??'direct',trajectoryPrecision:options.effectiveParameters||options.rotationParameters?'Float32':'Float64',
  requestedDt:options.dt??null,effectiveDt:actual.dt??options.dt??null,
  velocityEpoch:'full-step, after final KDK kick',externalPotential:'none; isolated live components'};
}
export function energyBase(state,options={}){
 if(options.externalGrid||options.haloTable||options.externalPotential)throw Error('Diagnóstico ao vivo isolado não aceita campo externo; use validationSnapshot com a energia externa explícita.');
 const p=energyParameters(options),algorithm=p.trajectoryPrecision==='Float32'?'gpu-f32':String(p.forceAlgorithm).includes('barnes-hut')||String(p.forceAlgorithm).includes('cpu-bh')?'barnes-hut':'direct',d=validationSnapshot(state,{G:p.G,epsilon:p.epsilon,algorithm,energyAlgorithm:'direct',theta:p.theta,selfGravity:false});
 return {...d,...p,selfGravity:true,precision:'Float64 compensated CPU evaluation',units:'1e10 Msun kpc^2 Myr^-2',externalPotential:0,arithmeticUncertainty:'Not a formal interval; see Decimal-80 calibration in energy-audit report.'};
}
export function fastEnergy(state,options={}){
 const start=performance.now(),d=energyBase(state,options),potential=barnesHutPotentialEnergy(state,{G:d.G,epsilon:d.epsilon,theta:d.theta});
 return {...d,potential,selfPotential:potential,energy:d.kinetic+potential,energyScale:Math.abs(d.kinetic)+Math.abs(potential),energyApproximate:d.theta>0,algorithm:'barnes-hut',energyAlgorithm:'barnes-hut',energyMethod:'Energia estimada — Barnes–Hut',treeOrder:'monopole',treeLeafBucket:8,
  treeEpsilonSquared:d.epsilon*d.epsilon,diagnosticCostMs:performance.now()-start};
}
export function directEnergy(state,options={}){
 const start=performance.now(),d=energyBase(state,options),potential=pairEnergyRange(state.positions,state.masses,state.n,0,state.n-1,d.G,d.epsilonSquared);
 return finishDirect(d,potential,performance.now()-start);
}
export function finishDirect(d,potential,costMs){return {...d,potential,selfPotential:potential,energy:d.kinetic+potential,energyScale:Math.abs(d.kinetic)+Math.abs(potential),energyApproximate:false,algorithm:'direct',energyAlgorithm:'direct',energyMethod:'Energia direta Float64 — pares compensados',diagnosticCostMs:costMs};}
export function relativeEnergy(current,initial){
 if(!current||!initial)return null;
 const scale=Math.abs(initial.kinetic)+Math.abs(initial.potential),regular=Math.abs(initial.energy)>64*Number.EPSILON*scale,denominator=regular?Math.abs(initial.energy):scale;
 if(!(denominator>0)||![current.energy,initial.energy,denominator].every(Number.isFinite))return null;
 const signed=(current.energy-initial.energy)/denominator;
 return {signed,absolute:Math.abs(signed),percent:100*signed,denominator,normalization:regular?'|E0|':'K0 + |U0| (E0 near cancellation)'};
}
export function compareEnergy(fast,direct){return {timeMyr:direct.time,deltaU:fast.potential-direct.potential,relativeU:direct.potential!==0?Math.abs(fast.potential-direct.potential)/Math.abs(direct.potential):null,fast,direct};}
