import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {folder} from './baseline.mjs';
const read=name=>readFile(resolve(folder,name),'utf8').then(JSON.parse);
const [base,parallel,browser,gpu,native]=await Promise.all(['baseline.json','parallel.json','browser.json','gpu-browser.json','native.json'].map(read));
const csv=async(name,rows)=>{const keys=Object.keys(rows[0]);const cell=x=>`"${String(x??'').replaceAll('"','""')}"`;await writeFile(resolve(folder,name),[keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\n')+'\n');};
await csv('baseline-phases.csv',base.results.map(r=>({N:r.n,baseN:r.baseN,haloRefinement:r.haloRefinement,step_ms:r.medianStepMs,tree_ms:r.treeBuildMs,traverse_validation_ms:r.forceTraversalValidationMs,KDK_other_ms:r.leapfrogOtherMs,process_logical_core_equivalents:r.effectiveProcessCores,...r.diagnostics})));
await csv('parallel-scaling.csv',parallel.results.map(r=>({N:r.n,workers:r.workerCount,original_step_ms:r.originalStepMs,parallel_step_ms:r.prototypeStepMs,speedup:r.speedup,tree_ms:r.buildMs,publication_ms:r.publicationMs,dispatch_traverse_ms:r.dispatchTraverseMs,process_logical_core_equivalents:r.medianEffectiveProcessCores,startup_ms:r.startupMs,bitwise_equal_four_steps:r.bitwiseIdenticalAfterFourKDKSteps})));
await csv('browser-comparison.csv',browser.flatMap(r=>[{N:r.n,backend:'CPU original BH f64',workers:1,step_ms:r.serial.medianStepMs,readback_ms:'',speedup_vs_browser_serial:1},...r.parallel.map(p=>({N:r.n,backend:'CPU isolated prototype BH f64',workers:p.workers,step_ms:p.medianStepMs,readback_ms:'',speedup_vs_browser_serial:p.speedup}))]).concat(gpu.results.map(r=>({N:r.n,backend:r.backend,workers:'GPU',step_ms:r.medianStepMs,readback_ms:r.finalReadbackMs,speedup_vs_browser_serial:browser.find(b=>b.n===r.n)?.serial.medianStepMs/r.medianStepMs||''}))));
// Include GPU columns explicitly: all CSV rows share the same schema.
const forceRows=native.results.map(r=>({N:r.n,targets:r.bhError.targets,scope:r.bhError.scope,BH_relative_L2:r.bhError.relativeL2,native_relative_L2:r.nativeError.relativeL2,GPU_relative_L2:'',BH_max_target_relative:r.bhError.maximumTargetRelative,native_max_target_relative:r.nativeError.maximumTargetRelative,GPU_max_target_relative:'',native_initial_and_three_steps_wall_ms:r.nativeInitialAndThreeStepsWallMs,native_initial_force_wall_ms:r.nativeForceOnlyWallMs}));
for(const r of gpu.results)forceRows.push({N:r.n,targets:r.forceReference.targets,scope:r.forceReference.scope,BH_relative_L2:'',native_relative_L2:'',GPU_relative_L2:r.forceReference.relativeL2,BH_max_target_relative:'',native_max_target_relative:'',GPU_max_target_relative:r.forceReference.maximumTargetRelative,native_initial_and_three_steps_wall_ms:'',native_initial_force_wall_ms:''});
await csv('force-reference.csv',forceRows);
await csv('transfers-node.csv',parallel.transfers);
const number=x=>x.toLocaleString('pt-BR',{maximumFractionDigits:2});
const colors=['#376da3','#27917b','#da8732'];
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="570" viewBox="0 0 1200 570"><rect width="1200" height="570" fill="white"/><g font-family="Arial,sans-serif" fill="#172c40"><text x="40" y="42" font-size="26">Ryzen 7 5700X · Barnes–Hut Float64</text><text x="40" y="70" font-size="15">Mesmo estado inicial, dt = 0,1 Myr, ε = 0,1 kpc, θ = 0,5 · mediana de 3 passos após aquecimento</text>`;
for(const [index,n] of [80000,536000].entries()){
 const rows=parallel.results.filter(r=>r.n===n),p8=rows.find(r=>r.workerCount===8),p16=rows.find(r=>r.workerCount===16),values=[p8.originalStepMs,p8.prototypeStepMs,p16.prototypeStepMs],y=128+index*177,max=p8.originalStepMs;
 svg+=`<text x="40" y="${y}" font-size="20">N = ${number(n)}${n===536000?' · N₀ = 40.000, halo ×32':''}</text>`;
 values.forEach((v,k)=>{const yy=y+18+k*38,w=700*v/max;svg+=`<text x="40" y="${yy+19}" font-size="15">${['Original · 1 Worker','Protótipo · 8 Workers','Protótipo · 16 Workers'][k]}</text><rect x="245" y="${yy}" width="${w}" height="27" fill="${colors[k]}"/><text x="${955}" y="${yy+19}" font-size="15">${number(v)} ms${k?' · '+number(max/v)+'×':''}</text>`;});
}
svg+=`<text x="40" y="480" font-size="14">Escalas das barras independentes por N; compare os valores em ms para comparar resoluções.</text><text x="40" y="505" font-size="15">Igualdade bit a bit com o original após 4 passos completos em todos os tamanhos e pools testados.</text><text x="40" y="530" font-size="14">Protótipo isolado, sem diagnósticos/renderização. Tempos Node.js; não equivalem à taxa completa da interface.</text><text x="40" y="552" font-size="13">Dados: parallel-scaling.csv · auditoria local de 22/10/2026 · não certifica equilíbrio galáctico</text></g></svg>`;
await writeFile(resolve(folder,'cpu-scaling.svg'),svg);
const checks=[];for(const [file,expected]of Object.entries(base.files)){const bytes=await readFile(resolve(folder,'../..',file));checks.push({file,expected,current:createHash('sha256').update(bytes).digest('hex')});}
if(checks.some(r=>r.expected!==r.current))throw Error('Fonte do motor principal mudou desde o baseline.');
await writeFile(resolve(folder,'source-integrity.json'),JSON.stringify({createdUTC:new Date().toISOString(),allUnchanged:true,files:checks},null,2));
console.log('CSV, SVG e integridade dos 10 módulos originais concluídos.');
