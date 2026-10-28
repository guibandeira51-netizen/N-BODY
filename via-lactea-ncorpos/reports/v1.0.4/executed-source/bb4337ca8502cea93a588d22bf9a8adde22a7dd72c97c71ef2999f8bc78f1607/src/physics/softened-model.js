/** Versioned preparation/evolution compatibility; never confers equilibrium. */
export function preparedSoftening(state) {
 const model=state?.meta?.softenedMean;
 if(model==null)return null;
 if(!Number.isFinite(model.epsilonKpc)||model.epsilonKpc<=0||model.converged!==true||!state.meta.physicalModel?.preparationPotentialSHA256?.match(/^[a-f0-9]{64}$/))throw Error('Preparação suavizada sem parâmetros, convergência numérica ou identidade de potencial válidos.');
 return {epsilonKpc:model.epsilonKpc,numericalFixedPointConverged:true,equilibriumValidated:false,modelId:state.meta.physicalModel.id};
}
export function assertPreparedForce(state,epsilon,{allowDifferentHamiltonian=false}={}){
 if(!Number.isFinite(epsilon)||epsilon<0)throw Error('Suavização da evolução inválida.');
 const preparation=preparedSoftening(state),mismatch=preparation!==null&&Math.abs(epsilon-preparation.epsilonKpc)>16*Number.EPSILON*Math.max(epsilon,preparation.epsilonKpc);
 if(mismatch&&!allowDifferentHamiltonian)throw Error('Suavização da evolução difere do campo de preparação; identifique explicitamente um experimento com outra Hamiltoniana.');
 return {preparation,differentHamiltonian:mismatch};
}
