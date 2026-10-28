import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {createAllocatedGalaxy} from '../../src/physics/initial-allocated.js';
import {createGalaxy} from '../../src/physics/initial.js';
import {sampleOrbitCandidate} from '../../src/physics/orbit-equilibrium.js';
import {COMPONENT_MASSES} from '../../src/physics/equilibrium-field.js';
const folder='reports/resolution-decision';await mkdir(folder,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceFiles=['src/physics/initial.js','src/physics/initial-legacy.js','src/physics/initial-allocated.js','src/physics/forces.js','src/physics/integrator.js','src/physics/models.js','src/physics/constants.js','src/compute/gpu.js','src/physics/disk-analysis.js','src/physics/orbit-equilibrium.js'];
const hashes={};for(const f of sourceFiles)hashes[f]=hash(await readFile(f));
await writeFile(folder+'/source-baseline.json',JSON.stringify(hashes,null,2));
let bytes;if(process.argv[2])bytes=await readFile(process.argv[2]);else try{bytes=gunzipSync(await readFile(folder+'/session-export-original.json.gz'));}catch{bytes=await readFile('C:/Users/PC/Downloads/medicao-ncorpos.json');}const report=JSON.parse(bytes),lab=report.laboratory;
await writeFile(folder+'/session-export-original.json',bytes);
const first=lab.samples[0],last=lab.samples.at(-1),reference=lab.energyAudit.references[0];
const identity={schema:'resolution-session-identity-v1',exportSHA256:hash(bytes),exportDateUTC:report.dateUTC,realizationId:lab.realizationId,configuration:lab.configuration,initial:lab.initial,first,last,referenceInitial:reference,codeIdentity:lab.energyAudit.codeIdentity,retainedMeasurements:lab.samples.length,totalMeasurements:lab.totalMeasurements,stateAvailableAtExport:report.stateAvailable,warning:'Stopped UI cleared active top-level configuration/time; retained laboratory identity and samples are authoritative. Selected raw particle snapshots, including t0, are retained inside energy-reference provenance.'};
await writeFile(folder+'/session-identity.json',JSON.stringify(identity,null,2));
const regen=createGalaxy(lab.configuration),round=s=>{for(const k of ['positions','velocities','masses'])s[k]=Float64Array.from(s[k],Math.fround);return s;};round(regen);
await writeFile(folder+'/session-initial-reconstructed.json',JSON.stringify({schema:'resolution-reconstructed-state-v1',qualification:'Deterministic reconstruction from retained seed/configuration and current source hashes; not an original captured particle-buffer export. Compare diagnostics before asserting byte identity.',configuration:lab.configuration,meta:regen.meta,n:regen.n,positions:Array.from(regen.positions),velocities:Array.from(regen.velocities),masses:Array.from(regen.masses),components:Array.from(regen.components)}));
const pointer=JSON.parse(await readFile('reports/equilibrium-rebuild/latest-library-1024.json')),library=JSON.parse(await readFile(pointer.library));
const manifest={schema:'resolution-decision-manifest-v1',createdUTC:new Date().toISOString(),physicalPolicy:'All target masses/densities unchanged. Nested antipodal prefix samples of EXISTING generators; only particle allocation changes. Common components copied byte-for-byte before f32 rounding. No new DF or velocity generator.',field:JSON.parse(await readFile('reports/equilibrium-rebuild/latest-field.json')),library:pointer,sourceHashes:hashes,pools:[],runs:[]};
for(const generator of ['legacy','candidate'])for(const seed of [2026,2027,2028]){
 const counts=[512,16384,32768],n=counts.reduce((a,b)=>a+b,0),pool=generator==='legacy'?createAllocatedGalaxy({counts,n,seed}):sampleOrbitCandidate(library,{counts,n,seed});
 const file=`${folder}/pool-${generator}-s${seed}.json`;await writeFile(file,JSON.stringify({n,counts,meta:pool.meta,positions:Array.from(pool.positions),velocities:Array.from(pool.velocities),components:Array.from(pool.components)}));manifest.pools.push({generator,seed,file,sha256:hash(await readFile(file)),counts});
 for(const nd of [512,2048,8192])for(const nh of [2048,8192])manifest.runs.push({id:`${generator}-s${seed}-d${nd}-h${nh}`,generator,seed,counts:[512,nd,nh],dt:.05,epsilon:.1,duration:200,epochs:[0,10,20,40,100,200],control:'C'});
 // Current UI has ~15k disk particles: explicitly test a comparable disk N,
 // and a larger halo, at the short stage, without claiming a long-time result.
 if(seed===2026)for(const counts of [[512,16384,8192],[512,8192,32768],[512,16384,32768]])manifest.runs.push({id:`${generator}-s${seed}-d${counts[1]}-h${counts[2]}-short`,generator,seed,counts,dt:.05,epsilon:.1,duration:40,epochs:[0,10,20,40],control:'C'});
}
for(const generator of ['legacy','candidate'])for(const dt of [.1,.025])manifest.runs.push({id:generator+'-s2026-d8192-h8192-dt'+dt,generator,seed:2026,counts:[512,8192,8192],dt,epsilon:.1,duration:40,epochs:[0,10,20,40],control:'C'});
await writeFile(folder+'/manifest.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({session:lab.realizationId,initialization:lab.initial.method,counts:lab.initial.counts,firstTime:first.timeMyr,lastTime:last.timeMyr,firstH:first.diskFrame?.instant?.h50,lastH:last.diskFrame?.instant?.h50,pools:manifest.pools.length,gpuRuns:manifest.runs.length,individualMassMsun:lab.initial.masses.map((m,c)=>m/lab.initial.counts[c]*1e10),firstReferenceKeys:Object.keys(reference.snapshot??{}),masses:COMPONENT_MASSES},null,2));
