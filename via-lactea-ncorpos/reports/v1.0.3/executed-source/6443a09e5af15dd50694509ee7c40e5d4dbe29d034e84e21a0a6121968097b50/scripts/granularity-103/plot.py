"""Scientific figures from completed records only; every plotted row exported."""
from pathlib import Path
import json,hashlib,csv,textwrap
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.3';OUT=BASE/'figures';OUT.mkdir(exist_ok=True);SOURCES={};FIGURES=[];ROWS=[];KM=977.7922216807891
plt.rcParams.update({'font.size':10,'axes.grid':True,'grid.alpha':.18,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none'})
def load(p):
 p=ROOT/p;SOURCES[p.relative_to(ROOT).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest();return json.loads(p.read_text(encoding='utf8'))
def draw(ax,x,y,label,color=None,ls='-',alpha=1,marker=None):
 x=np.asarray(x,dtype=float);y=np.asarray(y,dtype=float);ok=np.isfinite(x)&np.isfinite(y);ax.plot(x[ok],y[ok],label=label,color=color,ls=ls,alpha=alpha,marker=marker,lw=1.5,ms=4);ROWS.extend([[label,float(a),float(b)]for a,b in zip(x[ok],y[ok])])
def finish(fig,axes,number,slug,title,note):
 global ROWS
 for ax in np.asarray(axes).ravel():
  handles,labels=ax.get_legend_handles_labels()
  if handles:ax.legend(fontsize=8)
 fig.suptitle(title,fontsize=17,fontweight='bold');fig.text(.035,.015,textwrap.fill(note,155),fontsize=9,color='#45545c',va='bottom');fig.tight_layout(rect=[0,.13,1,.93]);name=f'{number:02d}-{slug}';fig.savefig(OUT/(name+'.png'),dpi=170);fig.savefig(OUT/(name+'.svg'));plt.close(fig)
 with(OUT/(name+'.csv')).open('w',newline='',encoding='utf8')as f:w=csv.writer(f);w.writerow(['series','x_units_as_labelled','y_units_as_labelled']);w.writerows(ROWS)
 FIGURES.append({'number':number,'title':title,'png':f'reports/v1.0.3/figures/{name}.png','svg':f'reports/v1.0.3/figures/{name}.svg','csv':f'reports/v1.0.3/figures/{name}.csv','limitations':note,'sources':dict(SOURCES)});ROWS=[];print(name,flush=True)
runs=[]
for p in sorted((BASE/'runs').glob('*.json')):
 r=load(p.relative_to(ROOT))
 if r['status']=='completed':runs.append(r)
summary=load('reports/v1.0.3/summary.json');fields=load('reports/v1.0.3/field-ensembles.json');colors={4000:'#b76727',8000:'#8066a9',20000:'#167b86',40000:'#2360a3'};style={2026:'-',2027:'--',2028:':'}
select=lambda stage:[r for r in runs if r['config']['stage']==stage]
def curve(r,getter):return [s['timeMyr']for s in r['samples']],[getter(s)for s in r['samples']]
def final_growth(r,pop='global',kin=False):
 a,b=r['samples'][0],r['samples'][-1]
 def value(s):
  d=s['disk']if pop=='global'else s['populations'][pop]
  return d['fixed']['sigmaNormal']if kin else d['instant']['h50']
 return 100*(value(b)/value(a)-1)
stages=[s for s in ['halo20','halo200']if select(s)]
# 1
fig,axes=plt.subplots(1,len(stages),figsize=(7*len(stages),5),squeeze=False)
for ax,stage in zip(axes.ravel(),stages):
 for r in select(stage):
  p=r['config'];x,y=curve(r,lambda s:s['disk']['instant']['h50']);draw(ax,x,100*(np.array(y)/y[0]-1),f"Nh={p['nh']:,} · h{p['haloSeed']}",colors[p['nh']],style[p['haloSeed']])
 ax.set(xlabel='Tempo [Myr]',ylabel='Variação de h50 global [%]',title=stage)
finish(fig,axes,1,'halo-time','Refinamento isolado do halo: mesmos bárions','Bárions da realização 2026 idênticos em todos os pares. dt=0,05 Myr; ε=0,1 kpc; força direta GPU f32. As linhas ligam somente instantes medidos; 20 e 200 Myr são campanhas distintas.')
# 2
fig,axes=plt.subplots(1,len(stages),figsize=(7*len(stages),5),squeeze=False)
for ax,stage in zip(axes.ravel(),stages):
 for seed in [2026,2027,2028]:
  rr=sorted([r for r in select(stage)if r['config']['haloSeed']==seed],key=lambda r:r['config']['haloParticleMassMsun']);draw(ax,[r['config']['haloParticleMassMsun']for r in rr],[final_growth(r,'thin')for r in rr],f'Semente halo {seed}',ls=style[seed],marker='o')
 ax.set(xlabel='Massa de cada macro partícula do halo [M☉]',ylabel='Variação de h50 do fino [%]',xscale='log',title=stage)
finish(fig,axes,2,'halo-particle-mass','Massa individual do halo e espessamento do disco fino','Massa total do halo e realização bariônica fixas. Cada ponto é um experimento completo; segmentos não são uma lei ajustada. Três sementes não estabelecem uma tendência assintótica precisa.')
# 3
fig,axes=plt.subplots(1,2,figsize=(13,5))
for ax,pop in zip(axes,['thin','thick']):
 for r in select('halo20'):
  p=r['config'];x,y=curve(r,lambda s:s['populations'][pop]['instant']['h50']);draw(ax,x,y,f"Nh={p['nh']:,} · h{p['haloSeed']}",colors[p['nh']],style[p['haloSeed']])
 ax.set(xlabel='Tempo [Myr]',ylabel=f'h50 {pop} [kpc]')
finish(fig,axes,3,'populations','Populações físicas separadas: fino e espesso','Etiquetas fixas da DF original, planos ajustados independentemente, todas as sementes. As coortes dos anéis iniciais estão no CSV separado: seleção instantânea por raio não é uma população acompanhada.')
# 4 actual Cartesian sigma_z
fig,axes=plt.subplots(1,2,figsize=(13,5))
for ax,pop in zip(axes,['thin','thick']):
 for r in select('halo20'):
  p=r['config'];x,y=curve(r,lambda s:s['populations'][pop]['fixed']['sigmaNormal']*KM);draw(ax,x,y,f"Nh={p['nh']:,} · h{p['haloSeed']}",colors[p['nh']],style[p['haloSeed']])
 ax.set(xlabel='Tempo [Myr]',ylabel=f'σz {pop} [km/s]')
finish(fig,axes,4,'vertical-dispersion','Aquecimento cinemático: dispersão vertical','σz usa o eixo z de referência e subtrai a velocidade média da população. A dispersão perpendicular ao plano próprio, σR, movimentos coerentes e inclinação também permanecem nos registros.')
# B-dependent figures are withheld until actual B data exist.
if select('baryons20'):
 fig,axes=plt.subplots(1,2,figsize=(13,5))
 for ax,pop in zip(axes,['thin','thick']):
  rr=[r for r in select('halo20')if r['config']['haloSeed']==2026]+[r for r in select('baryons20')if r['config']['baryonSeed']==2026 and r['config']['refinedPopulation']is None]
  for r in rr:
   p=r['config'];label=f"C vivo Nh={p['nh']:,}"if r['model']=='C'else 'B halo fixo Plummer';x,y=curve(r,lambda s:s['populations'][pop]['instant']['h50']);draw(ax,x,100*(np.array(y)/y[0]-1),label,colors.get(p['nh'],'#333333'))
  ax.set(xlabel='Tempo [Myr]',ylabel=f'Variação de h50 {pop} [%]')
 finish(fig,axes,5,'fixed-vs-live','Halo fixo e dinâmico: bárions inicialmente idênticos','Semente bariônica 2026 nos dois modelos; no C, halo 2026. B remove granularidade E resposta dinâmica do halo: a diferença B−C não isola sozinha o aquecimento colisional. O campo fixo é suavizado, não a tabela Newtoniana antiga.')
 fig,axes=plt.subplots(1,2,figsize=(13,5));labels={None:'Base',0:'Bojo ×2',1:'Fino ×2',2:'Espesso ×2'}
 for ax,pop in zip(axes,['thin','thick']):
  for seed in [2026,2027,2028]:
   rr=sorted([r for r in select('baryons20')if r['config']['baryonSeed']==seed],key=lambda r:-1 if r['config']['refinedPopulation']is None else r['config']['refinedPopulation']);draw(ax,list(range(len(rr))),[final_growth(r,pop)for r in rr],f'Semente {seed}',ls=style[seed],marker='o');ax.set_xticks(range(len(rr)),[labels[r['config']['refinedPopulation']]for r in rr])
  ax.set(ylabel=f'Variação de h50 {pop} em 20 Myr [%]')
 finish(fig,axes,6,'baryon-refinement','Refinamento bariônico isolado com halo fixo','Cada variante duplica apenas uma população e mantém sua massa física. As outras populações são copiadas por valores exatos do mesmo controle. Três sementes bariônicas; resolução dupla é um primeiro contraste, não convergência assintótica.')
# 7
energyStages=[s for s in ['halo20','baryons20','halo200','baryons200']if select(s)];fig,axes=plt.subplots(1,len(energyStages),figsize=(6*len(energyStages),5),squeeze=False)
for ax,stage in zip(axes.ravel(),energyStages):
 for r in select(stage):
  p=r['config'];label=(f"Nh{p['nh']} h{p['haloSeed']}"if r['model']=='C'else f"pop{p['refinedPopulation']} s{p['baryonSeed']}");draw(ax,[d['time']for d in r['energySeries']],[d['deltaEnergy']for d in r['energySeries']],label)
 ax.set(xlabel='Tempo [Myr]',ylabel='δE = [E(t)−E(0)] / |E(0)|',yscale='symlog',title=stage);ax.set_yscale('symlog',linthresh=1e-8)
finish(fig,axes,7,'energy','Conservação da Hamiltoniana correspondente a cada modelo','Diagnóstico direto Float64 dos estados efetivos f32. B inclui ΣmΦhalo sem 1/2; C soma pares i<j. Cadência 0,5 Myr no curto e a registrada no protocolo de 200 Myr. Máximos amostrados não limitam picos entre amostras.')
# 8
fig,axes=plt.subplots(1,2,figsize=(13,5));gg=sorted([g for g in summary['groups']if g['stage']=='halo20'],key=lambda g:g['nh']);draw(axes[0],[g['nh']for g in fields['groups']],[g['normalizedHaloNoise']for g in fields['groups']],'Desvio do campo entre sementes',marker='o');axes[0].set(xlabel='Nh',ylabel='Norma do desvio / norma do campo total esperado',xscale='log')
for pop,meanKey,sdKey in [('Fino','thinGrowthMean','thinGrowthSD'),('Espesso','thickGrowthMean','thickGrowthSD')]:
 x=[g['nh']for g in gg];y=[g[meanKey]for g in gg];sd=[g[sdKey]if g[sdKey]is not None else np.nan for g in gg];draw(axes[1],x,y,pop,marker='o');axes[1].errorbar(x,y,yerr=sd,fmt='none',capsize=4);ROWS.extend([[pop+' desvio entre sementes',float(a),float(b)]for a,b in zip(x,sd)if np.isfinite(b)])
axes[1].set(xlabel='Nh',ylabel='Variação de h50 em 20 Myr [%], média ± desvio',xscale='log')
finish(fig,axes,8,'convergence','Ruído do halo e convergência estrutural são testes distintos','Campo em sondas fixas e dispersão entre três sementes de halo. Os bárions fixos retêm seu próprio resíduo de amostragem. Barras são desvio entre sementes, não intervalo de confiança nem critério universal de estabilidade.')
# 9
fig,axes=plt.subplots(2,2,figsize=(13,8));chosen=[r for r in runs if(r['config']['stage']=='halo20'and r['config']['nh']==40000 and r['config']['haloSeed']==2026)or(r['config']['stage']=='baryons20'and r['config']['refinedPopulation']is None and r['config']['baryonSeed']==2026)]
for r in chosen:
 tags=np.array(r['particleConstants']['subpopulations']);m=np.array(r['particleConstants']['masses'])*1e10
 for row,pop in enumerate([1,2]):
  pick=tags==pop
  for state in r['particleStates']:
   p=np.array(state['positions']).reshape(-1,3);R=np.hypot(p[:,0],p[:,1]);z=np.abs(p[:,2]);rb=np.linspace(0,30,31);zb=np.linspace(0,3,41);h,_=np.histogram(R[pick],rb,weights=m[pick]);hz,_=np.histogram(z[pick&(R<30)],zb,weights=m[pick&(R<30)]);label=f"{r['model']} · {state['timeMyr']:g} Myr";draw(axes[row,0],(rb[1:]+rb[:-1])/2,np.where(h>0,h/(np.pi*np.diff(rb**2)),np.nan),label,ls='--'if state['timeMyr']==0 else '-');draw(axes[row,1],(zb[1:]+zb[:-1])/2,np.where(hz>0,hz/(2*np.diff(zb)),np.nan),label,ls='--'if state['timeMyr']==0 else '-')
  axes[row,0].set(xlabel='R [kpc]',ylabel=f'Σ população {pop} [M☉/kpc²]',yscale='log');axes[row,1].set(xlabel='|z| [kpc]',ylabel=f'dM/dz população {pop} [M☉/kpc]',yscale='log')
finish(fig,axes,9,'density-profiles','Perfis de densidade inicial e final','C: Nh=40.000,h2026; B: base,s2026, quando concluídos. Histograma ponderado por massa, bins fixos; perfil vertical na abertura R<30 kpc e eixo inicial z, complementar ao plano próprio. Bins vazios não recebem massa artificial.')
# 10
legacy=load('reports/v1.0.2/short-overview.json');fig,axes=plt.subplots(1,2,figsize=(13,5));hist=[r for r in legacy if r['model']=='C-GPU'];names=[]
for i,family in enumerate(['baseline','corrected']):
 rr=[r for r in hist if r['family']==family];draw(axes[0],[i]*len(rr),[r['growthPercent']for r in rr],family,marker='o',ls='None');names.append('1.0.1: IC anterior'if family=='baseline'else '1.0.2: campo corrigido')
axes[0].set_xticks([0,1],names);axes[0].set(ylabel='Variação global de h50 em 20 Myr [%]')
for seed in [2026,2027,2028]:
 rr=sorted([r for r in select('halo20')if r['config']['haloSeed']==seed],key=lambda r:r['config']['nh']);draw(axes[1],[r['config']['nh']for r in rr],[final_growth(r)for r in rr],f'1.0.3 halo {seed}',marker='o',ls=style[seed])
axes[1].set(xlabel='Nh · bárions fixos s2026',ylabel='Variação global de h50 em 20 Myr [%]',xscale='log')
finish(fig,axes,10,'versions','Comparação histórica e novo protocolo pareado','Esquerda: controle anterior e corrigido da 1.0.2, com três realizações bariônicas distintas; direita: somente o halo varia, mesmos bárions 2026. Não atribuir toda diferença entre painéis à versão. H-nh4000-h2026 reproduz o controle corrigido s2026.')
# 11 requested collective investigation, no physical-mode certification.
fig,axes=plt.subplots(1,2,figsize=(13,5))
for r in [r for r in select('halo20')if r['config']['nh']in [4000,40000]and r['config']['haloSeed']==2026]:
 for ring in [1,2,4]:
  x,y=curve(r,lambda s:s['disk']['rings'][ring]['modes'][1]['amplitude']);draw(axes[0],x,y,f"Nh{r['config']['nh']} R{r['samples'][0]['disk']['rings'][ring]['lower']}",colors[r['config']['nh']],['-','--',':'][[1,2,4].index(ring)])
 x,y=curve(r,lambda s:s['populations']['thin']['plane']['tiltDegrees']);draw(axes[1],x,y,f"Fino Nh{r['config']['nh']}",colors[r['config']['nh']])
axes[0].set(xlabel='Tempo [Myr]',ylabel='Amplitude normalizada m=2, anéis instantâneos');axes[1].set(xlabel='Tempo [Myr]',ylabel='Inclinação do plano fino [graus]')
finish(fig,axes,11,'collective-modes','Modos coletivos: medidas antes da interpretação','Referência condicional de ruído e m=1..4 em cada anel estão nos dados. O início antipodal suprime modos ímpares. 20 Myr e poucas resoluções não identificam uma barra/flexão como instabilidade física convergida. Q permanece um proxy condicionado.')
(OUT/'manifest.json').write_text(json.dumps({'schema':'granularity-figures-103','figures':FIGURES,'plottedCompletedRuns':len(runs),'scriptSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
