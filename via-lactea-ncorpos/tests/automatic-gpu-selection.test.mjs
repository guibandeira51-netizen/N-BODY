import test from 'node:test';import assert from 'node:assert/strict';
import {preferMeasuredGPU} from '../src/compute/scheduling.js';
test('automatic selection retains a feasible GPU measured at requested N when CPU has no same-N measurement',()=>{
 assert.equal(preferMeasuredGPU(500),true);
 assert.equal(preferMeasuredGPU(500,null),true);
 assert.equal(preferMeasuredGPU(500,undefined),true);
 assert.equal(preferMeasuredGPU(500,11245.35),true);
});
test('actual faster CPU measurements and invalid or excessively slow GPU pilots still prevent automatic GPU selection',()=>{
 assert.equal(preferMeasuredGPU(500,100),false);
 for(const x of [0,-1,NaN,Infinity,2001])assert.equal(preferMeasuredGPU(x),false);
 assert.equal(preferMeasuredGPU(2000),true);
});
