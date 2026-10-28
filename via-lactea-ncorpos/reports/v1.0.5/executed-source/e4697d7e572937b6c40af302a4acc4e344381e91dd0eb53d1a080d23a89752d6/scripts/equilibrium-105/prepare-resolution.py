"""Resample exactly one population from the unchanged action DF, copy all others."""
from pathlib import Path
import json,sys,time,hashlib,argparse,copy
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.5';OLD=ROOT/'reports/v1.0.2/corrected';sys.path.insert(0,str(ROOT/'scripts/equilibrium'));from generate_agama import build
ap=argparse.ArgumentParser();ap.add_argument('--stage',choices=['baryons','halo'],required=True);ap.add_argument('--families',nargs='+');ap.add_argument('--seeds',nargs='+',type=int,default=[2026,2027,2028]);args=ap.parse_args();sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();cfg=json.loads((ROOT/'reports/v1.0.0/agama-calibrated/preparation.json').read_text())['config'];M=json.loads((OLD/'preparation.json').read_text())['dfMassesMsun'];old=json.loads((ROOT/'reports/v1.0.4/higher-initial-manifest.json').read_text());rows=json.loads((BASE/'resolution-manifest.json').read_text())if(BASE/'resolution-manifest.json').exists()else[]
if args.stage=='halo'and not(BASE/'preparation-decision.json').exists():raise RuntimeError('Phase B decision required before higher halo sampling')
with agama.setNumThreads(4):
 _,dfs,_,_,_,conv=build(cfg,ROOT/'reports/v1.0.0/agama-calibrated',True);pot=agama.Potential(str(OLD/'potential-final.ini'));af=agama.ActionFinder(pot)
 for family in(args.families or(['bulge2','thin2','thick2']if args.stage=='baryons'else['E','F'])):
  for seed in args.seeds:
   bseed=seed if args.stage=='baryons'else 2026;parent=next(r for r in old if r['family']=='E'and r['baryonSeed']==bseed);source=ROOT/'reports/v1.0.4'/parent['file'];d=json.loads(source.read_text());tags=np.array(d['subpopulations']);blocks=[];checks=[];counts=parent['counts'].copy();pop={'bulge2':0,'thin2':1,'thick2':2}.get(family,3);counts[pop]=counts[pop]*2 if pop<3 else{'E':80000,'F':160000,'H':320000}[family]
   for j in range(4):
    ids=np.flatnonzero(tags==j);n=counts[j]
    if j!=pop or(args.stage=='halo'and family=='E'):
     donor=d
     if args.stage=='halo'and family=='E':
      hr=next(r for r in old if r['family']=='E'and r['haloSeed']==seed);donor=json.loads((ROOT/'reports/v1.0.4'/hr['file']).read_text())if j==3 else d
     b={k:np.asarray(donor[k]).reshape(-1,3)[ids]if k in['positions','velocities']else np.asarray(donor[k])[ids]for k in['positions','velocities','masses','components','subpopulations']}
    else:
     sub_seed=seed+j*100003;agama.setRandomSeed(sub_seed);np.random.seed(sub_seed%(2**32));pool=max(4096,n//2);xv,mc=agama.GalaxyModel(pot,dfs[j],af).sample(pool);xv=xv[np.random.permutation(pool)[:n//2]];f=dfs[j](af(xv));E=.5*np.sum(xv[:,3:]**2,axis=1)+pot.potential(xv[:,:3])
     if not np.isfinite(xv).all()or np.any(f<0)or np.any(E>=0):raise RuntimeError('admissibility')
     full=np.empty((n,6));full[::2]=xv;full[1::2]=-xv;full[:,3:]*=conv;b={'positions':full[:,:3],'velocities':full[:,3:],'masses':np.full(n,M[j]/n/1e10),'components':np.full(n,0 if j==0 else 2 if j==3 else 1),'subpopulations':np.full(n,j)};checks.append({'population':j,'samplingSeed':sub_seed,'independentOrbits':n//2,'negativeDF':int(sum(f<0)),'unbound':int(sum(E>=0))})
    if args.stage=='baryons'and j==3:continue
    blocks.append(b)
   ident=f'{family}-b{bseed}-h{seed}'if args.stage=='halo'else f'B-{family}-s{seed}';dest=BASE/'initial'/(ident+'.json')
   if dest.exists():raise RuntimeError('Refuse overwrite')
   for k in blocks[0]:d[k]=np.concatenate([b[k]for b in blocks]).ravel().tolist()
   d['n']=len(d['masses']);d['meta']['version105']={'preparation':'original104','family':family,'parent':source.relative_to(ROOT).as_posix(),'parentSHA256':sha(source),'counts':counts if args.stage=='halo'else counts[:3]+[0],'samplingChecks':checks,'scriptSHA256':sha(Path(__file__)),'qualification':'Only selected population resampled; no clones or changes of unvaried phase blocks. Halo campaign fixes every baryon to seed2026; seed variation in halo only.'};d['meta']['realizationId']='v105-'+ident;d['meta']['subpopulationCounts']=d['meta']['version105']['counts'];d['meta']['counts']=[d['components'].count(i)for i in range(3)]
   if args.stage=='baryons':d['schema']='nbody-baryons-external-v103';d['meta']['externalHaloMassMsun']=M[3];d['meta']['haloMode']='fixed'
   dest.write_text(json.dumps(d,allow_nan=False)+'\n',encoding='utf8');r={'id':ident,'family':family,'file':dest.relative_to(BASE).as_posix(),'sha256':sha(dest),'n':d['n'],'nh':counts[3]if args.stage=='halo'else 0,'counts':d['meta']['subpopulationCounts'],'baryonSeed':bseed,'haloSeed':seed if args.stage=='halo'else None,'stage':args.stage,'preparation':'original104','refinedPopulation':pop,'haloParticleMassMsun':M[3]/counts[3]if args.stage=='halo'else None,'checks':checks};rows.append(r);(BASE/'resolution-manifest.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8');print('RESOLUTION105',ident,d['n'],flush=True)
