"""Figures from recorded states only. Python 3 + NumPy + Matplotlib.
Run from app root; optional first argument is historical-states-09.json.
"""
import csv,json,sys
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports'/'v0.9.0'
plt.rcParams.update({'font.size':9,'axes.spines.top':False,'axes.spines.right':False,'figure.dpi':140,'savefig.dpi':180})
def save(fig,name):
    fig.savefig(REPORT/(name+'.png'),bbox_inches='tight')
    fig.savefig(REPORT/(name+'.pdf'),bbox_inches='tight')
    plt.close(fig)
def load(name):return json.loads((REPORT/name).read_text(encoding='utf-8'))
hist=load('historical-disk-analysis.json')['samples']
t=[s['timeMyr'] for s in hist]
fig,ax=plt.subplots(1,3,figsize=(11,3.1),layout='constrained')
ax[0].plot(t,[s['disk']['fixed']['h50'] for s in hist],'o-',label='Plano inicial z=0')
ax[0].plot(t,[s['disk']['instant']['h50'] for s in hist],'s-',label='Plano robusto instantâneo')
ax[0].set(ylabel='h50 (kpc)');ax[0].legend(fontsize=7)
ax[1].plot(t,[s['disk']['instant']['sigmaNormal'] for s in hist],'o-',color='#b85b25');ax[1].set(ylabel='σ normal (kpc/Myr)')
for aperture in [10,20,30]:
    ax[2].plot(t,[next(a for a in s['apertureSensitivity'] if a['apertureKpc']==aperture)['plane']['tiltDegrees'] for s in hist],'o-',label=f'Abertura {aperture} kpc')
ax[2].set(ylabel='Inclinação geométrica (graus)');ax[2].legend(fontsize=7)
for a in ax:a.set(xlabel='Tempo físico (Myr)');a.grid(alpha=.2)
fig.suptitle('Reprodução histórica — 50.000 partículas, GPU f32, dt=0,1 Myr, ε=0,1 kpc\nPontos medidos; segmentos unem estados, sem representar integrações intermediárias',fontsize=10)
save(fig,'historical-thickness')
fig,axes=plt.subplots(2,2,figsize=(9,6),layout='constrained')
for m,a in zip([1,2,3,4],axes.flat):
    for s in hist:
        bins=s['disk']['rings'];a.plot([b['radius'] for b in bins],[b['modes'][m-1]['amplitude'] for b in bins],'o-',ms=3,label=f"{s['timeMyr']:g} Myr")
    a.set(xlabel='R no plano instantâneo (kpc)',ylabel=f'A{m}',title=f'm={m}',xlim=(0,25));a.grid(alpha=.2)
axes[0,0].legend(fontsize=7);fig.suptitle('Distribuição de massa — modos azimutais históricos\nA2 pode representar barra; amplitude não identifica sozinha um braço espiral',fontsize=10)
save(fig,'historical-modes')
if (REPORT/'analysis.json').exists():
    data=load('analysis.json');rows=list(csv.DictReader((REPORT/'time-series.csv').open(encoding='utf-8-sig',newline='')))
    for base in [10000,50000]:
        selected=[r for r in data['summary'] if r['baseN']==base and r['baryonSeed']==2026 and r['dt']==.1 and r['epsilon']==.1]
        if not selected:continue
        fig,axes=plt.subplots(1,3,figsize=(12,3.3),layout='constrained')
        for r in selected:
            points=[p for p in rows if p['run_id']==r['id']];x=[float(p['time_Myr']) for p in points]
            label=f"{r['label']} Nh={r.get('haloCount',0)}, s={r.get('haloSeed','—')}"
            for a,key in zip(axes,['h50_instant_kpc','sigmaNormal_kpc_Myr','deltaE_signed']):a.plot(x,[float(p[key]) if p[key] else np.nan for p in points],label=label,lw=1)
        for a,y in zip(axes,['h50 instantâneo (kpc)','σ normal (kpc/Myr)','ΔE/|E0| — U por árvore']):a.set(xlabel='Tempo físico (Myr)',ylabel=y);a.grid(alpha=.2)
        axes[0].legend(fontsize=6);fig.suptitle(f'Halos A/B/C — resolução bariônica correspondente a Nbase={base}\nMesmas partículas bariônicas iniciais; C remove a resposta do halo e sua granulação',fontsize=10)
        save(fig,f'halo-comparison-{base}')
    modeRows=list(csv.DictReader((REPORT/'modes.csv').open(encoding='utf-8-sig',newline='')))
    ringRows=list(csv.DictReader((REPORT/'rings.csv').open(encoding='utf-8-sig',newline='')))
    fig,axes=plt.subplots(2,2,figsize=(10,6),layout='constrained')
    for r in data['summary']:
        if r['baseN']!=10000 or r['baryonSeed']!=2026 or r.get('haloSeed',2026)!=2026 or r['dt']!=.1 or r['epsilon']!=.1:continue
        q=[p for p in ringRows if p['run_id']==r['id'] and p['R_lower_kpc']=='4'];a2=[p for p in modeRows if p['run_id']==r['id'] and p['R_lower_kpc']=='4' and p['m']=='2'];label=f"{r['label']} Nh={r.get('haloCount',0)}"
        for ax,points,key in [(axes[0,0],a2,'amplitude'),(axes[0,1],q,'sigmaR_kpc_Myr'),(axes[1,0],q,'Q_conditional'),(axes[1,1],q,'Sigma_1e10Msun_kpc2')]:ax.plot([float(p['time_Myr']) for p in points],[float(p[key]) if p[key] else np.nan for p in points],label=label,lw=1)
    for a,y in zip(axes.flat,['A2','σR (kpc/Myr)','Q condicional','Σ (10¹⁰ M☉/kpc²)']):a.set(xlabel='Tempo físico (Myr)',ylabel=y);a.grid(alpha=.2)
    axes[0,0].legend(fontsize=7);fig.suptitle('Anel 4–6 kpc no plano instantâneo — evolução conjunta\nSéries autocorrelacionadas; comparação descritiva não determina causalidade',fontsize=10)
    save(fig,'heating-and-modes')
if len(sys.argv)>1:
    states=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    chosen=[states[i] for i in [0,2,3,-1]]
    Hs=[]
    for s in chosen:
        p=np.array(s['positions']).reshape(-1,3);c=np.array(s['components']);w=np.array(s['masses']);H,xe,ye=np.histogram2d(p[c==1,0],p[c==1,1],bins=160,range=[[-20,20],[-20,20]],weights=w[c==1]);Hs.append(H/.25**2)
    positive=np.concatenate([h[h>0] for h in Hs]);vmin=positive.min();vmax=positive.max()
    fig,axes=plt.subplots(1,4,figsize=(12,3.5),layout='constrained')
    for a,s,H in zip(axes,chosen,Hs):
        image=a.imshow(np.ma.masked_equal(H.T,0),origin='lower',extent=[-20,20,-20,20],norm=LogNorm(vmin=vmin,vmax=vmax),cmap='magma',interpolation='nearest');a.set(title=f"t={s['timeMyr']:g} Myr",xlabel='x inicial (kpc)',ylabel='y inicial (kpc)')
    fig.colorbar(image,ax=axes,label='Σ projetada (10¹⁰ M☉/kpc²)',shrink=.7)
    fig.suptitle('Partículas reais da reprodução histórica — projeção fixa e escala de cor compartilhada\nAmostragem inicial axisimétrica; bins de 0,25 kpc, sem estrelas gráficas adicionais',fontsize=10)
    save(fig,'historical-density')
print('Scientific figures generated in',REPORT)
