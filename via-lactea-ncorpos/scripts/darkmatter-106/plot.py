"""Exactly seven publication graphics, exported with their actual point data."""
from model import *
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import textwrap,shutil,re
FIG=OUT/'figures';FIG.mkdir(exist_ok=True);figs=[];points=[]
COL={'halo':'#176b68','baryons':'#b66a26','observed':'#25384b','bulge':'#906c9b','disk':'#cb9c46','F':'#176b68','E':'#8b789d','A-original':'#5277a0','B-original':'#bc8544'}
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False,'axes.labelcolor':'#334254','axes.edgecolor':'#bbc5c9','text.color':'#25384b','xtick.color':'#52616f','ytick.color':'#52616f','axes.grid':True,'grid.color':'#d9e1e4','grid.alpha':.55,'svg.fonttype':'none','lines.linewidth':2.2,'savefig.facecolor':'white'})
def read(name):return list(csv.DictReader((OUT/name).open(encoding='utf-8-sig')))
def xy(ax,x,y,label,color=None,ls='-'):
 ax.plot(x,y,label=label,color=color,ls=ls);points.extend([{'series':label,'x':float(a),'y':float(b)}for a,b in zip(x,y)])
def finish(fig,axes,n,slug,title,note,sources):
 global points
 note=re.sub(r'\b(de|em|até|por|inicial|halo|F105:)(?=\d)',r'\1 ',note)
 note=re.sub(r'(\d)(?=kpc|Myr|partículas|mil\b)',r'\1 ',note)
 for ax in np.asarray(axes).ravel():
  h,l=ax.get_legend_handles_labels()
  if l:ax.legend(frameon=False,fontsize=9)
 fig.suptitle(title,x=.08,ha='left',fontsize=16,fontweight='bold');fig.subplots_adjust(left=.09,right=.95,top=.86,bottom=.24,wspace=.28);fig.text(.08,.035,'\n'.join(textwrap.wrap(note,135)),fontsize=9,color='#52616f',va='bottom');prefix=f'{n:02d}-{slug}';fig.savefig(FIG/(prefix+'.svg'));fig.savefig(FIG/(prefix+'.png'),dpi=170);plt.close(fig)
 with(FIG/(prefix+'.csv')).open('w',newline='',encoding='utf8')as f:w=csv.DictWriter(f,fieldnames=['series','x','y']);w.writeheader();w.writerows(points)
 figs.append({'number':n,'title':title,'description':note,'png':'figures/'+prefix+'.png','svg':'figures/'+prefix+'.svg','csv':'figures/'+prefix+'.csv','sources':sources,'sha256':{ext:sha(FIG/(prefix+'.'+ext))for ext in['png','svg','csv']}});points=[]
rot=read('rotation.csv');obs=read('observations/eilers2019-jiao2021.csv');res=read('residuals.csv');R=np.array([float(r['R_kpc'])for r in rot]);mask=R<=30;R=R[mask];vals=lambda k:np.array([float(r[k])for r in rot])[mask];ro=np.array([float(r['R_kpc'])for r in obs]);vo=np.array([float(r['vc_km_s'])for r in obs]);minus=np.array([float(r['stat_minus_km_s'])for r in obs]);plus=np.array([float(r['stat_plus_km_s'])for r in obs]);sy=np.array([float(r['jiao_fractional_systematic'])for r in obs])*vo
fig,ax=plt.subplots(figsize=(11,5.8));xy(ax,R,vals('baryons_km_s'),'Bojo + discos',COL['baryons']);xy(ax,R,vals('total_km_s'),'Bojo + discos + halo',COL['halo']);ax.errorbar(ro,vo,yerr=np.array([np.hypot(minus,sy),np.hypot(plus,sy)]),fmt='none',ecolor='#b9c6cc',elinewidth=3,label='Estatística + sistemática Jiao (quadratura)');ax.errorbar(ro,vo,yerr=[minus,plus],fmt='o',ms=3.8,color=COL['observed'],elinewidth=1,label='Eilers2019: estatística');points.extend([{'series':'Eilers2019','x':float(x),'y':float(y)}for x,y in zip(ro,vo)])
for tag,v in[('stat minus',vo-minus),('stat plus',vo+plus),('quadrature minus',vo-np.hypot(minus,sy)),('quadrature plus',vo+np.hypot(plus,sy))]:points.extend([{'series':tag,'x':float(x),'y':float(y)}for x,y in zip(ro,v)])
ax.set(xlim=(4,26),ylim=(80,280),xlabel='Raio galactocêntrico R [kpc]',ylabel='Velocidade circular [km/s]');finish(fig,ax,1,'rotacao-observada','Curva de rotação: observações e modelos','38 pontos publicados; curvas calculadas por vc²=−R aR(R,0). Modelo histórico reduzido, massas fixas, sem gás/CGM e sem ajuste novo. Os dados de Eilers também participaram das restrições de Cautun: comparação de consistência.', ['rotation.csv','observations/eilers2019-jiao2021.csv'])
fig,ax=plt.subplots(figsize=(10.5,5.3))
for key,label,color,ls in[('bulge_km_s','Bojo',COL['bulge'],'-'),('disk_km_s','Discos fino + espesso',COL['disk'],'-'),('halo_km_s','Halo',COL['halo'],'--'),('total_km_s','Total',COL['observed'],'-')]:xy(ax,R,vals(key),label,color,ls)
ax.set(xlim=(.3,30),xlabel='R [kpc]',ylabel='Contribuição à velocidade circular [km/s]');finish(fig,ax,2,'contribuicoes','Contribuições gravitacionais do mesmo modelo','As forças radiais são somadas: vtotal²=vbojo²+vfino²+vespesso²+vhalo². Velocidades não são somadas linearmente. Os discos mantêm sua geometria achatada; não foi usada a aproximação esférica GM(<R)/R para sua força.',['rotation.csv'])
fig,ax=plt.subplots(figsize=(10.5,5.3));ax.axhline(0,color='#70808a',lw=1)
for label,name in[('baryons','Bojo + discos'),('halo','Bojo + discos + halo')]:
 rows=[r for r in res if r['field']==label];yy=np.array([float(r['residual_observed_minus_model_km_s'])for r in rows]);ax.errorbar(ro,yy,yerr=[np.hypot(minus,sy),np.hypot(plus,sy)],fmt='o',ms=3,color=COL[label],alpha=.85,label=name);points.extend([{'series':name,'x':float(x),'y':float(y)}for x,y in zip(ro,yy)]);points.extend([{'series':name+' lower/upper','x':float(x),'y':float(z)}for x,y,lo,hi in zip(ro,yy,np.hypot(minus,sy),np.hypot(plus,sy))for z in[y-lo,y+hi]])
ax.set(xlim=(4,26),xlabel='R [kpc]',ylabel='v observado − v modelo [km/s]');finish(fig,ax,3,'residuos','Resíduos: onde cada modelo se afasta dos dados','Barras: estatística e sistemática fracionária Jiao em quadratura, hipótese explícita. Covariância observacional completa não fornecida. Escores condicionais e cenário de escala comum de2% estão nos dados; não são significâncias de uma descoberta.',['residuals.csv','comparison.json'])
mass=read('enclosed-mass.csv');mr=np.array([float(r['r_kpc'])for r in mass]);fig,(ax,af)=plt.subplots(1,2,figsize=(12,5.3))
for key,label,color,ls in[('bulge_Msun','Bojo',COL['bulge'],'-'),('disk_Msun','Discos',COL['disk'],'-'),('halo_Msun','Halo',COL['halo'],'--'),('total_Msun','Total',COL['observed'],'-')]:xy(ax,mr,[float(r[key])for r in mass],label,color,ls)
ax.set(xscale='log',yscale='log',xlim=(.3,300),ylim=(1e8,2e12),xlabel='Raio esférico r [kpc]',ylabel='Massa dentro da esfera [M☉]');xy(af,mr,[float(r['f_DM'])for r in mass],'Fração de halo',COL['halo']);af.set(xscale='log',xlim=(.3,300),ylim=(0,1),xlabel='Raio esférico r [kpc]',ylabel='Mhalo(<r) / Mtotal(<r)');finish(fig,[ax,af],4,'massa-acumulada','Massa acumulada e fração de matéria escura','Todas as componentes são integradas no mesmo volume esférico, inclusive os discos achatados. Estas curvas são previsões do modelo adotado, não uma inferência observacional independente da massa.',['enclosed-mass.csv','model.json'])
orb=json.loads((OUT/'orbits.json').read_text());runs=[r for r in orb['runs']if r['id']=='R8.122'];limit=max(max(abs(np.array(r['states'])[:,:2]).ravel())for r in runs)*1.08;fig,axes=plt.subplots(1,2,figsize=(12,6))
for ax,run in zip(axes,runs):
 q=np.array(run['states']);xy(ax,q[:,0],q[:,1], 'Sem halo'if run['field']=='baryons'else'Com halo',COL[run['field']]);ax.plot(q[0,0],q[0,1],'o',color=COL['observed'],ms=5);ax.set(xlim=(-limit,limit),ylim=(-limit,limit),aspect='equal',xlabel='x [kpc]',ylabel='y [kpc]')
finish(fig,axes,5,'orbitas','Mesma partícula-teste em dois campos gravitacionais','R inicial8,122kpc; exatamente os mesmos vetores de posição e velocidade. Trajetórias DOP853 Float64 medidas até1200Myr, verificadas por KDK e tolerância mais estrita. Campo fixo: este tempo não é estabilidade de uma galáxia viva.',['orbits.json','orbits.csv','orbit-protocol.json'])
st=read('stability.csv');fig,ax=plt.subplots(figsize=(10.5,5.3));names={'A-original':'A · campo total fixo','B-original':'B · halo fixo, bárions vivos','E':'E105 · halo80mil','F':'F105 · halo160mil'}
for key in names:
 rows=[r for r in st if r['model']==key];x=np.array([float(r['time_Myr'])for r in rows]);y=np.array([float(r['mean_growth_percent'])for r in rows]);sd=np.array([float(r['sd_growth_percent'])for r in rows]);xy(ax,x,y,names[key],COL[key]);ax.fill_between(x,y-sd,y+sd,color=COL[key],alpha=.12)
 for tag,bound in[('−SD',y-sd),('+SD',y+sd)]:points.extend([{'series':names[key]+tag,'x':float(a),'y':float(b)}for a,b in zip(x,bound)])
ax.set(xlim=(0,200),xlabel='Tempo físico [Myr]',ylabel='Variação de h50 do disco fino [%]');finish(fig,ax,6,'estabilidade','Estabilidade estrutural: avanço e limite medido','Média±SD de três realizações. h50: mediana ponderada da distância ao plano próprio. F105:169546 partículas, crescimento18,29%±3,14% em200Myr. E/F têm bárions2026 fixos; A/B variam bárions. Não demonstrada estacionariedade ou superioridade estatística de F.',['stability.csv','validation.json'])
ee=read('energy.csv');fig,ax=plt.subplots(figsize=(10.5,5.3))
for seed,ls in[(2026,'-'),(2027,'--'),(2028,':')]:
 rows=[r for r in ee if int(r['seed'])==seed];xy(ax,[float(r['time_Myr'])for r in rows],[max(abs(float(r['relative_energy_error'])),1e-16)for r in rows],f'F105 · halo{seed}',COL['halo'],ls)
ax.axhline(1e-5,color=COL['baryons'],ls='--',label='Orçamento10⁻⁵');ax.set(yscale='log',xlim=(0,200),xlabel='Tempo físico [Myr]',ylabel='|E(t)−E(0)| / |E(0)|');finish(fig,ax,7,'energia','Conservação de energia nos ensaios F105','Força direta GPU Float32; KDK dt0,05Myr, Plummer ε0,1kpc. Diagnóstico Hamiltoniano direto Float64, parâmetros efetivos f32. Zero desenhado no piso10⁻¹⁶; CSV original conserva zero. Conservação energética não implica estacionariedade estrutural.',['energy.csv','validation.json'])
sourcefiles=set(s for f in figs for s in f['sources']);dump('figures/manifest.json',{'schema':'seven-figures-106','figures':figs,'sourceSHA256':{s:sha(OUT/s)for s in sourcefiles},'codeSHA256':sha(Path(__file__))});print('Seven figures exported with CSV/SVG/PNG')
