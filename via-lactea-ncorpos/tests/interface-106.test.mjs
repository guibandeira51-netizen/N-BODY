import {energyAuditCadenceView} from '../src/energy-audit-cadence.js';
import {haloRefinementView} from '../src/halo-refinement-view.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {energyAuditView} from '../src/energy-audit-session.js';
const root=resolve(import.meta.dirname,'..');

test('N-body tab preserves controls and original charts while adding four live observational panels',async()=>{
 const home=await readFile(resolve(root,'index.html'),'utf8'),experiment=await readFile(resolve(root,'experimento-ncorpos.html'),'utf8'),legacy=await readFile(resolve(root,'simulador-tecnico.html'),'utf8');
 assert(experiment.includes(haloRefinementView()));
 assert(!experiment.includes('value="cpu"'));assert(!experiment.includes('value="barnes-hut"'));assert(!experiment.includes('id="theta"'));
 for(const pattern of [/<section class="scene-panel"[\s\S]*?<\/section>/,/<section class="performance-panel"[\s\S]*?<\/section>/])assert.equal(experiment.match(pattern)?.[0].replace(/<div class="scene-mode">[\s\S]*?<span class="scene-unit">Espaço em kpc<\/span><\/div>/,'<span class="scene-unit">Espaço em kpc</span>'),legacy.match(pattern)?.[0]);
 for(const id of ['mode','n','halo-refinement','backend','force-method','model','seed','dt','epsilon'])assert(experiment.includes('id="'+id+'"'));
 const controls=experiment.match(/<aside class="controls"[\s\S]*?<\/aside>/)[0],charts=experiment.slice(experiment.indexOf('<section class="live-diagnostics"'));
 assert(controls.indexOf('Dispositivo e validação')<controls.indexOf('id="energy-validation"'));
 for(const id of ['energy-estimate','energy-reference','energy-cancel','energy-progress','energy-audited']){assert(controls.includes('id="'+id+'"'));assert(!charts.includes('id="'+id+'"'));}
 assert.equal((charts.match(/data-save-chart=/g)??[]).length,8);
 assert(!experiment.includes('id="live-energy-bias"'));assert(!experiment.includes('id="energy-bias-mode"'));
 const nav=experiment.match(/<nav aria-label="Navegação principal">([\s\S]*?)<\/nav>/)[1];assert.equal((nav.match(/<a /g)??[]).length,3);assert(!nav.includes('arquivo-cientifico'));assert(experiment.includes('src="./src/ncorpos-live-entry.js"'));assert(!experiment.includes('id="experiment-galaxy"'));assert(!home.includes('Laboratório de Estabilidade Galáctica'));assert(!home.includes('data-figure106='));
 for(const text of ['Resultados para revisão do TCC','Versão 1.0.1 · estabilidade','Laboratório de Estabilidade Galáctica','id="review-zip"'])assert(!experiment.includes(text));
 for(const id of ['live-height','live-energy','live-rotation','live-residuals','live-vertical-force','live-escape','live-enclosed-mass'])assert(experiment.includes('id="'+id+'"'));
});
