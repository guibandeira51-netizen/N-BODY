"""Spatial Jeans audit and density/kinematic fidelity of orbit-phase trials."""
from pathlib import Path
import sys,json,time,hashlib
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.5';OLD=ROOT/'reports/v1.0.2/corrected';sys.path.insert(0,str(ROOT/'scripts/equilibrium'));from generate_agama import build
agama.setUnits(length=1,velocity=1,mass=1);cfg=json.loads((ROOT/'reports/v1.0.0/agama-calibrated/preparation.json').read_text())['config'];pot=agama.Potential(str(OLD/'potential-final.ini'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();start=time.perf_counter();jeans=[];fidelity=[];velocities=[]
with agama.setNumThreads(4):
 _,dfs,_,_,_,conv=build(cfg,ROOT/'reports/v1.0.0/agama-calibrated',True);af=agama.ActionFinder(pot)
 for pop,df in enumerate(dfs):
  gm=agama.GalaxyModel(pot,df,af);Rs=[.1,.3,.5,1,3,8.122]if pop==0 else[1,3,5,8.122,12,20]if pop<3 else[1,3,8.122,20,50,100]
  for R in Rs:
   for z in[.05,.2,.8]:
    for h in[.04,.02,.01]:
     pts=np.array([[R,0,z],[R-h,0,z],[R+h,0,z],[R,0,z-h],[R,0,z+h]]);rho,mean,mom=gm.moments(pts,dens=True,vel=True,vel2=True);stress=rho[:,None]*mom;force=pot.force(pts[0]);rt=[(stress[2,0]-stress[1,0])/(2*h),(stress[4,4]-stress[3,4])/(2*h),(stress[0,0]-stress[0,1])/R,-rho[0]*force[0]];zt=[((R+h)*stress[2,4]-(R-h)*stress[1,4])/(2*h*R),(stress[4,2]-stress[3,2])/(2*h),-rho[0]*force[2]]
     jeans.append({'population':pop,'Rkpc':R,'zkpc':z,'hKpc':h,'densityMsunKpc3':float(rho[0]),'radialTerms':list(map(float,rt)),'verticalTerms':list(map(float,zt)),'radialResidual':float(sum(rt)),'verticalResidual':float(sum(zt)),'radialScaled':float(sum(rt)/sum(abs(x)for x in rt)),'verticalScaled':float(sum(zt)/sum(abs(x)for x in zt)),'meanRPhiZKmS':mean[0].tolist(),'secondXXYYZZXYXZYZKm2S2':mom[0].tolist()})
  print('SPATIAL JEANS105',pop,flush=True)
for row in json.loads((BASE/'mixed-manifest.json').read_text()):
 source=BASE/row['file'];d=json.loads(source.read_text());parent=ROOT/d['meta']['version105']['parent'];old=json.loads(parent.read_text());tags=np.asarray(d['subpopulations']);p=[np.asarray(x['positions']).reshape(-1,3)for x in[old,d]];v=[np.asarray(x['velocities']).reshape(-1,3)/conv for x in[old,d]]
 for pop in range(4):
  sel=tags==pop;profiles=[]
  for j,kind in enumerate(['original104','MIX105']):
   pp=p[j][sel];vv=v[j][sel];R=np.hypot(pp[:,0],pp[:,1]);r=np.linalg.norm(pp,axis=1);vr=np.divide(pp[:,0]*vv[:,0]+pp[:,1]*vv[:,1],R,out=np.zeros(len(R)),where=R>0);vp=np.divide(pp[:,0]*vv[:,1]-pp[:,1]*vv[:,0],R,out=np.zeros(len(R)),where=R>0);bins=np.array([0,.2,.5,1,2,4,6,8,10,12,16,20,30,50,100,300,1000,10000]);coordinate=R if pop in[1,2]else r;hist=np.histogram(coordinate,bins)[0]/len(pp);profiles.append(hist);solar=(R>=7.122)&(R<9.122)
   record={'seed':row['baryonSeed'],'population':pop,'preparation':kind,'count':int(sum(sel)),'massMsun':float(sum(np.asarray(d['masses'])[sel])*1e10),'r50Kpc':float(np.median(r)),'R50Kpc':float(np.median(R)),'medianAbsZKpc':float(np.median(abs(pp[:,2]))),'solarCount':int(sum(solar)),'solarMedianAbsZKpc':float(np.median(abs(pp[solar,2])))if sum(solar)else None,'sigmaRPhiZKmS':np.std(np.c_[vr,vp,vv[:,2]],axis=0).tolist(),'radialBinEdgesKpc':bins.tolist(),'radialMassFractions':hist.tolist()};velocities.append(record)
  fidelity.append({'seed':row['baryonSeed'],'population':pop,'radialMassTotalVariation':float(.5*np.sum(abs(profiles[1]-profiles[0]))),'radialCumulativeMaxChange':float(np.max(abs(np.cumsum(profiles[1]-profiles[0])))),'qualification':'Paired finite orbit phase samples with identical weights; includes sampling variability and physical change of phase distribution, not exact continuum density closure.'})
result={'schema':'initial-audit-105','scriptSHA256':sha(Path(__file__)),'potentialSHA256':sha(OLD/'potential-final.ini'),'agama':agama.__version__,'numpy':np.__version__,'seconds':time.perf_counter()-start,'Jeans':jeans,'momentOrdering':'XX YY ZZ XY XZ YZ','stressResidualUnits':'Msun (km/s)^2 / kpc^4','densityUnit':'Msun/kpc^3','interpretation':'Scaled residual is signed sum / sum absolute stationary Jeans terms. Three finite steps expose sensitivity; default native quadrature and Staeckel approximate actions limit inference. Tiny density tails are explicitly reported, not grounds for a global physical imbalance percentage. No kinematic parameter refit.','fidelity':fidelity,'particleKinematics':velocities,'previousIndependentEvidence':{p:sha(ROOT/p)for p in['reports/v1.0.4/ic-consistency.json','reports/v1.0.4/ic-diagnosis.json','reports/v1.0.4/field-audit.json','reports/v1.0.4/native-df/s2026.json','reports/v1.0.4/native-df/s2027.json','reports/v1.0.4/native-df/s2028.json']}}
(BASE/'ic-audit.json').write_text(json.dumps(result,allow_nan=False,indent=2)+'\n',encoding='utf8');print('IC105 audited',len(jeans),'points',fidelity,flush=True)
