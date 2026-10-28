import{readFile,writeFile}from'node:fs/promises';import{resolve}from'node:path';import{createHash}from'node:crypto';
import{plotSVG}from'../src/laboratory-panel.js';
const root=resolve(import.meta.dirname,'..'),folder=resolve(root,'reports/halo-geometry-integrated-2026-10-22');
const report=JSON.parse(await readFile(resolve(folder,'comparison-4096.json'),'utf8'));
if(!report.completed1200||!report.matchingInitialBaryons||!report.geometryProbes?.passed)throw Error('Ensaio final incompleto; não criar figuras de validação.');
for(const r of report.runs)if(r.rows.at(-1).timeMyr<1200||!r.convergence200.observed)throw Error('Horizonte ou convergência de 200 Myr não demonstrados.');
const metadata={computedUTC:report.computedUTC,config:report.config,model:'live Plummer particles versus static finite material NFW weak-field source',qualification:report.qualification};
for(const [name,title,key,yLabel]of[['h50','Espessura do disco · representações do halo','h50_kpc','h50 [kpc]'],['energy','Energia direta Float64 · desvios amostrados','relativeEnergy','ΔE / |E₀| [%]']]){
 const lines=report.runs.map(r=>({label:r.mode==='geometry'?'Halo NFW contínuo':'Halo NFW por partículas',points:r.rows.map(x=>[x.timeMyr,key==='relativeEnergy'?x.relativeEnergy.percent:x[key]])}));
 const svg=plotSVG(lines,{title,yLabel}).replace('</svg>',`<metadata>${JSON.stringify(metadata).replaceAll('&','&amp;').replaceAll('<','&lt;')}</metadata></svg>`);await writeFile(resolve(folder,name+'.svg'),svg);
}
const rotation=[];for(const r of report.runs)for(const snapshot of[r.rows[0],r.rows.find(x=>x.timeMyr>=200),r.rows.at(-1)])for(const row of snapshot.rotation.rows)rotation.push({mode:r.mode,time_Myr:snapshot.timeMyr,R_kpc:row.R_kpc,...row.vc_km_s});
const keys=Object.keys(rotation[0]);await writeFile(resolve(folder,'rotation-initial-200-1200.csv'),keys.join(',')+'\n'+rotation.map(r=>keys.map(k=>r[k]??'').join(',')).join('\n'));
const lines=report.runs.flatMap(r=>[r.rows[0],r.rows.at(-1)].map(s=>({label:(r.mode==='geometry'?'Contínuo':'Partículas')+' · '+s.timeMyr.toFixed(0)+' Myr',points:s.rotation.rows.map(row=>[row.R_kpc,row.vc_km_s.total])})));
await writeFile(resolve(folder,'rotation-initial-final.svg'),plotSVG(lines,{title:'Campo circular inicial e evoluído · modelos do halo',xLabel:'R [kpc]',yLabel:'v circular [km/s]'}));
const hashes={};for(const f of['src/physics/halo-geometry.js','src/compute/gpu-halo-geometry.js','src/compute/halo-geometry-probes.js','src/compute/halo-representation-validation-worker.js','src/physics/live-initial.js','src/physics/live-energy.js','src/physics/gpu-energy.js'])hashes[f]=createHash('sha256').update(await readFile(resolve(root,f))).digest('hex');
const summary={schema:report.schema,computedUTC:report.computedUTC,matchingInitialBaryons:report.matchingInitialBaryons,probeMaxRelativeError:report.geometryProbes.maxRelative,gpuComputeSpeedup:report.gpuComputeSpeedup,executedCoreSourceHashes:hashes,
 runs:report.runs.map(r=>({mode:r.mode,n:r.n,counts:r.counts,h50_initial:r.rows[0].h50_kpc,h50_200:r.rows.find(x=>x.timeMyr>=200).h50_kpc,h50_1200:r.rows.at(-1).h50_kpc,h50_growth_percent:100*(r.rows.at(-1).h50_kpc/r.rows[0].h50_kpc-1),maxSampledDirectErrorPercent:100*Math.max(...r.rows.map(x=>x.relativeEnergy.absolute)),gpuComputeSeconds:r.computeMs/1000,diagnosticSeconds:r.diagnosticMs/1000,forceRmsRelative:r.forceAudit.rmsRelative,convergence200:r.convergence200,finalTimeMyr:r.rows.at(-1).timeMyr})),qualification:report.qualification};
await writeFile(resolve(folder,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
