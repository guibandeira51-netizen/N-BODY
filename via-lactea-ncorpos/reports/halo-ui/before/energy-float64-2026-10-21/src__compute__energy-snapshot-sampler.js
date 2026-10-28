import {requireEnergyAuditCadence} from '../energy-audit-cadence.js';
import {copyEnergySnapshot} from '../physics/live-energy.js';

export function automaticEnergyPolicy(n,workers=4,requestedCadenceMyr=200,memoryBudgetBytes=96*1024*1024){
 requestedCadenceMyr=requireEnergyAuditCadence(requestedCadenceMyr);
 if(!Number.isFinite(memoryBudgetBytes)||memoryBudgetBytes<0)throw Error('Orçamento da referência energética inválido.');
 const snapshotBytes=57*n,estimatedWorkingBytes=snapshotBytes*(workers+7);
 const resolutionCadenceMyr=requestedCadenceMyr*Math.max(1,Math.ceil((n/80000)**2));
 return {requestedCadenceMyr,resolutionCadenceMyr,cadenceMyr:resolutionCadenceMyr,snapshotBytes,estimatedWorkingBytes,memoryBudgetBytes,
  allowed:Number.isSafeInteger(n)&&n>0&&estimatedWorkingBytes<=memoryBudgetBytes,maxEvaluationMs:60000,targetEvaluationMs:10000,maxReferences:4096};
}

export function energyCadenceForCost(policy,costMs){
 // Resolution and measured cost are independent lower bounds. Multiplying
 // both counts the N² cost twice and can omit an entire 5-Gyr experiment.
 return Math.max(policy.resolutionCadenceMyr,policy.requestedCadenceMyr*Math.max(1,Math.ceil(costMs/policy.targetEvaluationMs)));
}

// Runs only at actual diagnostic states. No additional integration, pause or force.
export class EnergySnapshotSampler{
 constructor(){this.requestedCadenceMyr=null;this.memoryBudgetBytes=undefined;this.next=0;this.started=false;this.disabled=false;}
 due(time,n){return !this.disabled&&automaticEnergyPolicy(n,4,this.requestedCadenceMyr??200,this.memoryBudgetBytes).allowed&&time>=this.next;}
 capture(state,fast,options){
  if(this.disabled)return null;
  const requested=requireEnergyAuditCadence(options?.energyAuditCadenceMyr??200);
  if(this.requestedCadenceMyr!==null&&requested!==this.requestedCadenceMyr)throw Error('A cadência pertence à realização. Reinicie para aplicar outro intervalo.');
  this.requestedCadenceMyr=requested;
  this.memoryBudgetBytes=options?.energyReferenceBudgetBytes;
  const policy=automaticEnergyPolicy(state.n,4,requested,this.memoryBudgetBytes);
  if(!policy.allowed){this.disabled=true;return {unavailable:true,timeMyr:state.time??0,reason:'Orçamento de memória da referência automática excedido; a simulação continua.',policy};}
  const time=state.time??0;
  if(!this.started&&time!==0){this.disabled=true;return {unavailable:true,timeMyr:time,reason:'Estado inicial não preservado. A referência automática começará corretamente na próxima execução.',policy};}
  if(time<this.next||this.started&&time===0)return null;
  const requestedTimeMyr=this.next;
  this.started=true;this.next=(Math.floor(time/policy.cadenceMyr)+1)*policy.cadenceMyr;
  return {state:copyEnergySnapshot(state),fast:structuredClone(fast),options:structuredClone(options),requestedTimeMyr,nextCaptureMyr:this.next,policy};
 }
}
