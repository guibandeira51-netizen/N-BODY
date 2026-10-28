/** Progressive reference campaign. Originals are read-only. No velocity edits. */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Leapfrog} from '../../src/physics/integrator.js';
import {ExternalGridLeapfrog} from '../../src/physics/external-grid.js';
import {G} from '../../src/physics/constants.js';
import {validationSnapshot,conservationSample,summarizeConservationSeries,compareGravityWithDirect} from '../../src/physics/validation-101.js';
import {root,read,save,loadModel,clone,select,structural,serialized,codeIdentity,hash} from './common.mjs';
const identity=await codeIdentity();await save('code-identity.json',identity);
const original=await loadModel('agama'),calibrated=await loadModel(),base=calibrated.s;
const baryonIds=Array.from({length:base.n},(_,i)=>i).filter(i=>base.components[i]!==2);
const fixed=select(base,baryonIds,{preserveMass:false,label:'All original N=1000 baryons; halo particles removed, fixed AGAMA halo replaces them'});
fixed.meta.withHalo=false;fixed.meta.haloMode='fixed';
const table=await read('reports/v1.0.0/agama-calibrated/halo-fixed-grid.json');
const big=await loadModel('agama-calibrated',10000);
function combine(a,b){const s=clone(a);for(const key of ['positions','velocities','masses','components','subpopulations'])s[key]=new s[key].constructor([...a[key],...b[key]]);s.n=a.n+b.n;s.accelerations=new Float64Array(3*s.n);return s;}
const haloIds=Array.from({length:big.s.n},(_,i)=>i).filter(i=>big.s.components[i]===2).slice(0,800);
const refined=combine(fixed,select(big.s,haloIds,{label:'First 400 antipodal halo pairs from 10k AGAMA; same finite halo mass, original 600 baryons bitwise retained'}));
refined.meta.withHalo=true;refined.meta.haloMode='live';
const baryonRefine=[];for(const [id,count] of [[0,300],[1,708],[2,192]])baryonRefine.push(...Array.from({length:big.s.n},(_,i)=>i).filter(i=>big.s.subpopulations[i]===id).slice(0,count));
const baryon1600=combine(select(big.s,baryonRefine,{label:'Paired subpopulation-stratified baryon subset; each physical mass retained'}),select(base,Array.from({length:base.n},(_,i)=>i).filter(i=>base.components[i]===2),{preserveMass:false}));
const binary={n:2,positions:Float64Array.of(-.5,0,0,.5,0,0),velocities:Float64Array.of(0,-.7*Math.sqrt(G/2/(1+.1**2)**1.5),0,0,.7*Math.sqrt(G/2/(1+.1**2)**1.5),0),masses:Float64Array.of(1,1),components:Uint8Array.of(0,0),subpopulations:Uint8Array.of(0,0),accelerations:new Float64Array(6),time:0,meta:{method:'softened eccentric binary regression; not a galaxy'}};
const plan=[];for(const dt of [.1,.05,.025])plan.push({id:'binary-dt'+dt,initial:binary,duration:200,dt,algorithm:'direct',structure:false,source:'analytic eccentric two-body control'});
for(const dt of [.1,.05,.025])plan.push({id:'C-f64-dt'+dt,initial:base,duration:20,dt,algorithm:'direct',source:calibrated.path});
plan.push({id:'C-original-f64',initial:original.s,duration:20,dt:.05,algorithm:'direct',source:original.path});
plan.push({id:'B-fixed-f64',initial:fixed,duration:20,dt:.05,algorithm:'direct',externalGrid:table,source:calibrated.path});
for(const theta of [.5,.25])plan.push({id:'C-bh-theta'+theta,initial:base,duration:20,dt:.05,theta,algorithm:'barnes-hut',source:calibrated.path});
for(const epsilon of [.05,.2])plan.push({id:'C-epsilon'+epsilon,initial:base,duration:20,dt:.05,epsilon,algorithm:'direct',source:calibrated.path});
plan.push({id:'D-halo-refined-f64',initial:refined,duration:20,dt:.05,algorithm:'direct',source:calibrated.path+' + '+big.path});
plan.push({id:'E-baryons-refined-f64',initial:baryon1600,duration:20,dt:.05,algorithm:'direct',source:big.path+' baryons + '+calibrated.path+' halo'});
await save('protocol-cpu.json',{schema:'validation-101-protocol',createdBeforeEvolution:true,createdUTC:new Date().toISOString(),energyCadence:'every integrator step; exact discrete Hamiltonian in f64',structureCadenceMyr:.5,runs:plan.map(({initial,externalGrid,...p})=>({...p,n:initial.n,epsilon:p.epsilon??.1,theta:p.theta??.5,externalGrid:!!externalGrid,status:'planned'})),limits:['Small N is an integration reference, never proof of collisionless galaxy equilibrium.','D uses unchanged baryons but halo sampling is a nested subset of another preserved draw. E changes baryonic realization; one-seed outcome is exploratory, not converged evidence.']});
const summary=[];
for(const p of plan){const started=performance.now(),s=clone(p.initial),o={epsilon:p.epsilon??.1,theta:p.theta??.5,dt:p.dt,algorithm:p.algorithm,energyAlgorithm:'direct',externalGrid:p.externalGrid};
 const engine=p.externalGrid?new ExternalGridLeapfrog(s,o):new Leapfrog(s,o);engine.initialize();
 const raw=[],structures=[],initial=validationSnapshot(s,o),states=[];raw.push(initial);if(p.structure!==false)structures.push(structural(s,initial));states.push(serialized(clone(s)));
 const steps=Math.round(p.duration/p.dt),stride=Math.round(.5/p.dt);
 for(let i=1;i<=steps;i++){engine.step();s.time=i*p.dt;engine.time=s.time;const d=validationSnapshot(s,o);raw.push(d);if(p.structure!==false&&i%stride===0)structures.push(structural(s,d));}
 states.push(serialized(clone(s)));const conservation=summarizeConservationSeries(raw),run={schema:'validation-101-run',id:p.id,status:'completed',origin:'new-integration-1.0.1',startedUTC:new Date(Date.now()-(performance.now()-started)).toISOString(),config:{n:s.n,dt:p.dt,epsilon:o.epsilon,theta:o.theta,durationMyr:p.duration,algorithm:p.algorithm,precision:'Float64',externalField:p.externalGrid?'AGAMA frozen axisymmetric halo':'none',seed:2026},source:p.source,sourceSHA256:p.source===calibrated.path?calibrated.sha256:p.source===original.path?original.sha256:null,codeSHA256:identity.sha256,conservation,energySeries:raw.map(d=>conservationSample(d,initial)),samples:structures,wallSeconds:(performance.now()-started)/1000};
 await save('runs/'+p.id+'.json',run);await save('snapshots/'+p.id+'.json',{id:p.id,config:run.config,states});
 summary.push({id:p.id,...run.config,...conservation,wallSeconds:run.wallSeconds,initialSHA256:hash(JSON.stringify(states[0]))});await save('cpu-summary.json',summary);console.log(p.id,'T',s.time,'max|dE|',conservation.maxAbsEnergyError,'seconds',run.wallSeconds.toFixed(2));
}
const field=[];for(const [label,s] of [['calibrated',base],['original',original.s]])for(const epsilon of [.05,.1,.2])for(const theta of [.5,.25])field.push({label,epsilon,theta,...compareGravityWithDirect(s,{epsilon,theta})});await save('force-energy-audit.json',field);
console.log('CPU reference campaign complete:',summary.length);
