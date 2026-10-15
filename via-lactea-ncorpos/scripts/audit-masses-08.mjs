import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createGalaxy} from '../src/physics/initial-legacy.js';
import {createAllocatedGalaxy} from '../src/physics/initial-allocated.js';
import {massAudit,massAuditMarkdown} from '../src/physics/mass-audit.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {diagnostics} from '../src/physics/diagnostics.js';
import {laboratorySample,relativeChange,energyDrift} from '../src/physics/laboratory.js';
const dir=new URL('../reports/v0.8.0/',import.meta.url);await mkdir(dir,{recursive:true});
const audit={dateUTC:new Date().toISOString(),sourceHashes:{},realizations:[]};
for(const file of ['constants.js','models.js','initial-legacy.js','initial-allocated.js','mass-audit.js','forces.js','integrator.js'])audit.sourceHashes[file]=createHash('sha256').update(await readFile(new URL('../src/physics/'+file,import.meta.url))).digest('hex');
for(const n of [10000,50000])for(const seed of [2026,2027])audit.realizations.push({seed,...massAudit(createGalaxy({n,seed}))});
for(const seed of [2026,2027])audit.realizations.push({seed,allocation:'fixed baryons; halo refined x5',...massAudit(createAllocatedGalaxy({n:26000,counts:[1500,4500,20000],seed}))});
await writeFile(new URL('mass-audit.json',dir),JSON.stringify(audit,null,2));await writeFile(new URL('mass-tables.md',dir),audit.realizations.map(massAuditMarkdown).join('\n'));
const old=JSON.parse(await readFile(new URL('../reports/laboratory/convergence-summary.json',import.meta.url),'utf8'));
const reproduction={dateUTC:new Date().toISOString(),runs:[]};
for(const seed of [2026,2027,2028]){const config={n:2000,seed,dt:.1,epsilon:.1,theta:.5,algorithm:'barnes-hut'},s=createGalaxy(config),e=new Leapfrog(s,config);e.initialize();const samples=[];
 for(const t of [0,5,10,15,20]){if(t)e.step(50);samples.push(laboratorySample(s,diagnostics(s,{...config,algorithm:'direct'}),config));}
 const a=samples[0],b=samples.at(-1),changes=b.components.map((c,i)=>({id:c.id,r50:relativeChange(c.r50,a.components[i].r50),R50:relativeChange(c.R50,a.components[i].R50),h50:relativeChange(c.massMedianAbsZ,a.components[i].massMedianAbsZ),sigmaZ:relativeChange(c.velocity.dispersion[2],a.components[i].velocity.dispersion[2])}));
 const previous=old.runs.find(r=>r.config.n===2000&&r.config.seed===seed&&r.config.dt===.1&&r.config.epsilon===.1&&r.config.theta===.5&&r.config.algorithm==='barnes-hut');
 const run={config,samples,changes,energyDrift:energyDrift(b.conservation,a.conservation),matchesHistoricalChanges:JSON.stringify(changes)===JSON.stringify(previous.changes)};reproduction.runs.push(run);console.log(JSON.stringify({seed,matched:run.matchesHistoricalChanges}));
}
await writeFile(new URL('cpu-reproduction.json',dir),JSON.stringify(reproduction));
