import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {folder,options,makeState,median,hash} from './baseline.mjs';
import {G} from '../../src/physics/constants.js';
import {barnesHutAccelerations} from '../../src/physics/forces.js';
import {directEnergy} from '../../src/physics/live-energy.js';
import {writeFalcon,readFalcon,runFalcon} from '../halo-5gyr/falcon-io.mjs';
const location=resolve(folder,'native');await mkdir(location,{recursive:true});
function targets(s){if(s.n<=10000)return Array.from({length:s.n},(_,k)=>k);let offset=0,ids=[];for(const count of s.meta.counts){for(let k=0;k<32;k++)ids.push(offset+Math.floor(k*count/32));offset+=count;}return ids;}
function references(s,ids){return ids.map(i=>{const a=[0,0,0],k=3*i;for(let j=0;j<s.n;j++)if(j!==i){const b=3*j,dx=s.positions[b]-s.positions[k],dy=s.positions[b+1]-s.positions[k+1],dz=s.positions[b+2]-s.positions[k+2],r2=dx*dx+dy*dy+dz*dz+options.epsilon**2,f=G*s.masses[j]/(r2*Math.sqrt(r2));a[0]+=f*dx;a[1]+=f*dy;a[2]+=f*dz;}return a;});}
function errors(acc,ids,ref){let delta=0,norm=0,max=0;ids.forEach((i,k)=>{let d=0,r=0;for(let axis=0;axis<3;axis++){d+=(acc[3*i+axis]-ref[k][axis])**2;r+=ref[k][axis]**2;}delta+=d;norm+=r;if(r>0)max=Math.max(max,Math.sqrt(d/r));});return{targets:ids.length,relativeL2:Math.sqrt(delta/norm),maximumTargetRelative:max,scope:ids.length===acc.length/3?'all targets':'96 stratified target probes; no global bound'};}
const report={createdUTC:new Date().toISOString(),options:{...options,G},binarySha256:createHash('sha256').update(await readFile('tools/pyfalcon/falcon-reference.exe')).digest('hex'),nativeSource:'scripts/halo-5gyr/falcon-reference.cpp; official falcON core, kernel 0 Plummer and sizeof(real)==8 checked at runtime',caution:'Different approximate force algorithm (mutual multipole falcON); theta numbers are not equivalent accuracy settings across solvers. Same Plummer kernel, masses and KDK form. Accuracy is measured against direct Float64, not inferred from speed.',results:[]};
const save=()=>writeFile(resolve(folder,'native.json'),JSON.stringify(report,null,2));await save();
for(const c of [{baseN:1000,haloRefinement:1},{baseN:10000,haloRefinement:1},{baseN:80000,haloRefinement:1},{baseN:40000,haloRefinement:32}]){
 const state=makeState(c),input=resolve(location,state.n+'-input.bin'),forceOutput=resolve(location,state.n+'-force.bin'),output=resolve(location,state.n+'-steps.bin');
 let t=performance.now();await writeFalcon(input,state);const inputWriteMs=performance.now()-t,ids=targets(state);t=performance.now();const ref=references(state,ids),referenceMs=performance.now()-t;
 t=performance.now();barnesHutAccelerations(state,options);const bhMs=performance.now()-t,bhError=errors(state.accelerations,ids,ref),runs=[];
 for(const steps of [0,3])for(let k=0;k<3;k++){t=performance.now();const r=await runFalcon(input,steps?output:forceOutput,{G,...options,steps});runs.push({...r,wallMs:performance.now()-t});}
 const force=await readFalcon(forceOutput),final=await readFalcon(output);assert.equal(hash(force.positions),hash(state.positions));assert.equal(hash(force.velocities),hash(state.velocities));assert.equal(hash(final.masses),hash(state.masses));assert.equal(runs[0].kernel,0);assert.equal(runs[0].precisionBytes,8);
 let energy=null;if(state.n<=10000){const a=directEnergy(state,options),b=directEnergy(final,options);energy={initial:a.energy,final:b.energy,signedPercent:100*(b.energy-a.energy)/Math.abs(a.energy),qualification:'Only start and end of 0.3 Myr; not a maximum trajectory error or long-term validation.'};}
 const zero=runs.filter(r=>r.steps===0),three=runs.filter(r=>r.steps===3),row={n:state.n,...c,initialHashes:{positions:hash(state.positions),velocities:hash(state.velocities),masses:hash(state.masses)},inputWriteMs,directReferenceMs:referenceMs,originalBHInitialForceMs:bhMs,bhError,nativeError:errors(force.accelerations,ids,ref),nativeForceOnlyWallMs:median(zero.map(r=>r.wallMs)),nativeInitialAndThreeStepsWallMs:median(three.map(r=>r.wallMs)),nativeComputeAndWriteThreeMs:median(three.map(r=>r.computeAndWriteMs)),energy,runs};
 report.results.push(row);await save();console.log(JSON.stringify({n:state.n,bhMs,forceErrorBH:bhError.relativeL2,forceErrorNative:row.nativeError.relativeL2,nativeThreeStepWallMs:row.nativeInitialAndThreeStepsWallMs}));
}
report.completedUTC=new Date().toISOString();await save();
