import test from 'node:test';import assert from 'node:assert/strict';
import {liveChartData} from '../src/live-diagnostics.js';
import {KM_S_TO_KPC_MYR} from '../src/physics/constants.js';
import {LaboratoryHistory} from '../src/physics/laboratory.js';

const sample=(t,energy=-8,speed=200)=>({timeMyr:t,conservation:{energy,kinetic:2,potential:energy-2,energyApproximate:false},diskFrame:{available:true,instant:{h50:.2+t*.01}},components:[{id:1,profiles:{velocity:[{lower:0,upper:1,mass:4,count:3,mean:[0,speed*KM_S_TO_KPC_MYR,0]},{lower:1,upper:2,mass:0,count:0,mean:null},{lower:2,upper:4,mass:1,count:1,mean:[0,100*KM_S_TO_KPC_MYR,0]}]}}]});
test('live rotation converts measured azimuthal means without filling empty rings or changing input states',()=>{
 const records=[sample(0),sample(7,-7.9,180)],before=structuredClone(records),d=liveChartData(records);
 assert.deepEqual(d.initialRotation,[[.5,200],[1.5,null],[3,100]]);assert.deepEqual(d.currentRotation,[[.5,180],[1.5,null],[3,100]]);assert.equal(d.timeMyr,7);assert.equal(d.rotationBins[1].count,0);assert.deepEqual(records,before);
 const noHalo=liveChartData(records,{withHalo:false});assert.deepEqual(noHalo.currentRotation,d.currentRotation);assert(noHalo.circularReference.every((p,i)=>p[1]<d.circularReference[i][1]));
});
test('live thickness and energy retain actual epochs, signed drift and a fresh baseline after reset',()=>{
 const history=new LaboratoryHistory();history.add(sample(0));history.add(sample(7,-7.9));let d=liveChartData(history.samples);assert.deepEqual(d.height,[[0,.2],[7,.27]]);assert.equal(d.energy[0][1],0);assert(Math.abs(d.energy[1][1]-1.25)<1e-12);
 history.reset();history.add(sample(0,-4));d=liveChartData(history.samples);assert.deepEqual(d.energy,[[0,0]]);assert.deepEqual(liveChartData([]).height,[]);
 const missing=sample(2);missing.diskFrame.available=false;assert.deepEqual(liveChartData([missing]).height,[[2,null]]);
});
