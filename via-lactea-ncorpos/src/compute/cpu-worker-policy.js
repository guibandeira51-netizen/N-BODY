/** Logical concurrency budget, not a claim about measured CPU utilization. */
export function cpuWorkerPolicy(requested=16,capabilities={}){
 const available=Math.max(1,Math.floor(capabilities.hardwareConcurrency??1));
 const wanted=Math.max(1,Math.min(16,Math.floor(Number(requested)||1),available));
 const parallel=Boolean(capabilities.worker&&capabilities.sharedArrayBuffer&&capabilities.crossOriginIsolated&&wanted>1);
 return {requestedWorkers:wanted,workers:parallel?wanted:1,parallel,
  reason:parallel?null:wanted===1?'Um processador lógico solicitado ou disponível.':'Memória compartilhada, isolamento entre origens ou Workers indisponíveis; CPU serial Float64.'};
}
export function forceWorkerBudget(capacity,energyWorkers=0){
 return Math.max(1,Math.min(capacity,capacity-Math.max(0,Math.floor(Number(energyWorkers)||0))));
}
