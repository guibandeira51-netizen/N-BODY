import test from 'node:test';
import assert from 'node:assert/strict';
import {directTargetField} from './direct-target-field.mjs';
import {directAccelerations, directPotentialEnergy} from '../../src/physics/forces.js';

const near = (a,b,t=1e-12) => assert.ok(Math.abs(a-b)<t, `${a} != ${b}`);
function state(positions,masses,components=masses.map((_,i)=>i%3)) {
  return {n:masses.length,positions:new Float64Array(positions),masses:new Float64Array(masses),components:new Uint8Array(components)};
}
test('individual Plummer potential uses other masses and excludes self interaction',()=>{
  const s=state([0,0,0,3,0,4],[2,7]), before=structuredClone(s);
  const rows=directTargetField(s,[0,1],{G:3,epsilonSquared:4,unsoftenedControl:true});
  near(rows[0].phi,-21/Math.sqrt(29)); near(rows[1].phi,-6/Math.sqrt(29));
  near(rows[0].az,21*4/29**1.5);near(rows[0].azUnsoftened,21*4/125);
  assert.deepEqual(s,before);
  const solo=directTargetField(state([1,2,3],[99]),[0],{G:3,epsilonSquared:4})[0];
  assert.equal(solo.phi,0);assert.equal(solo.az,0);
});
test('sum of individual potentials and accelerations matches independent pair implementation',()=>{
  const s=state([0,0,0,3,0,4,-2,1,.5,4,-2,1],[2,7,1,3]);
  const G=.04498502239584923,epsilonSquared=.009999999776482582;
  const rows=directTargetField(s,[0,1,2,3],{G,epsilonSquared});
  const opts={G,epsilon:Math.sqrt(epsilonSquared)}, acc=directAccelerations(s,opts,new Float64Array(12));
  near(.5*rows.reduce((u,r)=>u+s.masses[r.id]*r.phi,0),directPotentialEnergy(s,opts));
  for(const r of rows){near(r.ax,acc[3*r.id]);near(r.ay,acc[3*r.id+1]);near(r.az,acc[3*r.id+2]);near(r.phiByComponent.reduce((a,b)=>a+b,0),r.phi);}
});
test('diagnostic is invariant under coordinate translation and rejects singular controls',()=>{
  const s=state([0,0,0,3,0,4,-2,1,.5],[2,7,1]);
  const translated=structuredClone(s);translated.positions=translated.positions.map((p,i)=>p+[16,-8,4][i%3]);
  const opts={G:1,epsilonSquared:.01};
  assert.deepEqual(directTargetField(s,[0,1,2],opts),directTargetField(translated,[0,1,2],opts));
  assert.throws(()=>directTargetField(s,[4],opts),/Invalid target/);
  assert.throws(()=>directTargetField(s,[0],{G:1,epsilonSquared:-1}),/Invalid gravitational/);
  assert.throws(()=>directTargetField(state([0,0,0,0,0,0],[1,1]),[0],{G:1,epsilonSquared:0}),/Coincident/);
});
