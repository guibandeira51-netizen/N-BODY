"""Figures from preserved measurements, without new orbit integration."""
import csv
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'reports/disk-heating-live'
a = json.loads((OUT/'analysis.json').read_text(encoding='utf-8'))
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,
                     'axes.spines.right':False,'svg.fonttype':'none'})
t = np.array([s['time_Myr']/1000 for s in a['series']])
fig, axes = plt.subplots(2,2,figsize=(11,7),layout='constrained')
plots = [('h50_kpc',r'$h_{50}$ no plano próprio [kpc]','#22846e'),
         ('sigma_normal_km_s','Dispersão normal ao plano [km/s]','#3274ac'),
         ('R50_kpc','Raio cilíndrico de meia massa [kpc]','#8951a3'),
         ('direct_error_percent','Erro energético direto [%]','#bc6526')]
for ax,(key,label,color) in zip(axes.flat,plots):
    y = [s[key] for s in a['series']]
    ax.plot(t,y,'-',color=color,lw=1,alpha=.75)
    ax.scatter(t,y,s=6,color=color,zorder=3)
    ax.set(xlabel='Tempo físico [Gyr]',ylabel=label)
    ax.grid(alpha=.18)
    if key=='direct_error_percent':
        ax.axhline(0,color='#555',lw=.7,ls='--')
        ax.ticklabel_format(axis='y',style='sci',scilimits=(0,0))
fig.suptitle('Execução preservada: engrossamento e expansão com energia total bem conservada',fontsize=13)
fig.supxlabel('49.796 corpos; 199 estados reais. Segmentos apenas guiam a leitura entre amostras.',fontsize=9)
for ext in ['svg','png']:
    fig.savefig(OUT/f'evolucao-estrutural.{ext}',dpi=180)
plt.close(fig)

fig,axes=plt.subplots(1,2,figsize=(11,4.8),layout='constrained')
first,last=a['snapshotResults'][0],a['snapshotResults'][-1]
labels=['0–2','2–4','4–8','8–12','12–20','20–30','≥30']
x=np.arange(len(labels))
for shift,s,color,label in [(-.18,first,'#3274ac','Inicial'),(.18,last,'#bc6526','9,90 Gyr')]:
    axes[0].bar(x+shift,[c['h50Kpc'] for c in s['cohorts']],.36,color=color,label=label)
axes[0].set(xticks=x,xticklabels=labels,xlabel='Raio inicial da mesma população [kpc]',ylabel=r'$h_{50}$ no plano próprio [kpc]')
axes[0].set_title('As mesmas partículas engrossam')
axes[0].legend(frameon=False)
energies={0:[],2:[]}
with (OUT/'individual-disk-binding.csv').open(encoding='utf-8',newline='') as f:
    for row in csv.DictReader(f):
        index=int(row['snapshot'])
        if index in energies: energies[index].append(float(row['specific_energy_kpc2_Myr2']))
for index,color,label in [(0,'#3274ac','Inicial'),(2,'#bc6526','9,90 Gyr')]:
    e=np.sort(energies[index])
    axes[1].step(e,np.arange(1,len(e)+1)/len(e),where='post',color=color,lw=1.3,label=label)
axes[1].axvline(0,color='#444',lw=1,ls='--')
axes[1].set(xlabel=r'Energia específica individual [kpc²/Myr²]',ylabel='Fração acumulada do disco',ylim=(0,1.02))
axes[1].set_title('0 / 22.409 partículas com energia positiva')
axes[1].legend(frameon=False)
for ax in axes: ax.grid(axis='y',alpha=.18)
fig.suptitle('Aquecimento de partículas ligadas: avaliação direta Float64',fontsize=13)
fig.supxlabel('Energia instantânea no potencial vivo; não certifica ausência de escape entre snapshots.',fontsize=9)
for ext in ['svg','png']:fig.savefig(OUT/f'populacoes-e-ligacao.{ext}',dpi=180)
plt.close(fig)
