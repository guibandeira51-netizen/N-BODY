import test from 'node:test';import assert from 'node:assert/strict';
import {directEnergy,fastEnergy,energyParameters,relativeEnergy,compareEnergy,copyEnergySnapshot} from '../src/physics/live-energy.js';
import {directAccelerations} from '../src/physics/forces.js';
import {Leapfrog} from '../src/physics/integrator.js';
import {energyPlot} from '../src/live-diagnostics.js';
import {validationSnapshot} from '../src/physics/validation-101.js';
const state=()=>({n:3,positions:Float64Array.of(0,0,0,1,2,0,-1,0,3),velocities:Float64Array.of(.1,.2,0,-.2,0,.1,0,.3,.1),masses:Float64Array.of(2,7,3),components:new Uint8Array(3),accelerations:new Float64Array(9),time:0});
test('live direct reference counts unequal-mass pairs once and uses effective GPU G and epsilon squared',()=>{
 const s=state(),before=structuredClone(s),options={epsilon:.9,effectiveParameters:{G:Math.fround(.13),epsilonSquared:Math.fround(.1*.1)}};
 const d=directEnergy(s,options),p=energyParameters(options);let U=0;for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)U-=p.G*s.masses[i]*s.masses[j]/Math.sqrt([0,1,2].reduce((a,k)=>a+(s.positions[3*i+k]-s.positions[3*j+k])**2,0)+p.epsilonSquared);
 assert(Math.abs(d.potential-U)<1e-14);assert.equal(d.epsilonSquared,Math.fround(.01));assert.equal(d.G,Math.fround(.13));assert.equal(d.trajectoryPrecision,'Float32');assert.deepEqual(s,before);
});
test('initial CPU energy snapshot records the known zero epoch even before state.time exists and isolates its arrays',()=>{
 const s=state();delete s.time;const copy=copyEnergySnapshot(s);assert.equal(copy.time,0);assert.equal(copy.accelerations,undefined);assert.deepEqual(copy.positions,s.positions);copy.positions[0]+=10;assert.notEqual(copy.positions[0],s.positions[0]);assert.equal(directEnergy(copy).time,0);assert.equal(fastEnergy(s).time,0);
});
test('reference potential gradient agrees with force and no self interaction is included',()=>{
 const s=state(),o={G:.13,epsilon:.1},a=directAccelerations(s,o).slice(),h=1e-5;s.positions[0]+=h;const plus=directEnergy(s,o).potential;s.positions[0]-=2*h;const minus=directEnergy(s,o).potential;assert(Math.abs(-(plus-minus)/(2*h*s.masses[0])-a[0])<1e-9);
 const one={...s,n:1,positions:s.positions.slice(0,3),velocities:s.velocities.slice(0,3),masses:s.masses.slice(0,1),components:s.components.slice(0,1),accelerations:new Float64Array(3)};assert.equal(directEnergy(one,o).potential,0);
});
test('signed errors, explicit near-zero fallback and snapshot BH differences are not cosmetically corrected',()=>{
 assert.equal(relativeEnergy({energy:-7},{energy:-8,kinetic:2,potential:-10}).percent,12.5);assert.equal(relativeEnergy({energy:-9},{energy:-8,kinetic:2,potential:-10}).percent,-12.5);
 const r=relativeEnergy({energy:1},{energy:0,kinetic:2,potential:-2});assert.equal(r.denominator,4);assert.match(r.normalization,/cancellation/);assert.equal(relativeEnergy({energy:0},{energy:0,kinetic:0,potential:0}),null);
 const s=state(),f=fastEnergy(s,{theta:0}),d=directEnergy(s);assert(Math.abs(compareEnergy(f,d).deltaU)<1e-16);
 assert.throws(()=>fastEnergy(s,{externalPotential:()=>-1}),/campo externo/);
});
test('KDK diagnostics see the completed second kick, and energy reference points are never joined',()=>{
 const s=state(),o={dt:.001,G:.13,epsilon:.1},e=new Leapfrog(s,o);e.initialize();const p=s.positions.slice(),v=s.velocities.slice(),a=s.accelerations.slice();e.step();const anew=directAccelerations(s,o).slice();
 for(let k=0;k<v.length;k++){assert(Math.abs(s.positions[k]-(p[k]+o.dt*(v[k]+.5*o.dt*a[k])))<1e-15);assert(Math.abs(s.velocities[k]-(v[k]+.5*o.dt*(a[k]+anew[k])))<1e-15);}
 const d=directEnergy(s,o),f=fastEnergy(s,o),svg=energyPlot([{timeMyr:0,conservation:f}], [{timeMyr:0,direct:{...d,time:0}},{timeMyr:1,direct:{...d,time:1,energy:d.energy+.01}}]);
 const paths=[...svg.matchAll(/<path d="([^"]*)" fill="none" stroke="#c07b25"/g)];assert.equal(paths.length,1);assert(!paths[0][1].includes('L'));assert.equal((paths[0][1].match(/M/g)??[]).length,2);
});
test('static external potential enters without one half and live halo duplication is rejected',()=>{
 const s=state(),o={G:.13,epsilon:.1},d=validationSnapshot(s,{...o,externalPotential:(x,y,z)=>.5*(x*x+y*y+z*z)}),self=directEnergy(s,o);
 assert.equal(d.externalPotential,32.5);assert(Math.abs(d.energy-(self.energy+32.5))<1e-14);
 s.components[0]=2;assert.throws(()=>validationSnapshot(s,{...o,externalPotential:()=>-1}),/coexistir/);
});
