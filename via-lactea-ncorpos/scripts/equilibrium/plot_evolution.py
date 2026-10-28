"""Show radial diagnostics and conservation from actual preserved run records."""
from pathlib import Path
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
out=Path(__file__).resolve().parents[2]/'reports/v1.0.0'
for rid in ['calibrated-A-10k','calibrated-B-26k','calibrated-fixed']:
 file=out/'runs'/(rid+'.json')
 if not file.exists():continue
 run=json.loads(file.read_text(encoding='utf8'));fig,ax=plt.subplots(3,3,figsize=(13,11),layout='constrained')
 for s in run['samples']:
  if s['timeMyr'] not in [0,20,200,1000]:continue
  rings=[r for r in s['disk']['rings'] if r['count']>=20 and r['upper'] is not None];R=[r['radius'] for r in rings];label=f"{s['timeMyr']} Myr"
  quantities=[([r['surfaceDensity']*1e4 for r in rings],'Σ [M☉/pc²]'),([r['globalPlane']['h50'] for r in rings],'h50 · plano global [kpc]'),([r['globalPlane']['sigmaNormal']/.001022712165 for r in rings],'σ normal [km/s]'),([r['sigmaR']/.001022712165 for r in rings],'σR [km/s]'),([r['sigmaPhi']/.001022712165 for r in rings],'σφ [km/s]'),([r['Qconditional'] for r in rings],'Q condicional [adimensional]'),([next(m['amplitude'] for m in r['modes'] if m['m']==2) for r in rings],'A2 [adimensional]'),([r['globalPlane']['medianSignedHeight'] for r in rings],'Mediana de altura assinada [kpc]'),([(r['localPlane'] or {}).get('tiltFromGlobalDegrees') for r in rings],'Inclinação local/global [graus]')]
  for axes,(values,ylabel) in zip(ax.flat,quantities):axes.plot(R,values,marker='.',label=label);axes.set(xlabel='R instantâneo [kpc]',ylabel=ylabel);axes.grid(alpha=.2)
 ax[0,0].set_yscale('log');ax[0,0].legend();fig.suptitle(rid+' · anéis instantâneos ponderados por massa; mistura fino+espesso',fontsize=12);fig.savefig(out/(rid+'-radial.png'),dpi=160);fig.savefig(out/(rid+'-radial.pdf'));plt.close(fig)
fig,ax=plt.subplots(2,2,figsize=(11,8),layout='constrained')
for rid in ['legacy-10k','df-A-10k','calibrated-A-10k','calibrated-B-14k','calibrated-fixed','calibrated-A-50k']:
 file=out/'runs'/(rid+'.json')
 if not file.exists():continue
 run=json.loads(file.read_text(encoding='utf8'));t=[s['timeMyr'] for s in run['samples']]
 data=[[s['errors']['energy'] for s in run['samples']],[s['errors']['momentum'] for s in run['samples']],[s['conservation']['angularMomentum'][2] for s in run['samples']],[next(c['R50'] for c in s['structure']['components'] if c['id']==1) for s in run['samples']]]
 for axes,y in zip(ax.flat,data):axes.plot(t,y,label=rid,linewidth=1.2)
for axes,ylabel in zip(ax.flat,['ΔE/|E0| · diagnóstico BH aproximado','Erro P escalado · campo externo admite força líquida','Lz [10¹⁰ M☉ kpc²/Myr]','R½ disco [kpc]']):axes.set(xlabel='Tempo físico [Myr]',ylabel=ylabel);axes.grid(alpha=.2)
ax[0,0].legend(fontsize=8);fig.suptitle('Conservação numérica e estrutura: diagnósticos distintos',fontsize=12);fig.savefig(out/'conservation-and-structure.png',dpi=170);fig.savefig(out/'conservation-and-structure.pdf');plt.close(fig)
print('Saved radial/conservation figures from actual completed runs.')
