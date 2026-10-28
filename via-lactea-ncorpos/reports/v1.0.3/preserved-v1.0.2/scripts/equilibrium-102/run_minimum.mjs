/** Stage 1 ONLY: same Plummer engine/epsilon/dt/masses, old vs corrected ICs. */
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {deserializeModelSnapshot} from '../../src/physics/snapshot-model.js';
import {Leapfrog} from '../../src/physics/integrator.js';
import {validationSnapshot,conservationSample,summarizeConservationSeries} from '../../src/physics/validation-101.js';
import {structural,serialized} from '../validation-101/common.mjs';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'reports/v1.0.2'),hash=b=>createHash('sha256').update(b).digest('hex');
async function save(name,x){const p=resolve(out,name);await mkdir(dirname(p),{recursive:true});await writeFile(p,JSON.stringify(x,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v,2)+'\n');}
async function walk(p){const a=[];for(const e of await readdir(p,{withFileTypes:true})){if(e.name==='__pycache__')continue;const q=resolve(p,e.name);if(e.isDirectory())a.push(...await walk(q));else a.push(q);}return a;}
const code={},contents=[];for(const p of [...await walk(resolve(root,'src')),...await walk(resolve(root,'scripts/equilibrium-102'))]){const b=await readFile(p),name=relative(root,p).replaceAll('\\','/');code[name]=hash(b);contents.push({name,b});}const codeSHA256=hash(JSON.stringify(code));for(const {name,b} of contents){const dest=resolve(out,'executed-source',codeSHA256,name);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,b);}await save('code-identity.json',{version:'1.0.2-experimental',codeSHA256,files:code,node:process.version});
const plan=[];
const selected=process.argv.find(x=>x.startsWith('--family='))?.split('=')[1];if(selected&&!['baseline','corrected'].includes(selected))throw Error('Unknown family');
for(const family of selected?[selected]:['baseline','corrected']){
 const manifest=JSON.parse(await readFile(resolve(out,family,'snapshots.json'),'utf8'));
 for(const seed of [2026,2027,2028]){
  const row=manifest.find(r=>r.n===1000&&r.seed===seed);if(!row)throw Error('Missing initial state '+family+'/'+seed);
  plan.push({id:'C-'+family+'-1000-s'+seed,family,seed,row,n:1000,durationMyr:20,dt:.05,epsilon:.1,algorithm:'direct',precision:'Float64'});
 }
}
await save('minimum-protocol-'+(selected??'all')+'.json',{schema:'softened-minimum-protocol-102',createdBeforeEvolution:true,runs:plan,qualification:'New ICs change positions/velocities jointly through a DF fixed point; individual phase-space states differ across families. Seeds pair sampling procedures, not identical particle trajectories. No halo/baryon resolution optimization or dt tuning is undertaken in stage 1.'});
let summary=[];try{summary=JSON.parse(await readFile(resolve(out,'minimum-summary.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const p of plan){
 if(summary.some(r=>r.id===p.id)){console.log('Preserved completed',p.id);continue;}
 const bytes=await readFile(resolve(out,p.family,p.row.file));if(hash(bytes)!==p.row.sha256)throw Error('Source hash mismatch');const data=JSON.parse(bytes),s=deserializeModelSnapshot(data);s.subpopulations=Uint8Array.from(data.subpopulations);
 if(p.family==='corrected'&&s.meta.softenedMean?.epsilonKpc!==p.epsilon)throw Error('Preparation/evolution epsilon mismatch');
 const start=performance.now(),engine=new Leapfrog(s,p);engine.initialize();const raw=[],samples=[],states=[];const initial=validationSnapshot(s,p);raw.push(initial);samples.push(structural(s,initial));states.push(serialized({...s,positions:s.positions.slice(),velocities:s.velocities.slice(),accelerations:s.accelerations.slice()}));
 for(let i=1;i<=400;i++){engine.step();s.time=i*p.dt;engine.time=s.time;const d=validationSnapshot(s,p);raw.push(d);if(i%10===0)samples.push(structural(s,d));}
 states.push(serialized(s));const result={schema:'softened-minimum-run-102',id:p.id,status:'completed',family:p.family,config:{n:p.n,seed:p.seed,dt:p.dt,epsilon:p.epsilon,durationMyr:p.durationMyr,algorithm:p.algorithm,precision:p.precision},source:'reports/v1.0.2/'+p.family+'/'+p.row.file,sourceSHA256:p.row.sha256,codeSHA256,conservation:summarizeConservationSeries(raw),energySeries:raw.map(d=>conservationSample(d,initial)),samples,wallSeconds:(performance.now()-start)/1000,qualification:'Small-N integration control; finite-N granularity remains large. Fixed-point convergence does not certify structural equilibrium.'};
 await save('runs/'+p.id+'.json',result);await save('snapshots/'+p.id+'.json',{id:p.id,source:result.source,sourceSHA256:result.sourceSHA256,states});
 const a=samples[0],b=samples.at(-1);const row={id:p.id,family:p.family,seed:p.seed,n:p.n,h0:a.disk.instant.h50,h20:b.disk.instant.h50,growthPercent:100*(b.disk.instant.h50/a.disk.instant.h50-1),sigma0:a.disk.instant.sigmaNormal,sigma20:b.disk.instant.sigmaNormal,thin0:a.populations.thin.instant.h50,thin20:b.populations.thin.instant.h50,thick0:a.populations.thick.instant.h50,thick20:b.populations.thick.instant.h50,...result.conservation,wallSeconds:result.wallSeconds};summary.push(row);await save('minimum-summary.json',summary);console.log(JSON.stringify(row));
}
