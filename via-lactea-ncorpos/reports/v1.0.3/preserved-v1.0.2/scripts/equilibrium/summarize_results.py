"""Generate tables and scientific figures from actual completed experiments only."""
from pathlib import Path
import csv,json,argparse,math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def ratio(x,y):return 100*(y/x-1) if x not in (None,0) and y is not None else None
def load(p):return json.loads(p.read_text(encoding='utf8'))
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2]);a=p.parse_args();root=a.root.resolve();out=root/'reports/v1.0.0';rows=[];series=[];runs=[];failed=[]
 for f in sorted((out/'runs').glob('*.json')):
  r=load(f)
  if r.get('status')!='completed':failed.append({'file':f.name,'status':r.get('status'),'lastTimeMyr':r.get('lastTimeMyr'),'error':r.get('error')});continue
  c=r['config'];start=r['samples'][0];runs.append(r)
  for s in r['samples']:
   disk=s['disk'];stellar=next(v for v in s['structure']['components'] if v['id']==1);bulge=next(v for v in s['structure']['components'] if v['id']==0)
   row={'run':r['id'],'model':s['modelId'],'n':s['n'],'dt_Myr':c['dt'],'epsilon_kpc':c['epsilon'],'seed':c.get('seed'),'haloSeed':c.get('haloSeed',c.get('seed')),'time_Myr':s['timeMyr'],'h50_fixed_kpc':disk['fixed']['h50'],'h50_instant_kpc':disk['instant']['h50'],'h50_instant_change_percent':ratio(start['disk']['instant']['h50'],disk['instant']['h50']),'sigma_normal_kpc_Myr':disk['instant']['sigmaNormal'],'sigma_normal_change_percent':ratio(start['disk']['instant']['sigmaNormal'],disk['instant']['sigmaNormal']),'Rhalf_disk_kpc':stellar['R50'],'rhalf_bulge_kpc':bulge['r50'],'geometric_tilt_deg':disk['plane']['tiltDegrees'],'energy_error_approx':s['errors']['energy'],'energy_is_approximate':s['conservation']['energyApproximate']}
   series.append(row)
   if s['timeMyr'] in [0,20,200,1000]:rows.append(row)
 for name,data in [('summary.csv',rows),('series.csv',series)]:
  if data:
   with (out/name).open('w',encoding='utf-8-sig',newline='') as f:w=csv.DictWriter(f,fieldnames=list(data[0]));w.writeheader();w.writerows(data)
 # Compact synthesis with baseline and common epochs; no invented acceptance line.
 audit=load(out/'agama/preparation.json') if (out/'agama/preparation.json').exists() else {}
 table=load(out/'agama/halo-fixed-grid.json') if (out/'agama/halo-fixed-grid.json').exists() else {}
 backend=load(out/'backend-checks.json') if (out/'backend-checks.json').exists() else {}
 comparison={}
 index={r['id']:r for r in runs}
 for rid in index:
  if rid=='legacy-10k':continue
  r=index[rid];entry={};
  for T in [20,200,1000]:
   reference_id='calibrated-A-10k' if rid.startswith('calibrated-') else 'df-A-10k'
   s=next((x for x in r['samples'] if x['timeMyr']==T),None);base=next((x for x in index.get(reference_id,{}).get('samples',[]) if x['timeMyr']==T),None)
   if s and base:entry[str(T)]={k:ratio(base['disk']['instant'][k],s['disk']['instant'][k]) for k in ['h50','sigmaNormal']}
  comparison[rid]=entry
 plans=load(root/'scripts/equilibrium/protocol.json')['runs']+load(root/'scripts/equilibrium/protocol-calibrated.json')['runs'];done=set(r['id'] for r in runs);complete=all(r['id'] in done for r in plans);datasets={};frozen=[]
 for dataset in ['agama','agama-calibrated']:
  folder=out/dataset
  if not (folder/'preparation.json').exists():continue
  prep=load(folder/'preparation.json');info={'modelId':prep['config']['id'],'iterationConverged':prep['iterationConverged'],'lastForceChange':prep['lastForceChange'],'dfMassRelativeErrors':prep['dfMassRelativeErrors'],'finiteHaloTotalMsun':prep['finiteHaloTotalMsun'],'disks':prep['config']['disks']}
  for name in ['potential-grid-sensitivity','df-poisson-consistency','df-along-frozen-orbits']:
   file=folder/(name+'.json')
   if file.exists():
    q=load(file)
    if name=='potential-grid-sensitivity':info['potentialGridSensitivityPercentiles']=q['percentiles']
    if name=='df-poisson-consistency':info['absRelativePoissonResidualPercentiles']=np.quantile(np.abs(q['relativeTotalPoissonResidual']),[.5,.9,1]).tolist()
    if name=='df-along-frozen-orbits':info['fAlongOrbitChecks']=q['checks']
  if (folder/'density-profile-validation.json').exists():
   q=load(folder/'density-profile-validation.json');R=np.array(q['verticalRadiusKpc']);z=np.array(q['heightKpc']);heights=[]
   for values in q['densityThinThickMsunKpc3']:
    rho=np.array([np.interp(prep['config']['solarRadius'],R,np.array(values)[:,j]) for j in range(len(z))]);cdf=np.r_[0,np.cumsum((rho[:-1]+rho[1:])*np.diff(z)/2)];heights.append(float(np.interp(.5*cdf[-1],cdf,z)))
   info['measuredSolarMedianAbsZKpc']=heights;info['referenceExponentialSolarMedianAbsZKpc']=[d['referenceExponentialHeight']*math.log(2) for d in prep['config']['disks']]
  datasets[dataset]=info
  for file in folder.glob('*-frozen-analysis.json'):
   q=load(file);s0=q['samples'][0]
   frozen.append({'dataset':dataset,'snapshot':q['protocol']['snapshot'],'epochs':[{'timeMyr':s['timeMyr'],'h50':s['disk']['instant']['h50'],'sigmaNormal':s['disk']['instant']['sigmaNormal'],'h50ChangePercent':ratio(s0['disk']['instant']['h50'],s['disk']['instant']['h50']),'sigmaChangePercent':ratio(s0['disk']['instant']['sigmaNormal'],s['disk']['instant']['sigmaNormal']),'orbitalEnergyRelativeError':s['errors']['energy']} for s in q['samples']]})
 conclusion='Candidato AGAMA preparado e ensaiado, com controle de calibração vertical. As realizações permanecem em avaliação física e não foram promovidas a modelos de equilíbrio certificado.' if complete else f'Campanha em andamento: {len(runs)}/{len(plans)} ensaios preservados. Os candidatos ainda não estão validados.'
 assessment={'schema':'equilibrium-assessment-v1','status':'candidate-not-validated' if complete else 'in-progress','campaignComplete':complete,'publicConclusion':conclusion,'completedRuns':len(runs),'plannedRuns':len(plans),'failedOrPartialRuns':failed,'datasets':datasets,'frozenContinuumControls':frozen,'preparation':{'iterationConverged':audit.get('iterationConverged'),'lastForceChange':audit.get('lastForceChange'),'dfMassRelativeErrors':audit.get('dfMassRelativeErrors'),'finiteHaloTotalMsun':audit.get('finiteHaloTotalMsun')},'haloGridValidation':table.get('validation'),'backendChecks':backend,'rows':rows,'comparisonsAtMatchingEpochsPercent':comparison,'limits':['No universal percent-expansion acceptance criterion','SCM same-grid iteration convergence is not DF/grid/physical stability convergence','Model changes masses/profiles and omits gas; legacy-to-new difference is not initialization alone','Halo fixed field is unsoftened while particle interactions are Plummer','N-body long runs use GPU f32 and approximate BH energy diagnostic; short backend comparisons are not long-term f64 convergence','No artificial damping, velocity resets or decorative spirals']}
 if (out/'backend-checks-calibrated.json').exists():assessment['backendChecksCalibrated']=load(out/'backend-checks-calibrated.json')
 (out/'assessment.json').write_text(json.dumps(assessment,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf8')
 if runs:
  fig,ax=plt.subplots(2,2,figsize=(12,8),layout='constrained');colors=plt.get_cmap('tab10');selected=['legacy-10k','df-A-10k','df-B-14k','df-B-26k','df-fixed','df-A-50k','gaussian-same-density'] if 'calibrated-A-10k' not in index else ['legacy-10k','df-A-10k','calibrated-A-10k','calibrated-B-14k','calibrated-B-26k','calibrated-fixed','calibrated-A-50k','calibrated-gaussian-same-density']
  for j,rid in enumerate(selected):
   if rid not in index:continue
   r=index[rid];t=[s['timeMyr'] for s in r['samples']];h=[s['disk']['instant']['h50'] for s in r['samples']];sig=[s['disk']['instant']['sigmaNormal']/0.001022712165 for s in r['samples']];style='--' if rid=='legacy-10k' else '-'
   for plot,y in [(ax[0,0],h),(ax[0,1],sig),(ax[1,0],[100*(x/h[0]-1) for x in h]),(ax[1,1],[100*(x/sig[0]-1) for x in sig])]:plot.plot(t,y,style,label=rid,color=colors(j%10),linewidth=1.5)
  for plot in ax.flat:plot.set_xlabel('Tempo físico [Myr]');plot.grid(alpha=.2)
  ax[0,0].set_ylabel('h50 no plano instantâneo [kpc]');ax[0,1].set_ylabel('Dispersão normal [km/s]');ax[1,0].set_ylabel('Variação de h50 [%]');ax[1,1].set_ylabel('Variação da dispersão normal [%]');ax[0,0].legend(fontsize=8);fig.suptitle('Evolução N-corpos medida — equilíbrio e estabilidade permanecem em avaliação',fontsize=12);fig.savefig(out/'comparison.png',dpi=170);fig.savefig(out/'comparison.pdf');plt.close(fig)
  fig,ax=plt.subplots(1,2,figsize=(11,4),layout='constrained')
  for j,rid in enumerate(['df-A-10k','df-dt-half','df-epsilon-half','df-epsilon-double','df-A-h27','df-A-s27']):
   if rid not in index:continue
   ss=[s for s in index[rid]['samples'] if s['timeMyr']<=200];t=[s['timeMyr'] for s in ss];ax[0].plot(t,[s['disk']['instant']['h50'] for s in ss],label=rid);ax[1].plot(t,[s['disk']['instant']['sigmaNormal']/0.001022712165 for s in ss],label=rid)
  for plot in ax:plot.set_xlabel('Tempo físico [Myr]');plot.grid(alpha=.2);plot.legend(fontsize=7)
  ax[0].set_ylabel('h50 instantâneo [kpc]');ax[1].set_ylabel('Dispersão normal [km/s]');fig.savefig(out/'numerical-sensitivity.png',dpi=170);plt.close(fig)
 print(json.dumps({'completedRuns':len(runs),'rows':len(rows),'failedOrPartial':len(failed),'output':str(out)},ensure_ascii=False))

if __name__=='__main__':main()
