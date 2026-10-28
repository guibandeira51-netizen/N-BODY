"""Short actual AGAMA orbit controls in each preparation/softened-mean field."""
from pathlib import Path
import json,time
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/v1.0.2/smooth';OUT.mkdir(exist_ok=True)
agama.setUnits(length=1,velocity=1,mass=1)
for family in ['baseline','baseline-softened','corrected']:
 source_family='baseline' if family=='baseline-softened' else family
 folder=ROOT/'reports/v1.0.2'/source_family;manifest=json.loads((folder/'snapshots.json').read_text());audit=json.loads((folder/'preparation.json').read_text());conversion=audit['velocityConversion']
 # Baseline control deliberately uses its original preparation field, while
 # corrected control uses the new consistent softened field. Neither adds pairs.
 potential_path=ROOT/'reports/v1.0.2/field-proof/potential-epsilon-0.1.ini' if family=='baseline-softened' else folder/'potential-final.ini'
 pot=agama.Potential(str(potential_path))
 for seed in [2026,2027,2028]:
  row=next(x for x in manifest if x['n']==1000 and x['seed']==seed);d=json.loads((folder/row['file']).read_text());xv=np.c_[np.array(d['positions']).reshape(-1,3),np.array(d['velocities']).reshape(-1,3)/conversion];start=time.perf_counter()
  with agama.setNumThreads(4):orbits=agama.orbit(potential=pot,ic=xv,time=20*conversion,trajsize=41,accuracy=1e-10,dtype=float,separateTime=False)
  with (OUT/(family+'-s'+str(seed)+'.jsonl')).open('w') as f:
   for j,t in enumerate(np.linspace(0,20,41)):
    q=np.array([o[1][j] for o in orbits]);pos=q[:,:3];record={'timeMyr':float(t),'positions':pos.ravel().tolist(),'velocities':(q[:,3:]*conversion).ravel().tolist(),'accelerations':(pot.force(pos)*conversion**2).ravel().tolist(),'specificPotential':(pot.potential(pos)*conversion**2).tolist()};f.write(json.dumps(record,allow_nan=False)+'\n')
  (OUT/(family+'-s'+str(seed)+'-protocol.json')).write_text(json.dumps({'family':family,'seed':seed,'source':'reports/v1.0.2/'+source_family+'/'+row['file'],'sourceSHA256':row['sha256'],'potential':str(potential_path.relative_to(ROOT)),'durationMyr':20,'cadenceMyr':.5,'algorithm':'actual AGAMA DOP853 accuracy1e-10','selfGravity':False,'wallSeconds':time.perf_counter()-start,'qualification':'A test-particle control, not N-body. baseline=old ICs in old preparation field; baseline-softened=SAME old ICs in Plummer mean of old density, isolates initial field mismatch; corrected=new ICs in new self-consistent Plummer mean.'},indent=2))
  print('SMOOTH',family,seed,'20Myr',flush=True)
