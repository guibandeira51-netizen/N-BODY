import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createHaloExperiment} from '../src/physics/halo-experiments.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {analyticAcceleration,analyticPotential} from '../src/physics/models.js';
import {structureDiagnostics} from '../src/physics/structure-diagnostics.js';
import {diskAnalysis} from '../src/physics/disk-analysis.js';
// Orbit/DF diagnostic only: every tracer moves freely in the same initial mean
// field. This removes all baryonic response and granularity, unlike model C.
class MeanField extends Leapfrog{force(){for(let i=0;i<this.state.n;i++){const k=3*i;this.state.accelerations.set(analyticAcceleration(...this.state.positions.subarray(k,k+3),true),k);}return this.state.accelerations;}}
const report={schema:'initial-kinematics-smooth-control-v1',startedUTC:new Date().toISOString(),scope:'noninteracting baryonic orbit tracers in full initial analytic field; not production self-gravity or halo model C; no attribution of causal percentages',sourceHashes:{},runs:[]};
for(const name of ['src/physics/initial-legacy.js','src/physics/models.js','src/physics/integrator.js','src/physics/disk-analysis.js','scripts/mean-field-control-09.mjs'])report.sourceHashes[name]=createHash('sha256').update(await readFile(new URL('../'+name,import.meta.url))).digest('hex');
for(const config of [{baseN:10000,baryonSeed:2026,dt:.1,duration:1000},{baseN:10000,baryonSeed:2027,dt:.1,duration:1000},{baseN:10000,baryonSeed:2026,dt:.05,duration:200}]){
 const s=createHaloExperiment({...config,haloMode:'fixed'}),e=new MeanField(s,config);e.initialize();const samples=[];
 for(let t=0;t<=config.duration;t+=20){if(t)e.step(Math.round(20/config.dt));const st=structureDiagnostics(s),disk=diskAnalysis(s);let K=0,U=0;for(let i=0;i<s.n;i++){const k=3*i;K+=s.masses[i]*.5*(s.velocities[k]**2+s.velocities[k+1]**2+s.velocities[k+2]**2);U+=s.masses[i]*analyticPotential(...s.positions.subarray(k,k+3),true);}samples.push({timeMyr:t,energy:K+U,kinetic:K,potential:U,components:st.components.map(c=>({id:c.id,r50:c.r50,R50:c.R50,massMedianAbsZ:c.massMedianAbsZ,velocity:c.velocity})),disk:{plane:disk.plane,instant:disk.instant,fixed:disk.fixed}});}
 report.runs.push({config,samples});await writeFile(new URL('../reports/v0.9.0/mean-field-control.json',import.meta.url),JSON.stringify(report));console.log(JSON.stringify({completed:config}));
}
report.completedUTC=new Date().toISOString();await writeFile(new URL('../reports/v0.9.0/mean-field-control.json',import.meta.url),JSON.stringify(report));
