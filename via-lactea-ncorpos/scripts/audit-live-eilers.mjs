import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {componentRotationPlot} from '../src/component-rotation-plot.js';
const root=resolve(import.meta.dirname,'..'),folder=resolve(root,'reports/halo-ui');
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const metadata=svg=>JSON.parse(decode(svg.match(/<metadata id="rotation-comparison-data">([\s\S]*?)<\/metadata>/)[1]));
const first=metadata(await readFile(resolve(folder,'live-eilers-browser-first.svg'),'utf8')),second=metadata(await readFile(resolve(folder,'live-eilers-browser-second.svg'),'utf8'));
assert(second.field.timeMyr>first.field.timeMyr);assert.notDeepEqual(first.field.rows,second.field.rows);assert.deepEqual(first.observations,second.observations);

// Preserve the actual plotted speeds of the user's existing execution. This
// reconstruction is only a figure comparison, never an imported particle state.
const original=JSON.parse(await readFile(resolve(folder,'live-eilers-original-chart.json'),'utf8'));
const names={'Disco':'disk','Bojo':'bulge','Halo':'halo','Disco + bojo':'diskBulge','Total':'total'},radii=new Map();
for(const m of original.svg.matchAll(/<title>(Disco \+ bojo|Disco|Bojo|Halo|Total): R=([^ ]+) kpc; vc=([^ ]+) km\/s<\/title>/g)){
 const R=Number(m[2]),v=Number(m[3]);assert(Number.isFinite(R)&&Number.isFinite(v));
 if(!radii.has(R))radii.set(R,{R_kpc:R,vc_km_s:{disk:null,bulge:null,halo:null,diskBulge:null,total:null}});radii.get(R).vc_km_s[names[m[1]]]=v;
}
assert.equal(radii.size,31);
const azimuthSamples=Number(original.svg.match(/· (\d+) azimutes por raio/)[1]);
const field={schema:'preserved-rendered-component-field-v1',timeMyr:Number(original.timeMyr),azimuthSamples,rows:[...radii.values()].sort((a,b)=>a.R_kpc-b.R_kpc),source:'Exact R/v pairs from existing simulation SVG tooltips; epoch from live-epoch DOM attribute. Not a new force evaluation or particle snapshot.'};
const svg=componentRotationPlot(field);assert.equal((svg.match(/data-observation-point="eilers2019"/g)??[]).length,38);
await writeFile(resolve(folder,'live-eilers-current-field.svg'),svg);await writeFile(resolve(folder,'live-eilers-current-field.json'),JSON.stringify(metadata(svg),null,2));
const manifest=JSON.parse(await readFile(resolve(root,'reports/halo-5gyr/manifest.json'),'utf8')),physical=[];
for(const [path,expected] of Object.entries(manifest.sources)){const sha256=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');assert.equal(sha256,expected);physical.push({path,sha256});}
const evidence={uiTest:{n:1000,backend:'CPU direct Float64',firstTimeMyr:first.field.timeMyr,secondTimeMyr:second.field.timeMyr,measuredFieldChanged:true,observationsUnchanged:true,observedPoints:38},preservedUserFigure:{timeMyr:field.timeMyr,radialProbes:field.rows.length,origin:field.source},historicalPhysicalSourcesUnchanged:true,physical};
await writeFile(resolve(folder,'live-eilers-validation.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence.uiTest));console.log(JSON.stringify(evidence.preservedUserFigure));
