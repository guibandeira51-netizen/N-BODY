import {readFile,writeFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {unpackCheckpoint} from './checkpoint.js';import {diskAnalysis} from '../../src/physics/disk-analysis.js';import {G} from '../../src/physics/constants.js';
const dir='reports/halo-5gyr',json=async p=>JSON.parse(await readFile(p)),m=await json(dir+'/manifest.json'),ptr=await json(dir+'/latest.json'),d=await json(ptr.file),results=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const r of d.runs.filter(r=>r.complete&&r.config.mode==='live')){
 if(!r.finalSnapshot){results.push({id:r.config.id,independentlyRecomputed:false,reason:'No final binary snapshot was captured for this early run. Original measured series retained; no reconstructed final phase substituted.'});continue;}
 const bytes=gunzipSync(await readFile(r.finalSnapshot.file));if(hash(bytes)!==r.finalSnapshot.sha256)throw Error('Final checkpoint hash mismatch: '+r.config.id);
 const {state:s,metadata:h}=unpackCheckpoint(bytes),cfg=m.runs.find(c=>c.id===r.config.id);let init;
 if(cfg.encoding==='state-gzip'){const b=gunzipSync(await readFile(cfg.file));if(hash(b)!==cfg.sha256)throw Error('Initial checkpoint hash mismatch');init=unpackCheckpoint(b).state;}
 else {const b=await readFile(cfg.file);if(hash(b)!==cfg.sha256)throw Error('Initial JSON hash mismatch');const raw=JSON.parse(b);init={...raw,positions:Float64Array.from(raw.positions),velocities:Float64Array.from(raw.velocities),masses:Float64Array.from(raw.masses),components:Uint8Array.from(raw.components)};}
 if(s.n!==init.n)throw Error('Initial/final particle count mismatch');
 for(const [key,value]of Object.entries({G:Math.fround(G),dt:Math.fround(m.dt),epsilonSquared:Math.fround(m.epsilon*m.epsilon)}))if(h.parameters[key]!==value||r.effectiveParameters[key]!==value)throw Error('Effective physical parameter mismatch: '+key);
 const counts=[0,0,0],initialMass=[0,0,0],finalMass=[0,0,0];let identicalIndividualMasses=true;
 for(let i=0;i<s.n;i++){counts[s.components[i]]++;initialMass[init.components[i]]+=init.masses[i];finalMass[s.components[i]]+=s.masses[i];if(s.masses[i]!==init.masses[i]||s.components[i]!==init.components[i])identicalIndividualMasses=false;}
 const a=diskAnalysis(init),b=diskAnalysis(s),expectedSteps=Math.round(m.durationMyr/m.dt),expectedTime=expectedSteps*h.parameters.dt,epochVerified=h.globalSteps===expectedSteps&&s.time===expectedTime&&r.samples.at(-1).steps===expectedSteps&&r.samples.at(-1).timeMyr===s.time;
 const h0=a.instant.h50,hf=b.instant.h50,ratio=hf/h0,recordedH0=r.samples[0].disk.instant.h50,recordedHf=r.samples.at(-1).disk.instant.h50;
 const phasesReproduceReportedH50=h0===recordedH0&&hf===recordedHf;
 if(counts.some((n,i)=>n!==cfg.counts[i])||!epochVerified||!identicalIndividualMasses||!phasesReproduceReportedH50)throw Error('Independent verification failed: '+r.config.id);
 const independentPass=ratio<=m.criterion.finalH50RatioMaximum;if(independentPass!==r.meetsFinalCriterion)throw Error('Pass/fail flag inconsistent with saved phase');
 results.push({id:r.config.id,independentlyRecomputed:true,initialFile:cfg.file,finalFile:r.finalSnapshot.file,finalSHA256:r.finalSnapshot.sha256,counts,individualMassesAndComponentsUnchanged:identicalIndividualMasses,initialMass,finalMass,globalSteps:h.globalSteps,effectiveDtMyr:h.parameters.dt,timeMyr:s.time,epochVerified,velocityEpoch:h.velocityEpoch,h50InitialKpc:h0,h50FinalKpc:hf,ratio,growthPercent:100*(ratio-1),phasesReproduceReportedH50,independentPass,qualification:'Actual saved initial and final phases, same disk-analysis routine evaluated independently of the experiment worker. Checks implementation consistency, not an independent definition of thickness or an equilibrium theorem.'});
}
const out={schema:'halo-5gyr-final-recomputation-v1',createdUTC:new Date().toISOString(),sourceRun:ptr.file,requestedDurationMyr:m.durationMyr,thresholdRatio:m.criterion.finalH50RatioMaximum,results};
await writeFile(dir+'/independent-final-verification.json',JSON.stringify(out,null,2));console.log(JSON.stringify(results.map(r=>({id:r.id,recomputed:r.independentlyRecomputed,h50:r.h50FinalKpc,pass:r.independentPass})),null,2));
