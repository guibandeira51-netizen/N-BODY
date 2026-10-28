import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createAllocatedGalaxy} from '../../src/physics/initial-allocated.js';
import {sampleOrbitCandidate,serializeOrbitCandidate} from '../../src/physics/orbit-equilibrium.js';
import {selectDisk} from '../disk-audit/controls.mjs';
import {relativeEnergy} from '../../src/physics/live-energy.js';
import {RebuildControl,measureRebuild} from './controls.mjs';
const base='reports/equilibrium-rebuild',p=JSON.parse(await readFile(base+'/latest-library-1024.json','utf8')),library=JSON.parse(await readFile(p.library,'utf8')),field=JSON.parse(await readFile(library.field,'utf8')),out=base+'/controls-'+new Date().toISOString().replace(/[:.]/g,'-');await mkdir(out,{recursive:true});
const configs=[];for(const seed of [2026,2027,2028])for(const generator of ['legacy','candidate'])for(const control of ['fixed-total','disk-live','all-live'])configs.push({seed,generator,control,counts:[60,180,160],dt:.1,duration:200,stride:10});
for(const generator of ['legacy','candidate']){
 for(const dt of [.05,.025])configs.push({seed:2026,generator,control:'all-live',counts:[60,180,160],dt,duration:40,stride:2});
 for(const counts of [[120,360,320],[60,180,640]])configs.push({seed:2026,generator,control:'all-live',counts,dt:.1,duration:40,stride:2});
}
const manifest={schema:'equilibrium-rebuild-controls-v1',createdUTC:new Date().toISOString(),library:p,field:library.field,epsilon:field.epsilon,backend:'CPU direct Float64',qualification:'Rejection/characterization controls. Candidate density/stationarity not certified; no automatic promotion. N/halo studies short, epsilon convergence requires rebuilding the DF and remains gated.',runs:[]};
const sourceFiles=['src/physics/equilibrium-field.js','src/physics/orbit-equilibrium.js','src/physics/integrator.js','src/physics/forces.js','src/physics/constants.js','src/compute/gpu.js','scripts/equilibrium-rebuild/prepare.mjs','scripts/equilibrium-rebuild/run.mjs','scripts/equilibrium-rebuild/controls.mjs'];manifest.sourceHashes={};
for(const f of sourceFiles){manifest.sourceHashes[f]=createHash('sha256').update(await readFile(f)).digest('hex');await mkdir(out+'/source/'+f.slice(0,f.lastIndexOf('/')),{recursive:true});await cp(f,out+'/source/'+f);}
for(const config of configs){
 const start=performance.now(),n=config.counts.reduce((a,b)=>a+b,0),source=config.generator==='legacy'?createAllocatedGalaxy({n,counts:config.counts,seed:config.seed}):sampleOrbitCandidate(library,{n,counts:config.counts,seed:config.seed});
 const id=`${config.generator}-${config.control}-c${config.counts.join('-')}-s${config.seed}-dt${config.dt}-t${config.duration}`;
 const snapshot=serializeOrbitCandidate(source);if(config.generator==='legacy')snapshot.schema='legacy-phase-audit-v1';await writeFile(out+'/'+id+'-initial.json',JSON.stringify(snapshot));
 const state=config.control==='disk-live'?selectDisk(source):source,engine=new RebuildControl(state,{...config,field,epsilon:field.epsilon});engine.initialize();const samples=[];let baseline;
 for(let j=0;j<=Math.round(config.duration/config.stride);j++){
  if(j)engine.step(Math.round(config.stride/config.dt));const sample=measureRebuild(state,engine);baseline??=sample;sample.energyError=relativeEnergy(sample,baseline);sample.relativeLz=(sample.angularMomentum[2]-baseline.angularMomentum[2])/Math.abs(baseline.angularMomentum[2]);sample.relativeAngularVectorError=Math.hypot(...sample.angularMomentum.map((x,k)=>x-baseline.angularMomentum[k]))/baseline.angularScale;samples.push(sample);
 }
 const result={id,config,epsilon:field.epsilon,backend:'CPU direct Float64',libraryId:config.generator==='candidate'?library.id:null,initialSnapshot:id+'-initial.json',initialSnapshotSHA256:createHash('sha256').update(await readFile(out+'/'+id+'-initial.json')).digest('hex'),samples,wallMs:performance.now()-start};await writeFile(out+'/'+id+'.json',JSON.stringify(result));
 const summary={id,file:id+'.json',config,wallMs:result.wallMs,initialH50:samples[0].disk.instant.h50,finalH50:samples.at(-1).disk.instant.h50,maxSampledEnergyPercent:Math.max(...samples.map(s=>s.energyError.absolute*100))};manifest.runs.push(summary);await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify(summary));
}
manifest.completedUTC=new Date().toISOString();await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2));await writeFile(base+'/latest-controls.json',JSON.stringify({path:out,manifest:out+'/manifest.json'},null,2));
