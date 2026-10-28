import {mkdir,readFile,writeFile,readdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {makeControl,measureControl} from './controls.mjs';
import {relativeEnergy} from '../../src/physics/live-energy.js';
const root=resolve(import.meta.dirname,'../..');
const directory=resolve(root,process.argv[2]??'reports/disk-audit-current');await mkdir(directory,{recursive:true});
const id=new Date().toISOString().replace(/[:.]/g,'-'),out=resolve(directory,id);await mkdir(out);
const phase=process.env.DISK_AUDIT_PHASE??'before';
if(phase!=='before')await readFile(resolve(directory,'RELATORIO_ANTES_DAS_CORRECOES.md'));
const sourceFiles=['src/physics/initial.js','src/physics/initial-legacy.js','src/physics/initial-allocated.js','src/physics/halo-experiments.js','src/physics/constants.js','src/physics/models.js','src/physics/forces.js','src/physics/integrator.js','src/physics/live-energy.js','src/physics/disk-analysis.js','src/compute/gpu.js','src/compute/scheduling.js','src/ncorpos-live-entry.js','src/live-diagnostics.js','scripts/disk-audit/controls.mjs','scripts/disk-audit/run.mjs'];
const sourceHashes={};for(const file of sourceFiles){const bytes=await readFile(resolve(root,file));sourceHashes[file]=createHash('sha256').update(bytes).digest('hex');await mkdir(dirname(resolve(out,'before',file)),{recursive:true});await cp(resolve(root,file),resolve(out,'before',file));}
const protocol={schema:'disk-physical-numerical-audit-v1',phase,createdUTC:new Date().toISOString(),out,sourceHashes,
 physicalParameters:'unchanged production legacy Hernquist/Miyamoto-Nagai/truncated NFW; no new physical parameters',
 controlDefinitions:{'fixed-total':'same disk tracers in analytic full potential; no pair force','disk-live':'same massive disk, direct Plummer self gravity + analytic bulge and finite halo once','all-live':'all components live; production pair force and legacy IC'},
 numerics:'CPU Float64 direct force and direct compensated energy; fixed fields are unsoftened analytic controls, explicitly a different Hamiltonian',
 interpretation:'Matched disk phase arrays at equal epochs. h50 alone never certifies equilibrium. Low-N results do not extrapolate to N=50k. N/epsilon change discreteness/force respectively, not thresholds chosen for acceptance.',runs:[]};
await writeFile(resolve(out,'protocol-before-corrections.json'),JSON.stringify(protocol,null,2));
const configs=[];for(const seed of [2026,2027,2028])for(const control of ['fixed-total','disk-live','all-live'])configs.push({id:`${control}-s${seed}-200`,control,seed,n:800,dt:.1,epsilon:.1,duration:200,stride:10});
for(const dt of [.1,.05,.025])configs.push({id:`dt-${dt}`,control:'all-live',seed:2026,n:800,dt,epsilon:.1,duration:40,stride:1});
for(const seed of [2026,2027,2028]){
 for(const n of [400,1600])configs.push({id:`N-${n}-s${seed}`,control:'all-live',seed,n,dt:.1,epsilon:.1,duration:40,stride:5});
 for(const epsilon of [.05,.2])configs.push({id:`eps-${epsilon}-s${seed}`,control:'all-live',seed,n:800,dt:.1,epsilon,duration:40,stride:5});
 configs.push({id:`halo-refined-s${seed}`,control:'all-live',seed,n:800,haloFactor:4,dt:.1,epsilon:.1,duration:40,stride:5});
}
const selected=phase==='long-dt'?[.05,.025].map(dt=>({id:`long-dt-${dt}`,control:'all-live',seed:2026,n:800,dt,epsilon:.1,duration:200,stride:10})):phase==='after'?configs.filter(c=>c.duration===200||c.id.startsWith('dt-')):configs;
if(phase==='after')for(const dt of [.05,.025])selected.push({id:`small-eps-dt-${dt}`,control:'all-live',seed:2028,n:800,dt,epsilon:.05,duration:40,stride:1});
for(const config of selected){
 const start=performance.now(),{state,engine,original}=makeControl(config),samples=[],initialDiskHash=createHash('sha256').update(original.positions.subarray(3*original.meta.counts[0],3*(original.meta.counts[0]+original.meta.counts[1]))).update(original.velocities.subarray(3*original.meta.counts[0],3*(original.meta.counts[0]+original.meta.counts[1]))).digest('hex');
 const stepsPerSample=Math.round(config.stride/config.dt),count=Math.round(config.duration/config.stride);let reference;
 for(let j=0;j<=count;j++){
  if(j)engine.step(stepsPerSample);const row=measureControl(state,config);row.steps=engine.steps;row.requestedSampleMyr=j*config.stride;if(!reference)reference=row;row.relativeEnergy=relativeEnergy(row,reference);
  row.relativeLz=Math.abs(reference.angularMomentum[2])>0?(row.angularMomentum[2]-reference.angularMomentum[2])/Math.abs(reference.angularMomentum[2]):null;
  row.normalizedAngularVectorError=Math.hypot(...row.angularMomentum.map((x,k)=>x-reference.angularMomentum[k]))/reference.angularScale;
  row.normalizedMomentumError=Math.hypot(...row.momentum.map((x,k)=>x-reference.momentum[k]))/reference.momentumScale;samples.push(row);
 }
 const result={config,actualN:state.n,initialMeta:state.meta,initialDiskPhaseHash:initialDiskHash,wallMs:performance.now()-start,maxSampledAbsoluteEnergyPercent:Math.max(...samples.map(s=>s.relativeEnergy.absolute*100)),samples};
 await writeFile(resolve(out,config.id+'.json'),JSON.stringify(result));protocol.runs.push({file:config.id+'.json',config,actualN:result.actualN,initialDiskPhaseHash:initialDiskHash,wallMs:result.wallMs,first:samples[0],last:samples.at(-1),maxSampledAbsoluteEnergyPercent:result.maxSampledAbsoluteEnergyPercent});
 await writeFile(resolve(out,'results.json'),JSON.stringify(protocol));console.log(JSON.stringify({id:config.id,actualN:state.n,wallMs:result.wallMs,h0:samples[0].h50Kpc,h:samples.at(-1).h50Kpc,maxE:result.maxSampledAbsoluteEnergyPercent}));
}
protocol.completedUTC=new Date().toISOString();await writeFile(resolve(out,'results.json'),JSON.stringify(protocol));
await writeFile(resolve(directory,phase==='before'?'latest.json':`latest-${phase}.json`),JSON.stringify({run:id,results:`reports/disk-audit-current/${id}/results.json`},null,2));console.log('Audit evidence saved: '+out);
