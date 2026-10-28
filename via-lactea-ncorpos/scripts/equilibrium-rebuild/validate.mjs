import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {G} from '../../src/physics/constants.js';
import {seededRandom,sampleDisk,sampleHernquist,sampleHalo} from '../../src/physics/initial-legacy.js';
import {plummerKernel,convolvedAt,equilibriumFieldAt,COMPONENT_MASSES} from '../../src/physics/equilibrium-field.js';
const base='reports/equilibrium-rebuild',p=JSON.parse(await readFile(base+'/latest-field.json','utf8')),field=JSON.parse(await readFile(p.field,'utf8')),id='validation-'+new Date().toISOString().replace(/[:.]/g,'-'),out=base+'/'+id;await mkdir(out,{recursive:true});
const probes=[[1,0,.1],[3,0,.1],[8.2,0,.1],[8.2,0,.28],[16,0,1],[100,0,20]],rows=[];
for(const n of [1000,4000])for(const seed of [2026,2027,2028])for(let c=0;c<3;c++){
 const rng=seededRandom(seed+997*c),sample=[sampleHernquist,sampleDisk,sampleHalo][c],positions=Array.from({length:n},()=>sample(rng)),mass=COMPONENT_MASSES[c]/n;
 for(const point of probes){const a=[0,0,0];for(const x of positions){const d=x.map((v,k)=>v-point[k]),r2=d.reduce((s,v)=>s+v*v,.01),f=G*mass/(r2*Math.sqrt(r2));for(let k=0;k<3;k++)a[k]+=f*d[k];}const smooth=equilibriumFieldAt(field,...point,c).acceleration;rows.push({n,seed,component:c,point,massSum:mass*n,acceleration:a,continuous:smooth,relativeVectorDifference:Math.hypot(...a.map((x,k)=>x-smooth[k]))/Math.hypot(...smooth)});}
}
const epsilonProbes=[];for(const epsilon of [.05,.1,.2]){const kernel=plummerKernel(epsilon,[32,12,24]);for(const R of [1,3,8.2,16])for(const z of [0,.05,.28,1]){const components=[0,1,2].map(c=>convolvedAt(kernel,R,z,c));epsilonProbes.push({epsilonKpc:epsilon,R,z,totalForce:[0,1,2].map(k=>components.reduce((s,q)=>s+q.acceleration[k],0))});}}
const result={schema:'equilibrium-discreteness-validation-v1',createdUTC:new Date().toISOString(),sampling:'Independent exact legacy density inversors, not candidate orbital phases; unit masses fixed by component total. Three seeds are descriptive, not a certified uncertainty interval.',discreteRows:rows,epsilonProbes,qualification:'Field sensitivity only; changing epsilon requires a separate orbital preparation. These probes are not a converged epsilon evolution campaign.'};
await writeFile(out+'/validation.json',JSON.stringify(result,null,2));await writeFile(base+'/latest-validation.json',JSON.stringify({path:out,file:out+'/validation.json'},null,2));console.log(JSON.stringify({rows:rows.length,epsilonProbes:epsilonProbes.length,out}));
