import {validateState} from './forces.js';

/** An imported model declares its own masses; never relabel it as historical MN.
 * This admits data, not a claim of physical equilibrium. Validation is separate.
 */
export function deserializeModelSnapshot(data){
  if(data?.schema!=='nbody-initial-v2'||data.units!=='kpc,Myr,1e10 nominal Msun')throw Error('Schema/unidades de snapshot físico incompatíveis.');
  const n=data.n,p=data.meta?.physicalModel,method=data.meta?.method;
  if(!Number.isSafeInteger(n)||n<3||n>1000000)throw Error('N de snapshot inválido.');
  if(!p?.id||!data.meta?.realizationId||!['agama-action-df','same-density-gaussian-control'].includes(method))throw Error('Identidade/método do snapshot ausente ou desconhecido.');
  if(!Array.isArray(p.componentMassesMsun)||p.componentMassesMsun.length!==3||!p.componentMassesMsun.every(x=>Number.isFinite(x)&&x>0))throw Error('Massas físicas declaradas inválidas.');
  for(const [key,len] of [['positions',3*n],['velocities',3*n],['masses',n],['components',n]])if(!Array.isArray(data[key])||data[key].length!==len)throw Error('Dimensão inválida: '+key);
  if(!data.velocities.every(Number.isFinite)||data.components.some(c=>!Number.isInteger(c)||c<0||c>2))throw Error('Valores de fase/componentes inválidos.');
  const s={n,positions:Float64Array.from(data.positions),velocities:Float64Array.from(data.velocities),masses:Float64Array.from(data.masses),components:Uint8Array.from(data.components),accelerations:new Float64Array(3*n),time:0,meta:structuredClone(data.meta)};
  validateState(s);
  const sums=[0,0,0],counts=[0,0,0];for(let i=0;i<n;i++){sums[s.components[i]]+=s.masses[i];counts[s.components[i]]++;}
  if(sums.some((x,c)=>Math.abs(x*1e10/p.componentMassesMsun[c]-1)>1e-9))throw Error('Soma das partículas difere da massa física declarada.');
  if(!counts.every(x=>x>0))throw Error('Snapshot composto requer bojo, disco e halo vivos.');
  // Import cannot grant a certification by setting a boolean in arbitrary JSON.
  s.meta.importedEquilibriumClaim=data.meta.equilibriumValidated===true;s.meta.equilibriumValidated=false;
  s.meta.counts=counts;s.meta.withHalo=true;s.meta.haloMode='live';
  return s;
}
