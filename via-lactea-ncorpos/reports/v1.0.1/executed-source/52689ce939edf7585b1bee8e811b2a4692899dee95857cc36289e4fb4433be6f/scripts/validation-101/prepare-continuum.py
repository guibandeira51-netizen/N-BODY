"""Real AGAMA continuum control. Requires the original compiled AGAMA + numpy.
No live particles are evolved here; no rescaling/cooling is applied.
"""
from pathlib import Path
import json,sys,time,hashlib,platform
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'reports/v1.0.1/continuum';OUT.mkdir(parents=True,exist_ok=True)
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,allow_nan=False)+'\n',encoding='utf8')
agama.setUnits(length=1,velocity=1,mass=1)
for dataset in ['agama','agama-calibrated']:
 folder=ROOT/'reports/v1.0.0'/dataset
 snapshot=folder/'c20-agama-n1000-nb150-nd450-nh400-s2026-h2026.json';d=json.loads(snapshot.read_text())
 audit=json.loads((folder/'preparation.json').read_text());conv=audit['velocityConversion'];p=agama.Potential(str(folder/'potential-final.ini'))
 xv=np.c_[np.array(d['positions']).reshape(-1,3),np.array(d['velocities']).reshape(-1,3)/conv];start=time.perf_counter()
 # Integrate all bodies independently. Adaptive DOP853 is distinct from KDK.
 with agama.setNumThreads(4):result=agama.orbit(potential=p,ic=xv,time=1000*conv,trajsize=501,accuracy=1e-10,dtype=float)
 records=[]
 for j,t in enumerate(np.linspace(0,1000,501)):
  q=np.array([r[1][j] for r in result]);pos=q[:,:3];vel=q[:,3:]*conv
  record={'timeMyr':float(t),'positions':pos.ravel().tolist(),'velocities':vel.ravel().tolist(),'accelerations':(p.force(pos)*conv**2).ravel().tolist(),'specificPotential':(p.potential(pos)*conv**2).tolist()}
  records.append(record)
 # Binary numpy array avoids 500 copies of JSON formatting; node analysis consumes JSONL.
 with (OUT/(dataset+'.jsonl')).open('w',encoding='utf8') as f:
  for row in records:f.write(json.dumps(row,allow_nan=False)+'\n')
 points=xv[:,:3];save(OUT/(dataset+'-initial-field.json'),{'positions':points.ravel().tolist(),'acceleration':(p.force(points)*conv**2).ravel().tolist(),'specificPotential':(p.potential(points)*conv**2).tolist()})
 save(OUT/(dataset+'-protocol.json'),{'schema':'continuum-control-101','status':'completed','dataset':dataset,'n':d['n'],'durationMyr':1000,'cadenceMyr':2,'integrator':'actual AGAMA orbit adaptive DOP853 accuracy 1e-10','selfGravity':False,'units':'kpc,Myr,1e10 nominal Msun','source':str(snapshot.relative_to(ROOT)),'sourceSHA256':hashlib.sha256(snapshot.read_bytes()).hexdigest(),'potentialSHA256':hashlib.sha256((folder/'potential-final.ini').read_bytes()).hexdigest(),'wallSeconds':time.perf_counter()-start,'software':{'python':sys.version,'agama':str(agama.__version__),'numpy':np.__version__,'platform':platform.platform()},'qualification':'Test particles in their own unsoftened stationary continuum; no discrete self gravity, does not certify live equilibrium'})
 print(dataset,'completed 1000 Myr',time.perf_counter()-start,flush=True)
