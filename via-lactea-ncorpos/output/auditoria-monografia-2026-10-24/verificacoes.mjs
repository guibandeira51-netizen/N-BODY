import {writeFileSync} from 'node:fs';
import {G,MODEL as P,KM_S_TO_KPC_MYR} from '../../src/physics/constants.js';
import {analyticAcceleration,diskAcceleration,nfwFunction,R200,HALO_OUTER_RADIUS,HALO_TOTAL_MASS,haloMass} from '../../src/physics/models.js';
import {directAccelerations} from '../../src/physics/forces.js';
import {Leapfrog} from '../../src/physics/integrator.js';
import {directEnergy} from '../../src/physics/live-energy.js';

// Independent closed-form, untruncated reference. A constant potential offset
// from truncation is irrelevant to the gradient within R200.
function referencePhi([x,y,z]) {
 const r=Math.hypot(x,y,z);
 return -G*P.bulgeMass/(r+P.bulgeScale)-G*P.diskMass/Math.sqrt(x*x+y*y+(P.diskA+Math.sqrt(z*z+P.diskB**2))**2)-G*P.haloMassScale*Math.log1p(r/P.haloScale)/r;
}
const gradients=[[1,.3,.2],[8.2,0,1.1],[20,2,-.5]].map(point=>{
 const analytic=analyticAcceleration(...point),h=1e-4;
 const independent=point.map((_,k)=>{const a=[...point],b=[...point];a[k]+=h;b[k]-=h;return -(referencePhi(a)-referencePhi(b))/(2*h);});
 return {point,acceleration:analytic,finiteDifference:independent,relativeNormError:Math.hypot(...independent.map((v,k)=>v-analytic[k]))/Math.hypot(...analytic)};
});
const R=8.2;
const speeds=[0,1,2].map(c=>Math.sqrt(-R*analyticAcceleration(R,0,0,true,c)[0])/KM_S_TO_KPC_MYR);
const diskSphereShortcut=Math.sqrt(G*P.diskMass/R)/KM_S_TO_KPC_MYR;
const simple={n:2,positions:new Float64Array([0,0,0,2,0,0]),velocities:new Float64Array(6),accelerations:new Float64Array(6),masses:new Float64Array([2,3]),components:new Uint8Array([0,1])};
directAccelerations(simple,{epsilon:.1});
const measuredEnergy=directEnergy(simple,{epsilon:.1}).energy,referenceEnergy=-G*2*3/Math.sqrt(4+.01);
function state(){
 const v=.65*Math.sqrt(G*2/(4+.005**2)**1.5);
 return {n:2,positions:new Float64Array([-1,0,0,1,0,0]),velocities:new Float64Array([0,-v,0,0,v,0]),accelerations:new Float64Array(6),masses:new Float64Array([1,1]),components:new Uint8Array([0,0])};
}
function independentEnergy(s){let K=0;for(let i=0;i<s.n;i++)for(let k=0;k<3;k++)K+=.5*s.masses[i]*s.velocities[3*i+k]**2;const d=[0,1,2].map(k=>s.positions[k+3]-s.positions[k]);return K-G/Math.sqrt(d.reduce((sum,v)=>sum+v*v,.005**2));}
const convergence=[.1,.05,.025].map(dt=>{const s=state(),engine=new Leapfrog(s,{dt,epsilon:.005}),E0=independentEnergy(s);let max=0;for(let i=0;i<Math.round(100/dt);i++){engine.step();max=Math.max(max,Math.abs((independentEnergy(s)-E0)/E0));}return{dt,timeMyr:s.time,maxAbsoluteEnergyPercent:max*100,positions:Array.from(s.positions)};});
const nfwR=8.2,h=1e-4,phi=r=>-G*P.haloMassScale*Math.log1p(r/P.haloScale)/r,dPhi=(phi(nfwR+h)-phi(nfwR-h))/(2*h);
const result={scope:'New small CPU Float64 checks only; no new live-galaxy campaign; no production changes.',G,KM_S_TO_KPC_MYR,halo:{R200,outerRadius:HALO_OUTER_RADIUS,massScale:P.haloMassScale,M200:haloMass(R200),totalTruncated:HALO_TOTAL_MASS},gradients,solarRadius:{R,bulge:speeds[0],disk:speeds[1],halo:speeds[2],baryons:Math.hypot(...speeds.slice(0,2)),total:Math.hypot(...speeds),diskTotalMassSphericalShortcut:diskSphereShortcut},pair:{measuredEnergy,referenceEnergy,difference:measuredEnergy-referenceEnergy,acceleration:Array.from(simple.accelerations)},nfwSign:{r:nfwR,dPhiDr:dPhi,attractiveAcceleration:-dPhi,expectedPositiveDerivative:G*P.haloMassScale*nfwFunction(nfwR/P.haloScale)/nfwR**2},convergence,ratios:convergence.slice(0,-1).map((r,i)=>r.maxAbsoluteEnergyPercent/convergence[i+1].maxAbsoluteEnergyPercent)};
writeFileSync(new URL('./verificacoes-numericas.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
