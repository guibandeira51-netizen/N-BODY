"""Independent field, density, frequencies and finite-N ensemble measurements."""
from pathlib import Path
import json,time
import numpy as np
import agama
from plummer_mean import PlummerMean
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.2';OUT=BASE/'field-validation';OUT.mkdir(exist_ok=True)
def save(name,d):(OUT/name).write_text(json.dumps(d,ensure_ascii=False,allow_nan=False,indent=2)+'\n')
agama.setUnits(length=1,velocity=1,mass=1);start=time.perf_counter()
folder=BASE/'corrected';audit=json.loads((folder/'preparation.json').read_text());eps=audit['softeningKpc'];conversion=audit['velocityConversion'];G=audit['GAppKpc3Myr2Per1e10Msun']
native=agama.Potential(str(folder/'potential-final.ini'));newtonian=agama.Potential(str(folder/'physical-density-newtonian.ini'))
original=agama.Potential(str(ROOT/'reports/v1.0.0/agama-calibrated/potential-final.ini'))
R,z=np.meshgrid([.25,.5,1,2,4,6,8.122,10,12,16,20],[0,.05,.1,.2,.5,1,2]);points=np.c_[R.ravel(),0*R.ravel(),z.ravel()]
reference=[PlummerMean(c,eps,48,16,32) for c in newtonian]
ref_phi=sum(o.potential(points) for o in reference);ref_force=sum(o.force(points) for o in reference)
f=native.force(points);phi=native.potential(points)
grad=[];grad_ref=[]
for axis in [0,2]:
 step=np.zeros_like(points);step[:,axis]=1e-3
 grad.append((native.force(points+step)-native.force(points-step))/.002)
 grad_ref.append(sum((o.force(points+step)-o.force(points-step))/.002 for o in reference))
grad=np.stack(grad,axis=2);grad_ref=np.stack(grad_ref,axis=2)
relative=np.linalg.norm(f-ref_force,axis=1)/np.linalg.norm(ref_force,axis=1)
field={'schema':'softened-field-validation-102','epsilonKpc':eps,'pointsKpc':points.tolist(),'potentialKm2S2':phi.tolist(),'referencePotentialKm2S2':ref_phi.tolist(),'forceKm2S2PerKpc':f.tolist(),'referenceForceKm2S2PerKpc':ref_force.tolist(),'oldUnsoftenedForce':original.force(points).tolist(),'newUnsoftenedSourceForce':newtonian.force(points).tolist(),'forceRelativeResidual':relative.tolist(),'forceRelativeQuantiles50_90_Max':np.quantile(relative,[.5,.9,1]).tolist(),'potentialRelativeResidual':np.abs(phi/ref_phi-1).tolist(),'forceGradient':grad.tolist(),'referenceForceGradient':grad_ref.tolist(),'referenceOrders':[48,16,32],'scope':'native scalar fit vs independently refined convolution of SAME physical density; old/new field difference also changes equilibrium density'}
save('field.json',field)
r=np.linspace(.5,20,40);plane=np.c_[r,0*r,0*r];step=np.c_[0*r,0*r,np.full(len(r),.001)]
def frequencies(p):
 ar=p.force(plane)[:,0];dr=np.c_[np.full(len(r),.001),0*r,0*r]
 dar=(p.force(plane+dr)[:,0]-p.force(plane-dr)[:,0])/.002
 nu2=-(p.force(plane+step)[:,2]-p.force(plane-step)[:,2])/.002
 return {'omega2PerMyr2':(-ar/r*conversion**2).tolist(),'kappa2PerMyr2':((-dar-3*ar/r)*conversion**2).tolist(),'nu2PerMyr2':(nu2*conversion**2).tolist()}
save('frequencies.json',{'radiusKpc':r.tolist(),'original':frequencies(original),'corrected':frequencies(native),'qualification':'Derivatives of each scalar native potential; no negative frequency square is clipped in this audit.'})
dens=[agama.Density(str(folder/f'density-{i}-final.ini')) for i in range(4)]
old_dens=[agama.Density(str(ROOT/f'reports/v1.0.0/agama-calibrated/density-{i}-final.ini')) for i in range(4)]
physical=np.sum([d.density(points) for d in dens],axis=0)
class DensityAsScalar:
 def potential(self,x):return sum(d.density(x) for d in dens)
rho_eff=PlummerMean(DensityAsScalar(),eps,48,16,32).potential(points)
poisson=native.density(points)
save('density.json',{'pointsKpc':points.tolist(),'physicalDensityMsunKpc3':physical.tolist(),'effectivePoissonDensityReferenceMsunKpc3':rho_eff.tolist(),'nativePoissonDensityMsunKpc3':poisson.tolist(),'poissonRelativeResidual':((poisson-rho_eff)/rho_eff).tolist(),'physicalByPopulationMsunKpc3':[d.density(points).tolist() for d in dens],'oldPhysicalByPopulationMsunKpc3':[d.density(points).tolist() for d in old_dens],'qualification':'Physical density and smoothed Poisson density are different quantities. Residual includes source expansion, angular/radial quadrature and native interpolation derivatives.'})
# Fixed probe positions, distinct from particle locations: no self interaction.
probeR,probeZ=np.meshgrid([.5,1,2,4,8.122,12,16],[0,.1,.3,1.]);probes=np.c_[probeR.ravel(),0*probeR.ravel(),probeZ.ravel()]
ensembles=[]
for family in ['baseline','corrected']:
 manifest=json.loads((BASE/family/'snapshots.json').read_text())
 expected_source=original if family=='baseline' else newtonian
 soft=[PlummerMean(c,eps,48,16,32) for c in expected_source]
 expected=sum(o.force(probes) for o in soft)*conversion**2
 preparation=(original if family=='baseline' else native).force(probes)*conversion**2
 for n in [1000,10000]:
  draws=[];seeds=[]
  for row in manifest:
   if row['n']!=n:continue
   data=json.loads((BASE/family/row['file']).read_text());pos=np.array(data['positions']).reshape(-1,3);mass=np.array(data['masses']);seeds.append(row['seed']);delta=pos[None,:,:]-probes[:,None,:];d2=np.sum(delta*delta,axis=2)+eps**2
   force=G*np.sum(delta*(mass[None,:]/d2**1.5)[:,:,None],axis=1);draws.append(force)
  if not draws:continue
  draws=np.asarray(draws);mean=draws.mean(axis=0);std=draws.std(axis=0,ddof=1) if len(draws)>1 else np.full_like(mean,np.nan)
  ensembles.append({'family':family,'n':n,'seeds':seeds,'pointsKpc':probes.tolist(),'expectedPlummerMean':expected.tolist(),'preparationField':preparation.tolist(),'individualDiscreteForces':draws.tolist(),'ensembleMean':mean.tolist(),'ensembleStd':std.tolist(),'ensembleStandardError':(std/np.sqrt(len(draws))).tolist(),'systematicPreparationMismatch':(preparation-expected).tolist(),'ensembleMeanResidual':(mean-expected).tolist(),'qualification':'Mean residual still contains finite-ensemble uncertainty; standard error is recorded and no instantaneous force is forced to match the continuum.'})
save('ensemble.json',{'schema':'mean-vs-fluctuation-102','units':'kpc,Myr,1e10 nominal Msun; acceleration kpc/Myr^2','ensembles':ensembles})
print('FIELD VALIDATION',field['forceRelativeQuantiles50_90_Max'],'seconds',time.perf_counter()-start,flush=True)
