import {writeFile,mkdir} from 'node:fs/promises';
import {Leapfrog} from '../../src/physics/integrator.js';
import {directEnergy,relativeEnergy} from '../../src/physics/live-energy.js';
import {G} from '../../src/physics/constants.js';
const epsilon=.1,r=1,vc=Math.sqrt(2*G/(4+epsilon**2)**1.5),omega=vc/r,T=100;
const rows=[];
for(const shape of ['circular','eccentric'])for(const dt of [.1,.05,.025]){
 const factor=shape==='circular'?1:.7,state={n:2,positions:new Float64Array([-r,0,0,r,0,0]),velocities:new Float64Array([0,-factor*vc,0,0,factor*vc,0]),accelerations:new Float64Array(6),masses:new Float64Array([1,1]),components:new Uint8Array([1,1])},engine=new Leapfrog(state,{G,epsilon,dt,algorithm:'direct'}),initial=directEnergy(state,{epsilon}),l0=2*r*factor*vc;
 let maxEnergyPercent=0,maxL=0,maxP=0;
 for(let step=0;step<T/dt;step++){
  engine.step();maxEnergyPercent=Math.max(maxEnergyPercent,100*relativeEnergy(directEnergy(state,{epsilon}),initial).absolute);
  const l=state.positions[0]*state.velocities[1]-state.positions[1]*state.velocities[0]+state.positions[3]*state.velocities[4]-state.positions[4]*state.velocities[3];maxL=Math.max(maxL,Math.abs(l-l0)/Math.abs(l0));maxP=Math.max(maxP,Math.hypot(state.velocities[0]+state.velocities[3],state.velocities[1]+state.velocities[4],state.velocities[2]+state.velocities[5]));
 }
 const expected=new Float64Array([-Math.cos(omega*T),-Math.sin(omega*T),0,Math.cos(omega*T),Math.sin(omega*T),0]);rows.push({shape,dt,timeMyr:engine.time,steps:engine.steps,maxEveryStepEnergyPercent:maxEnergyPercent,maxEveryStepRelativeLz:maxL,maxEveryStepAbsoluteP:maxP,finalSignedEnergyPercent:relativeEnergy(directEnergy(state,{epsilon}),initial).percent,positionErrorCircular:shape==='circular'?Math.hypot(...state.positions.map((x,i)=>x-expected[i])):null,positions:Array.from(state.positions)});
}
const circular=rows.filter(r=>r.shape==='circular'),eccentric=rows.filter(r=>r.shape==='eccentric');
const result={G,epsilon,reference:'exact circular Plummer binary; eccentric pair shares same Hamiltonian; every-step energy, no endpoint-only selection',rows,observedCircularOrders:circular.slice(1).map((r,i)=>Math.log2(circular[i].positionErrorCircular/r.positionErrorCircular)),observedEccentricEnergyOrders:eccentric.slice(1).map((r,i)=>Math.log2(eccentric[i].maxEveryStepEnergyPercent/r.maxEveryStepEnergyPercent)),qualification:'These simple-system convergence tests validate numerical order, not equilibrium or all trajectories in a galaxy.'};
await mkdir(new URL('../../reports/disk-audit-current/',import.meta.url),{recursive:true});await writeFile(new URL('../../reports/disk-audit-current/leapfrog-before-corrections.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
