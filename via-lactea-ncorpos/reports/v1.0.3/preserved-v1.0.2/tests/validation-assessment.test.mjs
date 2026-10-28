import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeValidationAssessment,safeValidationArtifactPath} from '../src/validation-assessment.js';

test('scientific assessments remain independent when only small-N energy is validated',()=>{
 const a=normalizeValidationAssessment({assessments:{
  energy:{status:'validated',scope:'CPU Float64, N = 128, 20 Myr',summary:'Referência direta.',evidence:['Série temporal e erro máximo calculados.']},
  stability:{status:'not-validated',summary:'Aquecimento medido.',limitations:['Intervalo galáctico ainda insuficiente.']},
  convergence:{status:'incomplete',summary:'Refinamento do halo pendente.'}
 }});
 assert.equal(a.assessments.energy.label,'VALIDADO NUMERICAMENTE');
 assert.match(a.assessments.energy.scope,/N = 128/);
 assert.equal(a.assessments.stability.label,'NÃO VALIDADO');
 assert.equal(a.assessments.convergence.label,'DADOS INSUFICIENTES');
});

test('missing or ambiguous scientific evidence cannot promote a favourable qualification',()=>{
 for(const data of [null,{}, {status:'validated'}, {assessments:{energy:{status:'validated',evidence:['Reference only.']}}}, {assessments:{energy:{status:'validated',scope:'N=128',evidence:[]}}}]){
  const a=normalizeValidationAssessment(data);
  assert.equal(a.assessments.energy.status,'incomplete');
  assert.equal(a.assessments.stability.status,'incomplete');
  assert.equal(a.assessments.convergence.status,'incomplete');
 }
 const a=normalizeValidationAssessment({assessments:{energy:{status:'near-equilibrium',scope:'N=128',evidence:['Measured.']},stability:{status:'near-equilibrium',scope:'Smooth static field, 1 Gyr',evidence:['Structural series.']}}});
 assert.equal(a.assessments.energy.status,'incomplete');
 assert.equal(a.assessments.stability.label,'PRÓXIMO DO EQUILÍBRIO');
});

test('download manifest accepts local reproducibility artifacts and refuses paths outside the project',()=>{
 assert.equal(safeValidationArtifactPath('reports/v1.0.1/series.csv'),'./reports/v1.0.1/series.csv');
 assert.equal(safeValidationArtifactPath('./reports/v1.0.1/figures/energy.svg'),'./reports/v1.0.1/figures/energy.svg');
 for(const path of ['javascript:alert(1)','https://example.com/report.csv','../report.csv','reports/../report.csv','/report.csv','reports\\bad.csv','reports//bad.csv','reports/%2e%2e/bad.csv',null])assert.equal(safeValidationArtifactPath(path),null);
});
