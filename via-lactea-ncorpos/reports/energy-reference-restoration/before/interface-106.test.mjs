import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');

test('N-body tab keeps the selected controls and scene while replacing technical sections with three live charts',async()=>{
 const home=await readFile(resolve(root,'index.html'),'utf8'),experiment=await readFile(resolve(root,'experimento-ncorpos.html'),'utf8'),legacy=await readFile(resolve(root,'simulador-tecnico.html'),'utf8');
 for(const pattern of [/<aside class="controls"[\s\S]*?<\/aside>/,/<section class="scene-panel"[\s\S]*?<\/section>/,/<section class="performance-panel"[\s\S]*?<\/section>/])assert.equal(experiment.match(pattern)?.[0],legacy.match(pattern)?.[0]);
 const nav=experiment.match(/<nav aria-label="Navegação principal">([\s\S]*?)<\/nav>/)[1];assert.equal((nav.match(/<a /g)??[]).length,3);assert(!nav.includes('arquivo-cientifico'));assert(experiment.includes('src="./src/ncorpos-live-entry.js"'));assert(!experiment.includes('id="experiment-galaxy"'));assert(!home.includes('Laboratório de Estabilidade Galáctica'));assert(!home.includes('data-figure106='));
 for(const text of ['Resultados para revisão do TCC','Versão 1.0.1 · estabilidade','Laboratório de Estabilidade Galáctica','id="review-zip"'])assert(!experiment.includes(text));
 for(const id of ['live-height','live-energy','live-rotation'])assert(experiment.includes('id="'+id+'"'));
});
