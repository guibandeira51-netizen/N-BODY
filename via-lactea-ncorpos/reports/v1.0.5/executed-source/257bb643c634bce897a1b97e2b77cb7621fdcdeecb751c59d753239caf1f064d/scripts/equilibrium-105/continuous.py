"""Independent full-baryon stationarity control of each new preparation trial."""
from pathlib import Path
import json,time,hashlib,argparse
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.5';OUT=BASE/'continuous';OUT.mkdir(exist_ok=True);OLD=ROOT/'reports/v1.0.2/corrected';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();ap=argparse.ArgumentParser();ap.add_argument('--seeds',nargs='+',type=int,default=[2026,2027,2028]);args=ap.parse_args();agama.setUnits(length=1,velocity=1,mass=1);conv=json.loads((OLD/'preparation.json').read_text())['velocityConversion'];pot=agama.Potential(str(OLD/'potential-final.ini'));rows=json.loads((BASE/'mixed-manifest.json').read_text())
for row in rows:
 if row['baryonSeed']not in args.seeds:continue
 seed=row['baryonSeed'];ident=f'A-MIX-s{seed}-t200';dest=OUT/(ident+'-protocol.json')
 if dest.exists():raise RuntimeError('Refuse overwrite')
 source=BASE/row['file'];d=json.loads(source.read_text());n=sum(t!=3 for t in d['subpopulations']);p=np.asarray(d['positions'][:3*n],dtype=np.float32).astype(float).reshape(-1,3);v=np.asarray(d['velocities'][:3*n],dtype=np.float32).astype(float).reshape(-1,3);start=time.perf_counter();protocol={'id':ident,'source':source.relative_to(ROOT).as_posix(),'sourceSHA256':sha(source),'potentialSHA256':sha(OLD/'potential-final.ini'),'scriptSHA256':sha(Path(__file__)),'n':n,'counts':d['meta']['subpopulationCounts'][:3]+[0],'seed':seed,'durationMyr':200,'cadenceMyr':5,'algorithm':'AGAMA DOP853 Float64 accuracy1e-10','selfGravity':False,'model':'A','preparation':'MIX-105-trial','qualification':'New full same uploaded baryons, no self gravity. Fixed original total Plummer mean; density/force closure must be checked separately.'};dest.write_text(json.dumps(protocol,indent=2)+'\n',encoding='utf8')
 with agama.setNumThreads(4):orbits=agama.orbit(potential=pot,ic=np.c_[p,v/conv],time=200*conv,trajsize=41,accuracy=1e-10,dtype=float,separateTime=False)
 with(OUT/(ident+'.jsonl')).open('w',encoding='utf8')as f:
  for k,t in enumerate(np.linspace(0,200,41)):
   q=np.array([o[1][k]for o in orbits]);f.write(json.dumps({'timeMyr':float(t),'positions':q[:,:3].ravel().tolist(),'velocities':(q[:,3:]*conv).ravel().tolist(),'accelerations':(pot.force(q[:,:3])*conv**2).ravel().tolist(),'specificPotential':(pot.potential(q[:,:3])*conv**2).tolist()},allow_nan=False)+'\n')
 protocol['wallSeconds']=time.perf_counter()-start;dest.write_text(json.dumps(protocol,indent=2)+'\n',encoding='utf8');print('CONTINUOUS105',ident,protocol['wallSeconds'],flush=True)
