"""Empirical initial VDF histograms; no Gaussian assumption or fitted velocities."""
from pathlib import Path
import json,csv,hashlib
import numpy as np
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.5';manifest=json.loads((BASE/'mixed-manifest.json').read_text());conv=json.loads((ROOT/'reports/v1.0.2/corrected/preparation.json').read_text())['velocityConversion'];rows=[];moments=[];sources={};edges=np.arange(-1000,1000+10,10)
for row in manifest:
 trial=BASE/row['file'];m=json.loads(trial.read_text());original=ROOT/m['meta']['version105']['parent']
 for label,source in[('original104',original),('MIX105',trial)]:
  sources[source.relative_to(ROOT).as_posix()]=hashlib.sha256(source.read_bytes()).hexdigest();d=json.loads(source.read_text());p=np.asarray(d['positions']).reshape(-1,3);v=np.asarray(d['velocities']).reshape(-1,3)/conv;w=np.asarray(d['masses']);tags=np.asarray(d['subpopulations']);R=np.hypot(p[:,0],p[:,1]);vR=np.divide(p[:,0]*v[:,0]+p[:,1]*v[:,1],R,out=np.zeros(len(R)),where=R>0);vphi=np.divide(p[:,0]*v[:,1]-p[:,1]*v[:,0],R,out=np.zeros(len(R)),where=R>0)
  for pop in range(4):
   for lo,hi in[(0,2),(2,4),(4,6),(6,8),(8,10),(10,12),(12,20),(20,1000)]:
    sel=(tags==pop)&(R>=lo)&(R<hi);W=sum(w[sel]);n=int(sum(sel))
    if not n:continue
    for axis,vel in[('R',vR),('phi',vphi),('z',v[:,2])]:
     values=vel[sel];weights=w[sel];mean=sum(values*weights)/W;variance=sum(weights*(values-mean)**2)/W;hist=np.histogram(values,edges,weights=weights)[0]/W;moments.append({'preparation':label,'seed':row['baryonSeed'],'population':pop,'Rlower':lo,'Rupper':hi,'count':n,'axis':axis,'meanKmS':float(mean),'sigmaKmS':float(np.sqrt(variance)),'outOfHistogramMassFraction':float(sum(weights[(values<edges[0])|(values>=edges[-1])])/W)})
     for i,h in enumerate(hist):rows.append([label,row['baryonSeed'],pop,lo,hi,n,axis,float(edges[i]),float(edges[i+1]),float(h),float(h/10)])
with(BASE/'initial-velocity-distributions.csv').open('w',encoding='utf8',newline='')as f:w=csv.writer(f);w.writerow(['preparation','seed','population','Rlower_kpc','Rupper_kpc','count','axis','velocity_lower_km_s','velocity_upper_km_s','mass_fraction','probability_density_per_km_s']);w.writerows(rows)
(BASE/'initial-velocity-moments.json').write_text(json.dumps({'schema':'empirical-velocity-distributions-105','sources':sources,'moments':moments,'qualification':'Empirical mass-weighted phase samples in fixed Cartesian cylindrical annuli; population tags fixed. Antipodal pairs are correlated. Histograms are not observational data or an exact continuum DF. Overflow explicitly recorded. Velocities before GPU upload, physical preparation conversion declared.'},indent=2)+'\n',encoding='utf8');print('Initial VDF histogram rows',len(rows),flush=True)
