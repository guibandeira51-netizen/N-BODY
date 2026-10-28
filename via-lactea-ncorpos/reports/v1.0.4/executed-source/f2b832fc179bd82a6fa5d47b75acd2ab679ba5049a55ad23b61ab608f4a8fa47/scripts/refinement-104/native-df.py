"""200-Myr independent orbit audit of f(J) for all four populations."""
from pathlib import Path
import sys,json,hashlib,time
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.4';OLD=ROOT/'reports/v1.0.2/corrected';sys.path.insert(0,str(ROOT/'scripts/equilibrium'));from generate_agama import build
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();cfg=json.loads((ROOT/'reports/v1.0.0/agama-calibrated/preparation.json').read_text())['config'];rows=json.loads((BASE/'initial-manifest.json').read_text());out=BASE/'native-df';out.mkdir(exist_ok=True)
with agama.setNumThreads(4):
 _,dfs,_,_,_,conv=build(cfg,ROOT/'reports/v1.0.0/agama-calibrated',True);pot=agama.Potential(str(OLD/'potential-final.ini'));af=agama.ActionFinder(pot)
 for seed in[2026,2027,2028]:
  row=next(r for r in rows if r['family']=='D'and r['baryonSeed']==seed);source=BASE/row['file'];d=json.loads(source.read_text());tags=np.array(d['subpopulations']);ids=np.concatenate([np.flatnonzero(tags==pop)[::2][np.linspace(0,len(np.flatnonzero(tags==pop)[::2])-1,128,dtype=int)]for pop in range(4)]);p=np.array(d['positions'],dtype=np.float32).astype(float).reshape(-1,3)[ids];v=np.array(d['velocities'],dtype=np.float32).astype(float).reshape(-1,3)[ids];xv=np.c_[p,v/conv];start=time.perf_counter();orbits=agama.orbit(potential=pot,ic=xv,time=200*conv,trajsize=41,accuracy=1e-10,dtype=float,separateTime=False);states=[];checks=[];initialF=None;E0=None
  for k,t in enumerate(np.linspace(0,200,41)):
   q=np.array([o[1][k]for o in orbits]);actions=af(q);values=np.concatenate([np.asarray(dfs[pop](actions[pop*128:(pop+1)*128]))for pop in range(4)]);energy=.5*np.sum(q[:,3:]**2,axis=1)+pot.potential(q[:,:3]);initialF=values.copy()if initialF is None else initialF;E0=energy.copy()if E0 is None else E0
   for pop in range(4):
    sel=slice(pop*128,(pop+1)*128);a=initialF[sel];b=values[sel];ok=(a>0)&(b>0)&np.isfinite(a)&np.isfinite(b);change=np.abs(np.log(b[ok]/a[ok]));checks.append({'population':pop,'timeMyr':float(t),'independentOrbits':128,'invalid':int(np.sum(~ok)),'absLogFChangeQ50_90_99_Max':np.quantile(change,[.5,.9,.99,1]).tolist(),'maxRelativeSpecificEnergyError':float(np.max(np.abs((energy[sel]-E0[sel])/E0[sel])))})
   states.append({'timeMyr':float(t),'positions':q[:,:3].ravel().tolist(),'velocities':(q[:,3:]*conv).ravel().tolist()})
  result={'schema':'native-df-stationarity-104','seed':seed,'source':source.relative_to(ROOT).as_posix(),'sourceSHA256':sha(source),'scriptSHA256':sha(Path(__file__)),'potentialSHA256':sha(OLD/'potential-final.ini'),'algorithm':'AGAMA DOP853 Float64 accuracy1e-10; fixed full Plummer mean; no self gravity','particleIDs':ids.tolist(),'subpopulations':tags[ids].tolist(),'checks':checks,'states':states,'seconds':time.perf_counter()-start,'qualification':'128 deterministic original independent antipodal representatives per physical population, stratified in source array index; no resampling or changes of velocities. Variation of f of approximate actions along exact fixed-field trajectories diagnoses preparation/action approximation, not finite-N encounters. This subset does not replace the full same-baryon continuous controls.'};dest=out/f's{seed}.json'
  if dest.exists():raise RuntimeError('Refuse overwrite')
  dest.write_text(json.dumps(result,allow_nan=False)+'\n',encoding='utf8');print('NATIVE DF200',seed,result['seconds'],flush=True)
