"""Frozen Plummer halo from v1.0.2 physical density, scalar Hermite table.
Keeps the inherited DF-vs-density-grid mass residual explicit, no renormalizing.
"""
from pathlib import Path
import sys,json,time,hashlib
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/v1.0.3';OLD=ROOT/'reports/v1.0.2/corrected';sys.path.insert(0,str(ROOT/'scripts/equilibrium-102'));sys.path.insert(0,str(ROOT/'scripts/equilibrium'))
from plummer_mean import PlummerMean
from prepare_controls import hermite
def save(name,d):(OUT/name).write_text(json.dumps(d,allow_nan=False,indent=2)+'\n',encoding='utf8')
start=time.perf_counter();agama.setUnits(length=1,velocity=1,mass=1);audit=json.loads((OLD/'preparation.json').read_text());conv=audit['velocityConversion'];den=agama.Density(str(OLD/'density-3-final.ini'))
with agama.setNumThreads(4):
 newtonian=agama.Potential(type='Multipole',density=den,lmax=8,mmax=0,rmin=.003,rmax=3000,gridSizeR=96,symmetry='a')
 newtonian.export(str(OUT/'halo-density-newtonian.ini'));operator=PlummerMean(newtonian,.1,32,12,24)
 pot=agama.Potential(type='Multipole',potential=lambda x:operator.potential(x),lmax=8,mmax=0,rmin=.003,rmax=3000,gridSizeR=128,symmetry='a',fixOrder=True);pot.export(str(OUT/'halo-plummer-potential.ini'))
 nu=385;nv=385;rs=.1;zs=.03;du=np.log1p(1e5/rs)/(nu-1);dv=np.log1p(1e5/zs)/(nv-1);u=np.arange(nu)*du;v=np.arange(nv)*dv;R=np.expm1(u)*rs;z=np.expm1(v)*zs;xx,zz=np.meshgrid(R,z,indexing='ij');points=np.c_[xx.ravel(),0*xx.ravel(),zz.ravel()]
 f=pot.force(points);phi=pot.potential(points);dU=-f[:,0]*(points[:,0]+rs);dV=-f[:,2]*(points[:,2]+zs);step=1e-5;plus=points.copy();minus=points.copy();plus[:,2]=zs*np.expm1(np.repeat(v[None,:]+step,nu,axis=0).ravel());minus[:,2]=zs*np.expm1(np.repeat(v[None,:]-step,nu,axis=0).ravel());cross=-(pot.force(plus)[:,0]-pot.force(minus)[:,0])/(2*step)*(points[:,0]+rs)
 values=np.c_[phi,dU,dV,cross]*conv**2;offset=float(values[0,0]);values[:,0]-=offset
 table={'schema':'axisymmetric-potential-hermite-v1','modelId':audit['config']['id'],'nu':nu,'nv':nv,'du':float(du),'dv':float(dv),'rscale':rs,'zscale':zs,'massInternal':float(den.totalMass()/1e10),'physicalDFHaloMassMsun':audit['dfMassesMsun'][3],'densityGridMassRelativeResidual':float(den.totalMass()/audit['dfMassesMsun'][3]-1),'values':values.ravel().tolist(),'potentialOffset':offset,'softening':.1,'epsilonKpc':.1,'qualification':'Frozen scalar Plummer mean of SAME v1.0.2 physical halo density. Constant potential gauge improves coefficient precision; restored for energy, no force change. No live halo particles. Inherited density-grid vs DF mass discrepancy explicit. Kepler fallback outside grid must be counted.'}
 rng=np.random.default_rng(1032026);rr=np.exp(rng.uniform(np.log(.02),np.log(2000),4000));ct=rng.uniform(-1,1,4000);pt=np.c_[rr*np.sqrt(1-ct*ct),rr*0,rr*ct];pp,ff=hermite(table,pt);pp+=offset;truth=pot.force(pt)*conv**2;rel=np.linalg.norm(ff-truth,axis=1)/np.linalg.norm(truth,axis=1);potential=np.abs(pp/(pot.potential(pt)*conv**2)-1)
 p32=dict(table,values=np.asarray(table['values'],dtype=np.float32).astype(float).tolist(),du=float(np.float32(du)),dv=float(np.float32(dv)),rscale=float(np.float32(rs)),zscale=float(np.float32(zs)));_,f32=hermite(p32,pt);q32=np.linalg.norm(f32-truth,axis=1)/np.linalg.norm(truth,axis=1)
 diskR,diskz=np.meshgrid([.1,.25,.5,1,2,4,8.122,12,20],[0,.05,.1,.3,1,2]);probes=np.c_[diskR.ravel(),0*diskR.ravel(),diskz.ravel()];hi=PlummerMean(newtonian,.1,48,16,32);reference=hi.force(probes)*conv**2;fit=pot.force(probes)*conv**2;fitErr=np.linalg.norm(fit-reference,axis=1)/np.maximum(np.linalg.norm(reference,axis=1),1e-20)
 table['validation']={'randomSeed':1032026,'testPoints':4000,'radiusRangeKpc':[.02,2000],'forceRelativePercentiles50_90_99_Max':np.quantile(rel,[.5,.9,.99,1]).tolist(),'potentialRelativePercentiles50_90_99_Max':np.quantile(potential,[.5,.9,.99,1]).tolist(),'float32CoefficientForceRelativePercentiles50_90_99_Max':np.quantile(q32,[.5,.9,.99,1]).tolist(),'nativeVsRefinedPlummerForcePercentiles50_90_Max':np.quantile(fitErr,[.5,.9,1]).tolist(),'qualification':'Float32 coefficients checked in Float64 Hermite arithmetic; actual WGSL force checked separately before B runs.'};save('halo-fixed-grid.json',table)
 save('halo-grid-validation.json',{'points':pt.tolist(),'referenceForce':truth.tolist(),'referencePotential':(pot.potential(pt)*conv**2).tolist(),'tableForce':ff.tolist(),'float32CoefficientForce':f32.tolist(),'discPoints':probes.tolist(),'discReference':reference.tolist(),'discNative':fit.tolist(),'validation':table['validation'],'units':'kpc, Myr, 1e10 nominal Msun','scriptSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'wallSeconds':time.perf_counter()-start})
 if np.max(rel)>.001 or np.max(fitErr)>.001:raise RuntimeError('Frozen field failed reference checks')
 print('FROZEN PLUMMER HALO',table['validation'],'seconds',time.perf_counter()-start,flush=True)
