import {readFile,writeFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';
import {writeFalcon,readFalcon,runFalcon} from './falcon-io.mjs';import {unpackCheckpoint} from './checkpoint.js';import {directAccelerations,directPotentialEnergy} from '../../src/physics/forces.js';
const dir='reports/halo-5gyr',G=Math.fround(.04498502151469553),epsilon=Math.sqrt(Math.fround(.01)),results=[];
const original=JSON.parse(await readFile('reports/resolution-decision/session-snapshot-initial.json'));
function probes(s,out,indices){let da=0,aa=0,max=0,du=0,uu=0;for(const i of indices){const a=[0,0,0];let phi=0;for(let j=0;j<s.n;j++)if(i!==j){const d=[0,1,2].map(k=>s.positions[3*j+k]-s.positions[3*i+k]),r2=d.reduce((t,x)=>t+x*x,epsilon*epsilon),r=Math.sqrt(r2),f=G*s.masses[j]/(r2*r);for(let k=0;k<3;k++)a[k]+=f*d[k];phi-=G*s.masses[j]/r;}const diff=a.reduce((t,x,k)=>t+(x-out.accelerations[3*i+k])**2,0),ref=a.reduce((t,x)=>t+x*x,0);da+=diff;aa+=ref;max=Math.max(max,Math.sqrt(diff/ref));du+=(phi-out.potentials[i])**2;uu+=phi*phi;}return {count:indices.length,forceRelativeL2:Math.sqrt(da/aa),maximumRelativeForceError:max,potentialRelativeL2:Math.sqrt(du/uu)};}
const pair={n:2,positions:Float64Array.of(-.5,0,0,.5,0,0),velocities:new Float64Array(6),masses:Float64Array.of(2,3),components:Uint8Array.of(1,2)};
const small={n:512,positions:Float64Array.from(original.positions.slice(0,1536)),velocities:Float64Array.from(original.velocities.slice(0,1536)),masses:Float64Array.from(original.masses.slice(0,512)),components:Uint8Array.from(original.components.slice(0,512))};
const manifest=JSON.parse(await readFile(dir+'/manifest.json')),large=unpackCheckpoint(gunzipSync(await readFile(manifest.runs.find(r=>r.factor===16).file))).state;
for(const [name,s]of [['unequal-mass-pair',pair],['small-captured',small],['actual-original',original],['actual-halo-x16',large]]){
 await writeFalcon(dir+'/falcon-input.bin',s);
 for(const theta of [.5,.3,.15]){
  const timing=await runFalcon(dir+'/falcon-input.bin',dir+'/falcon-output.bin',{G,epsilon,theta}),out=await readFalcon(dir+'/falcon-output.bin');
  const indices=s.n<=512?Array.from({length:s.n},(_,i)=>i):Array.from({length:96},(_,j)=>j<64?4972+Math.floor(j*14917/64):Math.floor((j-64)*s.n/32));
  const r={name,n:s.n,...timing,...probes(s,out,indices)};results.push(r);console.log(JSON.stringify(r));
  await writeFile(dir+'/falcon-force-calibration.json',JSON.stringify({schema:'falcon-force-calibration-v1',createdUTC:new Date().toISOString(),G,epsilon,kernel:0,precision:'Float64 compile-time asserted',source:'GalacticDynamics-Oxford/pyfalcon d2e2e05acb377d21b9a87d94aa8b283f52f39fca',results,qualification:'Sampled force and potential errors against the same direct Plummer sum; no global error bound or stability certificate.'},null,2));
 }
}
