import {createGalaxy} from '../src/physics/initial.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {diagnostics,conservationError} from '../src/physics/diagnostics.js';
import {directAccelerations,barnesHutAccelerations} from '../src/physics/forces.js';
import {rotationCurve,analyticAcceleration} from '../src/physics/models.js';
import {writeFile} from 'node:fs/promises';
function profile(s) {
  return [0,1,2].map(c=>{const r=[],z=[];for(let i=0;i<s.n;i++)if(s.components[i]===c){r.push(Math.hypot(...s.positions.subarray(3*i,3*i+3)));z.push(Math.abs(s.positions[3*i+2]));}r.sort((a,b)=>a-b);z.sort((a,b)=>a-b);return {component:c,n:r.length,halfMassRadius:r.length?r[Math.floor(r.length/2)]:null,medianHeight:z.length?z[Math.floor(z.length/2)]:null};});
}
const output={dateUTC:new Date().toISOString(),qualification:'Short-time diagnostics of approximate Jeans initial conditions; not a proof of long-term collisionless equilibrium',runs:[],forceComparison:[]};
for(const withHalo of [false,true]) {
  const s=createGalaxy({n:2000,seed:2026,withHalo}),before=diagnostics(s,{algorithm:'direct',epsilon:0.1}),initialProfile=profile(s),engine=new Leapfrog(s,{algorithm:'barnes-hut',dt:0.1,theta:0.5,epsilon:0.1});engine.initialize();engine.step(200);
  const after=diagnostics(s,{algorithm:'direct',epsilon:0.1});
  output.runs.push({withHalo,n:s.n,seed:2026,physicalMyr:engine.time,algorithm:'barnes-hut',dt:0.1,epsilon:0.1,theta:0.5,errorsFromExactEnergy:conservationError(after,before),initial:initialProfile,final:profile(s),initialMeta:s.meta,finite:s.positions.every(Number.isFinite)&&s.velocities.every(Number.isFinite)});
}
const s=createGalaxy({n:1000});const ref=directAccelerations(s,{epsilon:0.1},new Float64Array(s.n*3));
for(const theta of [0.8,0.5,0.3,0.1]){const a=barnesHutAccelerations(s,{epsilon:0.1,theta},new Float64Array(s.n*3));let err=0,norm=0;for(let k=0;k<a.length;k++){err+=(a[k]-ref[k])**2;norm+=ref[k]**2;}output.forceComparison.push({n:s.n,theta,relativeRms:Math.sqrt(err/norm)});}
output.rotationAtSolarRadius=[false,true].map(withHalo=>({withHalo,Rkpc:8.2,vcKpcPerMyr:Math.sqrt(-8.2*analyticAcceleration(8.2,0,0,withHalo)[0])}));
await writeFile(new URL('../reports/validation-galaxy.json',import.meta.url),JSON.stringify(output,null,2));
const curve=rotationCurve();await writeFile(new URL('../reports/rotation-analytic.csv',import.meta.url),'R_kpc,bulge_km_s,disk_km_s,halo_km_s,baryons_km_s,total_km_s\n'+curve.map(x=>[x.r,x.bulge,x.disk,x.halo,x.baryons,x.total].join(',')).join('\n'));
console.log(JSON.stringify(output,null,2));
