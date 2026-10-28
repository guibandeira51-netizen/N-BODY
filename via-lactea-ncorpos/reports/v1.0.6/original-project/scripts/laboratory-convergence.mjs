import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createGalaxy} from '../src/physics/initial.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {diagnostics} from '../src/physics/diagnostics.js';
import {laboratorySample,energyDrift,relativeChange} from '../src/physics/laboratory.js';
import {axisymmetricMoments} from '../src/physics/jeans-axisymmetric.js';

const dir=new URL('../reports/laboratory/',import.meta.url);await mkdir(dir,{recursive:true});
const report={schema:'laboratory-convergence-v1',startedUTC:new Date().toISOString(),completedUTC:null,
  protocol:{units:'kpc, Myr, 1e10 Msun',seeds:[2026,2027,2028],baseline:{n:2000,dt:0.1,epsilon:0.1,theta:0.5,algorithm:'barnes-hut',duration:20},
    initialConditions:'Identical seeds and physical masses. Direct and timestep/epsilon/theta variants share identical t0 arrays. N variants compare collective properties.',
    energy:'exact direct Plummer pair sum at every saved state, independent of force algorithm',
    statistics:'Three seeds are exploratory, not a calibrated equilibrium classifier. No arbitrary percentage threshold.'},sourceHashes:{},runs:[],candidateAudit:[]};
for(const file of ['initial.js','initial-legacy.js','jeans-axisymmetric.js','structure-diagnostics.js','laboratory.js','forces.js','integrator.js','models.js','constants.js'])report.sourceHashes[file]=createHash('sha256').update(await readFile(new URL('../src/physics/'+file,import.meta.url))).digest('hex');
const persist=()=>writeFile(new URL('convergence.json',dir),JSON.stringify(report,null,2));
const configurations=[];
for(const seed of [2026,2027,2028]) {
  const base={n:2000,seed,dt:0.1,epsilon:0.1,theta:0.5,algorithm:'barnes-hut',duration:20};
  configurations.push(base,{...base,dt:0.05},{...base,dt:0.025},{...base,epsilon:0.3},{...base,theta:0.25},{...base,algorithm:'direct'}, {...base,n:1000},{...base,n:4000});
}
// Several inner-galaxy periods are assessed separately at modest N; this cannot
// certify the halo or the collisionless limit of this low-resolution model.
for(const seed of [2026,2027,2028])configurations.push({n:1000,seed,dt:0.1,epsilon:0.1,theta:0.5,algorithm:'barnes-hut',duration:200});
for(const config of configurations){
  const start=performance.now(),state=createGalaxy(config),engine=new Leapfrog(state,config);engine.initialize();
  const samples=[],stride=config.duration===20?5:20;
  for(let t=0;t<=config.duration;t+=stride){if(t)engine.step(Math.round(stride/config.dt));const d=diagnostics(state,{...config,algorithm:'direct'});samples.push(laboratorySample(state,d,config));}
  const initial=samples[0],final=samples.at(-1),changes=final.components.map((c,i)=>({id:c.id,r50:relativeChange(c.r50,initial.components[i].r50),R50:relativeChange(c.R50,initial.components[i].R50),h50:relativeChange(c.massMedianAbsZ,initial.components[i].massMedianAbsZ),sigmaZ:relativeChange(c.velocity.dispersion?.[2],initial.components[i].velocity.dispersion?.[2])}));
  report.runs.push({config,initialMeta:state.meta,wallMs:performance.now()-start,changes,energyDrift:energyDrift(final.conservation,initial.conservation),samples});await persist();console.log(JSON.stringify({config,changes,energy:report.runs.at(-1).energyDrift}));
}
for(const seed of [2026,2027,2028]){
  try{createGalaxy({n:2000,seed,initialization:'axisymmetric-jeans'});report.candidateAudit.push({seed,status:'constructed, not validated'});}
  catch(e){report.candidateAudit.push({seed,status:'rejected',reason:e.message});}
}
// Refine the negative moment to distinguish a physically incompatible closure
// from a coarse quadrature. No negative variance is silently clamped to zero.
report.candidateMomentRefinement=[128,256,512,1024,2048].map(points=>({points,R:1.0824538607953058,z:-0.18893562613780238,...axisymmetricMoments(0,1.0824538607953058,-0.18893562613780238,true,points)}));
report.completedUTC=new Date().toISOString();await persist();
const summary={source:'reports/laboratory/convergence.json',runCount:report.runs.length,completedUTC:report.completedUTC,conclusion:'Campanha exploratória; equilíbrio global e limite não colisional não demonstrados. Candidato Jeans axisimétrico rejeitado por variância azimutal negativa.',runs:report.runs.map(({config,changes,energyDrift,wallMs})=>({config,changes,energyDrift,wallMs})),candidateAudit:report.candidateAudit,candidateMomentRefinement:report.candidateMomentRefinement};
await writeFile(new URL('convergence-summary.json',dir),JSON.stringify(summary,null,2));console.log('Completed '+report.runs.length+' runs.');
