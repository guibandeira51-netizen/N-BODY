import {GPUBackend} from '../src/compute/gpu.js';import {createGalaxy} from '../src/physics/initial.js';import {diagnostics} from '../src/physics/diagnostics.js';import {fastEnergy,relativeEnergy} from '../src/physics/live-energy.js';import {LiveEnergyReference} from '../src/compute/live-energy-reference.js';
let evidence=null,gpu=null,pool=null,cancelled=false;
const $=id=>document.getElementById(id);
$('cancel').onclick=()=>{cancelled=true;pool?.cancel();$('status').textContent='Cancelamento solicitado; aguarda o passo GPU pendente.';};
$('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(evidence,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v)],{type:'application/json'}));a.download='repeticao-energia-80000.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('run').onclick=async()=>{
 $('run').disabled=true;$('cancel').disabled=false;cancelled=false;const started=performance.now();
 try{
  const historical=await fetch('../reports/energy-audit/observed-run-before.json').then(r=>r.json()),config=historical.laboratory.configuration;
  const codeIdentity=await fetch('../reports/interface-106/code-identity.json').then(r=>r.json());
  evidence={schema:'legacy-80000-selected-epoch-replay-v1',UTC:new Date().toISOString(),configuration:config,codeIdentity,rows:[],snapshots:[],limitations:['A repeated trajectory is compared with original aggregate diagnostics; original later particle states were not preserved.','Direct energy evaluation is CPU Float64 of actual stored GPU particles, not Float64 integration.','Only selected epochs are directly audited; maxima are sampled.']};
  gpu=await GPUBackend.create();pool=new LiveEnergyReference();await gpu.initialize(createGalaxy(config),config);const initial=await gpu.snapshot(),options={...config,effectiveParameters:gpu.effectiveParameters,forceMethod:'GPU direct Float32'};evidence.effectiveParameters=gpu.effectiveParameters;
  const n=1000,pilot={...initial,n,positions:initial.positions.slice(0,3*n),velocities:initial.velocities.slice(0,3*n),masses:initial.masses.slice(0,n),components:initial.components.slice(0,n)};
  $('status').textContent='Medindo piloto do diagnóstico direto; depois uma referência por época selecionada.';await pool.evaluate(pilot,options);evidence.projectedReferenceMs=pool.estimate(initial.n);evidence.parallelWorkers=pool.count;
  let firstDirect=null,firstFast=null;for(let k=0;k<historical.laboratory.samples.length;k++){
   if(cancelled)throw Error('Cancelado');const h=historical.laboratory.samples[k],target=Math.round(h.timeMyr/config.dt);
   while(gpu.steps<target){if(cancelled)throw Error('Cancelado');const count=Math.min(256,target-gpu.steps);await gpu.step(count);$('status').textContent=`Integrando até ${h.timeMyr.toFixed(1)} Myr; atual ${gpu.time.toFixed(1)} Myr. Época ${k+1}/8.`;}
   const state=k===0?initial:await gpu.snapshot(),old=diagnostics(state,{...config,algorithm:'barnes-hut'}),fast=fastEnergy(state,options);
   $('status').textContent=`Energia direta em ${state.time.toFixed(1)} Myr: 3.199.960.000 pares, ${pool.count} Workers; custo projetado ~${(pool.estimate(state.n)/1000).toFixed(1)} s.`;
   const direct=await pool.evaluate(state,options,p=>$('progress').value=(k+p)/historical.laboratory.samples.length);firstDirect??=direct;firstFast??=fast;
   const oldBaseline=historical.laboratory.samples[0].conservation,oldDrift=(old.energy-oldBaseline.energy)/Math.abs(oldBaseline.energy),originalDrift=(h.conservation.energy-oldBaseline.energy)/Math.abs(oldBaseline.energy);
   const row={time_Myr:state.time,requestedTimeMyr:h.timeMyr,n:state.n,steps:gpu.steps,oldKinetic:old.kinetic,oldPotential:old.potential,oldEnergy:old.energy,originalKinetic:h.conservation.kinetic,originalPotential:h.conservation.potential,originalEnergy:h.conservation.energy,kineticDifferenceFromOriginal:old.kinetic-h.conservation.kinetic,potentialDifferenceFromOriginal:old.potential-h.conservation.potential,energyDifferenceFromOriginal:old.energy-h.conservation.energy,deltaOriginalBH:originalDrift,deltaReplayedOldBH:oldDrift,deltaDirect:relativeEnergy(direct,firstDirect).signed,deltaFastEffective:relativeEnergy(fast,firstFast).signed,deltaU:fast.potential-direct.potential,relativeU:Math.abs((fast.potential-direct.potential)/direct.potential),fast,direct};
   evidence.rows.push(row);evidence.snapshots.push({n:state.n,time:state.time,positions:state.positions,velocities:state.velocities,masses:state.masses,components:state.components});$('result').textContent=JSON.stringify({effectiveParameters:evidence.effectiveParameters,parallelWorkers:pool.count,rows:evidence.rows.map(({fast,direct,...r})=>r)},null,2);
  }
  evidence.status='completed';evidence.wallMs=performance.now()-started;$('status').textContent=`Repetição concluída em ${(evidence.wallMs/1000).toFixed(1)} s. Exporte para preservar os snapshots auditados.`;
 }catch(e){if(evidence){evidence.status=cancelled?'cancelled':'failed';evidence.error=e.message;} $('status').textContent=e.message;}finally{gpu?.dispose();pool?.cancel();$('cancel').disabled=true;$('export').disabled=!evidence?.rows.length;}
};
