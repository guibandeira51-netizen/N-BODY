"""Eight measured stage-1 figures. Halo/baryon refinement plots await stage 2.
Every plotted value is exported; no synthetic long-time/untested-N curves.
"""
from pathlib import Path
import json,hashlib,csv
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.2';OUT=BASE/'figures';OUT.mkdir(exist_ok=True)
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.grid':True,'grid.alpha':.2,'svg.fonttype':'none'})
SOURCES={};FIGURES=[];ROWS=[];KM=977.7922216807891
def load(path):
 p=ROOT/path;SOURCES[path]=hashlib.sha256(p.read_bytes()).hexdigest();return json.loads(p.read_text())
def draw(ax,x,y,label,color=None,style='-',marker=None):
 x=np.asarray(x);y=np.asarray(y);ok=np.isfinite(x)&np.isfinite(y)
 ax.plot(x[ok],y[ok],label=label,color=color,ls=style,marker=marker,lw=1.5,ms=4)
 ROWS.extend([[label,float(a),float(b)] for a,b in zip(x[ok],y[ok])])
def finish(fig,axes,id,title,note,number):
 global ROWS
 for ax in np.asarray(axes).ravel():
  if ax.get_legend_handles_labels()[0]:ax.legend(fontsize=8)
 fig.suptitle(title,fontsize=17,fontweight='bold');fig.text(.05,.015,note,fontsize=9,color='#45545c',va='bottom',wrap=True);fig.tight_layout(rect=[0,.1,1,.94])
 fig.savefig(OUT/(id+'.png'),dpi=180);fig.savefig(OUT/(id+'.svg'));plt.close(fig)
 with (OUT/(id+'.csv')).open('w',newline='',encoding='utf8') as f:w=csv.writer(f);w.writerow(['series','x_physical_units_as_labelled','y_physical_units_as_labelled']);w.writerows(ROWS)
 FIGURES.append({'id':id,'requestedNumber':number,'title':title,'path':f'reports/v1.0.2/figures/{id}.png','svgPath':f'reports/v1.0.2/figures/{id}.svg','dataPath':f'reports/v1.0.2/figures/{id}.csv','limitations':note,'sources':[{'path':p,'sha256':h}for p,h in SOURCES.items()]});ROWS=[];print(id,flush=True)
gpu={};cpu={};smooth={}
for p in (BASE/'gpu').glob('*.json'):
 r=load(p.relative_to(ROOT).as_posix())
 if r.get('status')=='completed':gpu[(r['family'],r['config']['seed'])]=r
for p in (BASE/'runs').glob('*.json'):
 r=load(p.relative_to(ROOT).as_posix())
 if r['id'].startswith('C-'):cpu[(r['family'],r['config']['seed'])]=r
 else:smooth[(r['family'],r['config']['seed'])]=r
proof=load('reports/v1.0.2/field-proof/proof.json');field=load('reports/v1.0.2/field-validation/field.json');freq=load('reports/v1.0.2/field-validation/frequencies.json');ensemble=load('reports/v1.0.2/field-validation/ensemble.json');prep=load('reports/v1.0.2/corrected/preparation.json');conv=prep['velocityConversion']
colors={'baseline':'#c46d24','corrected':'#176d87','baseline-softened':'#8c648c'}
# 1: hold each source density explicit; corrected fit/reference are same density.
fig,axes=plt.subplots(2,2,figsize=(12,8))
for family,data,point_key,phi_key,force_key in [('Anterior: preparação Newtoniana',proof,'positions','potentialNewtonian','forceNewtonian'),('Anterior: média Plummer esperada',proof,'positions','potentialHighQuadrature','forceHighQuadrature'),('Novo: preparação Plummer',field,'pointsKpc','potentialKm2S2','forceKm2S2PerKpc'),('Novo: referência refinada',field,'pointsKpc','referencePotentialKm2S2','referenceForceKm2S2PerKpc')]:
 pts=np.array(data[point_key]);pick=pts[:,2]==.1;x=pts[pick,0];f=np.array(data[force_key])[pick];phi=np.array(data[phi_key])[pick]
 draw(axes[0,0],x,f[:,0]*conv**2,family);draw(axes[0,1],x,f[:,2]*conv**2,family);draw(axes[1,0],x,phi*conv**2,family)
for ax,label in [(axes[0,0],'a_R [kpc/Myr²]'),(axes[0,1],'a_z [kpc/Myr²]'),(axes[1,0],'Φ [kpc²/Myr²]')]:ax.set(xlabel='R [kpc], z = 0,1 kpc',ylabel=label)
draw(axes[1,1],freq['radiusKpc'],np.array(freq['original']['nu2PerMyr2']), 'Anterior: ν²');draw(axes[1,1],freq['radiusKpc'],np.array(freq['corrected']['nu2PerMyr2']), 'Novo: ν²');axes[1,1].set(xlabel='R [kpc], z = 0',ylabel='ν² [Myr⁻²]')
finish(fig,axes,'01-force-compatibility','Compatibilidade do campo de preparação','A densidade também se reajusta na solução nova. Ajuste nativo e referência refinada usam a MESMA densidade física; seus erros não incluem toda a incerteza da DF/malha.',1)
# 2: actual dense GPU series, all seeds; no averaged fictitious trajectory.
fig,axes=plt.subplots(1,2,figsize=(12,5))
for family in ['baseline','corrected']:
 for seed in [2026,2027,2028]:
  r=gpu[(family,seed)];t=[s['timeMyr']for s in r['samples']];h=[s['disk']['instant']['h50']for s in r['samples']]
  draw(axes[0],t,h,f'{family} · {seed}',colors[family],['-','--',':'][seed-2026]);draw(axes[1],t,100*(np.array(h)/h[0]-1),f'{family} · {seed}',colors[family],['-','--',':'][seed-2026])
axes[0].set(xlabel='Tempo [Myr]',ylabel='h₅₀ global instantâneo [kpc]');axes[1].set(xlabel='Tempo [Myr]',ylabel='Variação h₅₀ [%]')
finish(fig,axes,'02-global-thickness','Disco global: anterior e campo corrigido','N = 10.000; dt = 0,05 Myr; ε = 0,1 kpc; GPU direta Float32. Mesmas funções em ações/massas, novas amostras de fase. Sementes não tornam as posições iniciais idênticas.',2)
# 3: population own planes; dense CPU and measured GPU endpoints separate.
fig,axes=plt.subplots(2,2,figsize=(12,8))
for j,pop in enumerate(['thin','thick']):
 for family in ['baseline','corrected']:
  r=cpu[(family,2026)];draw(axes[0,j],[s['timeMyr']for s in r['samples']],[s['populations'][pop]['instant']['h50']for s in r['samples']],family,colors[family])
  for seed in [2026,2027,2028]:
   d=load('reports/v1.0.2/gpu-populations/'+gpu[(family,seed)]['id']+'.json')['samples'];draw(axes[1,j],[s['timeMyr']for s in d],[s['populations'][pop]['instant']['h50']for s in d],f'{family} · {seed}',colors[family],style='None',marker=['o','s','^'][seed-2026])
 axes[0,j].set(title=f'{pop} · CPU N=1.000, semente 2026',xlabel='Tempo [Myr]',ylabel='h₅₀ no plano próprio [kpc]');axes[1,j].set(title=f'{pop} · GPU N=10.000, estados completos',xlabel='Tempo [Myr]',ylabel='h₅₀ no plano próprio [kpc]')
finish(fig,axes,'03-population-thickness','Disco fino e espesso separados','Etiquetas iniciais preservadas. As populações GPU têm estados próprios completos somente em 0 e 20 Myr: pontos sem interpolar uma trajetória populacional não capturada.',3)
# 6: direct Hamiltonian, signed, sampled at known cadences.
fig,axes=plt.subplots(1,2,figsize=(12,5))
for j,pool in enumerate([cpu,gpu]):
 for family in ['baseline','corrected']:
  for seed in [2026,2027,2028]:
   r=pool[(family,seed)];draw(axes[j],[s['time']for s in r['energySeries']],[s['deltaEnergy']for s in r['energySeries']],f'{family} · {seed}',colors[family],['-','--',':'][seed-2026])
 axes[j].set_yscale('symlog',linthresh=1e-7);axes[j].set(xlabel='Tempo [Myr]',ylabel='δE assinado [adimensional]',title='CPU direta Float64 · N=1.000' if j==0 else 'GPU direta Float32 · N=10.000')
finish(fig,axes,'06-energy','Conservação da Hamiltoniana discreta de Plummer','Diagnóstico direto Float64: CPU a cada 0,05 Myr, GPU a cada 0,5 Myr. Máximos amostrados podem omitir picos; sementes com erros maiores permanecem visíveis.',6)
# 7: normal dispersion, all seed time series and population endpoint changes.
fig,axes=plt.subplots(1,2,figsize=(12,5))
for family in ['baseline','corrected']:
 for seed in [2026,2027,2028]:
  r=gpu[(family,seed)];draw(axes[0],[s['timeMyr']for s in r['samples']],[s['disk']['instant']['sigmaNormal']*KM for s in r['samples']],f'{family} · {seed}',colors[family],['-','--',':'][seed-2026])
  d=load('reports/v1.0.2/gpu-populations/'+r['id']+'.json')['samples']
  for pop,marker in [('thin','o'),('thick','s')]:draw(axes[1],[seed-2026],[KM*(d[-1]['populations'][pop]['instant']['sigmaNormal']-d[0]['populations'][pop]['instant']['sigmaNormal'])],f'{family} · {pop}' if seed==2026 else '_nolegend_',colors[family],style='None',marker=marker)
axes[0].set(xlabel='Tempo [Myr]',ylabel='σ normal global [km/s]');axes[1].set(xlabel='Semente (0=2026, 1=2027, 2=2028)',ylabel='Δσ normal por população [km/s]')
finish(fig,axes,'07-vertical-dispersion','Dispersão vertical: medir além da espessura','Velocidade projetada na normal do plano ajustado, média removida. Mudança de espessura e dispersão são observáveis distintos; o ajuste não remove todo movimento coerente.',7)
# 8: fixed reference-frame density profiles from actual full GPU states.
fig,axes=plt.subplots(1,2,figsize=(12,5))
for family in ['baseline','corrected']:
 d=load('reports/v1.0.2/gpu-populations/'+gpu[(family,2026)]['id']+'.json')['samples']
 for epoch,s in enumerate(d):
  c=next(c for c in s['subpopulationStructure']['components']if c['id']==1)
  for j,key in enumerate(['cylindrical','vertical']):
   bins=[b for b in c['profiles'][key]['bins']if b['upper']is not None and b['density']is not None and b['density']>0];x=[(b['lower']+b['upper'])/2 for b in bins];y=[b['density']*1e10 for b in bins];draw(axes[j],x,y,f'{family} · {s["timeMyr"]:g} Myr',colors[family],'-'if epoch==0 else'--')
axes[0].set(xlabel='R [kpc]',ylabel='Σ fino [M☉/kpc²]',yscale='log',xlim=(0,30));axes[1].set(xlabel='|z|, plano fixo [kpc]',ylabel='ρ fino, abertura R<30 kpc [M☉/kpc³]',yscale='log',xlim=(0,3))
finish(fig,axes,'08-density','Perfis inicial e final: população fina','N=10.000, semente 2026. Perfis de contagem em bordas fixas; bins sem massa não viram densidades artificiais. O perfil vertical usa o plano inicial, complementar às espessuras no plano próprio.',8)
# 9: isolate mean mismatch with identical old phase-space states.
fig,axes=plt.subplots(1,2,figsize=(12,5))
for family in ['baseline','baseline-softened','corrected']:
 for seed in [2026,2027,2028]:
  r=smooth[(family,seed)];t=[s['timeMyr']for s in r['samples']];h=[s['disk']['instant']['h50']for s in r['samples']];draw(axes[0],t,100*(np.array(h)/h[0]-1),f'{family} · {seed}',colors[family],['-','--',':'][seed-2026])
for family in ['baseline','corrected']:
 for seed in [2026,2027,2028]:
  r=gpu[(family,seed)];h=[s['disk']['instant']['h50']for s in r['samples']];draw(axes[1],[s['timeMyr']for s in r['samples']],100*(np.array(h)/h[0]-1),f'{family} · {seed}',colors[family],['-','--',':'][seed-2026])
axes[0].set(title='A · teste no campo estacionário, N=1.000',xlabel='Tempo [Myr]',ylabel='Δh₅₀ [%]');axes[1].set(title='C · autogravitante, N=10.000',xlabel='Tempo [Myr]',ylabel='Δh₅₀ [%]')
finish(fig,axes,'09-model-comparison','Campo contínuo e evolução N-corpos','baseline-softened: MESMAS condições antigas no campo Plummer da densidade antiga, isolando o desajuste. A usa DOP853, C usa KDK. Halo fixo e refinado da 1.0.2 aguardam a etapa seguinte.',9)
# 10: actual fixed-point convergence + measured ensemble noise, not a long-N claim.
fig,axes=plt.subplots(1,2,figsize=(12,5));trace=load('reports/v1.0.2/corrected/iterations.json');draw(axes[0],[r['iteration']for r in trace],[r['maxRelativeForceChange']for r in trace],'Máxima mudança de força');axes[0].set(xlabel='Iteração da solução suavizada',ylabel='Variação relativa',yscale='log');axes[0].axhline(.001,color='gray',ls=':',label='Tolerância numérica da iteração')
for family in ['baseline','corrected']:
 rows=[r for r in ensemble['ensembles']if r['family']==family];draw(axes[1],[r['n']for r in rows],[np.linalg.norm(np.array(r['ensembleStd']))/np.linalg.norm(np.array(r['expectedPlummerMean']))for r in rows],family,colors[family],marker='o')
axes[1].set(xlabel='N total',ylabel='Dispersão do campo / norma do campo médio',xscale='log')
finish(fig,axes,'10-convergence','Convergência do campo e ruído de amostragem','A convergência da iteração não certifica estabilidade. Dispersão entre três sementes, em sondas fixas: o ruído discreto persiste. Não há uma campanha longa de convergência N/ε/método nesta etapa.',10)
(OUT/'manifest.json').write_text(json.dumps({'schema':'softened-stage1-figures-102','figures':FIGURES,'pendingRequestedFigures':[{'number':4,'reason':'Novos halos refinados ainda não evoluídos: não inventar curva de aquecimento por massa.'},{'number':5,'reason':'Novo controle de refinamento bariônico com halo fixo ainda não executado.'}],'scriptSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
