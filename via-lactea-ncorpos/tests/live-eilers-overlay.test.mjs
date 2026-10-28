import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {EILERS_2019} from '../src/observations/eilers2019.js';
import {componentRotationPlot} from '../src/component-rotation-plot.js';
const metadata=svg=>JSON.parse(svg.match(/<metadata id="rotation-comparison-data">([\s\S]*?)<\/metadata>/)[1].replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'));
const field=time=>({timeMyr:time,azimuthSamples:32,rows:[{R_kpc:.5,vc_km_s:{disk:70,bulge:90,halo:40,diskBulge:114,total:121}},{R_kpc:30,vc_km_s:{disk:50,bulge:30,halo:150,diskBulge:58,total:161}}]});

test('live Eilers data preserve all 152 original R/v/statistical entries and exact CSV provenance',async()=>{
 const csv=await readFile(new URL('../'+EILERS_2019.sourceCsv,import.meta.url),'utf8'),lines=csv.trim().split(/\r?\n/);lines.shift();
 assert.equal(EILERS_2019.sourceCsvSha256,createHash('sha256').update(csv).digest('hex'));assert.equal(EILERS_2019.rows.length,38);
 assert.deepEqual(EILERS_2019.rows.map(r=>Object.values(r)),lines.map(line=>line.split(',').slice(0,4).map(Number)));
 assert.equal(EILERS_2019.rows[0].R_kpc,5.27);assert.equal(EILERS_2019.rows.at(-1).R_kpc,24.82);assert(Object.isFrozen(EILERS_2019.rows[0]));
});

test('live rotation overlay draws exactly 38 unconnected observational markers with asymmetric statistical bars',()=>{
 const s=field(7),before=structuredClone(s),svg=componentRotationPlot(s),d=metadata(svg);
 assert.equal((svg.match(/data-observation-point="eilers2019"/g)??[]).length,38);assert.equal((svg.match(/data-observation-error="statistical"/g)??[]).length,38);assert.equal((svg.match(/data-model-series=/g)??[]).length,5);
 assert(svg.includes('−28.58/+18.57 km/s'));assert(svg.includes('incertezas sistemáticas não incluídas'));assert.deepEqual(d.field,s);assert.deepEqual(s,before);assert.equal(d.modelFittedToObservations,false);assert.equal(d.observationInterpolation,false);
 const errorPath=svg.match(/data-radius-kpc="5.27"[^]*?data-observation-error="statistical" d="M([^ ]+) ([^V]+)V([^M]+)M/);
 const middle=252-160*226.83/250;
 assert(Math.abs((middle-Number(errorPath[2]))-160*1.9/250)<1e-12);assert(Math.abs((Number(errorPath[3])-middle)-160*1.91/250)<1e-12);
});

test('observations are available before integration and stay identical as the measured model epoch changes',()=>{
 const initial=metadata(componentRotationPlot(null)),a=metadata(componentRotationPlot(field(0))),b=metadata(componentRotationPlot(field(8)));
 assert.equal(initial.field,null);assert.deepEqual(a.observations,b.observations);assert.equal(a.field.timeMyr,0);assert.equal(b.field.timeMyr,8);
 assert(!componentRotationPlot(null).includes('data-model-point='));assert.equal(initial.observations.rows.length,38);
 const missing=field(8);missing.rows[1].vc_km_s.total=null;const svg=componentRotationPlot(missing);assert.equal((svg.match(/data-model-point="total"/g)??[]).length,1);assert(!svg.includes('NaN'));
});
