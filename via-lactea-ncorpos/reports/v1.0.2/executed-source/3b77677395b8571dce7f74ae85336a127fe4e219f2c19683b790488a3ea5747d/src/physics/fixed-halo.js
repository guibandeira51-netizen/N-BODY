import {G} from './constants.js';
import {haloMass,haloDensity,haloTable,HALO_OUTER_RADIUS,HALO_TOTAL_MASS,analyticPotential} from './models.js';
import {Leapfrog} from './integrator.js';
import {diagnostics} from './diagnostics.js';

export function validateFixedHaloState(s){
  if(s.components?.some((c,i)=>c===2&&s.masses[i]>0))throw Error('Halo fixo não pode coexistir com partículas massivas de halo.');
}
export function haloPotential(r){return analyticPotential(r,0,0,true)-analyticPotential(r,0,0,false);}
const cache=new Map();
export function fixedHaloTable({softening=0,radialPoints=4096,shellPoints=8192}={}){
  if(!(softening>=0)||!Number.isFinite(softening)||!Number.isSafeInteger(radialPoints)||radialPoints<32||!Number.isSafeInteger(shellPoints)||shellPoints<32)throw Error('Quadratura do halo inválida.');
  const key=[softening,radialPoints,shellPoints].join(',');if(cache.has(key))return cache.get(key);
  const radius=new Float64Array(radialPoints+1),mass=new Float64Array(radialPoints+1),potential=new Float64Array(radialPoints+1);
  for(let i=1;i<=radialPoints;i++)radius[i]=1e-6*(1e5/1e-6)**((i-1)/(radialPoints-1));
  if(softening===0){for(let i=0;i<radius.length;i++){mass[i]=haloMass(radius[i]);potential[i]=haloPotential(radius[i]);}}
  else {
    // Angular average of Plummer Green's function for a spherical shell:
    // <1/sqrt(d²+e²)> = 2/(sqrt((r+s)²+e²)+sqrt((r-s)²+e²)).
    // Differentiate this stable expression, rather than subtracting close roots.
    const shells=[];let total=0;
    for(let j=0;j<shellPoints;j++){const lo=j===0?0:1e-7*(HALO_OUTER_RADIUS/1e-7)**((j-1)/(shellPoints-1)),hi=1e-7*(HALO_OUTER_RADIUS/1e-7)**(j/(shellPoints-1)),s=(lo+hi)/2,dm=4*Math.PI*haloDensity(s)*s*s*(hi-lo);shells.push([s,dm]);total+=dm;}
    const norm=HALO_TOTAL_MASS/total; // Same finite target mass; quadrature normalization recorded.
    for(let i=0;i<radius.length;i++){const r=radius[i];let phi=0,acc=0;for(const [s,raw] of shells){const dm=raw*norm,u=Math.hypot(r+s,softening),v=Math.hypot(r-s,softening),sum=u+v;phi-=2*G*dm/sum;acc+=2*G*dm*((r+s)/u+(r-s)/v)/(sum*sum);}potential[i]=phi;mass[i]=r*r*acc/G;}
  }
  const table={radius,mass,potential,softening,radialPoints,shellPoints,totalMass:HALO_TOTAL_MASS,outerRadius:HALO_OUTER_RADIUS,method:softening?'spherical density convolved with Plummer kernel; normalized midpoint log-shell quadrature':'same truncated analytic NFW as production model'};cache.set(key,table);return table;
}
export function tableValue(table,r,key){
  if(r<0||!Number.isFinite(r))throw Error('Raio inválido.');const xs=table.radius,ys=table[key];
  if(r===0)return ys[0];if(r<xs[1])return key==='mass'?ys[1]*(r/xs[1])**(table.softening?3:2):ys[0]+(ys[1]-ys[0])*r/xs[1];
  if(r>=xs.at(-1))return key==='mass'?HALO_TOTAL_MASS:-G*HALO_TOTAL_MASS/r;
  let lo=1,hi=xs.length-1;while(hi-lo>1){const m=(lo+hi)>>>1;if(xs[m]>r)hi=m;else lo=m;}return ys[lo]+(ys[hi]-ys[lo])*(r-xs[lo])/(xs[hi]-xs[lo]);
}
export function addFixedHaloAccelerations(s,table=fixedHaloTable()){
  validateFixedHaloState(s);for(let i=0;i<s.n;i++){const k=3*i,r=Math.hypot(...s.positions.subarray(k,k+3));if(r>0){const f=-G*tableValue(table,r,'mass')/r**3;for(let j=0;j<3;j++)s.accelerations[k+j]+=f*s.positions[k+j];}}return s.accelerations;
}
export function fixedHaloDiagnostics(s,options={},table=fixedHaloTable()){
  validateFixedHaloState(s);const d=diagnostics(s,options);let externalPotential=0;
  for(let i=0;i<s.n;i++)externalPotential+=s.masses[i]*tableValue(table,Math.hypot(...s.positions.subarray(3*i,3*i+3)),'potential');
  return {...d,selfPotential:d.potential,externalPotential,potential:d.potential+externalPotential,energy:d.kinetic+d.potential+externalPotential,externalField:{type:'fixed finite NFW',softening:table.softening,tableRadialPoints:table.radialPoints,energy:'Uself + sum m Phi_external (no half factor)',linearMomentumConserved:false,angularMomentumConserved:'about fixed halo center',tableErrorCalibrated:false}};
}
export class FixedHaloLeapfrog extends Leapfrog {
  constructor(s,options={}){validateFixedHaloState(s);if(options.G!==undefined&&options.G!==G)throw Error('Halo fixo usa G físico do modelo.');super(s,options);this.haloTable=options.haloTable??fixedHaloTable();}
  force(){super.force();return addFixedHaloAccelerations(this.state,this.haloTable);}
}
