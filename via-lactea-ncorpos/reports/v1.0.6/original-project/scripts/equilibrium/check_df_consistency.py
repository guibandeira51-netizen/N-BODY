"""Off-grid density/Poisson and f(J) constancy checks, without evolving or
modifying the prepared physical model."""
from pathlib import Path
import argparse,json
import numpy as np
import agama
from generate_agama import build,save,plain
def finite_plain(a):
 if np.ndim(a):return [finite_plain(x) for x in a]
 return float(a) if np.isfinite(a) else None

def main():
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);a=p.parse_args();out=a.out.resolve();audit=json.loads((out/'preparation.json').read_text());cfg=audit['config'];agama.setUnits(length=1,velocity=1,mass=1)
 with agama.setNumThreads(4):
  model,dfs,targets,audit,profile,conv=build(cfg,out,True);R=np.array([.13,.47,1.3,3.7,8.122,15.3,30.7,100.3]);z=np.array([0,.13,.47,1.3]);rr,zz=np.meshgrid(R,z,indexing='ij');pts=np.c_[rr.ravel(),np.zeros(rr.size),zz.ravel()]
  direct=[];represented=[]
  for i,df in enumerate(dfs):
   rho=agama.GalaxyModel(model.potential,df,model.af).moments(pts,dens=True,vel=False,vel2=False);direct.append(np.asarray(rho));represented.append(agama.Density(str(out/f'density-{i}-final.ini')).density(pts));print('DF density',i,flush=True)
  direct=np.array(direct);represented=np.array(represented);der=model.potential.eval(pts,acc=False,der=True);poisson=-np.sum(np.asarray(der)[:,:3],axis=1)/(4*np.pi*agama.G)
  with np.errstate(divide='ignore',invalid='ignore'):relative=represented/direct-1
  save(out/'df-poisson-consistency.json',{'positionsKpc':plain(pts),'directDFDensityMsunKpc3':finite_plain(direct),'representedDensityMsunKpc3':finite_plain(represented),'potentialLaplacianDensityMsunKpc3':finite_plain(poisson),'relativeTotalPoissonResidual':finite_plain(poisson/np.sum(direct,axis=0)-1),'relativeRepresentedVsDFDensity':finite_plain(relative),'zeroOrNonfiniteDirectDensitySubcomponentPointIndices':plain(np.argwhere((direct<=0)|~np.isfinite(direct))),'qualification':'Independent off-grid velocity integrals in the final potential versus the density representation and Laplacian. Large relative errors in extremely sparse components are recorded without clipping; zero denominator/nonfinite ratios are null with explicit point indices. This is a finite probe set, not global CBE/Poisson proof.'})
  drift=[]
  for seed in [2026,2027]:
   name=f'c20-agama-n10000-nb1500-nd4500-nh4000-s{seed}-h{seed}';original=json.loads((out/(name+'.json')).read_text());sub=np.array(original['subpopulations']);initial=[]
   for T in [0,20,200,1000]:
    d=json.loads((out/f'{name}-frozen-{T}.json').read_text());xv=np.c_[np.array(d['positions']).reshape(-1,3),np.array(d['velocities']).reshape(-1,3)/conv]
    for c,df in enumerate(dfs):
     ids=np.flatnonzero(sub==c)[::2][:128];actions=model.af(xv[ids]);f=np.asarray(df(actions))
     if T==0:initial.append(f)
     ok=(initial[c]>0)&(f>0)&np.isfinite(f);variation=np.abs(np.log(f[ok]/initial[c][ok]));drift.append({'seed':seed,'subpopulation':c,'timeMyr':T,'independentOrbits':len(ids),'invalidOrNonpositiveF':int(np.sum(~ok)),'absLogFChangeQuantiles50_90_99_Max':plain(np.quantile(variation,[.5,.9,.99,1]))})
  save(out/'df-along-frozen-orbits.json',{'checks':drift,'qualification':'f(J) changes along true numerical orbits quantify limits of the approximate action finder and construction. A nonzero variation is not a velocity correction. Only 128 independent orbits per subpopulation and seed are probed.'})

if __name__=='__main__':main()
