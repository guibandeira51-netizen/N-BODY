// Presentation only: each scientific qualification comes from its own evidence.
const labels={validated:'VALIDADO NUMERICAMENTE','near-equilibrium':'PRÓXIMO DO EQUILÍBRIO','not-validated':'NÃO VALIDADO',incomplete:'DADOS INSUFICIENTES'};
const defaults={
  energy:'Sem séries temporais suficientes para qualificar a conservação de energia.',
  stability:'Sem evidências suficientes para qualificar o equilíbrio estrutural.',
  convergence:'Sem comparações controladas suficientes para qualificar a convergência.'
};
const strings=value=>Array.isArray(value)?value.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()):[];
export function normalizeValidationAssessment(data){
  const source=data&&typeof data==='object'?data:{};
  const assessments={};
  for(const key of Object.keys(defaults)){
    const row=source.assessments?.[key]??{},evidence=strings(row.evidence),limitations=strings(row.limitations);
    let status=Object.hasOwn(labels,row.status)?row.status:'incomplete';
    // A favourable label requires stated evidence and an explicit scope. A
    // structural qualification cannot be inherited from the energy card.
    const scope=typeof row.scope==='string'?row.scope.trim():'';
    if((status==='validated'||status==='near-equilibrium')&&(!evidence.length||!scope))status='incomplete';
    if(status==='near-equilibrium'&&key!=='stability')status='incomplete';
    assessments[key]={status,label:labels[status],summary:typeof row.summary==='string'&&row.summary.trim()?row.summary.trim():defaults[key],scope,evidence,limitations};
  }
  return {
    publicConclusion:typeof source.publicConclusion==='string'?source.publicConclusion:'As avaliações científicas estão incompletas. Consulte as evidências e pendências de cada dimensão.',
    domain:typeof source.domain==='string'?source.domain:typeof source.domain?.description==='string'?source.domain.description:'Domínio de validação ainda não informado.',
    generatedAt:typeof source.generatedAt==='string'?source.generatedAt:null,
    assessments,
    artifacts:source.artifacts&&typeof source.artifacts==='object'?source.artifacts:{}
  };
}

export function safeValidationArtifactPath(value){
  if(typeof value!=='string')return null;
  const path=value.replace(/^\.\//,'');
  if(!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'))return null;
  return './'+path;
}
