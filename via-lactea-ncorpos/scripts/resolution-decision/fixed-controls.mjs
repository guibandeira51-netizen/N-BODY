import {readFile,writeFile} from 'node:fs/promises';
import {RebuildControl} from '../equilibrium-rebuild/controls.mjs';
import {equilibriumFieldAt} from '../../src/physics/equilibrium-field.js';
import {directEnergy} from '../../src/physics/live-energy.js';
import {diskAnalysis} from '../../src/physics/disk-analysis.js';
import {structureDiagnostics} from '../../src/physics/structure-diagnostics.js';
import {G} from '../../src/physics/constants.js';
import {allocation,roundedState,angular} from './common.js';
const folder='reports/resolution-decision',manifest=JSON.parse(await readFile(folder+'/manifest.json')),field=JSON.parse(await readFile(manifest.field.field));
const runs=[];for(const generator of ['legacy','candidate'])for(const seed of [2026,2027,2028]){
 const pool=JSON.parse(await readFile(manifest.pools.find(p=>p.generator===generator&&p.seed===seed).file));
 for(const nd of(seed===2026?[512,2048]:[512]))for(const control of ['fixed-total','disk-live']){
  const counts=[512,nd,8192],config={generator,seed,counts,dt:.05,epsilon:.1,duration:200,control:control==='fixed-total'?'A':'B'},s=roundedState(allocation(pool,counts,{diskOnly:true})),engine=new RebuildControl(s,{control,field,dt:.05,epsilon:.1}),start=performance.now();engine.initialize();const samples=[];let computeMs=0,diagMs=0;
  for(const t of [0,10,20,40,100,200]){const before=performance.now();engine.step(Math.round(t/.05)-engine.steps);computeMs+=performance.now()-before;s.time=engine.time;const diag=performance.now(),self=control==='disk-live'?directEnergy(s,{epsilon:.1,G}):null;let K=0,U=0;for(let i=0;i<s.n;i++){const k=3*i,m=s.masses[i];K+=.5*m*(s.velocities[k]**2+s.velocities[k+1]**2+s.velocities[k+2]**2);U+=m*equilibriumFieldAt(field,...s.positions.subarray(k,k+3),control==='fixed-total'?'total':'spheroids').potential;}
   const energy=K+U+(self?.potential??0);samples.push({timeMyr:s.time,steps:engine.steps,energy,kinetic:K,potential:U+(self?.potential??0),energyError:{signed:samples.length?(energy-samples[0].energy)/Math.abs(samples[0].energy):0,absolute:samples.length?Math.abs((energy-samples[0].energy)/samples[0].energy):0},disk:diskAnalysis(s),structure:structureDiagnostics(s,{accelerations:s.accelerations}),angular:angular(s)});diagMs+=performance.now()-diag;}
  runs.push({config,n:s.n,backend:'CPU direct Float64; fixed scalar Hermite Plummer-convolved target',effectiveParameters:{G,dt:.05,epsilonSquared:.01},computeMs,diagnosticMs:diagMs,wallMs:performance.now()-start,samples});
  await writeFile(folder+'/fixed-controls.json',JSON.stringify({schema:'resolution-fixed-controls-v1',runs,qualification:'A and B contain only disk particles. Same disk phase arrays and rounded individual disk masses as C for identical seed/counts; CPU f64 nominal G/dt/epsilon versus C effective f32 parameters, explicitly retained. Only Lz is invariant in a fixed axisymmetric potential; external energy counted once.'}));console.log(`${generator} s${seed} Nd${nd} ${config.control}: h=${samples[0].disk.instant.h50} -> ${samples.at(-1).disk.instant.h50}, ${(performance.now()-start).toFixed(0)} ms`);
 }
}
