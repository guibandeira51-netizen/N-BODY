"""Continue the SAME fixed DFs and grids if ten iterations have not converged.
Does not alter physical parameters. Saves the previous preparation as evidence.
"""
from pathlib import Path
import argparse,json,time,shutil
from types import SimpleNamespace
import numpy as np
import agama
from generate_agama import build,save,plain

def main():
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--max-extra',type=int,default=10);a=p.parse_args();out=a.out.resolve();cfg=json.loads((out/'preparation.json').read_text())['config']
 with agama.setNumThreads(4):
  previous=out/'pre-refinement';previous.mkdir(exist_ok=True)
  for path in out.iterdir():
   if path.is_file() and (path.suffix=='.ini' or path.name in ['iterations.json','preparation.json','continuum-profiles.json']):shutil.copy2(path,previous/path.name)
  old,dfs,targets,audit,profile,conv=build(cfg,out,True);model=agama.SelfConsistentModel(**cfg['grids']);model.potential=old.potential
  grids=[dict(rminSph=.005,rmaxSph=25,sizeRadialSph=30,lmaxAngularSph=6)]+[dict(RminCyl=.02,RmaxCyl=60,sizeRadialCyl=25,zminCyl=.03,zmaxCyl=20,sizeVerticalCyl=20)]*2+[dict(rminSph=.02,rmaxSph=2000,sizeRadialSph=35,lmaxAngularSph=6)]
  for i,df in enumerate(dfs):model.components.append(agama.Component(df=df,density=agama.Density(str(out/f'density-{i}-final.ini')),disklike=i in (1,2),**grids[i]))
  r=np.geomspace(.1,1000,81);probe=np.vstack([np.c_[r,0*r,0*r],np.c_[r,0*r,r*.2]]);last=np.array(model.potential.force(probe));logs=json.loads((out/'iterations.json').read_text());streak=0
  for it in range(a.max_extra):
   t=time.perf_counter();model.iterate();f=np.array(model.potential.force(probe));diff=np.linalg.norm(f-last,axis=1)/np.linalg.norm(f,axis=1);last=f
   row={'iteration':len(logs)+1,'wallSeconds':time.perf_counter()-t,'maxRelativeForceChange':float(max(diff)),'medianRelativeForceChange':float(np.median(diff)),'gridDensityMassesMsun':[float(c.density.totalMass()) for c in model.components],'continuation':True};logs.append(row);save(out/'iterations.json',logs);print(row,flush=True)
   streak=streak+1 if max(diff)<=cfg['potentialTolerance'] else 0
   if streak>=2:break
  model.potential.export(str(out/'potential-final.ini'))
  for i,c in enumerate(model.components):c.density.export(str(out/f'density-{i}-final.ini'))
  audit['iterationConverged']=streak>=2;audit['lastForceChange']=logs[-1]['maxRelativeForceChange'];audit['additionalSCMIterations']=it+1;audit['preRefinementAvailable']='pre-refinement';save(out/'preparation.json',audit)
  r=np.geomspace(.05,1000,128);xyz=np.c_[r,0*r,0*r];f=model.potential.force(xyz);h=r*1e-3;omega=lambda R:-model.potential.force(np.c_[R,0*R,0*R])[:,0]/R;k2=4*omega(r)+r*(omega(r+h)-omega(r-h))/(2*h)
  profile.update(radiusKpc=plain(r),vcInternal=plain(np.sqrt(-r*f[:,0])*conv),kappaPerMyr=plain(np.sqrt(np.maximum(0,k2))*conv),potentialInternal=plain(model.potential.potential(xyz)*conv**2),densityMsunKpc3=[plain(c.density.density(xyz)) for c in model.components],enclosedMassMsun=[plain(c.density.enclosedMass(r)) for c in model.components],iterationConverged=audit['iterationConverged'],iterations=logs)
  moments=[];points=np.c_[profile['momentRadiusKpc'],np.zeros((len(profile['momentRadiusKpc']),2))]
  for df in dfs:
   rho,v,v2=agama.GalaxyModel(model.potential,df,model.af).moments(points,dens=True,vel=True,vel2=True);moments.append({'densityMsunKpc3':plain(rho),'meanVelocityXYZ':plain(v),'secondMomentsXXYYZZXYYZZX':plain(v2),'velocityUnit':'km/s; at (R,0,0), XYZ=R,phi,z'})
  profile['moments']=moments;save(out/'continuum-profiles.json',profile)

if __name__=='__main__':main()
