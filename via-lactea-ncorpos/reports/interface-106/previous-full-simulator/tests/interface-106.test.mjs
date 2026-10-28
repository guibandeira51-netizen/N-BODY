import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');

test('N-body tab uses the complete user-selected simulator with its original DOM and engine',async()=>{
 const home=await readFile(resolve(root,'index.html'),'utf8'),experiment=await readFile(resolve(root,'experimento-ncorpos.html'),'utf8'),legacy=await readFile(resolve(root,'simulador-tecnico.html'),'utf8');
 const stripNavigation=experiment.replace('<body data-page106="experiment">','<body>').replace(/<div class="ncorpos-navigation">[\s\S]*?<\/div>/,'').replace('\n  <link rel="stylesheet" href="./ncorpos-navigation.css">','');
 assert.equal(stripNavigation,legacy,'Keep every original simulator control, ID, script and layout unchanged');
 const nav=experiment.match(/<nav aria-label="Navegação principal">([\s\S]*?)<\/nav>/)[1];assert.equal((nav.match(/<a /g)??[]).length,3);assert(!nav.includes('arquivo-cientifico'));assert(experiment.includes('src="./src/main.js"'));assert(!experiment.includes('experiment106-page'));assert(!experiment.includes('id="experiment-galaxy"'));assert(!home.includes('Laboratório de Estabilidade Galáctica'));assert(!home.includes('data-figure106='));
});
