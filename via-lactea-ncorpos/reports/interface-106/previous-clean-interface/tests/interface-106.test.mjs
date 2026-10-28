import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createGalaxy} from '../src/physics/initial.js';
import {diagnostics} from '../src/physics/diagnostics.js';
const root=resolve(import.meta.dirname,'..');
let reply;
globalThis.self={};
globalThis.postMessage=m=>{reply=m;};
await import('../src/compute/presentation-worker.js');
const rpc=m=>{reply=null;self.onmessage({data:m});assert(reply,'worker must reply');return reply;};
const manifest=JSON.parse(await readFile(resolve(root,'reports/v1.0.2/corrected/snapshots.json'),'utf8'));
const snapshot=JSON.parse(await readFile(resolve(root,'reports/v1.0.2/corrected',manifest.find(r=>r.n===1000&&r.seed===2026).file),'utf8'));
const config={dt:.05,epsilon:.1,theta:.5,algorithm:'direct'};

test('clean experiment worker advances physical time and resets both energy baseline and original realization',()=>{
 const first=rpc({type:'prepare',snapshot,config});assert.equal(first.type,'prepared');assert.equal(first.sample.n,1000);assert.equal(first.sample.relativeEnergy,0);assert.equal(first.sample.heightPopulation,'thin');
 const advanced=rpc({type:'step',count:4,measure:true});assert.equal(advanced.time,.2);assert.equal(advanced.sample.timeMyr,.2);assert(advanced.packed.some((v,i)=>v!==first.packed[i]));assert(Number.isFinite(advanced.sample.relativeEnergy));
 const reset=rpc({type:'prepare',snapshot,config});assert.equal(reset.sample.timeMyr,0);assert.equal(reset.sample.relativeEnergy,0);assert.deepEqual(reset.packed,first.packed);assert.equal(reset.sample.height,first.sample.height);
 const incompatible=rpc({type:'prepare',snapshot,config:{...config,epsilon:.2}});assert.equal(incompatible.type,'error');
});

test('GPU diagnostic wrapper retains the thin population and uses supplied effective Hamiltonian parameters',()=>{
 const state=createGalaxy({initialization:'snapshot',snapshot});const effective={...config,G:2.7e-12,epsilon:.100000003};
 const first=rpc({type:'gpu-prepare',state,tags:snapshot.subpopulations,config:effective}).sample;
 assert.equal(first.energy,diagnostics(state,{...effective,algorithm:'direct'}).energy);
 const changed=structuredClone(state);for(let i=0;i<changed.n;i++)if(snapshot.subpopulations[i]===2)changed.positions[3*i+2]+=10;
 const measured=rpc({type:'gpu-measure',state:changed}).sample;assert.equal(measured.height,first.height);assert.notEqual(measured.energy,first.energy);assert.notEqual(measured.relativeEnergy,0);
});

test('presentation has three primary routes while the archive stays secondary and physical graphs stay on their own pages',async()=>{
 const home=await readFile(resolve(root,'index.html'),'utf8'),experiment=await readFile(resolve(root,'experimento-ncorpos.html'),'utf8');
 const nav=home.match(/<nav aria-label="Navegação principal">([\s\S]*?)<\/nav>/)[1];assert.equal((nav.match(/<a /g)??[]).length,3);assert(!nav.includes('arquivo-cientifico'));assert(home.includes('Guilherme Aleixo Bandeira'));assert(home.includes('não representa resultados da simulação'));assert(!home.includes('Laboratório de Estabilidade Galáctica'));assert(!home.includes('data-figure106='));assert.equal((experiment.match(/id="experiment-(height|energy)-plot"/g)??[]).length,2);assert(!experiment.includes('data-figure106='));assert(!experiment.includes('<details class="experiment-advanced" open'));
});
