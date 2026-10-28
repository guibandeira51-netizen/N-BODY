"""Publication figures from measured rows; point tables and source hashes."""
from pathlib import Path
import json,csv,hashlib,textwrap
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.4';OUT=BASE/'figures';OUT.mkdir(exist_ok=True);FIGS=[];POINTS=[];SOURCES={};colors={'A':'#a34f27','B':'#386cb0','C':'#b38a13','D':'#138377','E':'#753c9c','F':'#a52f69','G':'#354148'}
plt.rcParams.update({'font.size':10,'axes.grid':True,'grid.alpha':.2,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none'})
def read(name):
 p=BASE/name;SOURCES[p.relative_to(ROOT).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
 return json.loads(p.read_text(encoding='utf8'))if p.suffix=='.json'else list(csv.DictReader(p.open(encoding='utf8-sig',newline='')))
summary=read('summary.json');sr=read('structure-series.csv');en=read('energy-series.csv');density=read('density-profiles.csv');collective=read('collective-modes.json');mig=read('migration-decomposition.json');references=read('control-references.json');R={r['id']:r for r in summary['runs']};medium=[r for r in R.values()if r['duration']==200 and r['dt']==.05 and r['stage']!='higher-pilot20'];families=sorted(set(r['family']for r in medium));main=[r for r in medium if r['stage']=='factorial200'];styles={2026:'-',2027:'--',2028:':'}
def draw(ax,x,y,label,c=None,ls='-',alpha=1,marker=None):
 x=np.array(x,float);y=np.array(y,float);ok=np.isfinite(x)&np.isfinite(y);ax.plot(x[ok],y[ok],label=label,color=c,ls=ls,alpha=alpha,marker=marker,lw=1.6,ms=4);POINTS.extend([[label,ax.get_subplotspec().num1,float(a),float(b)]for a,b in zip(x[ok],y[ok])])
def curve(r,pop,key):
 rows=[s for s in sr if s['run']==r['id']and s['population']==pop];return np.array([float(s['time_Myr'])for s in rows]),np.array([float(s[key])for s in rows])
def ensemble(ax,rr,pop,key,percent=False):
 for family in sorted(set(r['family']for r in rr)):
  values=[]
  for r in rr:
   if r['family']!=family:continue
   t,y=curve(r,pop,key);y=100*(y/y[0]-1)if percent else y;values.append(y);draw(ax,t,y,'_'+family+' s'+str(r['seed']),colors[family],styles[r['seed']],.25)
  a=np.array(values);mean=a.mean(axis=0);draw(ax,t,mean,f'{family} · média ({len(values)} sementes)',colors[family]);sd=a.std(axis=0,ddof=1)if len(values)>1 else np.zeros_like(mean);ax.fill_between(t,mean-sd,mean+sd,color=colors[family],alpha=.12);POINTS.extend([[family+' SD',ax.get_subplotspec().num1,float(x),float(y)]for x,y in zip(t,sd)])
def finish(fig,axes,num,slug,title,note):
 global POINTS
 for ax in np.array(axes).ravel():
  h,l=ax.get_legend_handles_labels()
  if h:ax.legend(fontsize=8,ncol=2 if len(h)>5 else 1)
 fig.suptitle(title,fontsize=17,fontweight='bold');fig.text(.035,.018,textwrap.fill(note,160),fontsize=9,color='#45545c',va='bottom');fig.tight_layout(rect=[0,.15,1,.93]);name=f'{num:02d}-{slug}';fig.savefig(OUT/(name+'.png'),dpi=160);fig.savefig(OUT/(name+'.svg'));plt.close(fig)
 with(OUT/(name+'.csv')).open('w',newline='',encoding='utf8')as f:w=csv.writer(f);w.writerow(['series','panel_zero_based','x_units_as_axis','y_units_as_axis']);w.writerows(POINTS)
 FIGS.append({'number':num,'title':title,'png':f'reports/v1.0.4/figures/{name}.png','svg':f'reports/v1.0.4/figures/{name}.svg','csv':f'reports/v1.0.4/figures/{name}.csv','limitations':note,'sources':dict(SOURCES)});POINTS=[];print(name,flush=True)
note='Força direta WebGPU Float32, Plummer ε=0,1 kpc; KDK dt=0,05 Myr. Três sementes pareadas de bárions/halo. Linhas claras individuais; faixa ±1 desvio padrão amostral, sem intervalo de confiança. A/B: fino original; C/D: fino duplicado. A/C: Nh4 mil; B/D: Nh40 mil.'
fig,axes=plt.subplots(1,2,figsize=(14,5));ensemble(axes[0],main,'thin','h50_kpc');ensemble(axes[1],main,'thin','h50_kpc',True);axes[0].set(xlabel='Tempo [Myr]',ylabel='h50 fino [kpc]');axes[1].set(xlabel='Tempo [Myr]',ylabel='Variação de h50 fino [%]');finish(fig,axes,1,'fino-quatro-familias','Disco fino: refinamento isolado e combinado',note)
fig,axes=plt.subplots(1,2,figsize=(14,5))
for ax,pop in zip(axes,['thick','global']):ensemble(ax,main,pop,'h50_kpc');ax.set(xlabel='Tempo [Myr]',ylabel='h50 '+pop+' [kpc]')
finish(fig,axes,2,'espesso-global','Espessura por população e mistura global',note+' A mediana global muda também com a composição das populações; não substitui as medianas separadas.')
fig,axes=plt.subplots(1,2,figsize=(14,5))
for ax,key,label in zip(axes,['sigmaZ_km_s','sigmaR_km_s'],['σz','σR']):ensemble(ax,main,'thin',key);ax.set(xlabel='Tempo [Myr]',ylabel=label+' fino [km/s]')
finish(fig,axes,3,'dispersoes','Aquecimento vertical e radial do disco fino',note+' σz está no eixo de referência; σ perpendicular ao plano próprio também consta no CSV.')
fig,axes=plt.subplots(1,2,figsize=(14,5))
for fine,ff in [(False,['A','B']),(True,['C','D','E'])]:
 for seed in[2026,2027,2028]:
  rr=sorted([r for r in medium if r['family']in ff and r['seed']==seed],key=lambda r:r['nh']);label=('fino ×2'if fine else'fino original')+' · '+str(seed)
  draw(axes[0],[r['nh']for r in rr],[r['thinDeltaVarianceZ']/200 for r in rr],label,colors['D'if fine else'A'],styles[seed],marker='o');draw(axes[1],[r['haloParticleMassMsun']for r in rr],[r['thinDeltaVarianceZ']/200 for r in rr],label,colors['D'if fine else'A'],styles[seed],marker='o')
axes[0].set(xlabel='Número de partículas do halo',ylabel='Δσz² / 200 Myr [(km/s)²/Myr]',xscale='log');axes[1].set(xlabel='Massa por partícula do halo [M☉]',ylabel='Δσz² / 200 Myr [(km/s)²/Myr]',xscale='log');finish(fig,axes,4,'taxa-massa-resolucao','Taxa média medida e granularidade do halo',note+' Taxas são diferenças finitas no intervalo medido; não representam taxas assintóticas nem aquecimento puramente colisional. Segmentos apenas unem casos medidos.')
fig,axes=plt.subplots(1,2,figsize=(14,5));contrast=next(r for r in summary['contrasts']if r['stage']=='factorial200'and r['metric']=='thinGrowth');names=['haloOriginal','haloFine','thinCoarseHalo','thinFineHalo','interaction'];labels=['B−A','D−C','C−A','D−B','D−C−B+A']
for seed in[2026,2027,2028]:
 p=next(r for r in contrast['paired']if r['seed']==seed);draw(axes[0],range(5),[p[k]for k in names],str(seed),ls=styles[seed],marker='o')
axes[0].set_xticks(range(5),labels);axes[0].set(ylabel='Contraste de crescimento h50 fino [p.p.]',title='Efeito combinado e interação');axes[0].axhline(0,color='gray',lw=.8)
for kind,ls in [('full-continuum',':'),('fixed-halo','--')]:
 for fine in[False,True]:
  vv=[]
  for ref in references['references']:
   if ref['kind']!=kind or ref['refinedThin']!=fine:continue
   p=ROOT/ref['path'];SOURCES[ref['path']]=ref['sha256'];r=json.loads(p.read_text());t=np.array([s['timeMyr']for s in r['samples']]);y=np.array([s['populations']['thin']['instant']['h50']for s in r['samples']]);vv.append(100*(y/y[0]-1))
  draw(axes[1],t,np.mean(vv,axis=0),kind+(' fino×2'if fine else' base'),colors['D'if fine else'A'],ls)
ensemble(axes[1],[r for r in main if r['family']in['B','D']],'thin','h50_kpc',True);axes[1].set(xlabel='Tempo [Myr]',ylabel='Variação h50 fino [%]',title='Mesmos bárions: controles preservados')
finish(fig,axes,5,'contrastes-controles','O ganho combinado não é uma soma presumida',note+' Os controles históricos foram verificados por fases e hashes. Halo fixo remove também resposta dinâmica; campo total fixo remove autogravidade discreta e modos responsivos.')
fig,axes=plt.subplots(1,2,figsize=(14,5))
for ax,key,label in zip(axes,['thinGrowth','thinDeltaVarianceZ'],['Variação h50 fino [%]','Δσz² [(km/s)²]']):
 for j,family in enumerate(families):
  rr=[r for r in medium if r['family']==family];y=[r[key]for r in rr];draw(ax,[j]*len(y),y,family,colors[family],ls='',marker='o');ax.errorbar(j,np.mean(y),yerr=np.std(y,ddof=1)if len(y)>1 else 0,color=colors[family],fmt='_',capsize=5)
 ax.set_xticks(range(len(families)),families);ax.set(xlabel='Família de resolução',ylabel=label)
finish(fig,axes,6,'variabilidade','Variação entre sementes em 200 Myr',note+' E: Nh80 mil/fino×2; G: Nh40 mil/fino×4, quando presentes. Barras são média±SD; n=3 limita a inferência estatística.')
fig,axes=plt.subplots(2,2,figsize=(14,10))
for ax,component,coord in zip(axes.ravel(),['bulge','disk','halo','halo'],['spherical','vertical','spherical','vertical']):
 for family in['D','E','G']:
  ids={r['id']for r in medium if r['family']==family}
  for time,ls in[(0,'--'),(200,'-')]:
   rows=[d for d in density if d['run']in ids and float(d['time_Myr'])==time and d['component']==component and d['coordinate']==coord and d['upper_kpc']!=''and d['density_Msun_per_measure']!=''];bins={}
   for d in rows:
    x=(float(d['lower_kpc'])+float(d['upper_kpc']))/2;bins.setdefault(x,[]).append(float(d['density_Msun_per_measure']))
   if bins:xs=sorted(bins);draw(ax,xs,[np.mean(bins[x])for x in xs],family+' · '+str(time)+' Myr',colors[family],ls)
 ax.set(xlabel=('r'if coord=='spherical'else'|z|')+' [kpc]',ylabel='ρ [M☉/kpc³]',title=component+' · '+coord,yscale='log',xscale='log')
finish(fig,axes,7,'perfis-densidade','Perfis de densidade: início e fim medidos',note+' Perfil vertical integra uma abertura cilíndrica R<30 kpc; não é a densidade solar local. Disk reúne fino+espesso. Bins de overflow não têm densidade finita e são omitidos do desenho, mas preservados nos dados.')
fig,axes=plt.subplots(1,2,figsize=(14,5))
for family in families:
 rr=[r for r in medium if r['family']==family]
 for ax,key in zip(axes,['amplitude','noiseRMS']):
  arrays=[]
  for r in rr:
   c=next(c for c in collective['runs']if c['id']==r['id']);t=[s['timeMyr']for s in c['samples']];arrays.append([max((x[key]for x in s['m2InnerDisc']),default=np.nan)for s in c['samples']])
  draw(ax,t,np.mean(arrays,axis=0),family,colors[family])
axes[0].set(xlabel='Tempo [Myr]',ylabel='Máximo |A2| entre anéis R=2–12 kpc');axes[1].set(xlabel='Tempo [Myr]',ylabel='Máximo RMS condicional de ruído nos mesmos anéis');finish(fig,axes,8,'modos-coletivos','Modos m=2 e sua referência de amostragem',note+' Máximos de anéis e médias das sementes não são amplitudes de uma barra global. A referência de ruído é condicional; início antipodal suprime modos ímpares. A convergência de um modo físico ainda exige resolução/tempo adicionais.')
fig,axes=plt.subplots(1,2,figsize=(14,5))
for r in medium:
 rows=[e for e in en if e['run']==r['id']];t=[float(e['time_Myr'])for e in rows];draw(axes[0],t,[float(e['signed_deltaE'])for e in rows],r['family']+' · '+str(r['seed']),colors[r['family']],styles[r['seed']]);draw(axes[1],t,[float(e['angularScaledError'])for e in rows],'_'+r['id'],colors[r['family']],styles[r['seed']])
axes[0].set(xlabel='Tempo [Myr]',ylabel='(E−E0)/|E0|');axes[1].set(xlabel='Tempo [Myr]',ylabel='|ΔL| / soma inicial |Li|');finish(fig,axes,9,'energia-momentos','Conservação energética e angular medidas',note+' Hamiltoniano direto Float64 compensado em partições exaustivas i<j da trajetória GPU; cadência5 Myr em200. Máximos amostrados não limitam picos entre amostras. Boa conservação não certifica equilíbrio estrutural.')
fig,axes=plt.subplots(1,2,figsize=(14,5));ensemble(axes[0],[r for r in medium if r['family']in['C','D','E','G']],'thin','h50_kpc');axes[0].set(xlabel='Tempo [Myr]',ylabel='h50 fino [kpc]',title='Resolução crescente')
for r in R.values():
 if r['duration']==200 and r['family']=='D'and r['seed']==2026:
  t,y=curve(r,'thin','h50_kpc');draw(axes[1],t,y,'dt='+str(r['dt'])+' Myr',ls='--'if r['dt']!=.05 else'-')
axes[1].set(xlabel='Tempo [Myr]',ylabel='h50 fino [kpc]',title='Passo temporal, mesmas partículas');finish(fig,axes,10,'convergencia','Convergência física e temporal: domínios distintos',note+' Refinamentos superiores e passos adicionais só aparecem quando medidos. Discordância de N e crescimento tardio impedem declarar convergência estrutural; concordância temporal isolada não resolve granularidade.')
fig,axes=plt.subplots(1,2,figsize=(14,5))
for family in['D','E','G']:
 ids={r['id']for r in medium if r['family']==family};rr=[x for x in mig['rows']if x['id']in ids and x['population']=='thin']
 for ax,key in zip(axes,['sameCurrentIDsVarianceChange','initialCompositionChange']):
  bins={}
  for r in rr:bins.setdefault((r['lower']+r['upper'])/2,[]).append(r[key])
  if bins:xs=sorted(bins);draw(ax,xs,[np.mean(bins[x])for x in xs],family,colors[family],marker='o')
axes[0].set(xlabel='R central do anel [kpc]',ylabel='Mudança de variância dos mesmos IDs [(km/s)²]');axes[1].set(xlabel='R central do anel [kpc]',ylabel='Mudança por seleção inicial [(km/s)²]');finish(fig,axes,11,'migracao-coortes','Decomposição exata da variância local nos extremos',note+' Para os IDs do anel final: evolução de Var[vz] + diferença de Var[vz(0)] por composição = mudança local total. Eixo z fixo. A evolução dos IDs inclui movimentos coletivos; não é uma medição pura de encontros. Anéis externos têm poucas partículas.')
(OUT/'manifest.json').write_text(json.dumps({'schema':'refinement-figures-104','figures':FIGS},ensure_ascii=False,indent=2)+'\n',encoding='utf8')

