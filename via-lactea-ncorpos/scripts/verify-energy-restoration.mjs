import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {directEnergy,relativeEnergy} from '../src/physics/live-energy.js';
const root=new URL('../reports/energy-reference-restoration/',import.meta.url);
const raw=JSON.parse(await readFile(new URL('energia-2048-snapshots.json',root),'utf8'));
assert.equal(raw.references.length,3);
const initial=raw.references.find(r=>r.timeMyr===0).direct;
const energySources=['src/physics/live-energy.js','src/physics/pair-energy-partition.js','src/physics/validation-101.js','src/compute/live-energy-reference.js','src/compute/energy-reference-worker.js','src/physics/forces.js','src/physics/integrator.js','src/physics/initial.js'];
for(const file of energySources)assert.equal(createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex'),raw.codeIdentity.files[file]);
const results=[];
for(const r of raw.references){
 const s={...r.snapshot,positions:Float64Array.from(r.snapshot.positions),velocities:Float64Array.from(r.snapshot.velocities),masses:Float64Array.from(r.snapshot.masses),components:Uint8Array.from(r.snapshot.components)};
 const p=r.snapshot.parameters,d=directEnergy(s,{G:p.G,epsilon:p.epsilon,epsilonSquared:p.epsilonSquared,dt:p.effectiveDt,forceMethod:p.forceAlgorithm});
 assert.equal(s.time,r.timeMyr);assert(Math.abs(d.energy-r.direct.energy)<1e-13);
 const e=relativeEnergy(r.direct,initial);assert.equal(e.denominator,Math.abs(initial.energy));
 results.push({timeMyr:r.timeMyr,n:s.n,energy:r.direct.energy,recomputedEnergy:d.energy,absoluteRecomputationDifference:Math.abs(d.energy-r.direct.energy),signedPercent:e.percent,denominator:e.denominator,costMs:r.direct.diagnosticCostMs});
}
const svg=await readFile(new URL('energia-2048-baixada.svg',root),'utf8');
assert(svg.includes('Estimada · Barnes–Hut'));assert(svg.includes('Direta · Float64'));
const path=svg.match(/<path d="([^"]*)" fill="none" stroke="#c07b25"/)[1];
assert(!path.includes('L'));assert.equal((path.match(/M/g)??[]).length,3);
assert.equal((svg.match(/<circle[^>]*fill="#c07b25"/g)??[]).length,3);
const report={status:'passed',scope:'Restoration workflow, not a new equilibrium campaign',N:2048,backend:'CPU Worker',force:'direct Float64',dtMyr:.1,epsilonKpc:.1,seed:2026,normalization:'independent direct energy computed at t=0',results,exportedSVG:'energia-2048-baixada.svg',directPoints:3,interpolatedDirectSegments:0};
report.versionTraceability={energySourcesMatchEmbeddedManifest:energySources,embeddedManifest:raw.codeIdentity.sha256,note:'The browser fetched the previously served UI manifest before the final rebuild. It is preserved in the raw export, not relabelled as the final UI version. The energy evaluation, force, initial state and integrator sources listed here match that manifest byte for byte. Final interface identity is in reports/interface-106/code-identity.json.'};
await writeFile(new URL('snapshot-verification.json',root),JSON.stringify(report,null,2));
await writeFile(new URL('referencias-2048.csv',root),['time_Myr,n,E_direct,deltaE_signed_percent,direct_denominator,cost_ms',...results.map(r=>[r.timeMyr,r.n,r.energy,r.signedPercent,r.denominator,r.costMs].join(','))].join('\n')+'\n');
console.log(JSON.stringify(report,null,2));
