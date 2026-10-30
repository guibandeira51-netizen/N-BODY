import test from 'node:test';
import assert from 'node:assert/strict';
import {linearAxis,axisLabel,logTicks} from '../src/chart-axis.js';
test('display ticks stay distinct at tiny energy ranges and long physical times',()=>{
 for(const [min,max] of [[-5.5e-5,4e-6],[0,200.00000298023224],[0,35200],[.172,.455]]){
  const a=linearAxis(min,max),labels=a.ticks.map(x=>axisLabel(x,a.step));
  assert(a.min<=min&&a.max>=max);assert.equal(new Set(labels).size,labels.length);
  assert(labels.every(x=>!x.includes('000002980')));
 }
 assert.deepEqual(linearAxis(0,200.00000298023224).ticks,[0,50,100,150,200]);
 assert.equal(axisLabel(5e-5,1e-5),'5 × 10⁻⁵');
 assert.equal(axisLabel(200.00000298023224,50),'200');
 assert.deepEqual(logTicks(.5,500),[.5,1,2,5,10,20,50,100,200,500]);
});
