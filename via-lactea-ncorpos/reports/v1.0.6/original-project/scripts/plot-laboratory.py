"""Measured campaign figures. Requires numpy and matplotlib; no synthetic data."""
from pathlib import Path
import json, csv, platform, hashlib
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports/laboratory'
source=OUT/'convergence.json'
data=json.loads(source.read_text(encoding='utf-8'))
if not data['completedUTC']: raise RuntimeError('Campaign has not completed')
runs=data['runs']
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none','savefig.dpi':180})
def baseline(c): return c['duration']==20 and c['dt']==.1 and c['epsilon']==.1 and c['theta']==.5 and c['algorithm']=='barnes-hut'
def comp(sample,c): return next(x for x in sample['components'] if x['id']==c)
def save(fig,name):
    fig.text(.01,.005,'Fonte: integração local real · Guilherme Aleixo Bandeira · UEMS. Energia exata por pares Plummer.',fontsize=8)
    fig.tight_layout(rect=(0,.035,1,.97))
    for ext in ['png','svg','pdf']: fig.savefig(OUT/f'{name}.{ext}')
    plt.close(fig)

fig,axes=plt.subplots(2,2,figsize=(11,7))
for run in runs:
    if not baseline(run['config']) or run['config']['n']!=2000: continue
    samples=run['samples'];t=[s['timeMyr'] for s in samples];seed=run['config']['seed'];a=samples[0]
    series=[[100*(comp(s,0)['r50']/comp(a,0)['r50']-1) for s in samples],
            [100*(comp(s,1)['massMedianAbsZ']/comp(a,1)['massMedianAbsZ']-1) for s in samples],
            [comp(s,1)['velocity']['dispersion'][2]*s['velocityKmSFactor'] for s in samples],
            [100*(s['conservation']['energy']-a['conservation']['energy'])/abs(a['conservation']['energy']) for s in samples]]
    for ax,y in zip(axes.flat,series): ax.plot(t,y,'o-',label=f'Semente {seed}',ms=4)
for ax,label in zip(axes.flat,['Δ r½ do bojo (%)','Δ h50 do disco (%)','σz global do disco (km/s)','Δ E / |E₀| (%)']): ax.set(xlabel='Tempo físico (Myr)',ylabel=label);ax.grid(alpha=.2);ax.legend(fontsize=8)
fig.suptitle('N = 2.000 · Barnes–Hut θ = 0,5 · dt = 0,1 Myr · ε = 0,1 kpc')
save(fig,'evolucao-20Myr')

fig,axes=plt.subplots(1,3,figsize=(12,4.3))
for seed in [2026,2027,2028]:
    for ax,kind,label in zip(axes,['n','dt','epsilon'],['Número de partículas N','Passo dt (Myr)','Suavização ε (kpc)']):
        subset=[]
        for run in runs:
            c=run['config']
            if c['seed']!=seed or c['duration']!=20 or c['theta']!=.5 or c['algorithm']!='barnes-hut':continue
            if kind!='n' and c['n']!=2000:continue
            if kind!='dt' and c['dt']!=.1:continue
            if kind!='epsilon' and c['epsilon']!=.1:continue
            subset.append(run)
        subset.sort(key=lambda r:r['config'][kind]);ax.plot([r['config'][kind] for r in subset],[100*r['changes'][1]['h50'] for r in subset],'o-',label=str(seed));ax.set(xlabel=label,ylabel='Δ h50 do disco em 20 Myr (%)');ax.grid(alpha=.2)
axes[0].legend(title='Semente');fig.suptitle('Sensibilidade controlada; três realizações, sem certificação de convergência')
save(fig,'sensibilidade')

fig,axes=plt.subplots(1,2,figsize=(10,4.2))
for run in runs:
    if run['config']['duration']!=200:continue
    samples=run['samples'];a=samples[0];t=[s['timeMyr'] for s in samples]
    axes[0].plot(t,[100*(comp(s,1)['massMedianAbsZ']/comp(a,1)['massMedianAbsZ']-1) for s in samples],'o-',label=str(run['config']['seed']),ms=3)
    axes[1].plot(t,[100*(comp(s,0)['r50']/comp(a,0)['r50']-1) for s in samples],'o-',ms=3)
for ax,label in zip(axes,['Δ h50 do disco (%)','Δ r½ do bojo (%)']):ax.set(xlabel='Tempo físico (Myr)',ylabel=label);ax.grid(alpha=.2)
axes[0].legend(title='Semente');fig.suptitle('N = 1.000 · 200 Myr · experimento de baixa resolução, não limite não colisional')
save(fig,'evolucao-200Myr')

gpu_source=OUT/'gpu-resolution.json'
if gpu_source.exists():
    gpu=json.loads(gpu_source.read_text(encoding='utf-8'))
    if gpu.get('status')!='completed': raise RuntimeError('GPU campaign incomplete')
    fig,axes=plt.subplots(1,2,figsize=(10,4.2))
    for ax,n in zip(axes,[10000,50000]):
        for run in gpu['runs']:
            if run['config']['n']!=n:continue
            samples=run['samples'];a=samples[0]
            ax.plot([s['timeMyr'] for s in samples],[100*(comp(s,1)['massMedianAbsZ']/comp(a,1)['massMedianAbsZ']-1) for s in samples],'o-',label=str(run['config']['seed']),ms=4)
        ax.set(xlabel='Tempo físico (Myr)',ylabel='Δ h50 do disco (%)',title=f'N = {n:,}');ax.legend(title='Semente');ax.grid(alpha=.2)
    fig.suptitle('GPU direta Float32 · dt = 0,1 Myr · ε = 0,1 kpc')
    fig.text(.01,.005,'Fonte: estados integrados GPU · U destes experimentos é aproximada por árvore; gráfico usa posições.',fontsize=8)
    fig.tight_layout(rect=(0,.035,1,.97))
    for ext in ['png','svg','pdf']:fig.savefig(OUT/f'resolucao-gpu.{ext}')
    plt.close(fig)

with (OUT/'resultados-resumo.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.writer(f);w.writerow(['N','seed','dt_Myr','epsilon_kpc','theta','force','duration_Myr','bulge_r50_change_percent','disk_R50_change_percent','disk_h50_change_percent','disk_sigmaZ_change_percent','energy_signed_percent','wall_seconds'])
    for r in runs:
        c=r['config'];w.writerow([c['n'],c['seed'],c['dt'],c['epsilon'],c['theta'],c['algorithm'],c['duration'],100*r['changes'][0]['r50'],100*r['changes'][1]['R50'],100*r['changes'][1]['h50'],100*r['changes'][1]['sigmaZ'],100*r['energyDrift'],r['wallMs']/1000])
with (OUT/'series-temporais.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.writer(f);w.writerow(['run','N','seed','dt_Myr','epsilon_kpc','theta','force','time_Myr','component','r50_kpc','R50_kpc','h50_kpc','sigmaR_kpc_Myr','sigmaPhi_kpc_Myr','sigmaZ_kpc_Myr','K','U','E','W'])
    for i,r in enumerate(runs):
        c=r['config']
        for s in r['samples']:
            for a in s['components']:w.writerow([i,c['n'],c['seed'],c['dt'],c['epsilon'],c['theta'],c['algorithm'],s['timeMyr'],a['name'],a['r50'],a['R50'],a['massMedianAbsZ'],*a['velocity']['dispersion'],s['conservation']['kinetic'],s['conservation']['potential'],s['conservation']['energy'],s['virial']['W']])
stats=[]
for n in [1000,2000,4000]:
    selected=[r for r in runs if baseline(r['config']) and r['config']['n']==n]
    values=np.array([100*r['changes'][1]['h50'] for r in selected]);mean=float(values.mean());sd=float(values.std(ddof=1));interval=4.302652729911275*sd/np.sqrt(3)
    stats.append({'N':n,'seeds':3,'diskHeightChangeMeanPercent':mean,'sampleSDPercent':sd,'exploratoryMean95TInterval':[mean-interval,mean+interval], 'assumption':'Independent seeds, approximate normal distribution of changes; three seeds insufficient to validate this assumption or global equilibrium.'})
summary=json.loads((OUT/'convergence-summary.json').read_text(encoding='utf-8'))
summary['ensemble']=stats
summary['conclusion']='Espessamento do disco em todas as realizações de 20 Myr; mudanças não eliminadas por refinamento temporal ou força direta. Convergência espacial e equilíbrio global não demonstrados.'
(OUT/'convergence-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'plot-provenance.json').write_text(json.dumps({'python':platform.python_version(),'numpy':np.__version__,'matplotlib':matplotlib.__version__,'inputSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'ensembles':stats},indent=2),encoding='utf-8')
print(json.dumps(stats,indent=2))
