"""Separate fixed-baryon sampling, halo ensemble fluctuations and mean fields."""
from pathlib import Path
import json,hashlib
import numpy as np
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.3'
old=json.loads((ROOT/'reports/v1.0.2/field-validation/ensemble.json').read_text());reference=next(r for r in old['ensembles']if r['family']=='corrected'and r['n']==10000);points=np.asarray(reference['pointsKpc']);expected=np.asarray(reference['expectedPlummerMean']);prep=np.asarray(reference['preparationField']);G=json.loads((ROOT/'reports/v1.0.2/corrected/preparation.json').read_text())['GAppKpc3Myr2Per1e10Msun'];rows=json.loads((BASE/'halo-initial-manifest.json').read_text());groups=[];fixed=None
for nh in [4000,8000,20000,40000]:
 draws=[];halo=[];seeds=[]
 for row in rows:
  if row['nh']!=nh:continue
  d=json.loads((BASE/row['file']).read_text());pos=np.array(d['positions']).reshape(-1,3);m=np.array(d['masses']);tags=np.array(d['subpopulations']);delta=pos[None,:,:]-points[:,None,:];r2=np.sum(delta*delta,axis=2)+.01;terms=G*delta*(m[None,:]/r2**1.5)[:,:,None];bar=terms[:,tags!=3,:].sum(axis=1)
  if fixed is None:fixed=bar
  if not np.array_equal(bar,fixed):raise RuntimeError('Baryon force changed in paired study')
  h=terms[:,tags==3,:].sum(axis=1);halo.append(h);draws.append(bar+h);seeds.append(row['haloSeed'])
 draws=np.array(draws);halo=np.array(halo);avg=draws.mean(axis=0);std=draws.std(axis=0,ddof=1)
 groups.append({'nh':nh,'haloSeeds':seeds,'haloParticleMassMsun':next(r['haloParticleMassMsun']for r in rows if r['nh']==nh),'discreteForces':draws.tolist(),'discreteHaloForces':halo.tolist(),'mean':avg.tolist(),'stdAcrossHaloSeeds':std.tolist(),'standardError':(std/np.sqrt(len(draws))).tolist(),'normalizedHaloNoise':float(np.linalg.norm(std)/np.linalg.norm(expected)),'normalizedMeanResidual':float(np.linalg.norm(avg-expected)/np.linalg.norm(expected))})
result={'schema':'granularity-field-ensembles-103','pointsKpc':points.tolist(),'expectedPlummerMean':expected.tolist(),'preparationField':prep.tolist(),'fixedBaryonForce':fixed.tolist(),'systematicPreparationMismatch':(prep-expected).tolist(),'groups':groups,'epsilonKpc':.1,'units':'kpc, Myr, 1e10 nominal Msun','sourceSHA256':{r['file']:r['sha256']for r in rows},'qualification':'Only halo fluctuates; identical baryons can retain a fixed sampling residual. Three halo seeds provide limited ensemble precision. Field fluctuation reduction does not alone prove structural convergence.'}
(BASE/'field-ensembles.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8');print([(g['nh'],g['normalizedHaloNoise'],g['normalizedMeanResidual'])for g in groups])
