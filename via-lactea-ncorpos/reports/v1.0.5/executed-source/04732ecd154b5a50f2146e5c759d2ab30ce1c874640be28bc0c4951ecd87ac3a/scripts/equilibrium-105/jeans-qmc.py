"""Independent randomized Sobol velocity integral for selected Jeans residuals.
Four independent scrambles, two nested resolutions, common random velocities
across finite differences. Gaussian proposal has full support; f=0 for E>=0.
No changes to preparation, no velocity assignment to any simulated particle.
"""
from pathlib import Path
import sys,json,time,hashlib
import numpy as np
from scipy.stats import qmc
from scipy.special import ndtri
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.5';OLD=ROOT/'reports/v1.0.2/corrected';sys.path.insert(0,str(ROOT/'scripts/equilibrium'));from generate_agama import build
cfg=json.loads((ROOT/'reports/v1.0.0/agama-calibrated/preparation.json').read_text())['config'];agama.setUnits(length=1,velocity=1,mass=1);pot=agama.Potential(str(OLD/'potential-final.ini'));start=time.perf_counter();rows=[];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
protocol={'registeredUTC':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'method':'Owen-scrambled Sobol importance integration, diagonal Gaussian width2 native sigma, common normals per stencil, seeds92000+100pop+10location+replicate','points':[[1,0,.2],[8.122,0,.2]],'stepsKpc':[.02,.01],'powers':[14,16],'independentScrambles':4,'selection':'Supplementary dense-region checks chosen after native Jeans audit, not a new blind stability threshold. Intended to separate quadrature sensitivity from approximate-action inconsistency.','stressUnit':'Msun (km/s)^2/kpc^3','residualUnit':'Msun (km/s)^2/kpc^4','scriptSHA256':sha(Path(__file__))};(BASE/'jeans-qmc-protocol.json').write_text(json.dumps(protocol,indent=2)+'\n',encoding='utf8')
with agama.setNumThreads(4):
 _,dfs,_,_,_,_=build(cfg,ROOT/'reports/v1.0.0/agama-calibrated',True);af=agama.ActionFinder(pot)
 for pop in range(4):
  gm=agama.GalaxyModel(pot,dfs[pop],af)
  for location,R in enumerate([1.,8.122]):
   z=.2
   for h in[.02,.01]:
    pts=np.array([[R,0,z],[R-h,0,z],[R+h,0,z],[R,0,z-h],[R,0,z+h]]);rho,mu,second=gm.moments(pts,dens=True,vel=True,vel2=True);scales=2*np.sqrt(np.maximum(1e-8,second[:,:3]-mu**2));force=pot.force(pts[0])
    for rep in range(4):
     seed=92000+100*pop+10*location+rep;u=qmc.Sobol(3,scramble=True,seed=seed).random_base2(16);normal=ndtri(np.clip(u,1e-14,1-1e-14));results={14:[],16:[]}
     for pos,mean,scale in zip(pts,mu,scales):
      v=mean+normal*scale;bound=.5*np.sum(v*v,axis=1)+pot.potential(pos)<0;f=np.zeros(len(v));xv=np.c_[np.repeat(pos[None,:],int(sum(bound)),axis=0),v[bound]];f[bound]=dfs[pop](af(xv));proposal=np.exp(-.5*np.sum(normal**2,axis=1))/((2*np.pi)**1.5*np.prod(scale));weight=f/proposal
      if not np.isfinite(weight).all()or np.any(weight<0):raise RuntimeError('Invalid DF weight')
      tensor=np.c_[v[:,0]**2,v[:,1]**2,v[:,2]**2,v[:,0]*v[:,1],v[:,0]*v[:,2],v[:,1]*v[:,2]]
      for power in[14,16]:
       w=weight[:2**power];vv=v[:2**power];results[power].append({'density':float(np.mean(w)),'stress':np.mean(w[:,None]*tensor[:2**power],axis=0).tolist(),'mean':(np.mean(w[:,None]*vv,axis=0)/np.mean(w)).tolist(),'effectiveSampleFraction':float(sum(w)**2/sum(w*w)/len(w))})
     for power,result in results.items():
      st=np.array([q['stress']for q in result]);den=result[0]['density'];rt=[(st[2,0]-st[1,0])/(2*h),(st[4,4]-st[3,4])/(2*h),(st[0,0]-st[0,1])/R,-den*force[0]];zt=[((R+h)*st[2,4]-(R-h)*st[1,4])/(2*h*R),(st[4,2]-st[3,2])/(2*h),-den*force[2]];rows.append({'population':pop,'Rkpc':R,'zkpc':z,'hKpc':h,'power':power,'scramble':rep,'seed':seed,'densityMsunKpc3':den,'nativeDensityMsunKpc3':float(rho[0]),'moments':result,'radialTerms':list(map(float,rt)),'verticalTerms':list(map(float,zt)),'radialScaled':float(sum(rt)/sum(abs(x)for x in rt)),'verticalScaled':float(sum(zt)/sum(abs(x)for x in zt))})
    (BASE/'jeans-qmc.json').write_text(json.dumps({'schema':'independent-Jeans-QMC-105','protocol':protocol,'rows':rows,'seconds':time.perf_counter()-start,'qualification':'Independent velocity integration of the SAME approximate f(J). Scramble scatter is integration uncertainty, not seed variance of N-body galaxies. Tail under-resolution and finite differences remain possible; compare both sample sizes and steps.'},allow_nan=False,indent=2)+'\n',encoding='utf8');print('QMC105',pop,R,h,'elapsed',time.perf_counter()-start,flush=True)
