"""Only change selected population sampling, copying paired controls byte-for-value.
Reuses the converged v1.0.2 Plummer mean, the same fixed action DFs and masses.
No recentering, velocity rescaling, new DF fit or physical parameter adjustment.
"""
from pathlib import Path
from types import SimpleNamespace
import argparse,sys,json,hashlib,copy,time
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.3';OLD=ROOT/'reports/v1.0.2/corrected'
sys.path.insert(0,str(ROOT/'scripts/equilibrium'))
from generate_agama import build,plain
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,data):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,allow_nan=False,indent=2)+'\n',encoding='utf8')
def phase_digest(d,ids):
 h=hashlib.sha256()
 for key in ['positions','velocities','masses','components','subpopulations']:
  a=np.asarray(d[key]);a=a.reshape(-1,3)[ids].ravel()if key in ['positions','velocities']else a[ids]
  h.update(np.asarray(a,dtype='<f8'if key in ['positions','velocities','masses']else '<i4').tobytes())
 return h.hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--stage',choices=['halo','baryons'],default='halo');args=ap.parse_args();folder=BASE/'initial'/args.stage;folder.mkdir(parents=True,exist_ok=True)
 original=ROOT/'reports/v1.0.0/agama-calibrated';cfg=json.loads((original/'preparation.json').read_text())['config'];manifest=json.loads((OLD/'snapshots.json').read_text());audit=json.loads((OLD/'preparation.json').read_text());rows=[];start=time.perf_counter()
 with agama.setNumThreads(4):
  _,dfs,targets,_,_,conversion=build(cfg,original,True);pot=agama.Potential(str(OLD/'potential-final.ini'));af=agama.ActionFinder(pot);M=audit['dfMassesMsun']
  def draw(pop,n,seed):
   sub_seed=seed+pop*100003;agama.setRandomSeed(sub_seed);np.random.seed(sub_seed%(2**32));pool=max(4096,n//2)
   xv,mc_mass=agama.GalaxyModel(pot,dfs[pop],af).sample(pool);xv=xv[np.random.permutation(pool)[:n//2]];f=np.asarray(dfs[pop](af(xv)));bound=.5*np.sum(xv[:,3:]**2,axis=1)+pot.potential(xv[:,:3])
   if not np.isfinite(xv).all()or not np.isfinite(f).all()or np.any(f<0)or np.any(bound>=0):raise RuntimeError('admissibility failed')
   full=np.empty((n,6));full[::2]=xv;full[1::2]=-xv;full[:,3:]*=conversion
   return full,{'population':pop,'seed':sub_seed,'independentPairs':n//2,'samplePool':pool,'negativeDF':int(np.sum(f<0)),'unbound':int(np.sum(bound>=0)),'massMsun':M[pop],'particleMassMsun':M[pop]/n,'monteCarloMassMsun':float(np.sum(mc_mass))}
  plans=[(2026,h,nh,None)for nh in [4000,8000,20000,40000]for h in [2026,2027,2028]]if args.stage=='halo'else[(s,s,0,pop)for pop in [None,0,1,2]for s in [2026,2027,2028]]
  for seed,hseed,nh,pop in plans:
   source=next(r for r in manifest if r['n']==10000 and r['seed']==seed);original_data=json.loads((OLD/source['file']).read_text());d=copy.deepcopy(original_data);tags=np.array(d['subpopulations']);bar=np.where(tags!=3)[0];fixed_digest=phase_digest(d,bar if args.stage=='halo'else np.where(tags!=3 if pop is None else((tags!=3)&(tags!=pop)))[0]);checks=[]
   if args.stage=='halo':
    ident=f'H-nh{nh}-b2026-h{hseed}';xv,check=draw(3,nh,hseed);checks.append(check);ids=bar;new_pop=3
   else:
    ident=f'B-{("base"if pop is None else["bulge","thin","thick"][pop]+"2")}-s{seed}';ids=bar if pop is None else np.where((tags!=3)&(tags!=pop))[0];new_pop=pop
    if pop is not None:xv,check=draw(pop,int(np.sum(tags==pop))*2,seed);checks.append(check)
   # Preserve original order for all unchanged populations; whole-population
   # blocks then sorted by their physical tag. Canonical hashes ignore ordering.
   blocks=[]
   for component in range(4 if args.stage=='halo'else 3):
    indices=np.where(tags==component)[0]
    if component==new_pop:
     n=len(xv);blocks.append((xv[:,:3],xv[:,3:],np.full(n,M[component]/n/1e10),np.full(n,0 if component==0 else 2 if component==3 else 1),np.full(n,component)))
    else:blocks.append((np.asarray(d['positions']).reshape(-1,3)[indices],np.asarray(d['velocities']).reshape(-1,3)[indices],np.asarray(d['masses'])[indices],np.asarray(d['components'])[indices],tags[indices]))
   for key,k in [('positions',0),('velocities',1),('masses',2),('components',3),('subpopulations',4)]:d[key]=np.concatenate([b[k]for b in blocks]).ravel().tolist()
   d['n']=len(d['masses']);d['meta']['realizationId']='v103-'+ident;d['meta']['version103']={'stage':args.stage,'baryonSeed':seed,'haloSeed':hseed if nh else None,'fixedPopulationSHA256':fixed_digest,'parentSource':'reports/v1.0.2/corrected/'+source['file'],'parentSHA256':source['sha256'],'generatorSHA256':sha(Path(__file__)),'potentialSHA256':sha(OLD/'potential-final.ini'),'samplingChecks':checks,'qualification':'experimental; exact copied unvaried population values; no equilibrium certification'};d['meta']['haloSeed']=hseed if nh else None;d['meta']['withHalo']=bool(nh);d['meta']['haloMode']='live'if nh else 'fixed-plummer-mean';d['meta']['subpopulationCounts']=[d['subpopulations'].count(i)for i in range(4)];d['meta']['counts']=[d['components'].count(i)for i in range(3)]
   if not nh:d['schema']='nbody-baryons-external-v103';d['meta']['externalHaloMassMsun']=M[3]
   newtags=np.asarray(d['subpopulations']);unchanged=np.where(newtags!=3 if args.stage=='halo'or pop is None else((newtags!=3)&(newtags!=pop)))[0]
   if phase_digest(d,unchanged)!=fixed_digest:raise RuntimeError('paired population changed')
   path=folder/(ident+'.json');save(path,d);row={'id':ident,'file':path.relative_to(BASE).as_posix(),'sha256':sha(path),'n':d['n'],'baryonSeed':seed,'haloSeed':hseed if nh else None,'nh':nh,'counts':d['meta']['subpopulationCounts'],'fixedPopulationSHA256':fixed_digest,'haloParticleMassMsun':M[3]/nh if nh else None,'haloToThinParticleMass':(M[3]/nh)/(M[1]/3546)if nh else None,'stage':args.stage,'refinedPopulation':pop,'samplingChecks':checks};rows.append(row);save(BASE/(args.stage+'-initial-manifest.json'),rows);print('PREPARED',ident,'N',d['n'],flush=True)
 save(BASE/(args.stage+'-preparation.json'),{'rows':len(rows),'wallSeconds':time.perf_counter()-start,'DFMassesMsun':M,'physicalConfig':cfg,'potentialSHA256':sha(OLD/'potential-final.ini'),'generatorSHA256':sha(Path(__file__)),'agama':agama.__version__,'python':sys.version,'numpy':np.__version__,'qualification':'Same v1.0.2 fixed DFs/Plummer potential; copied paired populations; antipodal sampling.'})
if __name__=='__main__':main()
