"""Read-only legacy controls; original snapshots are copied, never overwritten."""
from pathlib import Path
import json,sys,shutil
import agama
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/equilibrium'))
from generate_agama import build,sample,save,digest
OLD=ROOT/'reports/v1.0.0/agama-calibrated';OUT=ROOT/'reports/v1.0.2/baseline';OUT.mkdir(parents=True,exist_ok=True)
cfg=json.loads((OLD/'preparation.json').read_text())['config']
with agama.setNumThreads(4):
 model,dfs,targets,audit,profile,conversion=build(cfg,OLD,True)
 shutil.copy2(OLD/'potential-final.ini',OUT/'potential-final.ini')
 original=json.loads((OLD/'snapshots.json').read_text());rows=[]
 for counts in [[150,450,400],[1500,4500,4000]]:
  for seed in [2026,2027,2028]:
   match=next((x for x in original if x['counts']==counts and x['seed']==seed and x['haloSeed']==seed),None)
   if match:
    shutil.copy2(OLD/match['file'],OUT/match['file']);r=dict(match);r['origin']='copied historical initial snapshot';r['originalSHA256']=match['sha256']
   else:
    r=sample(model,dfs,targets,audit,profile,conversion,counts,seed,seed,OUT);r['origin']='new sample of unchanged historical action DF and unsoftened potential'
   r['sha256']=digest(OUT/r['file']);rows.append(r);print('BASELINE',r['file'],r['origin'],flush=True)
 save(OUT/'snapshots.json',rows);save(OUT/'preparation.json',audit);save(OUT/'continuum-profiles.json',profile)
