import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spiralGeometry,patternSpeed} from '../src/physics/disk-analysis.js';
import {energyDrift,epicyclic} from '../src/physics/laboratory.js';
import {csv} from '../src/export/zip.js';
const root=new URL('../reports/v0.9.0/',import.meta.url),inputs=process.argv.slice(2);
if(!inputs.length)throw Error('Informe os JSON da campanha concluída.');
const campaigns=[];for(const path of inputs){const bytes=await readFile(path);campaigns.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),data:JSON.parse(bytes)});}
const runs=campaigns.flatMap((c,campaign)=>c.data.runs.map(r=>({...r,campaign,id:`${campaign}-${r.id}`})));
// Early campaign used pair-only P. The uniform disk masses permit reconstructing
// the independent-particle RMS exactly from count, without changing trajectories.
for(const run of runs)for(const s of run.samples)for(const b of s.disk.rings)for(const a of b.modes){a.storedConditionalP=a.approximateNullP;a.independentParticleRms=b.count?1/Math.sqrt(b.count):null;a.inferenceRms=b.count?Math.max(a.nullRms,a.independentParticleRms):null;a.approximateNullP=a.independentGroups>=30&&a.inferenceRms>32*Number.EPSILON?Math.exp(-((a.amplitude/a.inferenceRms)**2)):null;}
const pct=(a,b)=>b?100*(a-b)/b:null;
function pearson(pairs){pairs=pairs.filter(p=>p.every(Number.isFinite));if(pairs.length<3)return null;const mean=k=>pairs.reduce((s,p)=>s+p[k]/pairs.length,0),x=mean(0),y=mean(1);let xx=0,yy=0,xy=0;for(const p of pairs){xx+=(p[0]-x)**2;yy+=(p[1]-y)**2;xy+=(p[0]-x)*(p[1]-y);}return xx*yy?xy/Math.sqrt(xx*yy):null;}
const summary=[],series=[],rings=[],modes=[],geometry=[],phase=[],correlations=[];
for(const run of runs){const initial=run.samples[0],last=run.samples.at(-1),get=(s,k)=>s.disk.instant[k];
 const meta=run.initialMeta,ratio=meta.counts[2]?(meta.masses[2]/meta.counts[2])/(meta.masses[1]/meta.counts[1]):null;
 summary.push({id:run.id,...run.config,wallSeconds:run.wallMs/1000,haloParticleToDiskMassRatio:ratio,initialFixedH:initial.disk.fixed.h50,finalFixedH:last.disk.fixed.h50,initialInstantH:get(initial,'h50'),finalInstantH:get(last,'h50'),deltaFixedHPct:pct(last.disk.fixed.h50,initial.disk.fixed.h50),deltaInstantHPct:pct(get(last,'h50'),get(initial,'h50')),initialSigmaNormal:get(initial,'sigmaNormal'),finalSigmaNormal:get(last,'sigmaNormal'),deltaSigmaNormalPct:pct(get(last,'sigmaNormal'),get(initial,'sigmaNormal')),deltaBulgeR50Pct:pct(last.components[0].r50,initial.components[0].r50),deltaEnergy:energyDrift(last.conservation,initial.conservation),robustTilt:last.disk.plane.tiltDegrees,angularMomentumTilt:last.diskTiltDegrees,centerZ:last.disk.plane.center[2]});
 for(let j=0;j<run.samples.length;j++){const s=run.samples[j],a=s.disk;
  series.push([run.id,s.timeMyr,run.config.label,run.config.n,run.config.haloCount??0,run.config.haloSeed??null,a.fixed.h50,a.instant.h50,a.instant.sigmaNormal,a.plane.tiltDegrees,s.diskTiltDegrees,...a.plane.center,...a.centerOfMass,s.conservation.kinetic,s.conservation.potential,s.conservation.energy,energyDrift(s.conservation,initial.conservation),s.components[0].r50,s.components[1].R50]);
  for(const [i,b] of a.rings.entries()){
   rings.push([run.id,s.timeMyr,b.lower,b.upper,b.count,b.mass,b.globalPlane.h50,b.localPlane?.h50,b.sigmaR,b.sigmaPhi,b.globalPlane.sigmaNormal,b.surfaceDensity,b.conditionalQ?.kappa,b.conditionalQ?.Q,b.meanRadialVelocity,b.meanAzimuthalVelocity,b.globalPlane.medianSignedHeight,b.localPlane?.tiltFromGlobalDegrees]);
   for(const m of b.modes){modes.push([run.id,s.timeMyr,b.lower,b.upper,b.count,m.m,m.re,m.im,m.amplitude,m.phaseRadians,m.nullRms,m.independentParticleRms,m.inferenceRms,m.approximateNullP,m.storedConditionalP]);if(j){const previous=run.samples[j-1],p=patternSpeed(previous.disk.rings[i],b,s.timeMyr-previous.timeMyr,m.m,{maxReferenceOmega:epicyclic(Math.max(2,b.lower)).vc/Math.max(2,b.lower)});phase.push({id:run.id,timeMyr:s.timeMyr,lower:b.lower,upper:b.upper,m:m.m,...p});}}
  }
  geometry.push({id:run.id,timeMyr:s.timeMyr,modes:[1,2,3,4].map(m=>spiralGeometry(a,m))});
 }
 for(let i=0;i<initial.disk.rings.length;i++){const b0=initial.disk.rings[i],samples=run.samples.map(s=>s.disk.rings[i]);correlations.push({id:run.id,lower:b0.lower,upper:b0.upper,samples:samples.length,pearsonA2SigmaR:pearson(samples.map(b=>[b.modes[1].amplitude,b.sigmaR])),pearsonA2Q:pearson(samples.map(b=>[b.modes[1].amplitude,b.conditionalQ?.Q])),pearsonA2Thickness:pearson(samples.map(b=>[b.modes[1].amplitude,b.globalPlane.h50])),qualification:'descriptive only: autocorrelated time series, shared trends, no causal estimate or significance P'});}
}
const result={schema:'halo-analysis-09-v1',createdUTC:new Date().toISOString(),completed:campaigns.every(c=>c.data.status==='completed'),inputs:campaigns.map(({data,...m})=>({...m,status:data.status,completedRuns:data.runs.length,plannedRuns:data.plannedRuns})),runCount:runs.length,noiseCorrection:'P recomputed with max(pair-label RMS,1/sqrt(ring count)); uniform disk masses verified by generator/test. Raw campaign P retained only for provenance.',summary,correlations,differentialRotation:[2,4,8,12,20].map(radius=>({radius,...epicyclic(radius)})),interpretation:'Experiments do not certify global equilibrium or isolate a causal heating fraction. C removes halo response as well as particle noise. Correlations and conditional phase fits remain exploratory under repeated epochs.'};
await writeFile(new URL('analysis.json',root),JSON.stringify(result,null,2));
const summaryKeys=[...new Set(summary.flatMap(s=>Object.keys(s)))];
await writeFile(new URL('model-summary.csv',root),csv(summaryKeys,summary.map(s=>summaryKeys.map(k=>s[k]))));
await writeFile(new URL('time-series.csv',root),csv(['run_id','time_Myr','model','N','N_halo','halo_seed','h50_fixed_kpc','h50_instant_kpc','sigmaNormal_kpc_Myr','geometricTilt_deg','angularMomentumTilt_deg','robustCenterX_kpc','robustCenterY_kpc','robustCenterZ_kpc','diskCOMx_kpc','diskCOMy_kpc','diskCOMz_kpc','K_internal','U_internal','E_internal','deltaE_signed','bulge_r50_kpc','disk_R50_kpc'],series));
await writeFile(new URL('rings.csv',root),csv(['run_id','time_Myr','R_lower_kpc','R_upper_kpc','count','mass_1e10Msun','h50_global_kpc','h50_local_kpc','sigmaR_kpc_Myr','sigmaPhi_kpc_Myr','sigmaNormal_kpc_Myr','Sigma_1e10Msun_kpc2','kappa_Myr-1','Q_conditional','mean_vR_kpc_Myr','mean_vPhi_kpc_Myr','medianHeight_kpc','localTilt_deg'],rings));
await writeFile(new URL('modes.csv',root),csv(['run_id','time_Myr','R_lower_kpc','R_upper_kpc','count','m','re','im','amplitude','phase_rad','pairNullRms','independentRms','conservativeRms','conditional_p','original_stored_p'],modes));
await writeFile(new URL('phase-fits.json',root),JSON.stringify({geometry,phase,qualification:'conditional exploratory estimates, not proof of persistent spiral; changing fitted basis, bars, aliasing, covariance and multiple patterns can invalidate fits'}));
console.log(JSON.stringify({completed:result.completed,runCount:runs.length,summary:summary.map(s=>({id:s.id,label:s.label,N:s.n,T:s.duration,seed:s.haloSeed,dh:s.deltaInstantHPct,ds:s.deltaSigmaNormalPct}))}));
