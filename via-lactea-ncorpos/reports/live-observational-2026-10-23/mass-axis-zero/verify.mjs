import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{observationalPlots}from'../../../src/observational-plots.js';
const folder=new URL('./',import.meta.url),root=new URL('../../../',import.meta.url),data=JSON.parse(await readFile(new URL('../ui-live-states.json',folder))).last.measurement,before=JSON.stringify(data),svg=observationalPlots(data)['live-enclosed-mass'];
if(!svg.includes('data-zero-reference="true" d="M90 320H710"')||JSON.stringify(data)!==before)throw Error('Eixo ou integridade dos dados inválidos');
await writeFile(new URL('mass-zero.svg',folder),svg);
const path=new URL('reports/halo-geometry-integrated-2026-10-22/code-identity.json',root),identity=JSON.parse(await readFile(path));
for(const f of['src/observational-plots.js','tests/live-observational.test.mjs'])identity.files[f]=createHash('sha256').update(await readFile(new URL(f,root))).digest('hex');
identity.sha256=createHash('sha256').update(JSON.stringify(identity.files)).digest('hex');identity.builtUTC=new Date().toISOString();identity.visualizationRevision='mass-axis-minimum-zero';await writeFile(path,JSON.stringify(identity,null,2));
await writeFile(new URL('validation.json',folder),JSON.stringify({changed:'Only vertical axis minimum of enclosed mass plot is fixed to zero; upper padding stays automatic',dataUnchanged:before===JSON.stringify(data),dataEpochMyr:data.timeMyr,n:data.n,zeroReferenceAtBottom:true,sourceIdentity:identity.sha256,tests:'node --test tests/live-observational.test.mjs',build:'pending'},null,2));
