import {copyEnergySnapshot,energyParameters,relativeEnergy} from './physics/live-energy.js';

// A completed reference is meaningful only with the original realization at t=0.
export function directReferenceData(references){
 const initial=references.find(r=>r.timeMyr===0&&r.direct?.time===0)?.direct??null;
 return {initial,points:initial?references.flatMap(r=>[[r.timeMyr,relativeEnergy(r.direct,initial)?.percent??null],[r.timeMyr,null]]):[]};
}

// Own the arrays and options before asynchronous work. Integration can then resume.
export function preserveEnergyCapture(capture){
 if(!capture?.states?.length||!capture.states.some(x=>x.state?.time===0&&x.fast?.time===0))throw Error('Estado inicial em t=0 indisponível. Reinicie uma nova realização para preservar sua referência inicial.');
 const options=structuredClone(capture.options),parameters=energyParameters(options);
 const states=capture.states.map(({state,fast})=>{
  if(!Number.isSafeInteger(state.n)||state.n<1||state.positions.length!==3*state.n||state.velocities.length!==3*state.n||state.masses.length!==state.n||state.components.length!==state.n||!Number.isFinite(state.time)||state.time<0||fast?.time!==state.time)throw Error('Snapshot inconsistente: época, N ou dimensões incompatíveis. Nenhum ponto foi registrado.');
  for(const array of [state.positions,state.velocities,state.masses])if(!array.every(Number.isFinite))throw Error('Snapshot contém valores não finitos. Nenhum ponto foi registrado.');
  if(fast.G!==parameters.G||fast.epsilonSquared!==parameters.epsilonSquared)throw Error('Snapshot e diagnóstico usam parâmetros gravitacionais diferentes. Nenhum ponto foi registrado.');
  return {state:copyEnergySnapshot(state),fast:structuredClone(fast)};
 }).sort((a,b)=>a.state.time-b.state.time);
 const initial=states[0].state;
 for(const {state} of states)if(state.n!==initial.n||state.masses.some((m,i)=>m!==initial.masses[i])||state.components.some((c,i)=>c!==initial.components[i]))throw Error('Snapshots pertencem a realizações diferentes. Reinicie uma nova realização.');
 return {states,options,parameters,configuration:structuredClone(capture.configuration??null),backend:parameters.trajectoryPrecision==='Float32'?'WebGPU':'CPU Worker'};
}

export const energyAuditView=()=>`<details id="energy-validation" class="energy-validation"><summary>Validação de energia</summary><div class="energy-validation-content"><p class="field-help">Energia estimada — Barnes–Hut: aproximação numérica. Referência direta: CPU Float64 paralela, sob demanda, sem alterar as partículas.</p><p class="field-help">Cada série usa sua própria E₀ em t=0, na mesma realização. Desvios assinados em %. A integração pode continuar enquanto o snapshot preservado é avaliado.</p><div class="energy-validation-actions"><button type="button" id="energy-estimate" class="button secondary">Estimar custo da referência direta</button><button type="button" id="energy-reference" class="button primary" disabled>Calcular referência direta Float64</button><button type="button" id="energy-cancel" class="button secondary" disabled>Cancelar cálculo</button></div><progress id="energy-progress" max="1" value="0" aria-label="Progresso da referência energética"></progress><p id="energy-job" class="field-help" role="status">Estime o custo para selecionar os snapshots antes de calcular.</p><button type="button" id="energy-restart" class="button secondary" hidden>Reiniciar com referência inicial preservada</button><p id="energy-availability" class="field-help" role="status">Nenhuma referência direta calculada nesta execução.</p><p id="energy-baselines" class="field-help"></p><details><summary>Instantes auditados e parâmetros</summary><div class="energy-audited-scroll"><table class="energy-audited-table"><thead><tr><th>t [Myr]</th><th>N</th><th>E direta</th><th>δE [%]</th></tr></thead><tbody id="energy-audited"></tbody></table></div><p class="field-help">Energia em 10¹⁰ M☉ kpc²/Myr². Cada linha permite consultar os parâmetros do snapshot. Referências diretas não são interpoladas e não certificam estabilidade estrutural.</p></details><details><summary>Dados da auditoria</summary><button type="button" id="energy-json" class="button secondary">Energia · JSON</button><button type="button" id="energy-csv" class="button secondary">Energia · CSV</button></details></div></details>`;
