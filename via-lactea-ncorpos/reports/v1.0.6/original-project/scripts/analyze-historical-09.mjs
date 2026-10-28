import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {diskAnalysis,spiralGeometry} from '../src/physics/disk-analysis.js';
const input=process.argv[2];if(!input)throw Error('Informe o JSON dos estados reproduzidos.');
const data=await readFile(input),states=JSON.parse(data),report={createdUTC:new Date().toISOString(),sourceSha256:createHash('sha256').update(data).digest('hex'),samples:[]};
for(const raw of states){const s={n:raw.n,time:raw.timeMyr,positions:Float64Array.from(raw.positions),velocities:Float64Array.from(raw.velocities),masses:Float64Array.from(raw.masses),components:Uint8Array.from(raw.components)};const analysis=diskAnalysis(s),apertureSensitivity=[10,20,30].map(aperture=>{const a=aperture===20?analysis:diskAnalysis(s,{fitAperture:aperture});return {apertureKpc:aperture,plane:a.plane,instant:a.instant};});report.samples.push({timeMyr:raw.timeMyr,disk:analysis,apertureSensitivity,geometry:[1,2,3,4].map(m=>spiralGeometry(analysis,m,{familyTests:36*states.length}))});console.log(JSON.stringify({timeMyr:raw.timeMyr,fixed:analysis.fixed.h50,instant:analysis.instant.h50,sigmaNormal:analysis.instant.sigmaNormal,robustTilt:analysis.plane.tiltDegrees,centerZ:analysis.plane.center[2]}));}
await writeFile(new URL('../reports/v0.9.0/historical-disk-analysis.json',import.meta.url),JSON.stringify(report));
