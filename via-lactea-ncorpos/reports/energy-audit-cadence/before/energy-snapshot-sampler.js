import {copyEnergySnapshot} from '../physics/live-energy.js';

export function automaticEnergyPolicy(n,workers=4){
 const snapshotBytes=57*n,estimatedWorkingBytes=snapshotBytes*(workers+7),memoryBudgetBytes=96*1024*1024;
 return {cadenceMyr:200*Math.max(1,Math.ceil((n/80000)**2)),snapshotBytes,estimatedWorkingBytes,memoryBudgetBytes,
  allowed:Number.isSafeInteger(n)&&n>0&&estimatedWorkingBytes<=memoryBudgetBytes,maxEvaluationMs:60000,targetEvaluationMs:10000,maxReferences:4096};
}

// Runs only at actual diagnostic states. No additional integration, pause or force.
export class EnergySnapshotSampler{
 constructor(){this.next=0;this.started=false;this.disabled=false;}
 due(time,n){return !this.disabled&&automaticEnergyPolicy(n).allowed&&time>=this.next;}
 capture(state,fast,options){
  if(this.disabled)return null;
  const policy=automaticEnergyPolicy(state.n);
  if(!policy.allowed){this.disabled=true;return {unavailable:true,timeMyr:state.time??0,reason:'Orçamento de memória da referência automática excedido; a simulação continua.',policy};}
  const time=state.time??0;
  if(!this.started&&time!==0){this.disabled=true;return {unavailable:true,timeMyr:time,reason:'Estado inicial não preservado. A referência automática começará corretamente na próxima execução.',policy};}
  if(time<this.next||this.started&&time===0)return null;
  const requestedTimeMyr=this.next;
  this.started=true;this.next=(Math.floor(time/policy.cadenceMyr)+1)*policy.cadenceMyr;
  return {state:copyEnergySnapshot(state),fast:structuredClone(fast),options:structuredClone(options),requestedTimeMyr,nextCaptureMyr:this.next,policy};
 }
}
