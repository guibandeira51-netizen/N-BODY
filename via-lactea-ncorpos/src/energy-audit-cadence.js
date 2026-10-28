export const ENERGY_AUDIT_CADENCES=Object.freeze([50,100,150,200]);
export function requireEnergyAuditCadence(value){
 const cadence=Number(value);
 if(!['number','string'].includes(typeof value)||!ENERGY_AUDIT_CADENCES.includes(cadence))throw Error('Selecione o intervalo de auditoria Float64: 50, 100, 150 ou 200 Myr antes de iniciar.');
 return cadence;
}
export const energyAuditCadenceView=()=>`<div class="field energy-audit-cadence"><label for="energy-audit-cadence">Intervalo de auditoria Float64 · Myr</label><select id="energy-audit-cadence" required aria-required="true" aria-describedby="energy-audit-cadence-help"><option value="" selected disabled>Selecione o intervalo</option>${ENERGY_AUDIT_CADENCES.map(n=>`<option value="${n}">${n} Myr</option>`).join('')}</select><p id="energy-audit-cadence-help" class="field-help">Escolha obrigatória antes de iniciar. Alterações valem para uma nova realização. Intervalo físico solicitado entre snapshots. Há um cálculo ativo e um snapshot em espera; atrasos e omissões são registrados, sem criar medições intermediárias.</p></div>`;
