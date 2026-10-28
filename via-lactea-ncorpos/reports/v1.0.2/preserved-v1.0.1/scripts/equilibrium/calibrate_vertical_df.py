"""Calibrate DF Hdisk against a declared spatial target, NEVER against evolved
heating. The target is median |z|=zd*ln(2) at Rsolar for an exponential disk.
Retains the first candidate as a control. Uses the initial reference potential.
"""
from pathlib import Path
import json,argparse
import numpy as np
from scipy.integrate import quad
from scipy.optimize import brentq
import agama
from generate_agama import save,plain,digest

def main():
 p=argparse.ArgumentParser();p.add_argument('--config',type=Path,default=Path(__file__).with_name('model-c20.json'));p.add_argument('--out',type=Path,required=True);a=p.parse_args();cfg=json.loads(a.config.read_text());out=a.out.resolve();out.mkdir(parents=True,exist_ok=True);agama.setUnits(length=1,velocity=1,mass=1)
 with agama.setNumThreads(4):
  h=cfg['halo'];b=cfg['bulge'];shape=lambda r:(r/h['scaleRadius'])**-1*(1+r/h['scaleRadius'])**-2*np.exp(-(r/h['cutoffRadius'])**h['cutoffStrength']);norm=h['massWithinReferenceRadius']/(4*np.pi*quad(lambda r:r*r*shape(r),0,h['referenceRadius'],epsabs=1e-7,epsrel=1e-10)[0]);hp=dict(type='Spheroid',gamma=1,beta=3,alpha=1,scaleRadius=h['scaleRadius'],outerCutoffRadius=h['cutoffRadius'],cutoffStrength=h['cutoffStrength'],densityNorm=norm);bp=dict(type='Spheroid',gamma=0,beta=b['alpha'],alpha=1,scaleRadius=b['r0'],outerCutoffRadius=b['cutoff'],cutoffStrength=2,mass=b['mass']);dp=[dict(type='Disk',mass=d['mass'],scaleRadius=d['radius'],scaleHeight=d['referenceExponentialHeight']) for d in cfg['disks']];pot=agama.Potential(*[agama.Potential(**p) for p in [bp]+dp+[hp]])
  pot.export(str(out/'calibration-reference-potential.ini'));af=agama.ActionFinder(pot);logs=[]
  for d in cfg['disks']:
   target=d['referenceExponentialHeight']*np.log(2);z=np.r_[0,np.geomspace(.0005,max(15,30*d['referenceExponentialHeight']),70)];pts=np.c_[np.full(len(z),cfg['solarRadius']),np.zeros(len(z)),z]
   def objective(H):
    df=agama.DistributionFunction(type='QuasiIsothermal',potential=pot,mass=d['mass'],Rdisk=d['radius'],Hdisk=H,sigmar0=d['sigmaRsolar']*np.exp(cfg['solarRadius']/d['sigmaScaleRadius']),Rsigmar=d['sigmaScaleRadius'],sigmamin=1,coefJr=1,coefJz=.25);rho=np.asarray(agama.GalaxyModel(pot,df,af).moments(pts,dens=True,vel=False,vel2=False));cum=np.r_[0,np.cumsum((rho[:-1]+rho[1:])/2*np.diff(z))];median=np.interp(.5*cum[-1],cum,z);row={'population':d['name'],'HdiskKpc':float(H),'targetMedianAbsZKpc':float(target),'measuredMedianAbsZKpc':float(median),'referencePotential':'initial analytic C20 reduced model; no N-body evolution used'};logs.append(row);save(out/'vertical-calibration-log.json',logs);print(row,flush=True);return median-target
   bracket=[.15*d['referenceExponentialHeight'],d['referenceExponentialHeight']];root=brentq(objective,*bracket,xtol=.001,rtol=.002,maxiter=10);d['dfHdisk']=float(root);d['verticalCalibrationTargetMedianAbsZKpc']=float(target)
  cfg['id']='C20-NFW-collisionless-v2-vertical-calibrated';cfg['calibration']={'target':'median |z| of reference exponential at solar radius, before SCM','calibrationCodeSHA256':digest(Path(__file__)),'referencePotentialSHA256':digest(out/'calibration-reference-potential.ini'),'usesEvolvedStability':False,'qualification':'Fixed spatial target, no dynamical cooling. Final SCM density must be checked again; no exact fit of the full exponential profile is asserted.'};save(out/'model-c20-calibrated.json',cfg)

if __name__=='__main__':main()
