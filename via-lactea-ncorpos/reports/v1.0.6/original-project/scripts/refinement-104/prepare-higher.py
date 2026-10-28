"""Additional sampling only after direct-method cost pilot is registered."""
from pathlib import Path
import sys,json,hashlib,copy,argparse
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.4';OLD=ROOT/'reports/v1.0.2/corrected'
sys.path.insert(0,str(ROOT/'scripts/equilibrium'));from generate_agama import build
ap=argparse.ArgumentParser();ap.add_argument('--seeds',nargs='+',type=int,default=[2026]);ap.add_argument('--families',nargs='+',default=['E','G']);args=ap.parse_args()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((BASE/'initial-manifest.json').read_text());rows=json.loads((BASE/'higher-initial-manifest.json').read_text())if(BASE/'higher-initial-manifest.json').exists()else[]
cfg=json.loads((ROOT/'reports/v1.0.0/agama-calibrated/preparation.json').read_text())['config'];audit=json.loads((OLD/'preparation.json').read_text());M=audit['dfMassesMsun']
with agama.setNumThreads(4):
 _,dfs,_,_,_,conversion=build(cfg,ROOT/'reports/v1.0.0/agama-calibrated',True);pot=agama.Potential(str(OLD/'potential-final.ini'));af=agama.ActionFinder(pot)
 for family in args.families:
  for seed in args.seeds:
   nh=40000 if family=='G'else 80000;fine4=family in['F','G'];parent=next(r for r in manifest if r['family']=='D'and r['baryonSeed']==seed);d=json.loads((BASE/parent['file']).read_text());oldtags=np.array(d['subpopulations']);blocks=[];checks=[]
   for pop in range(4):
    ids=np.flatnonzero(oldtags==pop);n=nh if pop==3 else 14184 if pop==1 and fine4 else len(ids)
    if n==len(ids):b={key:np.array(d[key]).reshape(-1,3)[ids]if key in['positions','velocities']else np.array(d[key])[ids]for key in['positions','velocities','masses','components','subpopulations']}
    else:
     sub_seed=seed+pop*100003;agama.setRandomSeed(sub_seed);np.random.seed(sub_seed%(2**32));pool=max(4096,n//2);xv,mc=agama.GalaxyModel(pot,dfs[pop],af).sample(pool);xv=xv[np.random.permutation(pool)[:n//2]];f=dfs[pop](af(xv));bound=.5*np.sum(xv[:,3:]**2,axis=1)+pot.potential(xv[:,:3])
     if not np.isfinite(xv).all()or np.any(f<0)or np.any(bound>=0):raise RuntimeError('admissibility')
     full=np.empty((n,6));full[::2]=xv;full[1::2]=-xv;full[:,3:]*=conversion;b={'positions':full[:,:3],'velocities':full[:,3:],'masses':np.full(n,M[pop]/n/1e10),'components':np.full(n,0 if pop==0 else 2 if pop==3 else 1),'subpopulations':np.full(n,pop)};checks.append({'population':pop,'seed':sub_seed,'pool':pool,'independentPairs':n//2,'negativeDF':int(np.sum(f<0)),'unbound':int(np.sum(bound>=0))})
    blocks.append(b)
   for key in blocks[0]:d[key]=np.concatenate([b[key]for b in blocks]).ravel().tolist()
   ident=f'F{family}-b{seed}-h{seed}';d['n']=len(d['masses']);d['meta']['realizationId']='v104-'+ident;d['meta']['subpopulationCounts']=[len(b['masses'])for b in blocks];d['meta']['counts']=[d['components'].count(i)for i in range(3)];d['meta']['version104']={'family':family,'seed':seed,'counts':d['meta']['subpopulationCounts'],'parent':parent,'samplingChecks':checks,'generatorSHA256':sha(Path(__file__)),'potentialSHA256':sha(OLD/'potential-final.ini'),'qualification':'Unvaried blocks copied; changed populations resampled from same fixed action DFs in unchanged converged Plummer mean; no clones or velocity rescaling.'}
   path=BASE/'initial'/(ident+'.json')
   if path.exists():raise RuntimeError('Refuse overwrite '+ident)
   p=np.array(d['positions']).reshape(-1,3)
   if len(np.unique(p,axis=0))!=len(p):raise RuntimeError('duplicate')
   path.write_text(json.dumps(d,allow_nan=False)+'\n',encoding='utf8');rows.append({'id':ident,'family':family,'file':path.relative_to(BASE).as_posix(),'sha256':sha(path),'n':d['n'],'nh':nh,'baryonSeed':seed,'haloSeed':seed,'refinedPopulation':1,'counts':d['meta']['subpopulationCounts'],'haloParticleMassMsun':M[3]/nh,'haloToThinParticleMass':(M[3]/nh)/(M[1]/d['meta']['subpopulationCounts'][1]),'parent':parent,'samplingChecks':checks});(BASE/'higher-initial-manifest.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8');print('PREPARED',ident,d['n'],flush=True)

