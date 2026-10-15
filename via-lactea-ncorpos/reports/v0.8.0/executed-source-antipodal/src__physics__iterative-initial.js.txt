import {createGalaxy as historical,seededRandom,sampleHernquist,sampleDisk,sampleHalo} from './initial-legacy.js';
import {MODEL} from './constants.js';
import {HALO_TOTAL_MASS,analyticPotential} from './models.js';
import {validateState} from './forces.js';
import {massAudit} from './mass-audit.js';

/** Axisymmetric nearest-neighbour velocity transfer, Rodionov et al. 2009 §2.2.
 * Preparation only. No transfer, reset, cooling or constraints in free evolution.
 * Uses signed (R,z), the Euclidean kpc metric, least-used donor among k nearest.
 */
export function nearestTree(points,depth=0){
  if(!points.length)return null;
  const axis=depth%2;points.sort((a,b)=>a[axis]-b[axis]||a[2]-b[2]);const mid=points.length>>1;
  return {p:points[mid],axis,left:nearestTree(points.slice(0,mid),depth+1),right:nearestTree(points.slice(mid+1),depth+1)};
}
export function nearestK(tree,R,z,k){
  const best=[],q=[R,z];
  function visit(node){if(!node)return;const p=node.p,d=(p[0]-R)**2+(p[1]-z)**2;best.push({d,id:p[2]});best.sort((a,b)=>a.d-b.d||a.id-b.id);if(best.length>k)best.pop();const delta=q[node.axis]-p[node.axis];visit(delta<0?node.left:node.right);if(best.length<k||delta*delta<=best.at(-1).d)visit(delta<0?node.right:node.left);}
  visit(tree);return best;
}
export function targetPositions(template,seed,{antipodal=false}={}){
  const s={n:template.n,positions:new Float64Array(3*template.n),velocities:new Float64Array(3*template.n),accelerations:new Float64Array(3*template.n),masses:template.masses.slice(),components:template.components.slice(),time:0,meta:structuredClone(template.meta)};
  const rng=seededRandom(seed),samplers=[sampleHernquist,sampleDisk,sampleHalo];
  for(let i=0;i<s.n;i++){const c=s.components[i];if(antipodal&&i%2){for(let k=0;k<3;k++)s.positions[3*i+k]=-s.positions[3*(i-1)+k];}else s.positions.set(samplers[c](rng),3*i);}
  return s;
}
export function transferVelocities(evolved,target,{neighbours=10,seed=2026,antipodal=false}={}){
  validateState(evolved);validateState(target);
  if(!Number.isSafeInteger(neighbours)||neighbours<1)throw Error('Número de vizinhos inválido.');
  if(!evolved.velocities?.every(Number.isFinite))throw Error('Velocidade doadora não finita.');
  const trees=[0,1,2].map(c=>nearestTree(Array.from({length:evolved.n},(_,i)=>i).filter(i=>evolved.components[i]===c).map(i=>[Math.hypot(evolved.positions[3*i],evolved.positions[3*i+1]),evolved.positions[3*i+2],i])));
  if(antipodal){if(target.n%2)throw Error('Simetria antipodal requer pares completos.');for(let i=0;i<target.n;i+=2){if(target.components[i]!==target.components[i+1]||target.masses[i]!==target.masses[i+1]||[0,1,2].some(k=>target.positions[3*i+k]!==-target.positions[3*(i+1)+k]))throw Error('Alvos sem simetria antipodal exata.');}}
  const usage=new Uint32Array(evolved.n),order=Array.from({length:target.n},(_,i)=>i).filter(i=>!antipodal||i%2===0),rng=seededRandom(seed),out=new Float64Array(3*target.n);let sumDistance=0,maxDistance=0;
  for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  for(const i of order){const k=3*i,x=target.positions[k],y=target.positions[k+1],R=Math.hypot(x,y);if(R===0)throw Error('Transferência cilíndrica indefinida em R=0.');
    const candidates=nearestK(trees[target.components[i]],R,target.positions[k+2],neighbours);if(!candidates.length)throw Error('Componente sem doadores.');
    candidates.sort((a,b)=>usage[a.id]-usage[b.id]||a.d-b.d||a.id-b.id);const donor=candidates[0],j=3*donor.id,ox=evolved.positions[j],oy=evolved.positions[j+1],r=Math.hypot(ox,oy);if(r===0)throw Error('Doador no eixo cilíndrico.');
    const vr=(ox*evolved.velocities[j]+oy*evolved.velocities[j+1])/r,vp=(ox*evolved.velocities[j+1]-oy*evolved.velocities[j])/r;
    out[k]=(x*vr-y*vp)/R;out[k+1]=(y*vr+x*vp)/R;out[k+2]=evolved.velocities[j+2];usage[donor.id]++;sumDistance+=Math.sqrt(donor.d);maxDistance=Math.max(maxDistance,Math.sqrt(donor.d));
    if(antipodal)for(let a=0;a<3;a++)out[k+3+a]=-out[k+a];
  }
  if(!out.every(Number.isFinite))throw Error('Transferência não finita.');target.velocities.set(out);target.accelerations.fill(0);target.time=0;
  return {neighbours,antipodal,primaryAssignments:order.length,unusedDonors:usage.filter(x=>!x).length,maxReuse:usage.reduce((a,b)=>Math.max(a,b),0),meanDistanceKpc:sumDistance/order.length,maxDistanceKpc:maxDistance};
}
export function inertialFrame(state){
  const p=[0,0,0],v=[0,0,0],M=state.masses.reduce((a,b)=>a+b,0);
  for(let i=0;i<state.n;i++)for(let k=0;k<3;k++){p[k]+=state.masses[i]*state.positions[3*i+k]/M;v[k]+=state.masses[i]*state.velocities[3*i+k]/M;}
  for(let i=0;i<state.n;i++)for(let k=0;k<3;k++){state.positions[3*i+k]-=p[k];state.velocities[3*i+k]-=v[k];}
  return {position:p,velocity:v};
}
export function escapeAudit(s){let unbound=0;for(let i=0;i<s.n;i++){const k=3*i;const E=.5*(s.velocities[k]**2+s.velocities[k+1]**2+s.velocities[k+2]**2)+analyticPotential(...s.positions.subarray(k,k+3),s.meta?.withHalo!==false);if(E>0)unbound++;}return {unbound,reference:'initial unsoftened analytic potential; diagnostic, not velocity clipping'};}
export async function prepareIterative(config,{evolve,iterations=20,segmentMyr=10,neighbours=10,antipodal=true,onIteration=()=>{}}={}){
  if(typeof evolve!=='function'||!Number.isSafeInteger(iterations)||iterations<1||!(segmentMyr>0))throw Error('Protocolo iterativo inválido.');
  const original=historical(config);let current=deserializeInitial(serializeInitial(original));const log=[];
  if(antipodal&&original.meta.counts.some(n=>n%2))throw Error('Preparação antipodal requer quantidade par em cada componente.');
  for(let iteration=1;iteration<=iterations;iteration++){
    const evolved=await evolve(current,segmentMyr),seed=(Number(config.seed??2026)+Math.imul(iteration,0x9e3779b9))>>>0;
    const target=iteration===iterations?{...original,positions:original.positions.slice(),velocities:new Float64Array(original.velocities.length),accelerations:new Float64Array(original.accelerations.length),time:0}:targetPositions(original,seed,{antipodal});
    const transfer=transferVelocities(evolved,target,{neighbours,seed,antipodal});current=target;log.push({iteration,transfer,escape:escapeAudit(current)});await onIteration(log.at(-1));
  }
  const frame=inertialFrame(current);current.meta={...original.meta,method:'iterative-density-transfer',initialization:'Candidato iterativo de densidade e transferência cilíndrica; Rodionov et al. (2009)',preparation:{iterations,segmentMyr,neighbours,antipodal,config,log,finalFrameShift:frame},equilibriumValidated:false,escape:escapeAudit(current),qualification:'Preparação com densidade prescrita; evolução livre obrigatória; não é GALIC/AGAMA nem DF analítica comprovada.'};
  return current;
}
export function serializeInitial(state){return {schema:'nbody-initial-v1',units:'kpc,Myr,1e10 nominal Msun',model:MODEL,haloTotalMass:HALO_TOTAL_MASS,n:state.n,positions:Array.from(state.positions),velocities:Array.from(state.velocities),masses:Array.from(state.masses),components:Array.from(state.components),meta:state.meta};}
export function deserializeInitial(data){
  if(data.schema!=='nbody-initial-v1'||data.units!=='kpc,Myr,1e10 nominal Msun'||JSON.stringify(data.model)!==JSON.stringify(MODEL)||data.haloTotalMass!==HALO_TOTAL_MASS)throw Error('Modelo ou unidades incompatíveis.');
  const s={n:data.n,positions:Float64Array.from(data.positions),velocities:Float64Array.from(data.velocities),masses:Float64Array.from(data.masses),components:Uint8Array.from(data.components),accelerations:new Float64Array(3*data.n),meta:structuredClone(data.meta),time:0};validateState(s);
  if(data.components.length!==s.n||data.components.some(c=>![0,1,2].includes(c))||s.velocities.length!==3*s.n||!s.velocities.every(Number.isFinite))throw Error('Snapshot inválido.');
  if(massAudit(s).components.some(c=>c.relativeDifferencePercent==null||Math.abs(c.relativeDifferencePercent)>1e-10))throw Error('Massa do snapshot não corresponde ao modelo.');
  return s;
}
