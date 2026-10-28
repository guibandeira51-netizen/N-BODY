import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {deserializeInitial} from '../src/physics/iterative-initial.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {diagnostics} from '../src/physics/diagnostics.js';
import {laboratorySample} from '../src/physics/laboratory.js';
const input=resolve(process.argv[2]??'reports/v0.8.0/snapshots/cpu-candidate-1000-2026.json');
const raw=await readFile(input),state=deserializeInitial(JSON.parse(raw)),config={...state.meta.preparation.config,algorithm:'barnes-hut'},engine=new Leapfrog(state,config);engine.initialize();
const report={dateUTC:new Date().toISOString(),inputSha256:createHash('sha256').update(raw).digest('hex'),config,freeEvolution:true,samples:[]};
for(const t of [0,5,10,15,20,50,100,150,200]){const previous=report.samples.at(-1)?.timeMyr??0;if(t)engine.step(Math.round((t-previous)/config.dt));report.samples.push(laboratorySample(state,diagnostics(state,{...config,algorithm:'direct'}),config));}
await writeFile(new URL('../reports/v0.8.0/cpu-snapshot-validation.json',import.meta.url),JSON.stringify(report));console.log('Snapshot integrado livremente até 200 Myr; sem preparação ou correção durante a evolução.');
