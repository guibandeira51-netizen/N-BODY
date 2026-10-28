/** Release integrity checks: provenance, actual artifacts and physical identities. */
import assert from 'node:assert/strict';
import {readFile,stat,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {root,out,read,hash,save} from './common.mjs';
const built=process.argv.includes('--built'),base=built?resolve(root,'dist'):root;
const summary=await read('reports/v1.0.1/summary.json'),a=await read('reports/v1.0.1/assessment.json'),figures=await read('reports/v1.0.1/figures/figure-manifest.json');
assert.equal(summary.newIntegrations,21);assert.equal(summary.referenceBinaryRuns,3);assert.equal(summary.historicalReanalyzedRuns,10);assert.equal(summary.historicalStates,33);
assert.equal(a.assessments.stability.status,'not-validated');assert.equal(a.assessments.convergence.status,'incomplete');assert.ok(a.assessments.energy.scope.includes('N=1000'));
assert.equal(figures.figures.length,10);
let verifiedSources=0;
for(const f of figures.figures){for(const key of ['path','svgPath','dataPath'])assert.ok((await stat(resolve(base,f[key]))).size>0);for(const source of f.sources){assert.equal(hash(await readFile(resolve(root,source.path))),source.sha256,'Stale plotted source '+source.path);verifiedSources++;}}
const links=['assessment.json','summary.json','energy-series.csv','structure-series.csv'].map(n=>'reports/v1.0.1/'+n);
for(const r of a.artifacts.data)links.push(r.path);
for(const name of ['ESTABILIDADE_E_CONSERVACAO_TCC.md','AUDITORIA_ENERGIA_1_0_1.md','EQUILIBRIO_AXISIMETRICO_1_0_1.md','CONVERGENCIA_NUMERICA_1_0_1.md','COMPARACAO_AGAMA_1_0_1.md'])links.push(name);
for(const p of links)assert.ok((await stat(resolve(base,p))).size>0,'Missing artifact '+p);
const hist=await read('reports/v1.0.1/historical-downloads-preservation.json');for(const [p,h] of Object.entries(hist))assert.equal(hash(await readFile(resolve(root,'downloads',p))),h,'Historical download changed '+p);
const energies=(await readFile(resolve(out,'energy-series.csv'),'utf8')).trim().split(/\r?\n/);for(const row of energies.slice(1)){const cells=row.split(','),n=Number(cells[2].replace(/^"|"$/g,''));assert.ok(Number.isInteger(n)&&n>0,'Missing N in energy CSV');assert.ok(!row.includes('NaN')&&!row.includes('Infinity'));}
const id=await read('reports/v1.0.1/code-identity.json');assert.ok(id.sourceDirectory);for(const [p,h] of Object.entries(id.files))assert.equal(hash(await readFile(resolve(root,id.sourceDirectory,p))),h,'Executed source differs '+p);
const record={status:'passed',built,checkedUTC:new Date().toISOString(),newIntegrations:summary.newIntegrations,historicalStates:33,scientificFigures:10,figureSourceHashChecks:verifiedSources,energyCsvRows:energies.length-1,preservedHistoricalArchives:Object.keys(hist).length,executedCpuSourceFiles:Object.keys(id.files).length,artifactsChecked:links.length};await save(built?'build-verification.json':'release-verification.json',record);console.log(JSON.stringify(record));
