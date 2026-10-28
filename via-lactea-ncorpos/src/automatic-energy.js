import {requireEnergyAuditCadence} from './energy-audit-cadence.js';
import {preserveEnergyCapture} from './energy-audit-session.js';
import {automaticEnergyPolicy,energyCadenceForCost} from './compute/energy-snapshot-sampler.js';

// One active evaluation and one waiting snapshot. Never reconstruct missed epochs.
export class AutomaticEnergyReferences{
 constructor({pool,onReference,onChange=()=>{},isExternallyBusy=()=>false}){
  Object.assign(this,{pool,onReference,onChange,isExternallyBusy});this.generation=0;this.clear();
 }
 clear(){this.active=null;this.pending=null;this.initial=null;this.policy=null;this.disabled=false;this.phase='idle';this.lastError=null;this.lastTime=null;this.lastCostMs=null;this.estimatedCostMs=null;this.nextEligible=0;this.completed=0;this.omitted=0;this.events=[];this.peakPending=0;this.progress=0;}
 event(type,timeMyr,reason){this.events.push({type,timeMyr,reason});if(this.events.length>128)this.events.shift();if(type==='omitted')this.omitted++;}
 report(){return {mode:'automatic',phase:this.phase,activeTimeMyr:this.active?.state.time??null,pendingTimeMyr:this.pending?.state.time??null,pendingCount:this.pending?1:0,peakPending:this.peakPending,completed:this.completed,omitted:this.omitted,lastTimeMyr:this.lastTime,lastCostMs:this.lastCostMs,estimatedCostMs:this.estimatedCostMs,requestedCadenceMyr:this.policy?.requestedCadenceMyr??null,cadenceMyr:this.policy?.cadenceMyr??200,policy:this.policy,progress:this.progress,lastError:this.lastError,events:this.events.slice(),rawSnapshotRetention:'Initial and two latest completed snapshots; other points retain energies, parameters and epochs.'};}
 reset(){this.generation++;this.pool.cancel();this.clear();this.onChange(this.report());}
 unavailable(reason,time){this.lastError=reason;this.disabled=true;this.phase='limited';this.event('unavailable',time,reason);if(this.pending)this.event('omitted',this.pending.state.time,reason);this.pending=null;this.onChange(this.report());}
 enqueue(payload,configuration){
  if(!payload)return;
  if(payload.unavailable){this.unavailable(payload.reason,payload.timeMyr);return;}
  if(this.disabled)return;
  const time=payload.state.time;
  try{
   const requested=requireEnergyAuditCadence(payload.options?.energyAuditCadenceMyr??configuration?.energyAuditCadenceMyr??200);
   if(this.policy&&this.policy.requestedCadenceMyr!==requested)throw Error('A cadência pertence à realização. Reinicie para aplicar outro intervalo.');
   this.policy??=automaticEnergyPolicy(payload.state.n,this.pool.count,requested,payload.options?.energyReferenceBudgetBytes??configuration?.energyReferenceBudgetBytes,{enforceMemoryBudget:(payload.options?.enforceEnergyReferenceBudget??configuration?.enforceEnergyReferenceBudget)!==false});
   if(!this.policy.allowed){this.unavailable('Orçamento de memória da referência automática excedido; a simulação continua.',time);return;}
   if(this.completed>=this.policy.maxReferences){this.unavailable('Limite de referências da sessão atingido. Exporte os dados e inicie outra execução para continuar a auditoria.',time);return;}
   if(!this.initial&&time!==0){this.unavailable('Estado inicial não preservado. A referência automática começará corretamente na próxima execução.',time);return;}
   if(time!==0&&time<this.nextEligible){this.event('omitted',time,'Cadência adaptada ao custo da avaliação.');return;}
   const capture=preserveEnergyCapture({states:this.initial&&time!==0?[{state:this.initial.state,fast:this.initial.fast},{state:payload.state,fast:payload.fast}]:[{state:payload.state,fast:payload.fast}],options:payload.options,configuration});
   const last=capture.states.at(-1),job={...last,options:capture.options,parameters:capture.parameters,configuration:capture.configuration,backend:capture.backend,requestedTimeMyr:payload.requestedTimeMyr};
   if(time===0){if(this.initial)return;this.initial=job;}
   if(this.pending)this.event('omitted',this.pending.state.time,'Fila limitada: substituído pelo snapshot pendente mais recente.');
   this.pending=job;this.peakPending=1;this.pump();
  }catch(error){this.unavailable(error.message,time);}
 }
 cancelCurrent(){if(this.active){this.active.cancelled=true;this.pool.cancel();}}
 async pump(){
  if(this.active||!this.pending||this.disabled||this.isExternallyBusy())return;
  const job=this.pending,mine=this.generation;this.pending=null;this.active=job;this.phase='calculating';this.progress=0;this.onChange(this.report());
  try{
   if(this.pool.rate===null){
    // A 1000-body first-call timing is dominated by JIT/setup at large N.
    // Measure a bounded 10000-body pilot before extrapolating pair throughput.
    // This subset is timing only and is never plotted as a physical reference.
    const s=job.state,n=Math.min(s.n,10000),pilot={...s,n,positions:s.positions.slice(0,3*n),velocities:s.velocities.slice(0,3*n),masses:s.masses.slice(0,n),components:s.components.slice(0,n)};
    await this.pool.evaluate(pilot,job.options);if(mine!==this.generation)return;
   }
   // A cost estimate is not an accuracy or feasibility failure. Large,
   // memory-admitted jobs stay asynchronous and explicitly cancellable.
   this.estimatedCostMs=this.pool.estimate(job.state.n);this.onChange(this.report());
   const direct=await this.pool.evaluate(job.state,job.options,p=>{if(mine===this.generation){this.progress=p;this.onChange(this.report());}});
   if(mine!==this.generation)return;
   this.onReference(job,direct);this.completed++;this.lastTime=job.state.time;this.lastCostMs=direct.diagnosticCostMs;
   this.policy.cadenceMyr=energyCadenceForCost(this.policy,direct.diagnosticCostMs);
   this.nextEligible=(Math.floor(job.state.time/this.policy.cadenceMyr)+1)*this.policy.cadenceMyr;this.phase='ready';this.lastError=null;
   this.event('completed',job.state.time,'Referência direta Float64 calculada no snapshot preservado.');
  }catch(error){
   if(mine!==this.generation)return;
   this.lastError=job.cancelled?'Avaliação direta cancelada.':error.message;
   this.event('omitted',job.state.time,this.lastError);this.phase='failed';
   if(job.state.time===0)this.unavailable('Referência inicial direta indisponível nesta execução: '+this.lastError+' A simulação continua.',0);
  }finally{
   if(mine===this.generation){this.active=null;
    if(this.pending&&this.pending.state.time<this.nextEligible){this.event('omitted',this.pending.state.time,'Cadência adaptada ao custo.');this.pending=null;}
    this.onChange(this.report());queueMicrotask(()=>this.pump());
   }
  }
 }
}
