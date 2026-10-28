import {writeFile} from 'node:fs/promises';import {G} from '../src/physics/constants.js';import {Leapfrog} from '../src/physics/integrator.js';import {directEnergy,relativeEnergy} from '../src/physics/live-energy.js';
const make=f=>({n:2,positions:Float64Array.of(-1,0,0,1,0,0),velocities:Float64Array.of(0,-Math.sqrt(2*G/(4+.005**2)**1.5)*f,0,0,Math.sqrt(2*G/(4+.005**2)**1.5)*f,0),masses:Float64Array.of(1,1),components:new Uint8Array(2),accelerations:new Float64Array(6),time:0});
const rows=[],summaries=[];
for(const kind of ['circular','eccentric']){
 const factor=kind==='circular'?1:.65,fine=make(factor),fe=new Leapfrog(fine,{dt:.003125,epsilon:.005});const refs=[];
 // Common epochs avoid attributing differing sample grids to trajectory convergence.
 for(let t=0;t<=100;t++){if(t)fe.step(320);refs.push(fine.positions.slice());}
 for(const dt of [.1,.05,.025]){
  const s=make(factor),e=new Leapfrog(s,{dt,epsilon:.005}),d0=directEnergy(s,{epsilon:.005}),local=[];let max=0,maxL=0,maxTrajectory=0,costTotal=0,costMaximum=0;
  const nsteps=Math.round(1000/dt);for(let i=0;i<=nsteps;i++){
   if(i)e.step();const d=directEnergy(s,{epsilon:.005}),rel=relativeEnergy(d,d0).signed;costTotal+=d.diagnosticCostMs;costMaximum=Math.max(costMaximum,d.diagnosticCostMs);max=Math.max(max,Math.abs(rel));maxL=Math.max(maxL,Math.hypot(...d.angularMomentum.map((v,k)=>v-d0.angularMomentum[k]))/d0.angularMomentumScale);
   if(i%Math.round(1/dt)===0){const t=Math.round(i*dt),err=t<=100?Math.hypot(...s.positions.map((v,k)=>v-refs[t][k])):null;if(err!=null)maxTrajectory=Math.max(maxTrajectory,err);local.push({kind,dt,time_Myr:i*dt,E:d.energy,deltaE:rel,trajectoryNormError_kpc:err});}
  }rows.push(...local);summaries.push({kind,dt,n:2,model:'resolved Plummer binary, initial radii 1 kpc, masses 1e10 Msun each',backend:'CPU',force:'direct',trajectoryPrecision:'Float64',energyPrecision:'Float64 compensated',G,epsilon:.005,time_Myr:s.time,initialEnergy:d0.energy,finalEnergy:local.at(-1).E,maxAbsDirectEveryStep:max,finalDirect:local.at(-1).deltaE,maxAngularChange:maxL,maxTrajectoryErrorFirst100Myr:maxTrajectory,trajectoryReferenceDt:.003125,finalPosition:[...s.positions],directDiagnosticCostMs:{mean:costTotal/(nsteps+1),maximum:costMaximum,evaluations:nsteps+1}});
 }
}
const stem=process.argv.includes('--cost-audit')?'resolved-controls-cost-audit':'resolved-controls';
await writeFile('reports/energy-audit/'+stem+'.json',JSON.stringify({summaries,limitations:['Independent well-resolved binary controls; compact r=0.1 kpc stress tests remain preserved separately.','Fine trajectory comparison is sampled at integer Myr over first 100 Myr; energy maximum uses every full KDK step over 1000 Myr.']},null,2));const keys=Object.keys(rows[0]);await writeFile('reports/energy-audit/'+stem+'.csv',keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]??'').join(',')).join('\n'));console.log(JSON.stringify(summaries));
