"""Same 6000 baryons as B in the full v1.0.2 mean field; no self gravity."""
from pathlib import Path
import json,time,hashlib,argparse
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.3';OUT=BASE/'continuum';OUT.mkdir(exist_ok=True);OLD=ROOT/'reports/v1.0.2/corrected';agama.setUnits(length=1,velocity=1,mass=1)
parser=argparse.ArgumentParser();parser.add_argument('--duration',type=int,choices=[20,200],default=20);args=parser.parse_args();duration=args.duration;cadence=.5 if duration==20 else 5
conv=json.loads((OLD/'preparation.json').read_text())['velocityConversion'];pot=agama.Potential(str(OLD/'potential-final.ini'));manifest=json.loads((BASE/'baryons-initial-manifest.json').read_text())
for seed in [2026,2027,2028]:
 row=next(r for r in manifest if r['baryonSeed']==seed and r['refinedPopulation']is None);path=BASE/row['file'];d=json.loads(path.read_text());p=np.asarray(d['positions'],dtype=np.float32).astype(float).reshape(-1,3);v=np.asarray(d['velocities'],dtype=np.float32).astype(float).reshape(-1,3);xv=np.c_[p,v/conv];start=time.perf_counter();ident=f'A-base-s{seed}-t{duration}'
 if(OUT/(ident+'-protocol.json')).exists():raise RuntimeError('Existing scientific control; do not overwrite')
 protocol={'id':ident,'model':'A','stage':'continuous'+str(duration),'seed':seed,'n':d['n'],'source':'reports/v1.0.3/'+row['file'],'sourceSHA256':row['sha256'],'potentialSHA256':hashlib.sha256((OLD/'potential-final.ini').read_bytes()).hexdigest(),'scriptSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'durationMyr':duration,'cadenceMyr':cadence,'algorithm':'actual AGAMA DOP853','accuracy':1e-10,'selfGravity':False,'inputQuantization':'positions, velocities and weights rounded once to Float32 to match actual initial GPU uploads; evolution itself Float64','qualification':'A: test particles in complete fixed Plummer mean. B: self-gravitating baryons and fixed halo only. Same initial baryons do not make the Hamiltonians identical.'}
 (OUT/(ident+'-protocol.json')).write_text(json.dumps(protocol,indent=2)+'\n',encoding='utf8')
 with agama.setNumThreads(4):orbits=agama.orbit(potential=pot,ic=xv,time=duration*conv,trajsize=41,accuracy=1e-10,dtype=float,separateTime=False)
 with(OUT/(ident+'.jsonl')).open('w',encoding='utf8')as f:
  for i,t in enumerate(np.linspace(0,duration,41)):
   q=np.array([o[1][i]for o in orbits]);record={'timeMyr':float(t),'positions':q[:,:3].ravel().tolist(),'velocities':(q[:,3:]*conv).ravel().tolist(),'accelerations':(pot.force(q[:,:3])*conv**2).ravel().tolist(),'specificPotential':(pot.potential(q[:,:3])*conv**2).tolist()};f.write(json.dumps(record,allow_nan=False)+'\n')
 protocol['wallSeconds']=time.perf_counter()-start;(OUT/(ident+'-protocol.json')).write_text(json.dumps(protocol,indent=2)+'\n',encoding='utf8');print('CONTINUUM',ident,'seconds',protocol['wallSeconds'],flush=True)
