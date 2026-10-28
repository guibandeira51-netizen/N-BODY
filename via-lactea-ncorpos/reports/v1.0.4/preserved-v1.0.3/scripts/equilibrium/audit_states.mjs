import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {equilibriumSample,ringMembership} from '../../src/physics/equilibrium-analysis.js';
// Recompute diagnostics from the independently serialized GPU checkpoints. This
// catches wrong exports/units/component labels; it is not a stability criterion.
const root=resolve(import.meta.dirname,'../..'),folder=resolve(root,'reports/v1.0.0/runs'),checks=[];
function close(a,b,label){if(a==null||b==null){assert.equal(a,b,label);return;}assert.ok(Math.abs(a-b)<=1e-11*Math.max(1,Math.abs(a),Math.abs(b)),`${label}: ${a} != ${b}`);}
for(const name of await readdir(folder)){
 if(!name.endsWith('.json'))continue;const bytes=await readFile(resolve(folder,name)),r=JSON.parse(bytes);if(r.status!=='completed'||!r.particleConstants)continue;
 const c=r.particleConstants;assert.equal(c.units,'kpc,Myr,1e10 nominal Msun');assert.equal(c.masses.length,c.n);assert.equal(c.components.length,c.n);assert.ok(c.masses.every(x=>Number.isFinite(x)&&x>0));assert.ok(c.components.every(x=>[0,1,2].includes(x)));
 let membership;const rows=[];
 for(const raw of r.particleStates){
  for(const key of ['positions','velocities','accelerations']){assert.equal(raw[key].length,3*c.n);assert.ok(raw[key].every(Number.isFinite));}
  const s={n:c.n,time:raw.timeMyr,meta:c.meta,masses:Float64Array.from(c.masses),components:Uint8Array.from(c.components),positions:Float64Array.from(raw.positions),velocities:Float64Array.from(raw.velocities),accelerations:Float64Array.from(raw.accelerations)};
  membership??=ringMembership(s);const stored=r.samples.find(x=>x.timeMyr===raw.timeMyr);assert.ok(stored);const a=equilibriumSample(s,{diagnostic:stored.conservation,initialMembership:membership});
  for(const plane of ['fixed','instant'])for(const key of ['h50','sigmaNormal'])close(a.disk[plane][key],stored.disk[plane][key],`${r.id} ${s.time} ${plane}.${key}`);
  for(const component of a.structure.components){const old=stored.structure.components.find(x=>x.id===component.id);for(const key of ['mass','r50','R50'])close(component[key],old[key],`${r.id} ${s.time} component${component.id}.${key}`);}
  for(let i=0;i<a.cohorts.initialRingToCurrentRingMass.length;i++)for(let j=0;j<a.cohorts.initialRingToCurrentRingMass[i].length;j++)close(a.cohorts.initialRingToCurrentRingMass[i][j],stored.cohorts.initialRingToCurrentRingMass[i][j],`${r.id} migration ${i},${j}`);
  rows.push({timeMyr:s.time,n:s.n,recomputedThicknessDispersionRadiiAndCohorts:true});
 }
 assert.deepEqual(rows.map(x=>x.timeMyr),[0,20,200,1000].filter(t=>t<=r.config.duration));checks.push({id:r.id,file:name,sha256:createHash('sha256').update(bytes).digest('hex'),checkpoints:rows});
}
await writeFile(resolve(root,'reports/v1.0.0/state-export-audit.json'),JSON.stringify({schema:'equilibrium-state-export-audit-v1',checks,qualification:'Recomputation verifies serialized states against measured diagnostics. It does not certify physical equilibrium.'},null,2));console.log({runsVerified:checks.length,checkpoints:checks.reduce((n,x)=>n+x.checkpoints.length,0)});
