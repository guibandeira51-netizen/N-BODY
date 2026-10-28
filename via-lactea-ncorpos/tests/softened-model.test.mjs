import test from 'node:test';
import assert from 'node:assert/strict';
import {preparedSoftening,assertPreparedForce} from '../src/physics/softened-model.js';
import {initialOrbit} from '../src/physics/equilibrium-analysis.js';
const fixture=()=>({meta:{softenedMean:{epsilonKpc:.1,converged:true},physicalModel:{id:'softened-test',preparationPotentialSHA256:'a'.repeat(64)}}});
test('softened preparation requires its own numerical/force identity but cannot certify equilibrium',()=>{
 const s=fixture(),a=preparedSoftening(s);assert.equal(a.equilibriumValidated,false);assert.equal(a.epsilonKpc,.1);
 s.meta.softenedMean.converged=false;assert.throws(()=>preparedSoftening(s),/convergência/);
 s.meta.softenedMean.converged=true;s.meta.physicalModel.preparationPotentialSHA256='unknown';assert.throws(()=>preparedSoftening(s),/identidade/);
});
test('wrong evolution epsilon must be a deliberately identified different-Hamiltonian experiment',()=>{
 const s=fixture();assert.equal(assertPreparedForce(s,.1).differentHamiltonian,false);assert.throws(()=>assertPreparedForce(s,.2),/Hamiltoniana/);
 assert.equal(assertPreparedForce(s,.2,{allowDifferentHamiltonian:true}).differentHamiltonian,true);assert.equal(s.meta.softenedMean.epsilonKpc,.1);
 for(const e of [-1,NaN,Infinity])assert.throws(()=>assertPreparedForce(s,e));
});
test('historical ICs retain their independent meaning without silent softened relabelling',()=>{
 assert.equal(preparedSoftening({meta:{}}),null);assert.equal(assertPreparedForce({meta:{}},.1).preparation,null);
 const s=fixture();s.meta.physicalModel.initialOrbitTable={radiusKpc:[1,10],vcInternal:[.2,.2],kappaPerMyr:[.05,.01]};assert.match(initialOrbit(s,5).reference,/Plummer/);delete s.meta.softenedMean;assert.match(initialOrbit(s,5).reference,/unsoftened/);
});
