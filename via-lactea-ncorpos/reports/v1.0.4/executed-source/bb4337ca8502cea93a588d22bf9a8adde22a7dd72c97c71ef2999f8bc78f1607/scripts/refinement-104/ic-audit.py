"""Independent Jeans moment consistency and epicyclic finite-difference checks.
These are diagnostics of an approximate action DF, not equilibrium certificates.
"""
from pathlib import Path
import sys,json,hashlib,time
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.4';OLD=ROOT/'reports/v1.0.2/corrected';sys.path.insert(0,str(ROOT/'scripts/equilibrium'));from generate_agama import build
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();cfg=json.loads((ROOT/'reports/v1.0.0/agama-calibrated/preparation.json').read_text())['config'];start=time.perf_counter();results=[];frequencies=[]
with agama.setNumThreads(4):
 _,dfs,_,_,_,conv=build(cfg,ROOT/'reports/v1.0.0/agama-calibrated',True);pot=agama.Potential(str(OLD/'potential-final.ini'));af=agama.ActionFinder(pot)
 for pop,df in enumerate(dfs):
  gm=agama.GalaxyModel(pot,df,af)
  for R in[1.,3.,8.122,15.]:
   for z in[.1,.4]:
    for h in[.02,.01]:
     p=np.array([[R,0,z],[R-h,0,z],[R+h,0,z],[R,0,z-h],[R,0,z+h]]);rho,second=gm.moments(p,dens=True,vel=False,vel2=True);stress=rho[:,None]*second;force=pot.force(p[0]);radialTerms=[(stress[2,0]-stress[1,0])/(2*h),(stress[4,4]-stress[3,4])/(2*h),(stress[0,0]-stress[0,1])/R,-rho[0]*force[0]];verticalTerms=[((R+h)*stress[2,4]-(R-h)*stress[1,4])/(2*h*R),(stress[4,2]-stress[3,2])/(2*h),-rho[0]*force[2]]
     results.append({'population':pop,'Rkpc':R,'zkpc':z,'differenceStepKpc':h,'densityMsunKpc3':float(rho[0]),'radialTermsMsunKpc4Km2S2':radialTerms,'verticalTermsMsunKpc4Km2S2':verticalTerms,'radialResidualScaled':float(sum(radialTerms)/sum(abs(x)for x in radialTerms)),'verticalResidualScaled':float(sum(verticalTerms)/sum(abs(x)for x in verticalTerms)),'sigmaRKmS':float(np.sqrt(second[0,0])),'sigmaZKmS':float(np.sqrt(second[0,2]))})
  print('JEANS',pop,flush=True)
 for R in[.5,1,2,3,5,8.122,12,15,20]:
  h=R*1e-3;p=np.array([[R,0,0],[R-h,0,0],[R+h,0,0],[R,0,-h],[R,0,h]]);f=pot.force(p);omega2=-f[0,0]/R;kappa2=-(f[2,0]-f[1,0])/(2*h)-3*f[0,0]/R;nu2=-(f[4,2]-f[3,2])/(2*h)
  frequencies.append({'Rkpc':R,'omega2Myr2':float(omega2*conv**2),'kappa2Myr2':float(kappa2*conv**2),'nu2Myr2':float(nu2*conv**2),'circularPeriodMyr':float(2*np.pi/np.sqrt(omega2)/conv),'verticalPeriodMyr':float(2*np.pi/np.sqrt(nu2)/conv)})
result={'schema':'refinement-ic-consistency-104','potentialSHA256':sha(OLD/'potential-final.ini'),'generatorSHA256':sha(ROOT/'scripts/equilibrium-102/generate.py')if(ROOT/'scripts/equilibrium-102/generate.py').exists()else None,'scriptSHA256':sha(Path(__file__)),'agama':agama.__version__,'seconds':time.perf_counter()-start,'Jeans':results,'frequencies':frequencies,'momentOrdering':'xx,yy,zz,xy,xz,yz at y=0. Noncentral second moments. Stationary axisymmetric Jeans equations include cross stress, no imposed isotropy. Residual divided by sum of absolute terms; two finite-difference steps expose numerical sensitivity. Tiny-density bulge tails should not determine global quality. Moment quadrature and approximate actions limit interpretation. No physical parameter adjusted.','preservedEvidence':{p:sha(ROOT/p)for p in['reports/v1.0.2/corrected/iterations.json','reports/v1.0.2/df-validation/closure.json','reports/v1.0.2/df-validation/f-along-orbits.json','reports/v1.0.2/corrected/kinematic-moments.json','reports/v1.0.2/corrected/continuum-profiles.json']}}
(BASE/'ic-consistency.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n',encoding='utf8');print('Saved independent moment/frequency audit',flush=True)
