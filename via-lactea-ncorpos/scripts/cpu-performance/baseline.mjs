import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {createLiveGalaxy,liveResolution} from '../../src/physics/live-initial.js';
import {Leapfrog} from '../../src/physics/integrator.js';
import {directAccelerations,getBarnesHutStats} from '../../src/physics/forces.js';
import {fastEnergy,directEnergy,copyEnergySnapshot} from '../../src/physics/live-energy.js';
import {laboratorySample} from '../../src/physics/laboratory.js';
import {componentRotationField} from '../../src/physics/rotation-field.js';
export const folder=resolve(import.meta.dirname,'../../reports/cpu-performance-2026-10-22');
export const options={seed:2026,withHalo:true,dt:.1,epsilon:.1,theta:.5,algorithm:'barnes-hut',energyAuditCadenceMyr:200};
export const cases=[{baseN:1000,haloRefinement:1},{baseN:10000,haloRefinement:1},{baseN:24000,haloRefinement:1},{baseN:80000,haloRefinement:1},{baseN:40000,haloRefinement:32}];
export const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
export const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
export function makeState(c){return createLiveGalaxy({...options,...liveResolution(c.baseN,c.haloRefinement)});}
export function pack(s){const data=new Float32Array(4*s.n);for(let i=0;i<s.n;i++){data[4*i]=s.positions[3*i];data[4*i+1]=s.positions[3*i+1];data[4*i+2]=s.positions[3*i+2];data[4*i+3]=s.components[i];}return data;}
export function measured(fn){const t=performance.now(),value=fn();return {ms:performance.now()-t,value};}
export async function prepare(){
 await mkdir(resolve(folder,'baseline'),{recursive:true});
 const sources=['src/physics/forces.js','src/physics/integrator.js','src/physics/initial.js','src/physics/initial-legacy.js','src/physics/live-initial.js','src/physics/rotation-field.js','src/compute/live-worker.js','src/ncorpos-live-entry.js','src/compute/energy-snapshot-sampler.js','src/automatic-energy.js'];
 const files={};for(const file of sources){const bytes=await readFile(resolve(import.meta.dirname,'../..',file));files[file]=createHash('sha256').update(bytes).digest('hex');await copyFile(resolve(import.meta.dirname,'../..',file),resolve(folder,'baseline',file.replaceAll('/','__')));}
 const report={createdUTC:new Date().toISOString(),cpu:os.cpus()[0].model,logicalProcessors:os.cpus().length,availableParallelism:os.availableParallelism(),totalMemoryBytes:os.totalmem(),runtime:process.version,platform:process.platform,options,files,method:'Unmodified original KDK and BH. One warmup step then three real full steps. Forces timed around original engine.force(); tree build comes from original getBarnesHutStats. Remainder includes validation, clearing and traversal. Diagnostics measured separately on the same final state; not inside step timing. Process CPU time / wall time is an effective whole-process core count, not per-core OS telemetry.',results:[]};
 await writeFile(resolve(folder,'baseline.json'),JSON.stringify(report,null,2));return report;
}
export function profileCase(c){
 const init=measured(()=>makeState(c)),s=init.value,clone=measured(()=>structuredClone(s));
 const initialHashes={positions:hash(s.positions),velocities:hash(s.velocities),masses:hash(s.masses)},engine=new Leapfrog(s,options),force=engine.force.bind(engine);let current;
 engine.force=()=>{const t=performance.now(),out=force(),stats=getBarnesHutStats(s);if(current){current.forceMs+=performance.now()-t;current.treeBuildMs+=stats.buildMs;current.treeNodes=stats.nodeCount;current.treeAllocatedBytes=stats.allocatedBytes;}return out;};
 const prep=measured(()=>engine.initialize());engine.step(1);const samples=[];
 for(let i=0;i<3;i++){current={forceMs:0,treeBuildMs:0};const cpu=process.cpuUsage(),step=measured(()=>engine.step(1)),usage=process.cpuUsage(cpu);samples.push({...current,totalStepMs:step.ms,integrationAndBookkeepingMs:step.ms-current.forceMs,traversalValidationAndClearMs:current.forceMs-current.treeBuildMs,effectiveProcessCores:(usage.user+usage.system)/1000/step.ms});current=null;}
 const energy=measured(()=>fastEnergy(s,options)),energyAgain=measured(()=>fastEnergy(s,options)),structure=measured(()=>laboratorySample(s,energyAgain.value,options)),rotation=measured(()=>componentRotationField(s,options)),packing=measured(()=>pack(s)),snapshot=measured(()=>copyEnergySnapshot(s)),diagnosticClone=measured(()=>structuredClone(structure.value));
 const direct=s.n<=10000?measured(()=>directEnergy(s,options)):null;
 return {...c,n:s.n,counts:s.meta.counts,initialHashes,initializationMs:init.ms,stateCloneMs:clone.ms,initialForceMs:prep.ms,steps:engine.steps,timeMyr:engine.time,samples,medianStepMs:median(samples.map(r=>r.totalStepMs)),treeBuildMs:median(samples.map(r=>r.treeBuildMs)),forceTraversalValidationMs:median(samples.map(r=>r.traversalValidationAndClearMs)),leapfrogOtherMs:median(samples.map(r=>r.integrationAndBookkeepingMs)),effectiveProcessCores:median(samples.map(r=>r.effectiveProcessCores)),diagnostics:{fastEnergyFirstMs:energy.ms,fastEnergyRepeatedMs:energyAgain.ms,structureMs:structure.ms,rotationFieldMs:rotation.ms,packFloat32Ms:packing.ms,copySnapshotMs:snapshot.ms,cloneStructuredDiagnosticMs:diagnosticClone.ms,directFloat64Ms:direct?.ms??null,directPairs:s.n*(s.n-1)/2,energyDirectSkipped:s.n>10000?'Full direct energy at large N measured separately; never inserted in every physics step.':null},finite:s.positions.every(Number.isFinite)&&s.velocities.every(Number.isFinite)};
}
if(process.argv[1]&&basename(process.argv[1])==='baseline.mjs'){
 const report=await prepare();for(const c of cases){const row=profileCase(c);report.results.push(row);await writeFile(resolve(folder,'baseline.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({n:row.n,stepMs:row.medianStepMs,buildMs:row.treeBuildMs,traversalMs:row.forceTraversalValidationMs,integrationMs:row.leapfrogOtherMs,cores:row.effectiveProcessCores,diagnostics:row.diagnostics}));}
 report.completedUTC=new Date().toISOString();await writeFile(resolve(folder,'baseline.json'),JSON.stringify(report,null,2));
}
