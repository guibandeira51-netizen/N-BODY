import{readFile,writeFile}from'node:fs/promises';import{createLiveGalaxy}from'../../src/physics/live-initial.js';import{directEnergy}from'../../src/physics/live-energy.js';
const file=new URL('./inputs.json',import.meta.url),d=JSON.parse(await readFile(file,'utf8')),gpu=JSON.parse(await readFile(new URL('./gpu-results.json',import.meta.url),'utf8')),s=gpu.velocityControl.slow,parameters=gpu.velocityControl.parameters;
const typed={...s,positions:Float64Array.from(s.positions),velocities:Float64Array.from(s.velocities),accelerations:Float64Array.from(s.accelerations),masses:Float64Array.from(s.masses),components:Uint8Array.from(s.components)};
d.energyFixture={state:s,parameters,productionEnergy:directEnergy(typed,{haloRepresentation:'geometry',effectiveParameters:parameters})};
const base=createLiveGalaxy({baseN:4096,seed:2026,haloRefinement:4}),geo=createLiveGalaxy({baseN:4096,seed:2026,haloRepresentation:'geometry'});d.initialFloat32BaryonEquality={};
for(const k of['positions','velocities','masses'])d.initialFloat32BaryonEquality[k]=Array.from(geo[k],Math.fround).every((v,i)=>Object.is(v,Math.fround(base[k][i])));
d.effectiveParticleHaloMass4096x4=Array.from(base.masses).reduce((sum,m,i)=>sum+(base.components[i]===2?Math.fround(m):0),0);await writeFile(file,JSON.stringify(d));
