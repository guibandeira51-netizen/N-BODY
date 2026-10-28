"""Compare the continuum DF model and actual particle realizations without
silently imposing the input density profile on the output."""
from pathlib import Path
import json,argparse,math
import numpy as np
import agama
from generate_agama import build,save,plain

def cdf_emp(r,m,at):
 order=np.argsort(r);rr=r[order];s=np.cumsum(m[order]);j=np.searchsorted(rr,at,side='right')-1;return np.where(j>=0,s[np.maximum(0,j)],0)

def main():
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);a=p.parse_args();out=a.out.resolve();audit=json.loads((out/'preparation.json').read_text());cfg=audit['config'];agama.setUnits(length=1,velocity=1,mass=1)
 with agama.setNumThreads(4):
  model,dfs,targets,audit,profile,conv=build(cfg,out,True);dens=[agama.Density(str(out/f'density-{i}-final.ini')) for i in range(4)]
  r=np.geomspace(.01,2000,180);R=np.geomspace(.01,60,160);xy=np.c_[R,0*R]
  sigma=[d.projectedDensity(xy) for d in dens[1:3]];densityR=np.geomspace(.01,60,160);height=np.r_[0,np.geomspace(.003,12,100)];rr,zz=np.meshgrid(densityR,height,indexing='ij');pts=np.c_[rr.ravel(),0*rr.ravel(),zz.ravel()]
  vertical=[np.array(d.density(pts)).reshape(len(densityR),len(height)) for d in dens[1:3]]
  cont={'radiusKpc':plain(r),'enclosedSphericalMassMsun':[plain(d.enclosedMass(r)) for d in dens],'cylindricalRadiusKpc':plain(R),'surfaceDensityThinThickMsunKpc2':[plain(s) for s in sigma],'verticalRadiusKpc':plain(densityR),'heightKpc':plain(height),'densityThinThickMsunKpc3':[plain(v) for v in vertical],'qualification':'All continuum profiles computed from final DF-derived density interpolators, not input analytic targets. Vertical maps store full R,z arrays.'}
  save(out/'density-profile-validation.json',cont)
  realizations=[]
  for entry in json.loads((out/'snapshots.json').read_text()):
   d=json.loads((out/entry['file']).read_text());pos=np.array(d['positions']).reshape(-1,3);m=np.array(d['masses'])*1e10;labels=np.array(d['components']);sub=np.array(d['subpopulations']);records=[]
   for c in range(4):
    mask=sub==c;radius=np.linalg.norm(pos[mask],axis=1);ref=np.array(cont['enclosedSphericalMassMsun'][c]);sample=cdf_emp(radius,m[mask],r);M=audit['dfMassesMsun'][c]
    records.append({'subpopulation':c,'sampleMassMsun':float(sum(m[mask])),'massTargetMsun':targets[c],'massRelativeDifference':float(sum(m[mask])/targets[c]-1),'maxCDFDifferenceFraction':float(max(np.abs(sample-ref))/M),'sampleCDFMsun':plain(sample),'effectiveIndependentPairs':int(sum(mask)//2),'qualification':'CDF deviation includes finite sample, correlated antipodal pairs and density interpolation; no automatic one-sample KS significance for these samples'})
   realizations.append({'id':entry['id'],'components':records})
  save(out/'particle-profile-validation.json',{'radiusKpc':plain(r),'realizations':realizations})
  # Potential-grid sensitivity at fixed final densities, distinct from SCM iteration convergence.
  points=np.c_[np.geomspace(.05,1000,200),np.zeros(200),np.geomspace(.05,1000,200)*.15]
  sph=agama.Density(dens[0],dens[3]);disk=agama.Density(dens[1],dens[2]);refined=agama.Potential(agama.Potential(type='Multipole',density=sph,lmax=10,gridSizeR=80,rmin=.005,rmax=3000),agama.Potential(type='CylSpline',density=disk,gridSizeR=60,gridSizeZ=50,Rmin=.01,Rmax=100,zmin=.015,zmax=60))
  f0=model.potential.force(points);f1=refined.force(points);err=np.linalg.norm(f1-f0,axis=1)/np.linalg.norm(f1,axis=1)
  save(out/'potential-grid-sensitivity.json',{'points':plain(points),'relativeForceDifference':plain(err),'percentiles':plain(np.quantile(err,[.5,.9,.99,1])),'qualification':'Higher potential expansion resolution at fixed final density; this does not recompute DF density moments on finer grids and is not full SCM-grid convergence.'})

if __name__=='__main__':main()
