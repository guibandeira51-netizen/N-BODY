import test from 'node:test';
import assert from 'node:assert/strict';
import {ParallelBH,sharedState} from '../scripts/cpu-performance/parallel-pool.mjs';
import {barnesHutAccelerations} from '../src/physics/forces.js';
import {Leapfrog} from '../src/physics/integrator.js';

test('shared-memory prototype preserves original BH force and KDK bitwise, with default G, unequal/zero masses and coincident particles',async()=>{
 const n=73,state={n,time:0,positions:Float64Array.from({length:3*n},(_,k)=>k<6?0:Math.sin(k)*9),velocities:Float64Array.from({length:3*n},(_,k)=>Math.cos(k)*.01),masses:Float64Array.from({length:n},(_,k)=>k%11===0?0:.01+k*.001),components:Uint8Array.from({length:n},(_,k)=>k%3),accelerations:new Float64Array(3*n)};
 for(const theta of [0,.5]){
  const options={epsilon:.1,theta,dt:.1},serial=structuredClone(state),parallel=sharedState(state),pool=new ParallelBH(4);
  try{await pool.ready();barnesHutAccelerations(serial,options);await pool.force(parallel,options);assert.deepEqual(parallel.accelerations,serial.accelerations);
   const engine=new Leapfrog(serial,{...options,algorithm:'barnes-hut'});engine.initialize();for(let i=0;i<10;i++){engine.step();await pool.step(parallel,options);assert.equal(parallel.time,serial.time);}assert.deepEqual(parallel.positions,serial.positions);assert.deepEqual(parallel.velocities,serial.velocities);assert.deepEqual(parallel.masses,serial.masses);
  }finally{await pool.close();}
 }
});
