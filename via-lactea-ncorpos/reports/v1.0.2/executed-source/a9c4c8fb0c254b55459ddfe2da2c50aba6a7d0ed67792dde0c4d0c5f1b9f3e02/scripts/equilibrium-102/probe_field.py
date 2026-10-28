"""Minimal field proof before any self-consistency iteration or live evolution."""
from pathlib import Path
import json,time
import numpy as np
import agama
from plummer_mean import PlummerMean,soften_native
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/v1.0.2/field-proof';OUT.mkdir(parents=True,exist_ok=True)
agama.setUnits(length=1,velocity=1,mass=1)
old=agama.Potential(str(ROOT/'reports/v1.0.0/agama-calibrated/potential-final.ini'))
print('Source components',list(old),flush=True);start=time.perf_counter()
with agama.setNumThreads(4):new,ops=soften_native(agama,old,.1)
new.export(str(OUT/'potential-epsilon-0.1.ini'));print('Native softened expansion seconds',time.perf_counter()-start,flush=True)
R,z=np.meshgrid([.1,.25,.5,1,2,4,8.122,12,20],[0,.05,.1,.2,.5,1.,2.]);points=np.c_[R.ravel(),0*R.ravel(),z.ravel()]
phi=sum(o.potential(points) for o in ops);force=sum(o.force(points) for o in ops)
high=[PlummerMean(c,.1,48,16,32) for c in old]
phi_hi=sum(o.potential(points) for o in high);force_hi=sum(o.force(points) for o in high)
phi_fit=new.potential(points);force_fit=new.force(points);force_old=old.force(points)
norm=lambda a:np.linalg.norm(a,axis=1)
relative=lambda a,b:norm(a-b)/np.maximum(norm(b),1e-12)
report={'schema':'plummer-field-proof-102','epsilonKpc':.1,'positions':points.tolist(),'potentialNewtonian':old.potential(points).tolist(),'potentialQuadrature':phi.tolist(),'potentialHighQuadrature':phi_hi.tolist(),'potentialNativeFit':phi_fit.tolist(),'forceNewtonian':force_old.tolist(),'forceQuadrature':force.tolist(),'forceHighQuadrature':force_hi.tolist(),'forceNativeFit':force_fit.tolist(),'quadratureForceRelative':relative(force,force_hi).tolist(),'fitForceRelative':relative(force_fit,force_hi).tolist(),'meanFieldCorrectionRelative':relative(force_old,force_hi).tolist(),'potentialFitRelative':(np.abs(phi_fit/phi_hi-1)).tolist(),'orders':[24,8,16],'higherOrders':[48,16,32],'wallSeconds':time.perf_counter()-start,'qualification':'Newtonian source unchanged; corrected scalar is a numerical Plummer convolution. Errors must be measured, not assumed.'}
(OUT/'proof.json').write_text(json.dumps(report,indent=2)+'\n');print({key:np.quantile(report[key],[.5,.9,1]).tolist() for key in ['quadratureForceRelative','fitForceRelative','meanFieldCorrectionRelative','potentialFitRelative']},flush=True)
