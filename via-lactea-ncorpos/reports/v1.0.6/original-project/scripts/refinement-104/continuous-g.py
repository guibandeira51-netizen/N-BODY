"""Full same-phase thin4 baryons in the complete fixed Plummer mean."""
from pathlib import Path
import json,time,hashlib
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.4';OUT=BASE/'continuous-g';OUT.mkdir(exist_ok=True);OLD=ROOT/'reports/v1.0.2/corrected';agama.setUnits(length=1,velocity=1,mass=1);conv=json.loads((OLD/'preparation.json').read_text())['velocityConversion'];pot=agama.Potential(str(OLD/'potential-final.ini'));rows=json.loads((BASE/'higher-initial-manifest.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for row in rows:
 if row['family']!='G':continue
 ident=f'AG-thin4-s{row["baryonSeed"]}-t200';dest=OUT/(ident+'-protocol.json')
 if dest.exists():raise RuntimeError('Refuse overwrite')
 path=BASE/row['file'];d=json.loads(path.read_text());nb=sum(t!=3 for t in d['subpopulations']);p=np.asarray(d['positions'][:3*nb],dtype=np.float32).astype(float).reshape(-1,3);v=np.asarray(d['velocities'][:3*nb],dtype=np.float32).astype(float).reshape(-1,3);xv=np.c_[p,v/conv];start=time.perf_counter();protocol={'id':ident,'source':path.relative_to(ROOT).as_posix(),'sourceSHA256':sha(path),'scriptSHA256':sha(Path(__file__)),'potentialSHA256':sha(OLD/'potential-final.ini'),'seed':row['baryonSeed'],'n':nb,'durationMyr':200,'cadenceMyr':5,'algorithm':'AGAMA DOP853 Float64 accuracy1e-10','selfGravity':False,'qualification':'All16638 same uploaded baryons from G; complete fixed mean, no self gravity. This changes collective response as well as discrete forces. Input p,v,m quantized once toFloat32.'};dest.write_text(json.dumps(protocol,indent=2)+'\n',encoding='utf8')
 with agama.setNumThreads(4):orbits=agama.orbit(potential=pot,ic=xv,time=200*conv,trajsize=41,accuracy=1e-10,dtype=float,separateTime=False)
 with(OUT/(ident+'.jsonl')).open('w',encoding='utf8')as f:
  for k,t in enumerate(np.linspace(0,200,41)):
   q=np.array([o[1][k]for o in orbits]);record={'timeMyr':float(t),'positions':q[:,:3].ravel().tolist(),'velocities':(q[:,3:]*conv).ravel().tolist(),'accelerations':(pot.force(q[:,:3])*conv**2).ravel().tolist(),'specificPotential':(pot.potential(q[:,:3])*conv**2).tolist()};f.write(json.dumps(record,allow_nan=False)+'\n')
 protocol['seconds']=time.perf_counter()-start;dest.write_text(json.dumps(protocol,indent=2)+'\n',encoding='utf8');print('NATIVE ALL G',ident,protocol['seconds'],flush=True)
