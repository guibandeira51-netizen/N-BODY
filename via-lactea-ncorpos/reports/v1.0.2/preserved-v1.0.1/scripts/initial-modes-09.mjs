import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createGalaxy} from '../src/physics/initial-legacy.js';
import {diskAnalysis} from '../src/physics/disk-analysis.js';
const report={schema:'initial-mode-null-09-v1',startedUTC:new Date().toISOString(),seeds:Array.from({length:32},(_,i)=>2026+i),sizes:[10000,50000],sourceHashes:{},runs:[]};
for(const p of ['src/physics/initial-legacy.js','src/physics/disk-analysis.js'])report.sourceHashes[p]=createHash('sha256').update(await readFile(new URL('../'+p,import.meta.url))).digest('hex');
for(const n of report.sizes){for(const seed of report.seeds){const s=createGalaxy({n,seed}),a=diskAnalysis(s);report.runs.push({n,seed,plane:a.plane.normal,rings:a.rings.map(r=>({lower:r.lower,upper:r.upper,count:r.count,modes:r.modes.map(({m,amplitude,nullRms,approximateNullP})=>({m,amplitude,nullRms,approximateNullP}))}))});}console.log('Initial ensemble N='+n+' complete.');}
report.completedUTC=new Date().toISOString();await writeFile(new URL('../reports/v0.9.0/initial-modes.json',import.meta.url),JSON.stringify(report));
