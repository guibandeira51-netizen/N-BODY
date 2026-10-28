"""Separate a fixed baryon-sampling residual from halo ensemble fluctuations."""
from pathlib import Path
import json
import numpy as np
import agama
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.3';agama.setUnits(length=1,velocity=1,mass=1)
field=json.loads((BASE/'field-ensembles.json').read_text());points=np.array(field['pointsKpc']);full=np.array(field['expectedPlummerMean']);audit=json.loads((ROOT/'reports/v1.0.2/corrected/preparation.json').read_text());conv=audit['velocityConversion'];G=audit['GAppKpc3Myr2Per1e10Msun'];halo=agama.Potential(str(BASE/'halo-plummer-potential.ini')).force(points)*conv**2;bar=full-halo;fixed=np.array(field['fixedBaryonForce']);norm=lambda x:float(np.linalg.norm(x)/np.linalg.norm(full))
groups=[]
for g in field['groups']:
 h=np.array(g['discreteHaloForces']);groups.append({'nh':g['nh'],'fixedBaryonResidual':(fixed-bar).tolist(),'haloMeanResidual':(h.mean(axis=0)-halo).tolist(),'normalizedFixedBaryonResidual':norm(fixed-bar),'normalizedHaloMeanResidual':norm(h.mean(axis=0)-halo),'normalizedHaloStdAcrossSeeds':norm(h.std(axis=0,ddof=1))})
baryons=[];manifest=json.loads((BASE/'baryons-initial-manifest.json').read_text())
for pop in [None,0,1,2]:
 draws=[]
 for r in manifest:
  if r['refinedPopulation']!=pop:continue
  d=json.loads((BASE/r['file']).read_text());p=np.array(d['positions']).reshape(-1,3);m=np.array(d['masses']);delta=p[None,:,:]-points[:,None,:];r2=np.sum(delta*delta,axis=2)+.01;draws.append(G*np.sum(delta*(m[None,:]/r2**1.5)[:,:,None],axis=1))
 a=np.array(draws);baryons.append({'refinedPopulation':pop,'baryonSeeds':[2026,2027,2028],'discreteBaryonForces':a.tolist(),'normalizedMeanResidual':norm(a.mean(axis=0)-bar),'normalizedStdAcrossBaryonSeeds':norm(a.std(axis=0,ddof=1))})
result={'schema':'granularity-field-components-103','pointsKpc':points.tolist(),'expectedFull':full.tolist(),'expectedHalo':halo.tolist(),'expectedBaryons':bar.tolist(),'haloGroups':groups,'baryonGroups':baryons,'qualification':'Expected baryons are full refined v1.0.2 convolution minus the separately fitted Plummer halo. Small source/expansion closure errors remain. Fixed baryon residual is sampling in this particular realization, not a systematic preparation bias. Finite-ensemble standard errors and structural evolution are different tests.'}
(BASE/'field-components.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8');print('FIELD COMPONENTS',{'fixedBaryonResidual':norm(fixed-bar),'halo':[(g['nh'],g['normalizedHaloMeanResidual'])for g in groups],'baryons':[(g['refinedPopulation'],g['normalizedStdAcrossBaryonSeeds'])for g in baryons]})
