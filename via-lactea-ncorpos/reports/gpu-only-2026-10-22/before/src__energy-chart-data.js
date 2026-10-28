export const ENERGY_UNITS='10¹⁰ M☉ kpc²/Myr²';

// Energy-only history: retain every measured epoch, without retaining particle arrays.
export class EnergyTimeline {
 constructor(){this.samples=[];}
 add(sample){const t=sample.timeMyr,last=this.samples.at(-1);if(!Number.isFinite(t)||t<0||last&&t<last.timeMyr)throw Error('Invalid energy epoch');const measured={timeMyr:t,conservation:structuredClone(sample.conservation)};if(last?.timeMyr===t)this.samples[this.samples.length-1]=measured;else this.samples.push(measured);}
 reset(){this.samples=[];}
}
// Presentation only. Never change measured energies or invent intervening states.
export function energyDenominator(d){
 if(!d||![d.energy,d.kinetic,d.potential].every(Number.isFinite))return {value:null,reason:'Energia de referência ausente ou incompleta.'};
 const scale=Math.abs(d.kinetic)+Math.abs(d.potential),value=Math.abs(d.energy);
 if(!(value>0)||value<=64*Number.EPSILON*scale)return {value:null,reason:'|E de referência| numericamente inadequado para normalização relativa.'};
 return {value,reason:null};
}
const relative=(d,initial)=>{
 const norm=energyDenominator(initial);if(norm.value===null||!Number.isFinite(d?.energy))return null;
 const signed=(d.energy-initial.energy)/norm.value;
 return {signed,absolute:Math.abs(signed),percent:100*signed,denominator:norm.value,normalization:'|E0|'};
};

export function sameEnergySnapshot(r){
 const a=r.fast,b=r.direct,t=r.timeMyr;
 if(!a||!b||![t,a.energy,b.energy,a.kinetic,b.kinetic,a.potential,b.potential,a.G,b.G,a.epsilonSquared,b.epsilonSquared].every(Number.isFinite))return false;
 if(a.time!==t||b.time!==t||a.kinetic!==b.kinetic||a.G!==b.G||a.epsilonSquared!==b.epsilonSquared)return false;
 if(!Number.isSafeInteger(a.n)||a.n!==b.n||!Number.isFinite(a.mass)||a.mass!==b.mass)return false;
 if(['forceAlgorithm','trajectoryPrecision','velocityEpoch','effectiveDt'].some(key=>a[key]!==b[key]))return false;
 if((a.externalPotential??0)!==(b.externalPotential??0))return false;
 if(r.snapshot&&(r.snapshot.time!==t||r.snapshot.n!==b.n))return false;
 const p=r.snapshot?.parameters;
 return !p||(p.G===b.G&&p.epsilonSquared===b.epsilonSquared);
}

const measured=(d,timeMyr)=>({timeMyr,n:d.n,mass:d.mass,effectiveDt:d.effectiveDt,treeTheta:d.theta,treeOrder:d.treeOrder,treeLeafBucket:d.treeLeafBucket,diagnosticCostMs:d.diagnosticCostMs,K:d.kinetic,U:d.potential,E:d.energy,G:d.G,epsilonSquared:d.epsilonSquared,forceAlgorithm:d.forceAlgorithm,trajectoryPrecision:d.trajectoryPrecision,evaluationPrecision:d.precision,velocityEpoch:d.velocityEpoch,externalPotential:d.externalPotential??0});
export function energyPanelsData(samples,references=[],context={}){
 const bh0=samples.find(s=>s.timeMyr===0&&s.conservation?.time===0)?.conservation??null;
 const dir0=references.find(r=>r.timeMyr===0&&r.direct?.time===0)?.direct??null;
 const pairs=references.filter(sameEnergySnapshot),pair0=pairs.find(r=>r.timeMyr===0),B0=pair0?pair0.fast.energy-pair0.direct.energy:null,common=energyDenominator(dir0);
 const estimated=samples.filter(s=>Number.isFinite(s.timeMyr)&&s.conservation).map(s=>({...measured(s.conservation,s.timeMyr),method:'Barnes–Hut monopolar · aproximação',relative:relative(s.conservation,bh0)}));
 const direct=references.filter(r=>Number.isFinite(r.timeMyr)&&r.direct?.time===r.timeMyr).map(r=>({...measured(r.direct,r.timeMyr),method:'Pares diretos Float64 · CPU compensada',relative:relative(r.direct,dir0),origin:r.origin??'recorded',n:r.snapshot?.n,configuration:r.snapshot?.configuration??context.configuration,backend:r.snapshot?.backend,requestedTimeMyr:r.requestedTimeMyr,samplingCadenceMyr:r.samplingCadenceMyr}));
 const comparison=pairs.map(r=>{
  const B=r.fast.energy-r.direct.energy,instant=energyDenominator(r.direct),deltaB=B0===null?null:B-B0;
  return {timeMyr:r.timeMyr,method:'Diferença de estimadores no mesmo snapshot',BH:measured(r.fast,r.timeMyr),direct:measured(r.direct,r.timeMyr),B,epsilonPercent:instant.value===null?null:100*B/instant.value,deltaB,etaPercent:deltaB===null||common.value===null?null:100*deltaB/common.value,
   bhChangeCommonPercent:!pair0||common.value===null?null:100*(r.fast.energy-pair0.fast.energy)/common.value,directChangeCommonPercent:!dir0||common.value===null?null:100*(r.direct.energy-dir0.energy)/common.value,
   n:r.snapshot?.n,configuration:r.snapshot?.configuration??context.configuration,backend:r.snapshot?.backend,instantNormalizationReason:instant.reason};
 });
 const times=[...estimated,...direct].map(r=>r.timeMyr).filter(Number.isFinite),maximum=times.length?Math.max(...times):0;
 const finiteErrors=rows=>rows.map(r=>r.relative?.percent).filter(Number.isFinite);
 const errorsBH=finiteErrors(estimated),errorsDir=finiteErrors(direct);
 return {schema:'energy-panels-v1',realizationId:context.realizationId??null,configuration:context.configuration??null,codeIdentity:context.codeIdentity?.sha256??context.codeIdentity??null,units:ENERGY_UNITS,relativeUnits:'percent',
  directSampling:{cadenceMyr:context.automatic?.cadenceMyr??context.directSampling?.cadenceMyr??null,events:[...(context.automatic?.events??context.directSampling?.events??[]),...(context.guideEvents??[])]},
  xDomain:[Math.min(0,...times),maximum>0?maximum:1],estimated,direct,comparison,
  bhInitial:bh0,directInitial:dir0,biasInitial:B0,normalization:{BH:energyDenominator(bh0),direct:common,comparison:'B = E_BH - E_dir; ΔB = B - B0; η = 100 ΔB / |E_dir(0)|. Native percentages with different denominators are not subtracted.'},
  summary:{bhMaxAbsolutePercent:errorsBH.length?Math.max(...errorsBH.map(Math.abs),100*(context.maxFastAbsolute??0)):null,bhLastPercent:estimated.at(-1)?.relative?.percent??null,directMaxAbsolutePercent:errorsDir.length?Math.max(...errorsDir.map(Math.abs)):null,directLastPercent:direct.at(-1)?.relative?.percent??null},
  rejectedComparisonTimes:references.filter(r=>!sameEnergySnapshot(r)).map(r=>r.timeMyr),noInterpolatedDirectPoints:true,fastHistory:context.fastHistory??'Every measured energy epoch in this realization; no temporal decimation. Archived inputs may already be decimated: see source.'};
}

export function numericFormat(value,sign=false){
 if(!Number.isFinite(value))return 'indisponível';if(Object.is(value,-0)||value===0)return '0';
 const a=Math.abs(value),s=sign&&value>0?'+':'';
 return s+(a<.0001||a>=1e6?value.toExponential(5).replace('.',','):value.toLocaleString('pt-BR',{maximumSignificantDigits:9,useGrouping:false}));
}
export function zoomDomain(values,{includeZero=true,absoluteEnergy=false}={}){
 const valid=values.filter(Number.isFinite);if(includeZero&&valid.length)valid.push(0);
 if(!valid.length)return {min:-1,max:1,minimal:false,empty:true};
 let min=Math.min(...valid),max=Math.max(...valid),span=max-min;
 const floor=Math.max(128*Number.MIN_VALUE,128*Number.EPSILON*(absoluteEnergy?Math.max(Math.abs(min),Math.abs(max)):100));
 const minimal=span<floor;
 if(minimal){const center=min/2+max/2;min=center-floor/2;max=center+floor/2;span=max-min;}
 const margin=span*.08;
 return {min:min-margin,max:max+margin,minimal,minimumDisplaySpan:floor,empty:false};
}

export function energyPanelsCSV(data){
 const header=['realization_id','time_Myr','method','K','U','E','relative_signed','relative_percent','relative_absolute','energy_units','G','epsilonSquared_kpc2','force','trajectory_precision','evaluation_precision','backend','n','configuration_json','B','epsilon_BH_percent','deltaB','eta_percent','BH_change_common_percent','direct_change_common_percent','velocity_epoch','effective_dt_Myr','tree_theta','tree_order','tree_leaf_bucket','diagnostic_cost_ms','total_mass_1e10_Msun'];
 const rows=[header];
 for(const r of [...data.estimated,...data.direct])rows.push([data.realizationId,r.timeMyr,r.method,r.K,r.U,r.E,r.relative?.signed,r.relative?.percent,r.relative?.absolute,data.units,r.G,r.epsilonSquared,r.forceAlgorithm,r.trajectoryPrecision,r.evaluationPrecision,r.backend??(r.trajectoryPrecision==='Float32'?'WebGPU':'CPU Worker'),r.n??data.configuration?.n,JSON.stringify(r.configuration??data.configuration),'','','','','','',r.velocityEpoch,r.effectiveDt,r.treeTheta,r.treeOrder,r.treeLeafBucket,r.diagnosticCostMs,r.mass]);
 for(const r of data.comparison)rows.push([data.realizationId,r.timeMyr,r.method,r.direct.K,r.direct.U,r.direct.E,'','','',data.units,r.direct.G,r.direct.epsilonSquared,r.direct.forceAlgorithm,r.direct.trajectoryPrecision,r.direct.evaluationPrecision,r.backend,r.n,JSON.stringify(r.configuration??data.configuration),r.B,r.epsilonPercent,r.deltaB,r.etaPercent,r.bhChangeCommonPercent,r.directChangeCommonPercent,r.direct.velocityEpoch,r.direct.effectiveDt,r.BH.treeTheta,r.BH.treeOrder,r.BH.treeLeafBucket,'',r.direct.mass]);
 return rows.map(row=>row.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n');
}
