"""Reanalyse preserved fields and trajectories; never rerun or rewrite them."""
from model import *
if __name__=='__main__':
 base=ROOT/'reports/v1.0.5';a=json.loads((base/'analysis.json').read_text());ts=list(csv.DictReader((base/'time-series.csv').open(encoding='utf-8-sig')));es=list(csv.DictReader((base/'energy-series.csv').open(encoding='utf-8-sig')));series=[];energies=[];used={}
 for label in['A-original','B-original','E','F']:
  runs=[r for r in a['runs']if r['label']==label and r['duration']==200];assert len(runs)==3
  buckets={}
  for run in runs:
   used[run['path']]=run['sha256'];rows=[r for r in ts if r['id']==run['id']and r['pop']=='thin'];h0=float(rows[0]['h50'])
   for r in rows:buckets.setdefault(float(r['time']),[]).append(100*(float(r['h50'])/h0-1))
   if label=='F':
    for r in es:
     if r['id']==run['id']:energies.append(dict(id=run['nativeId'],seed=run['seed'],time_Myr=float(r['time']),relative_energy_error=float(r['deltaE'])))
  for t,v in sorted(buckets.items()):series.append(dict(model=label,time_Myr=t,mean_growth_percent=float(np.mean(v)),sd_growth_percent=float(np.std(v,ddof=1)),n=len(v)))
 table('stability.csv',series);table('energy.csv',energies)
 fieldpath=ROOT/'reports/v1.0.4/field-audit.json';f=json.loads(fieldpath.read_text());draws=[d for d in f['draws']if d['family']=='E'];assert len(draws)==3;contrast=[]
 for k,pt in enumerate(f['pointsKpc']):
  if pt[2]!=0 or pt[0]<4:continue
  forces=np.array([np.sum(np.array(d['populationForces']),axis=0)[k]for d in draws]);ref=np.array(f['expectedPlummerMean'][k]);contrast.append(dict(R_kpc=pt[0],reference_aR_kpc_Myr2=float(ref[0]),ensemble_aR_kpc_Myr2=float(np.mean(forces[:,0])),sd_aR_kpc_Myr2=float(np.std(forces[:,0],ddof=1)),fractional_mean_radial_difference=float(np.mean(forces[:,0])/ref[0]-1),n=3))
 table('smooth-nbody-field.csv',contrast)
 dump('validation.json',{'schema':'reused-validation-106','newNBodyRuns':0,'horizonMyr':200,'Fcounts':[1500,7092,954,160000],'FNtotal':169546,'thinGrowthMeanPercent':next(g for g in a['groups']if g['label']=='F')['metrics']['thinGrowth']['mean'],'thinGrowthSDPercent':next(g for g in a['groups']if g['label']=='F')['metrics']['thinGrowth']['sd'],'structuralConclusion':'Estacionariedade estrutural e convergência global não demonstradas. F tem apenas a menor estimativa pontual entre E105/F105 pareados.','energyMaxAbsF':max(abs(r['relative_energy_error'])for r in energies),'energyMethod':'GPU direta Float32 KDK dt0.05Myr epsilon0.1kpc; Hamiltoniano direto compensado Float64 com parâmetros efetivos f32. Três realizações F105 completas. Não é energia Barnes–Hut.','h50Definition':'Mediana ponderada da distância absoluta ao plano próprio de cada população. Mudanças relativas ao próprio início. Faixas são SD entre três realizações, não CI.','ensembleScope':'E105/F105: mesmos bárions2026, três halos. A/B: três realizações bariônicas. Não misturar legacy80000 total/1.51Gyr com E104/F105.','sources':used,'derivedSourceSHA256':{str(p.relative_to(ROOT)).replace('\\','/'):sha(p)for p in[base/'analysis.json',base/'time-series.csv',base/'energy-series.csv',fieldpath]},'fieldExperimentD':{'source':'reports/v1.0.4/field-audit.json','family':'E104','n':89546,'seeds':[2026,2027,2028],'arithmetic':f['arithmetic'],'scope':f['qualification'],'table':'smooth-nbody-field.csv','interpretation':'Initial direct Plummer particle field versus corresponding Plummer continuum, never mean stellar vphi versus circular speed. Ensemble fluctuations include baryon and halo sampling. Unsmooothed106 field is a separate reference, not silently compared with softened particles. No new physical trajectories.'}})
 print('Reused12 historical trajectories and initial E104 field experiment; zero new N-body integrations')
