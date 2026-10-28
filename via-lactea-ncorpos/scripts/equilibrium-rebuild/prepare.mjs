import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createAllocatedGalaxy} from '../../src/physics/initial-allocated.js';
import {seededRandom,sampleHernquist,sampleDisk,sampleHalo} from '../../src/physics/initial-legacy.js';
import {equilibriumFieldAt} from '../../src/physics/equilibrium-field.js';
import {integrateOrbit,occupationCell,fitOrbitWeights,ORBIT_R_EDGES,ORBIT_Z_EDGES,sampleOrbitCandidate,serializeOrbitCandidate} from '../../src/physics/orbit-equilibrium.js';
const base='reports/equilibrium-rebuild',pointer=JSON.parse(await readFile(base+'/latest-field.json','utf8')),field=JSON.parse(await readFile(pointer.field,'utf8'));
const perComponent=Number(process.argv[2]??128),seed=Number(process.argv[3]??42),periods=Number(process.argv[4]??4),id='orbits-'+perComponent+'-s'+seed+'-p'+periods+'-'+new Date().toISOString().replace(/[:.]/g,'-'),out=base+'/'+id;await mkdir(out,{recursive:true});
const proposal=createAllocatedGalaxy({n:3*perComponent,counts:[perComponent,perComponent,perComponent],seed}),bins=(ORBIT_R_EDGES.length-1)*(ORBIT_Z_EDGES.length-1),components=[],start=performance.now();
const targetSamples=100000,orbitEnergyGoal=1e-5;
for(let c=0;c<3;c++){
 const target=new Float64Array(bins),validationTarget=new Float64Array(bins),sample=[sampleHernquist,sampleDisk,sampleHalo][c];
 for(let copy=0;copy<2;copy++){const rng=seededRandom(1009+c*771+copy*7919);for(let j=0;j<targetSamples;j++)(copy?validationTarget:target)[occupationCell(sample(rng))]+=1/targetSamples;}
 const orbits=[],attempts=[];
 for(let i=c*perComponent;i<(c+1)*perComponent;i++){
  // Antipodal proposals have identical orbit occupancy; use a random azimuth
  // with an independent velocity proposal already supplied by the legacy seed.
  if((i-c*perComponent)%2)continue;
  const phase=[...proposal.positions.subarray(3*i,3*i+3),...proposal.velocities.subarray(3*i,3*i+3)],r=Math.hypot(...phase.slice(0,3)),R=Math.hypot(phase[0],phase[1]);
  const maxR=field.total.rscale*Math.expm1(field.total.du*(field.total.nu-1)),maxZ=field.total.zscale*Math.expm1(field.total.dv*(field.total.nv-1));
  if(R>maxR||Math.abs(phase[2])>maxZ){attempts.push({proposal:i,accepted:false,reason:'initial tail outside allocated grid: coverage pending, target tail retained'});continue;}
  const a=equilibriumFieldAt(field,r,0,0).acceleration[0],period=2*Math.PI*Math.sqrt(r/-a),duration=periods*period;let result;
  for(const steps of [4096,8192,16384,32768,65536]){result=integrateOrbit(field,phase,{duration,steps,phases:512});if(!result.accepted&&result.reason.startsWith('unbound'))break;if(result.accepted&&result.maxRelativeEnergyError<=orbitEnergyGoal)break;}
  const accepted=result.accepted&&result.maxRelativeEnergyError<=orbitEnergyGoal;attempts.push({proposal:i,accepted,reason:accepted?'resolved at allocated specific-energy goal':result.reason??'specific-energy goal unresolved',steps:result.steps,maxRelativeEnergyError:result.maxRelativeEnergyError,duration});
  if(accepted)orbits.push({...result,proposalID:i,initialPhase:phase});
 }
 const fit=fitOrbitWeights(orbits,Array.from(target)),targetNoiseL1=target.reduce((s,x,j)=>s+Math.abs(x-validationTarget[j]),0),heldTargetL1=fit.validation.reduce((s,x,j)=>s+Math.abs(x-validationTarget[j]),0);
 components.push({component:c,requestedOrbits:perComponent/2,orbits,attempts,target:Array.from(target),validationTarget:Array.from(validationTarget),targetSamples,targetNoiseL1,heldTargetL1,fit});
 console.log(JSON.stringify({component:c,orbits:orbits.length,attempts:attempts.length,targetNoiseL1,heldTargetL1,fit:fit.history.at(-1),effectiveOrbits:fit.effectiveOrbits}));
 await writeFile(out+'/partial.json',JSON.stringify({completedComponents:components.length,wallMs:performance.now()-start}));
}
const library={schema:'legacy-orbit-library-v1',id,seed,epsilon:field.epsilon,potentialSHA256:pointer.sha256,field:pointer.field,numerics:{perComponent,uniqueProposals:perComponent/2,orbitEnergyGoal,maximumSteps:65536,phases:512,duration:`${periods} equatorial circular periods at each initial spherical radius; no claim that this mixes all orbits`,periods,targetSamples,fit:'KL density merit, 500 multiplicative iterations; no kinematic closure imposed'},components,wallMs:performance.now()-start,equilibriumValidated:false};
await writeFile(out+'/library.json',JSON.stringify(library));
for(const samplingSeed of [2026,2027,2028]){const s=sampleOrbitCandidate(library,{n:800,seed:samplingSeed});await writeFile(out+'/candidate-n800-s'+samplingSeed+'.json',JSON.stringify(serializeOrbitCandidate(s)));}
await writeFile(base+'/latest-library-'+perComponent+'.json',JSON.stringify({id,path:out,library:out+'/library.json',sha256:createHash('sha256').update(await readFile(out+'/library.json')).digest('hex')},null,2));
console.log(JSON.stringify({out,wallMs:library.wallMs,equilibriumValidated:false}));
