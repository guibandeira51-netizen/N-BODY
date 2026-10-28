// Straight visual segments only: these endpoints are measured snapshots, never new samples.
export function directEnergyGuide(rows,{cadenceMyr=null,events=[],xDomain=[0,1]}={}){
 const ordered=rows.filter(r=>Number.isFinite(r.timeMyr)).slice().sort((a,b)=>a.timeMyr-b.timeMyr);
 const valid=ordered.filter(r=>Number.isFinite(r.value)),times=new Set(valid.map(r=>r.timeMyr));
 const intervals=valid.slice(1).map((r,i)=>r.timeMyr-valid[i].timeMyr).filter(d=>d>0).sort((a,b)=>a-b);
 const inferred=intervals.length?intervals[Math.floor((intervals.length-1)/2)]:null;
 const nominal=Number.isFinite(cadenceMyr)&&cadenceMyr>0?cadenceMyr:inferred;
 const missing=events.filter(e=>Number.isFinite(e.timeMyr)&&!times.has(e.timeMyr)&&['omitted','unavailable','failed','cancelled','error'].includes(e.type));
 const segments=[],gaps=[];let previous=null,invalidBetween=false;
 for(const row of ordered){
  if(!Number.isFinite(row.value)){invalidBetween=true;continue;}
  if(previous&&row.timeMyr>previous.timeMyr){
   const dt=row.timeMyr-previous.timeMyr,expected=row.samplingCadenceMyr??previous.samplingCadenceMyr??nominal;
   const failures=missing.filter(e=>e.timeMyr>previous.timeMyr&&e.timeMyr<=row.timeMyr);
   const reasons=[...(invalidBetween?['Snapshot intermediário sem valor energético válido.']:[]),...failures.map(e=>e.reason??'Referência ausente ou avaliação não concluída.'),...(expected>0&&dt>1.5*expected?['Intervalo maior que 1,5 vezes a cadência de referência.']:[])];
   if(reasons.length)gaps.push({fromTimeMyr:previous.timeMyr,toTimeMyr:row.timeMyr,intervalMyr:dt,expectedCadenceMyr:expected,reasons});
   else segments.push({fromTimeMyr:previous.timeMyr,toTimeMyr:row.timeMyr,fromValue:previous.value,toValue:row.value});
  }
  previous=row;invalidBetween=false;
 }
 if(previous&&xDomain[1]>previous.timeMyr){
  const end=xDomain[1],failures=missing.filter(e=>e.timeMyr>previous.timeMyr&&e.timeMyr<=end);
  if(failures.length||nominal>0&&end-previous.timeMyr>1.5*nominal)gaps.push({fromTimeMyr:previous.timeMyr,toTimeMyr:end,intervalMyr:end-previous.timeMyr,expectedCadenceMyr:nominal,trailing:true,reasons:failures.length?failures.map(e=>e.reason??'Referência não concluída.'):["Ainda sem referência direta neste intervalo."]});
 }
 return {segments,gaps,nominalCadenceMyr:nominal,cadenceSource:Number.isFinite(cadenceMyr)&&cadenceMyr>0?'recorded':inferred?'inferred lower median of measured intervals':'unavailable',gapFactor:1.5,visualGuideOnly:true,interpolatedMeasurements:false};
}
