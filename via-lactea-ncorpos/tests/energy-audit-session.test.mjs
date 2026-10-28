import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveEnergyCapture,directReferenceData} from '../src/energy-audit-session.js';
import {energyChartEvidence,energyPlot} from '../src/live-diagnostics.js';
import {fastEnergy} from '../src/physics/live-energy.js';

const state=time=>({n:3,time,positions:Float64Array.of(0,0,0,1,0,0,0,1,0),velocities:new Float64Array(9),masses:Float64Array.of(1,2,3),components:Uint8Array.of(0,1,2)});
const capture=()=>{const options={epsilon:.1,dt:.1,algorithm:'direct'},states=[0,1].map(time=>{const s=state(time);return {state:s,fast:fastEnergy(s,options)};});return {states,options,configuration:{seed:2026}};};

test('asynchronous energy selection owns state arrays and effective options; rejects cross-realization or mismatched snapshots',()=>{
 const source=capture(),job=preserveEnergyCapture(source),value=job.states[1].state.positions[0];
 source.states[1].state.positions[0]=17;source.options.epsilon=3;source.configuration.seed=7;
 assert.equal(job.states[1].state.positions[0],value);assert.equal(job.options.epsilon,.1);assert.equal(job.configuration.seed,2026);
 const noInitial=capture();noInitial.states.shift();assert.throws(()=>preserveEnergyCapture(noInitial),/inicial em t=0/);
 const wrongTime=capture();wrongTime.states[1].fast.time=2;assert.throws(()=>preserveEnergyCapture(wrongTime),/época/);
 const wrongParameters=capture();wrongParameters.options.epsilon=.2;assert.throws(()=>preserveEnergyCapture(wrongParameters),/parâmetros gravitacionais/);
 const wrongMass=capture();wrongMass.states[1].state.masses[1]=12;assert.throws(()=>preserveEnergyCapture(wrongMass),/realizações diferentes/);
});

test('direct error uses its own exact t=0 reference, never the first nonzero epoch or BH initial energy',()=>{
 const initial={time:0,energy:-10,kinetic:2,potential:-12},later={time:2,energy:-9,kinetic:3,potential:-12};
 const refs=[{timeMyr:2,direct:later},{timeMyr:0,direct:initial}],samples=[{timeMyr:0,conservation:{...initial,energy:-20}},{timeMyr:2,conservation:{...later,energy:-18}}];
 const data=energyChartEvidence(samples,refs);assert.equal(data.references[0].relative.percent,10);assert.equal(data.references[0].relative.denominator,10);assert.equal(data.estimated[1].relative.percent,10);
 assert.deepEqual(directReferenceData([refs[0]]).points,[]);assert.equal(directReferenceData([refs[0]]).initial,null);
 assert.match(energyPlot(samples,[]),/Nenhuma referência direta calculada nesta execução/);
 const svg=energyPlot(samples,refs),path=svg.match(/<path d="([^"]*)" fill="none" stroke="#c07b25"/)[1];assert(!path.includes('L'));assert.equal((path.match(/M/g)??[]).length,2);assert.match(svg,/energy-chart-data/);
});
