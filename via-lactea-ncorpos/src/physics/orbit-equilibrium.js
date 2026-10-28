// Positive orbit-superposition candidate; not GALIC or an equilibrium certificate.
import {seededRandom,componentCounts} from './initial-legacy.js';
import {equilibriumFieldAt,COMPONENT_MASSES} from './equilibrium-field.js';
import {MODEL} from './constants.js';
export const ORBIT_R_EDGES=Object.freeze([0,.3,1,2,4,8,16,32,64,128,256,Infinity]);
export const ORBIT_Z_EDGES=Object.freeze([0,.05,.1,.2,.4,.8,1.6,4,16,64,256,Infinity]);
export function occupationCell(p,rEdges=ORBIT_R_EDGES,zEdges=ORBIT_Z_EDGES){
 if(p.length<3||![p[0],p[1],p[2]].every(Number.isFinite))throw Error('Invalid density point');
 const R=Math.hypot(p[0],p[1]),z=Math.abs(p[2]),find=(x,e)=>{let i=0;while(i<e.length-2&&x>=e[i+1])i++;return i;};
 return find(R,rEdges)*(zEdges.length-1)+find(z,zEdges);
}
export function integrateOrbit(field,phase,{duration,steps=4096,phases=128,rEdges=ORBIT_R_EDGES,zEdges=ORBIT_Z_EDGES}={}){
 if(phase.length!==6||!phase.every(Number.isFinite)||!(duration>0)||!Number.isSafeInteger(steps)||steps<4||!Number.isSafeInteger(phases)||phases<4||steps%(2*phases))throw Error('Invalid orbit integration protocol');
 const p=phase.slice(0,3),v=phase.slice(3),dt=duration/steps,bins=(rEdges.length-1)*(zEdges.length-1),first=new Float64Array(bins),second=new Float64Array(bins),states=[],stride=steps/phases;
 let q=equilibriumFieldAt(field,...p),initial=.5*v.reduce((s,x)=>s+x*x,0)+q.potential,maxError=0,firstE=null,lastE=initial;
 const scale=Math.abs(initial);if(!(initial<0))return {accepted:false,reason:'unbound proposed orbit in softened field',initialEnergy:initial};
 for(let i=1;i<=steps;i++){
  for(let k=0;k<3;k++){v[k]+=.5*dt*q.acceleration[k];p[k]+=dt*v[k];}
  q=equilibriumFieldAt(field,...p);for(let k=0;k<3;k++)v[k]+=.5*dt*q.acceleration[k];
  lastE=.5*v.reduce((s,x)=>s+x*x,0)+q.potential;const err=Math.abs(lastE-initial)/scale;maxError=Math.max(maxError,err);
  if(!Number.isFinite(err))return {accepted:false,reason:'nonfinite orbit',initialEnergy:initial};
  // Numerical rejection, not an energy correction or an accepted stability limit.
  if(maxError>.1)return {accepted:false,reason:'orbit integration unresolved at allocated steps',maxRelativeEnergyError:maxError,initialEnergy:initial};
  if(i%stride===0){const hist=i<=steps/2?first:second;hist[occupationCell(p,rEdges,zEdges)]+=2/phases;states.push([...p,...v]);if(firstE===null)firstE=lastE;}
 }
 return {accepted:true,initialEnergy:initial,lastEnergy:lastE,maxRelativeEnergyError:maxError,dt,duration,steps,first:Array.from(first),second:Array.from(second),states,halfOccupationL1:first.reduce((s,x,j)=>s+Math.abs(x-second[j]),0)};
}
export function fitOrbitWeights(orbits,target,{iterations=500}={}){
 if(!Number.isSafeInteger(iterations)||iterations<0)throw Error('Invalid optimization budget');
 if(!orbits.length||!target.length||target.some(x=>!Number.isFinite(x)||x<0)||Math.abs(target.reduce((a,b)=>a+b,0)-1)>1e-10||orbits.some(o=>o.first.length!==target.length||o.first.some(x=>!Number.isFinite(x)||x<0)))throw Error('Invalid orbit matrix/target');
 const n=orbits.length,b=target.length,w=new Float64Array(n).fill(1/n),history=[];
 const mixture=key=>{const p=new Float64Array(b);for(let i=0;i<n;i++)for(let j=0;j<b;j++)p[j]+=w[i]*orbits[i][key][j];return p;};
 const unseen=target.reduce((s,t,j)=>s+(orbits.every(o=>o.first[j]===0)?t:0),0);
 for(let it=0;it<=iterations;it++){
  const p=mixture('first');if(it%25===0||it===iterations){const validation=mixture('second');history.push({iteration:it,trainingL1:p.reduce((s,x,j)=>s+Math.abs(x-target[j]),0),validationL1:validation.reduce((s,x,j)=>s+Math.abs(x-target[j]),0),halfDifferenceL1:p.reduce((s,x,j)=>s+Math.abs(x-validation[j]),0)});}
  if(it===iterations)break;
  let total=0;for(let i=0;i<n;i++){let gain=0;for(let j=0;j<b;j++)if(p[j]>0)gain+=orbits[i].first[j]*target[j]/p[j];w[i]*=gain;total+=w[i];}
  if(!(total>0))throw Error('No density support in orbit library');for(let i=0;i<n;i++)w[i]/=total;
 }
 return {weights:Array.from(w),training:Array.from(mixture('first')),validation:Array.from(mixture('second')),history,unreachableTargetMass:unseen,effectiveOrbits:1/w.reduce((s,x)=>s+x*x,0),equilibriumValidated:false};
}
export function sampleOrbitCandidate(library,{n=800,counts=componentCounts(n,true),seed=2026}={}){
 if(library?.schema!=='legacy-orbit-library-v1'||counts.length!==3||counts.some(x=>!Number.isSafeInteger(x)||x<2||x%2)||counts.reduce((a,b)=>a+b,0)!==n)throw Error('Candidate requires positive even component counts and matching N');
 const state={n,time:0,positions:new Float64Array(3*n),velocities:new Float64Array(3*n),accelerations:new Float64Array(3*n),masses:new Float64Array(n),components:new Uint8Array(n)},rng=seededRandom(seed);let offset=0;
 for(let c=0;c<3;c++){
  const group=library.components[c],weights=group.fit.weights,cdf=[];if(!weights.length||weights.length!==group.orbits.length||weights.some(w=>!Number.isFinite(w)||w<0)||group.orbits.some(o=>!o.states.length||o.states.some(p=>p.length!==6||!p.every(Number.isFinite))))throw Error('Invalid positive orbit measure');let sum=0;for(const w of weights)cdf.push(sum+=w);
  if(Math.abs(sum-1)>1e-10)throw Error('Orbit weights must be normalized');
  for(let j=0;j<counts[c];j+=2){const pick=rng();let k=0;while(k<cdf.length-1&&pick>cdf[k])k++;const orbit=group.orbits[k],phase=orbit.states[Math.floor(rng()*orbit.states.length)],phi=2*Math.PI*rng(),co=Math.cos(phi),si=Math.sin(phi),reverse=c===1?1:(rng()<.5?-1:1),p=[co*phase[0]-si*phase[1],si*phase[0]+co*phase[1],phase[2]],v=[co*phase[3]-si*phase[4],si*phase[3]+co*phase[4],phase[5]].map(x=>x*reverse);
   for(let pair=0;pair<2;pair++){const i=offset+j+pair,sign=pair?-1:1;state.positions.set(p.map(x=>x*sign),3*i);state.velocities.set(v.map(x=>x*sign),3*i);state.masses[i]=COMPONENT_MASSES[c]/counts[c];state.components[i]=c;}
  }offset+=counts[c];
 }
 state.meta={method:'positive-orbit-superposition-candidate',seed,withHalo:true,counts,masses:[...COMPONENT_MASSES],model:MODEL,initialization:'Mistura positiva de órbitas no campo Plummer; candidato experimental sem certificação',realizationId:`${library.id}-n${n}-c${counts.join('-')}-s${seed}`,preparation:{libraryId:library.id,epsilonKpc:library.epsilon,potentialSHA256:library.potentialSHA256,constructionSeed:library.seed,phaseSampling:'Random stored physical orbit phases and independent azimuths; antipodal pairs; spheroid time-reversal mixture'},equilibriumValidated:false,qualification:'Masses exactly retained. Density and stationarity gates remain external; importing this snapshot never certifies equilibrium.'};
 return state;
}
export function serializeOrbitCandidate(s){return {schema:'legacy-orbit-candidate-v1',units:'kpc,Myr,1e10 nominal Msun',n:s.n,positions:Array.from(s.positions),velocities:Array.from(s.velocities),masses:Array.from(s.masses),components:Array.from(s.components),meta:structuredClone(s.meta)};}
export function deserializeOrbitCandidate(data,{epsilon}={}){
 if(data?.schema!=='legacy-orbit-candidate-v1'||data.units!=='kpc,Myr,1e10 nominal Msun'||JSON.stringify(data.meta?.model)!==JSON.stringify(MODEL)||data.meta?.method!=='positive-orbit-superposition-candidate'||!data.meta?.preparation?.potentialSHA256?.match(/^[a-f0-9]{64}$/))throw Error('Unidentified orbit candidate/model');
 const n=data.n;if(!Number.isSafeInteger(n)||n<6||n>1000000)throw Error('Invalid N');
 for(const [key,length]of [['positions',3*n],['velocities',3*n],['masses',n],['components',n]])if(!Array.isArray(data[key])||data[key].length!==length||!data[key].every(Number.isFinite))throw Error('Invalid snapshot array '+key);
 const sums=[0,0,0],counts=[0,0,0];for(let i=0;i<n;i++){const c=data.components[i];if(!Number.isInteger(c)||c<0||c>2||!(data.masses[i]>0))throw Error('Invalid component/mass');sums[c]+=data.masses[i];counts[c]++;}
 if(sums.some((m,c)=>Math.abs(m/COMPONENT_MASSES[c]-1)>64*n*Number.EPSILON))throw Error('Candidate changes physical masses');
 const e=data.meta.preparation.epsilonKpc;if(!(e>0)||!Number.isFinite(e)||(epsilon!==undefined&&epsilon!==e))throw Error('Preparation/evolution softening mismatch');
 return {n,time:0,positions:Float64Array.from(data.positions),velocities:Float64Array.from(data.velocities),masses:Float64Array.from(data.masses),components:Uint8Array.from(data.components),accelerations:new Float64Array(3*n),meta:{...structuredClone(data.meta),counts,importedEquilibriumClaim:data.meta.equilibriumValidated===true,equilibriumValidated:false}};
}
