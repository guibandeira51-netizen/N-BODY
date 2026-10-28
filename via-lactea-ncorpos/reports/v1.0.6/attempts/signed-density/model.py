"""Fixed-mass Newtonian decomposition of preserved physical density grids.
No DF recalculation, no rotation-curve fitting, no N-body evolution.
"""
from pathlib import Path
import json,csv,hashlib,time,sys
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/v1.0.6';OLD=ROOT/'reports/v1.0.2/corrected'
agama.setUnits(length=1,velocity=1,mass=1)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(name,data):
 (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf8')
def table(name,rows):
 with(OUT/name).open('w',newline='',encoding='utf8')as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
def load_model():
 return [agama.Potential(str(OUT/f'potentials/component-{i}.ini'))for i in range(4)]
if __name__=='__main__':
 start=time.perf_counter();prep=json.loads((OLD/'preparation.json').read_text());masses=prep['dfMassesMsun'];dens=[agama.Density(str(OLD/f'density-{i}-final.ini'))for i in range(4)];norm=[m/d.totalMass()for m,d in zip(masses,dens)];pot=[];checks=[]
 R=np.unique(np.r_[np.linspace(.3,30,180),8.122,np.geomspace(30,300,32)]);points=np.c_[R,R*0,R*0]
 with agama.setNumThreads(4):
  for i,d in enumerate(dens):
   callback=lambda xyz,d=d,s=norm[i]:d.density(xyz)*s
   settings=dict(type='Multipole',symmetry='a',lmax=12,mmax=0,gridSizeR=100,rmin=.001,rmax=4000)if i in[0,3]else dict(type='CylSpline',symmetry='a',mmax=0,gridSizeR=100,gridSizeZ=80,Rmin=.003,Rmax=240,zmin=.003,zmax=160)
   p=agama.Potential(density=callback,**settings);p.export(str(OUT/f'potentials/component-{i}.ini'));pot.append(p)
   finer=dict(settings)
   if i in[0,3]:finer.update(gridSizeR=160,lmax=16)
   else:finer.update(gridSizeR=150,gridSizeZ=120)
   high=agama.Potential(density=callback,**finer);probe=np.c_[np.linspace(5,25,41),np.zeros(41),np.zeros(41)]
   err=abs(p.force(probe)[:,0]/high.force(probe)[:,0]-1);checks.append({'population':i,'maxRadialForceRelativeGridRefinement5to25':float(max(err)),'settings':settings,'finerSettings':finer});print('Component',i,'grid error',max(err),flush=True)
  total=agama.Potential(*pot);bar=agama.Potential(*pot[:3]);v2=np.array([-R*p.force(points)[:,0]for p in pot]);assert np.min(v2)>0
  curves=[]
  for k,r in enumerate(R):
   vals=np.sqrt(v2[:,k]);vb=np.linalg.norm(vals[:3]);vt=np.linalg.norm(vals);ar=total.force(points[k])[0];curves.append(dict(R_kpc=float(r),bulge_km_s=float(vals[0]),thin_km_s=float(vals[1]),thick_km_s=float(vals[2]),disk_km_s=float(np.linalg.norm(vals[1:3])),halo_km_s=float(vals[3]),baryons_km_s=float(vb),total_km_s=float(vt),delta_v_km_s=float(vt-vb),delta_v_percent_of_baryons=float(100*(vt/vb-1)),baryons_aR_km2_s2_kpc=float(bar.force(points[k])[0]),total_aR_km2_s2_kpc=float(ar),halo_aR_km2_s2_kpc=float(pot[3].force(points[k])[0])))
  table('rotation.csv',curves)
  # Same spherical enclosed-volume convention for all physical source densities.
  rr=np.unique(np.r_[np.geomspace(.1,1000,170),8.122,20,50,207,414]);mm=np.array([d.enclosedMass(rr)*s for d,s in zip(dens,norm)]);massrows=[dict(r_kpc=float(r),bulge_Msun=float(mm[0,k]),thin_Msun=float(mm[1,k]),thick_Msun=float(mm[2,k]),disk_Msun=float(mm[1,k]+mm[2,k]),halo_Msun=float(mm[3,k]),total_Msun=float(sum(mm[:,k])),f_DM=float(mm[3,k]/sum(mm[:,k])))for k,r in enumerate(rr)];table('enclosed-mass.csv',massrows)
  fd=[]
  for r in[1,5,8.122,12,20,25]:
   h=r*1e-5;a=total.force([r,0,0])[0];grad=-(total.potential([r+h,0,0])-total.potential([r-h,0,0]))/(2*h);fd.append({'Rkpc':r,'force':float(a),'negativePotentialGradient':float(grad),'relativeDifference':float(abs(a-grad)/abs(a))})
  oldNewton=agama.Potential(str(OLD/'physical-density-newtonian.ini'));oldPlummer=agama.Potential(str(OLD/'potential-final.ini'));q=np.c_[np.linspace(5,25,41),np.zeros(41),np.zeros(41)];reference={'Rkpc':q[:,0].tolist(),'relativeNewForceToPreservedNewtonian':(total.force(q)[:,0]/oldNewton.force(q)[:,0]-1).tolist(),'relativePlummerToNewNewtonian':(oldPlummer.force(q)[:,0]/total.force(q)[:,0]-1).tolist()}
 dump('model.json',{'schema':'fixed-mass-physical-field-106','modelId':'C20-reduced-DF-density-Newtonian106','sourceConfig':prep['config'],'componentMassesMsun':masses,'densityGridMassesMsun':[d.totalMass()for d in dens],'numericalMassNormalization':norm,'normalizationReason':'Normalize each finite density grid to the unchanged action-DF mass already assigned to historical particles. Factors quantify interpolation/truncation mass closure; no observational or stability fit.','symmetry':'Stationary axisymmetric, reflection symmetric, isolated Newtonian smooth potential; gas and CGM omitted.','potentialConvention':'Phi(infinity)=0; lengths kpc, velocities km/s, masses Msun, time unit kpc/(km/s).','relationToLiveModel':'Same preserved final physical density shapes and component masses; NEW unsmoothed Newtonian decomposition. Live historical campaigns retain Plummer epsilon0.1kpc and their own field. They are not relabelled as this orbit experiment.','freeFittedParameters106':0,'observationalDependence':'Historical Cautun-based parameters used rotation-curve constraints related to Eilers: this is a consistency comparison, not an independent out-of-sample discovery or formal model-selection test.','sourceSHA256':{str(p.relative_to(ROOT)).replace('\\','/'):sha(p)for p in[OLD/'preparation.json',*[OLD/f'density-{i}-final.ini'for i in range(4)]]},'potentialSHA256':{f'potentials/component-{i}.ini':sha(OUT/f'potentials/component-{i}.ini')for i in range(4)},'gridChecks':checks,'gradientChecks':fd,'preservedReferenceComparison':reference,'GAgama':agama.G,'wallSeconds':time.perf_counter()-start})
 print('Fixed model and curves complete',time.perf_counter()-start,flush=True)
