"""Off-grid DF closure and f(J) along actual short control orbits."""
from pathlib import Path
import json,sys
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/equilibrium'))
from generate_agama import build,save,plain
BASE=ROOT/'reports/v1.0.2';OLD=ROOT/'reports/v1.0.0/agama-calibrated';OUT=BASE/'df-validation';OUT.mkdir(exist_ok=True)
cfg=json.loads((OLD/'preparation.json').read_text())['config']
def finite(x):
 if np.ndim(x):return [finite(v) for v in x]
 return float(x) if np.isfinite(x) else None
with agama.setNumThreads(4):
 legacy,dfs,targets,audit,profile,conversion=build(cfg,OLD,True)
 pot=agama.Potential(str(BASE/'corrected/potential-final.ini'));af=agama.ActionFinder(pot)
 R,z=np.meshgrid([.3,1,3,8.122,15],[.03,.2,1.]);points=np.c_[R.ravel(),0*R.ravel(),z.ravel()]
 exact=[];represented=[]
 for i,df in enumerate(dfs):
  rho=agama.GalaxyModel(pot,df,af).moments(points,dens=True,vel=False,vel2=False);exact.append(np.asarray(rho));represented.append(agama.Density(str(BASE/f'corrected/density-{i}-final.ini')).density(points));print('INDEPENDENT DF DENSITY',i,flush=True)
 exact=np.asarray(exact);represented=np.asarray(represented)
 with np.errstate(divide='ignore',invalid='ignore'):ratio=represented/exact-1
 prep=json.loads((BASE/'corrected/preparation.json').read_text())
 grid_masses=[float(agama.Density(str(BASE/f'corrected/density-{i}-final.ini')).totalMass()) for i in range(4)]
 save(OUT/'closure.json',{'pointsKpc':plain(points),'directPhysicalDFDensityMsunKpc3':finite(exact),'representedPhysicalDensityMsunKpc3':finite(represented),'relativeRepresentationResidual':finite(ratio),'gridMassesMsun':grid_masses,'fixedActionDFMassesMsun':prep['dfMassesMsun'],'gridMassRelativeResidual':plain(np.asarray(grid_masses)/np.asarray(prep['dfMassesMsun'])-1),'qualification':'Independent off-grid velocity integrals in the final softened potential. Source-grid representation error is distinct from Plummer convolution/force interpolation error; fixed particle masses use action-space integrals, not grid normalization.'})
 checks=[]
 for family in ['baseline','baseline-softened','corrected']:
  definition_potential=pot if family=='corrected' else legacy.potential
  finder=af if family=='corrected' else legacy.af
  source_family='baseline' if family=='baseline-softened' else family
  manifest=json.loads((BASE/source_family/'snapshots.json').read_text())
  for seed in [2026,2027,2028]:
   row=next(r for r in manifest if r['n']==1000 and r['seed']==seed);s=json.loads((BASE/source_family/row['file']).read_text());labels=np.asarray(s['subpopulations']);first=None;last=None
   with (BASE/'smooth'/f'{family}-s{seed}.jsonl').open() as stream:
    for line in stream:
     state=json.loads(line)
     if state['timeMyr']==0:first=state
     if state['timeMyr']==20:last=state
   for c,df in enumerate(dfs):
    ids=np.flatnonzero(labels==c)[::2][:128];values=[]
    for state in [first,last]:
     xv=np.c_[np.array(state['positions']).reshape(-1,3)[ids],np.array(state['velocities']).reshape(-1,3)[ids]/conversion];values.append(np.asarray(df(finder(xv))))
    ok=(values[0]>0)&(values[1]>0)&np.isfinite(values[0])&np.isfinite(values[1]);change=np.abs(np.log(values[1][ok]/values[0][ok]));checks.append({'family':family,'seed':seed,'population':c,'independentOrbits':len(ids),'invalidOrNonpositive':int(np.sum(~ok)),'absLogFChangeQuantiles50_90_99_Max':plain(np.quantile(change,[.5,.9,.99,1])) if len(change) else None})
   print('F ALONG ORBITS',family,seed,flush=True)
 save(OUT/'f-along-orbits.json',{'checks':checks,'qualification':'For baseline-softened, evaluate the ORIGINAL f(J_old) along orbits in the changed softened field: this directly tests nonstationarity of the old DF. For corrected, evaluate f(J_corrected). Approximate actions and short20Myr horizon limit the inference; no phase-space values are altered.'})
