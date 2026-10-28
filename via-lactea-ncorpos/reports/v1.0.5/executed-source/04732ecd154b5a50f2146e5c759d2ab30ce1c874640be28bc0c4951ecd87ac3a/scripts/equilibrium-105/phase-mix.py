"""Prospective orbit-phase preparation trial. Not a self-consistency certificate.
Every independent original orbit keeps its mass, energy and Lz in the SAME fixed
Plummer mean. A uniform time in [0,1000] Myr is drawn before seeing outcomes.
This is a finite orbit-average sampling experiment, not GALIC or Schwarzschild
weight optimization. No live trajectory is cooled or used to choose phases.
"""
from pathlib import Path
import json,time,hashlib,copy,argparse
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.5';OLD=ROOT/'reports/v1.0.2/corrected';OUT=BASE/'initial';OUT.mkdir(exist_ok=True)
ap=argparse.ArgumentParser();ap.add_argument('--seeds',nargs='+',type=int,default=[2026,2027,2028]);args=ap.parse_args();sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
agama.setUnits(length=1,velocity=1,mass=1);conv=json.loads((OLD/'preparation.json').read_text())['velocityConversion'];pot=agama.Potential(str(OLD/'potential-final.ini'));manifest=json.loads((ROOT/'reports/v1.0.4/higher-initial-manifest.json').read_text());rows=json.loads((BASE/'mixed-manifest.json').read_text())if(BASE/'mixed-manifest.json').exists()else[]
for seed in args.seeds:
 row=next(r for r in manifest if r['family']=='E'and r['baryonSeed']==seed);source=ROOT/'reports/v1.0.4'/row['file'];d=json.loads(source.read_text());dest=OUT/f'MIX-E-b{seed}-h{seed}.json'
 if dest.exists():raise RuntimeError('Refuse overwrite')
 start=time.perf_counter();p=np.asarray(d['positions'],dtype=np.float32).astype(float).reshape(-1,3);v=np.asarray(d['velocities'],dtype=np.float32).astype(float).reshape(-1,3)/conv;tags=np.asarray(d['subpopulations']);rng=np.random.default_rng(700000+seed);ids=np.arange(0,d['n'],2);times=rng.uniform(.001,1000,len(ids));xv=np.c_[p[ids],v[ids]]
 protocol={'schema':'orbit-phase-trial-105','registeredUTC':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'seed':seed,'phaseSeed':700000+seed,'uniformPhaseWindowMyr':[.001,1000],'source':source.relative_to(ROOT).as_posix(),'sourceSHA256':sha(source),'potentialSHA256':sha(OLD/'potential-final.ini'),'scriptSHA256':sha(Path(__file__)),'method':'Same weighted original orbits, random time in fixed complete mean, DOP853 Float64 accuracy1e-10, then antipodal partners. New trial model, original action DF not redefined as exact. Finite phase mixing may change density; independent closure and stationary controls mandatory.','promotion':False};(BASE/f'phase-mix-s{seed}-protocol.json').write_text(json.dumps(protocol,indent=2)+'\n',encoding='utf8')
 with agama.setNumThreads(4):orbits=agama.orbit(potential=pot,ic=xv,time=times*conv,trajsize=2,accuracy=1e-10,dtype=float,separateTime=False)
 q=np.array([o[1][-1]for o in orbits]);e0=.5*np.sum(xv[:,3:]**2,axis=1)+pot.potential(xv[:,:3]);e1=.5*np.sum(q[:,3:]**2,axis=1)+pot.potential(q[:,:3]);l0=xv[:,0]*xv[:,4]-xv[:,1]*xv[:,3];l1=q[:,0]*q[:,4]-q[:,1]*q[:,3];full=np.empty((d['n'],6));full[::2]=q;full[1::2]=-q;full[:,3:]*=conv
 result=copy.deepcopy(d);result['positions']=full[:,:3].ravel().tolist();result['velocities']=full[:,3:].ravel().tolist();result['meta']['realizationId']=f'v105-MIX-E-b{seed}-h{seed}';result['meta']['initialization']='Finite random orbital phase sampling of original AGAMA-Plummer weighted orbits; experimental105';result['meta']['version105']={'preparation':'MIX-105-trial','protocol':f'phase-mix-s{seed}-protocol.json','parent':protocol['source'],'parentSHA256':protocol['sourceSHA256'],'equilibriumValidated':False};dest.write_text(json.dumps(result,allow_nan=False)+'\n',encoding='utf8')
 checks=[]
 for pop in range(4):
  sel=tags[ids]==pop;checks.append({'population':pop,'independentOrbits':int(sum(sel)),'maxRelativeSpecificEnergyChange':float(np.max(np.abs((e1[sel]-e0[sel])/e0[sel]))),'LzMaxAbsoluteChangeKpcKmS':float(np.max(np.abs(l1[sel]-l0[sel]))),'LzRMSScaledChange':float(np.sqrt(np.mean((l1[sel]-l0[sel])**2))/max(1e-30,np.sqrt(np.mean(l0[sel]**2))))})
 protocol.update(seconds=time.perf_counter()-start,checks=checks,phaseTimeSHA256=hashlib.sha256(times.astype('<f8').tobytes()).hexdigest());np.savez_compressed(BASE/f'phase-times-s{seed}.npz',particleIDs=ids,timesMyr=times);(BASE/f'phase-mix-s{seed}-protocol.json').write_text(json.dumps(protocol,indent=2)+'\n',encoding='utf8');rows.append({'id':f'MIX-E-b{seed}-h{seed}','file':dest.relative_to(BASE).as_posix(),'sha256':sha(dest),'n':d['n'],'counts':row['counts'],'family':'MIX-E','baryonSeed':seed,'haloSeed':seed,'nh':80000,'preparation':'MIX-105-trial','parent':row,'checks':checks});(BASE/'mixed-manifest.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8');print('MIX105',seed,protocol['seconds'],checks,flush=True)
