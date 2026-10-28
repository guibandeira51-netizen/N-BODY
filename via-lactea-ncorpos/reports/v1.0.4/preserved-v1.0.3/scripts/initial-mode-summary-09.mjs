import {readFile,writeFile} from 'node:fs/promises';
const report=new URL('../reports/v0.9.0/',import.meta.url),data=JSON.parse(await readFile(new URL('initial-modes.json',report),'utf8')),summary=[];
for(const n of data.sizes)for(const lo of [2,4,6,8,10,12,16])for(const m of [1,2,3,4]){
 const rows=data.runs.filter(r=>r.n===n).flatMap(r=>r.rings.filter(b=>b.lower===lo).map(b=>({count:b.count,...b.modes[m-1]}))),mean=f=>rows.reduce((s,r)=>s+f(r)/rows.length,0);
 summary.push({n,lower:lo,m,seeds:rows.length,meanCount:mean(r=>r.count),ensembleAmplitudeRMS:Math.sqrt(mean(r=>r.amplitude**2)),pairReferenceRMS:Math.sqrt(mean(r=>r.nullRms**2)),independentReferenceRMS:Math.sqrt(mean(r=>1/r.count)),qualification:'32 realizations, no calibrated global morphology test; odd modes suppressed by antipodal pairs'});
}
await writeFile(new URL('initial-mode-summary.json',report),JSON.stringify({source:'initial-modes.json',summary},null,2));
console.log('Initial sampling summary saved.');
