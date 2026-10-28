import test from 'node:test';import assert from 'node:assert/strict';
import {liveChartData} from '../src/live-diagnostics.js';
import {LaboratoryHistory} from '../src/physics/laboratory.js';

const sample=(t,energy=-8)=>({timeMyr:t,conservation:{energy,kinetic:2,potential:energy-2,energyApproximate:false},diskFrame:{available:true,instant:{h50:.2+t*.01}}});
test('live chart projection uses the latest measured component field without deriving circular speeds from velocities',()=>{
 const records=[sample(0),sample(7,-7.9)];records[1].rotationField={timeMyr:7,rows:[{R_kpc:2,vc_km_s:{disk:80,bulge:60,halo:100,diskBulge:100,total:Math.sqrt(20000)}}]};const before=structuredClone(records),d=liveChartData(records);
 assert.deepEqual(d.rotationField,records[1].rotationField);assert.equal(d.timeMyr,7);assert.deepEqual(records,before);assert.equal(liveChartData([sample(0)]).rotationField,null);
});
test('live thickness and energy retain actual epochs, signed drift and a fresh baseline after reset',()=>{
 const history=new LaboratoryHistory();history.add(sample(0));history.add(sample(7,-7.9));let d=liveChartData(history.samples);assert.deepEqual(d.height,[[0,.2],[7,.27]]);assert.equal(d.energy[0][1],0);assert(Math.abs(d.energy[1][1]-1.25)<1e-12);
 history.reset();history.add(sample(0,-4));d=liveChartData(history.samples);assert.deepEqual(d.energy,[[0,0]]);assert.deepEqual(liveChartData([]).height,[]);
 const missing=sample(2);missing.diskFrame.available=false;assert.deepEqual(liveChartData([missing]).height,[[2,null]]);
});
