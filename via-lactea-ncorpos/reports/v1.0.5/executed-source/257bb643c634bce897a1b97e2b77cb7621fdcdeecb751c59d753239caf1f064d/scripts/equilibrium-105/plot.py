"""Measured scientific figures, each with exact plotted points and source hashes."""
from pathlib import Path
import json,csv,hashlib,textwrap
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import NullFormatter
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.5';OUT=BASE/'figures';OUT.mkdir(exist_ok=True);sources={};figs=[];points=[]
def read(name):
 p=BASE/name;sources[p.relative_to(ROOT).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest();return json.loads(p.read_text(encoding='utf-8-sig'))if p.suffix=='.json'else list(csv.DictReader(p.open(encoding='utf-8-sig',newline='')))
a=read('analysis.json');ts=read('time-series.csv');rs=read('ring-series.csv');ds=read('density-profiles.csv');es=read('energy-series.csv');ms=read('fourier-series.csv');vs=read('vertical-series.csv');ic=read('ic-audit.json');runs={r['id']:r for r in a['runs']};colors={'A-original':'#20706c','B-original':'#bd7620','E104':'#9b699f','E':'#3976ae','F':'#a03342','H':'#553f83','A-MIX':'#7c6c3e','B-MIX':'#775321','B-bulge2':'#6267aa','B-thin2':'#43894c','B-thick2':'#bb557d'};styles={2026:'-',2027:'--',2028:':'}
plt.rcParams.update({'font.size':10,'axes.grid':True,'grid.alpha':.18,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none'})
def num(x):
 try:return float(x)
 except:return np.nan
def draw(ax,x,y,label,color=None,ls='-',alpha=1,marker=None):
 x=np.array(x,float);y=np.array(y,float);ok=np.isfinite(x)&np.isfinite(y);ax.plot(x[ok],y[ok],label=label,color=color,ls=ls,alpha=alpha,marker=marker,lw=1.6,ms=4);points.extend([[label,ax.get_subplotspec().num1,float(u),float(v)]for u,v in zip(x[ok],y[ok])])
def curve(ax,labels,pop,key,percent=False,orbit=False):
 for label in labels:
  rr=[r for r in a['runs']if r['label']==label and r['duration']==200];buckets={}
  for r in rr:
   rows=[s for s in ts if s['id']==r['id']and s['pop']==pop];y0=num(rows[0][key])if rows else 1
   for s in rows:buckets.setdefault(num(s['time']),[]).append(100*(num(s[key])/y0-1)if percent else num(s[key]))
  if not buckets:continue
  x=sorted(buckets);y=[np.mean(buckets[t])for t in x];sd=[np.std(buckets[t],ddof=1)if len(buckets[t])>1 else 0 for t in x];xx=np.array(x)/214.6676587 if orbit else x;draw(ax,xx,y,label,colors.get(label));ax.fill_between(xx,np.array(y)-sd,np.array(y)+sd,color=colors.get(label),alpha=.12);points.extend([[label+' mean-SD',ax.get_subplotspec().num1,float(u),float(v)]for u,v in zip(xx,np.array(y)-sd)]);points.extend([[label+' mean+SD',ax.get_subplotspec().num1,float(u),float(v)]for u,v in zip(xx,np.array(y)+sd)])
def finish(fig,axes,slug,title,note):
 global points
 for ax in np.asarray(axes).ravel():
  handles,labels=ax.get_legend_handles_labels()
  if labels:ax.legend(fontsize=8,loc='best',ncol=2 if len(labels)>5 else 1)
  if ax.get_xscale()=='log':ax.xaxis.set_minor_formatter(NullFormatter())
 fig.suptitle(title,fontsize=15,y=.98);fig.subplots_adjust(top=.84,bottom=.25,wspace=.3,hspace=.4);fig.text(.06,.035,'\n'.join(textwrap.wrap(note,148)),fontsize=9,va='bottom');fig.savefig(OUT/(slug+'.png'),dpi=160,facecolor='white');fig.savefig(OUT/(slug+'.svg'),facecolor='white');plt.close(fig)
 with(OUT/(slug+'.csv')).open('w',encoding='utf8',newline='')as f:w=csv.writer(f);w.writerow(['series','panel','x','y']);w.writerows(points)
 figs.append({'id':slug,'title':title,'description':note,'png':f'figures/{slug}.png','svg':f'figures/{slug}.svg','csv':f'figures/{slug}.csv'});points=[]
main=['A-original','B-original','E','F'];note='Dados efetivamente medidos; fontes, unidades e sementes constam nos CSV e no manifesto. Não houve correção de espessura ou de velocidades durante a evolução.';ensembleNote=' Faixas: média ± desvio padrão, não intervalos de confiança. E/F fixam bárions2026 e variam três halos; A/B/E104 usam três realizações bariônicas.'
fig,ax=plt.subplots(1,2,figsize=(14,6))
for x,pop in zip(ax,['thin','thick']):curve(x,main,pop,'h50',True);x.set(xlabel='Tempo [Myr]',ylabel='Variação de h50 [%]',title='Disco fino'if pop=='thin'else'Disco espesso')
finish(fig,ax,'01-espessura-tempo','Espessura vertical ao longo do tempo',note+ensembleNote)
fig,ax=plt.subplots(1,2,figsize=(14,6))
for x,pop in zip(ax,['thin','thick']):
 for label in['B-original','E','F']:
  ids={r['id']for r in a['runs']if r['label']==label and r['seed']==2026 and r['duration']==200}
  for t,ls in[(0,'--'),(200,'-')]:
   rows=[r for r in rs if r['id']in ids and r['pop']==pop and num(r['time'])==t and num(r['count'])>=60];draw(x,[(num(r['lower'])+num(r['upper']))/2 for r in rows],[num(r['h50'])for r in rows],f'{label} · {t} Myr',colors.get(label),ls)
 x.set(xlabel='R do anel [kpc]',ylabel='h50 [kpc]',title={'thin':'Disco fino','thick':'Disco espesso'}[pop])
finish(fig,ax,'02-espessura-aneis','Espessura por anel galáctico',note+' Uma realização pareada, semente 2026. Anéis com menos de 60 partículas omitidos do desenho; permanecem nos CSV.')
fig,ax=plt.subplots(1,2,figsize=(14,6));curve(ax[0],main,'thin','sigmaZ');curve(ax[1],main,'thick','sigmaZ');ax[0].set(xlabel='Tempo [Myr]',ylabel='σz fino [km/s]');ax[1].set(xlabel='Tempo [Myr]',ylabel='σz espesso [km/s]');finish(fig,ax,'03-dispersao-vertical','Dispersão vertical e evolução cinemática',note+ensembleNote+' σz usa o eixo cartesiano fixo, complementar à projeção no plano próprio.')
fig,ax=plt.subplots(1,2,figsize=(14,6))
for x,key,ylabel in zip(ax,['sigmaR','sigmaPhi'],['σR [km/s]','σφ [km/s]']):
 for label in main:
  rows=[r for r in rs if r['label']==label and r['seed']=='2026'and r['pop']=='thin'and num(r['lower'])==8 and runs[r['id']]['duration']==200];draw(x,[num(r['time'])for r in rows],[num(r[key])for r in rows],label,colors.get(label))
 x.set(xlabel='Tempo [Myr]',ylabel=ylabel,title='Disco fino, anel 8–10 kpc, semente 2026')
finish(fig,ax,'04-dispersoes-radial-azimutal','Dispersões radial e azimutal',note+' Seleção instantânea por anel; migração muda sua composição.')
def density_fig(coordinates,components,slug,title):
 fig,ax=plt.subplots(1,2,figsize=(14,6))
 for x,coordinate,component in zip(ax,coordinates,components):
  for label in['E','F']:
   ids={r['id']for r in a['runs']if r['label']==label and r['seed']==2026 and r['duration']==200}
   for t,ls in[(0,'--'),(200,'-')]:
    rows=[r for r in ds if r['id']in ids and r['component']==component and r['coordinate']==coordinate and num(r['time'])==t and num(r['density'])>0 and np.isfinite(num(r['upper']))];draw(x,[(num(r['lower'])+num(r['upper']))/2 for r in rows],[num(r['density'])for r in rows],f'{label} · {t} Myr',colors.get(label),ls)
  x.set(xlabel=('R'if coordinate=='cylindrical'else'|z|'if coordinate=='vertical'else'r')+' [kpc]',ylabel='Σ [M☉/kpc²]'if coordinate=='cylindrical'else'ρ [M☉/kpc³]',title={'disk':'Discos','bulge':'Bojo','halo':'Halo'}[component],xscale='log',yscale='log')
 finish(fig,ax,slug,title,note+' Perfis verticais usam abertura R<30 kpc; disk reúne fino e espesso. Sem ajuste observacional novo. Overflow sem densidade finita não é desenhado.')
density_fig(['vertical','vertical'],['disk','bulge'],'05-perfil-vertical','Perfis verticais de densidade')
density_fig(['cylindrical','spherical'],['disk','halo'],'06-perfil-radial','Perfis radiais de massa e densidade')
fig,ax=plt.subplots(1,2,figsize=(14,6))
for label in main:
 rows=[r for r in es if r['label']==label and r['seed']=='2026'and runs[r['id']]['duration']==200];draw(ax[0],[num(r['time'])for r in rows],[max(abs(num(r['deltaE'])),1e-16)for r in rows],label,colors.get(label))
energyLabel='F'if any(r['label']=='F'and r['duration']==200 for r in a['runs'])else'E';rows=[r for r in es if r['label']==energyLabel and r['seed']=='2026'and runs[r['id']]['duration']==200]
for key in['K','U','E']:draw(ax[1],[num(r['time'])for r in rows],[num(r[key])for r in rows],key)
ax[0].set(xlabel='Tempo [Myr]',ylabel='|ΔE| / |E₀|',yscale='log');ax[1].set(xlabel='Tempo [Myr]',ylabel='Energia [10¹⁰ M☉ kpc²/Myr²]',title=energyLabel+', semente 2026');finish(fig,ax,'07-energia','Energia total e erro energético',note+' Zero aparece no piso gráfico 10⁻¹⁶; CSV preserva zero. Novos ensaios usam G e ε² efetivos f32 no Hamiltoniano Float64; controles históricos mantêm sua convenção nominal. Máximos são amostrados.')
fig,ax=plt.subplots(1,2,figsize=(14,6));selected='F'if any(r['label']=='F'and r['duration']==200 for r in a['runs'])else'E104'
for m in[1,2,3,4]:
 rows=[r for r in ms if r['label']==selected and r['seed']=='2026'and r['pop']=='thin'and num(r['lower'])==4 and num(r['m'])==m and runs[r['id']]['duration']==200];draw(ax[0],[num(r['time'])for r in rows],[num(r['amplitude'])for r in rows],f'm={m}');draw(ax[1],[num(r['time'])for r in rows],[num(r['phase'])for r in rows],f'm={m}')
rows=[r for r in ms if r['label']==selected and r['seed']=='2026'and r['pop']=='thin'and num(r['lower'])==4 and num(r['m'])==2 and runs[r['id']]['duration']==200];draw(ax[0],[num(r['time'])for r in rows],[num(r['noise'])for r in rows],'Ruído condicional m=2 (RMS)','#555555',ls='--');ax[0].set(xlabel='Tempo [Myr]',ylabel='|Am| / M');ax[1].set(xlabel='Tempo [Myr]',ylabel='Fase principal [rad]');finish(fig,ax,'08-fourier','Modos de Fourier: amplitude e fase',note+f' {selected}, disco fino 4–6 kpc, semente 2026. Fases em baixa amplitude não identificam padrões; fases são principais, sem velocidade de padrão inferida. Início antipodal suprime modos ímpares de densidade.')
fig,ax=plt.subplots(1,2,figsize=(14,6))
for label in['B-bulge2','B-thin2','B-thick2','E','F']:
 rows=[r for r in vs if r['label']==label and r['seed']=='2026'and r['pop']=='thin'and num(r['lower'])==4 and num(r['m'])==1 and runs[r['id']]['duration']==200];draw(ax[0],[num(r['time'])for r in rows],[num(r['heightAmplitude'])for r in rows],label,colors.get(label));draw(ax[1],[num(r['time'])for r in rows],[num(r['breathing'])for r in rows],label,colors.get(label))
ax[0].set(xlabel='Tempo [Myr]',ylabel='|⟨z exp(iφ)⟩| [kpc]');ax[1].set(xlabel='Tempo [Myr]',ylabel='Cov(z,vz) / Var(z) [Myr⁻¹]');finish(fig,ax,'09-plano-respiracao','Plano médio, flexão e respiração vertical',note+' Anel fixo 4–6 kpc, semente 2026. Momentos descritivos, sem prova de instabilidade. Fluxo linear removido apenas no diagnóstico; velocidades integradas nunca são alteradas.')
fig,ax=plt.subplots(1,2,figsize=(14,6))
for label in['E','F']:
 rr=[r for r in a['runs']if r['label']==label and r['duration']==200]
 if rr:
  for x,key,ylabel in zip(ax,['thinGrowth','thinVarianceChange'],['Δh50 fino [%]','Δσz² [(km/s)²]']):draw(x,[r['haloParticleMassMsun']for r in rr],[r[key]for r in rr],label,colors.get(label),ls='',marker='o');x.set(xlabel='Massa da macro partícula do halo [M☉]',ylabel=ylabel,xscale='log')
finish(fig,ax,'10-massa-aquecimento','Massa das macro partículas e aquecimento medido',note+' Pontos são realizações, não uma lei ajustada de relaxação. Duas resoluções não demonstram limite assintótico.')
fig,ax=plt.subplots(1,2,figsize=(14,6));curve(ax[0],['A-original','B-original','E104'],'thin','h50',True);curve(ax[1],['A-original','B-original','E104'],'thin','sigmaZ',True);ax[0].set(xlabel='Tempo [Myr]',ylabel='Δh50 fino [%]');ax[1].set(xlabel='Tempo [Myr]',ylabel='Δσz fino [%]');finish(fig,ax,'11-continuo-vivo','Campo contínuo, bárions vivos e halo vivo',note+' Faixas: média±SD de três realizações pareadas de bárions. '+' Nove controles históricos, mesmas fases bariônicas por semente, verificados por hash. Diferenças também incluem resposta coletiva e não são frações causais puras de encontros.')
fig,ax=plt.subplots(1,2,figsize=(14,6))
for x,pop in zip(ax,['thin','thick']):curve(x,['A-original','A-MIX'],pop,'h50',True);x.set(xlabel='Tempo [Myr]',ylabel='Δh50 [%]',title={'thin':'Disco fino','thick':'Disco espesso'}[pop])
finish(fig,ax,'12-preparacao','Preparação original e tentativa de fases orbitais',note+' Faixas: média±SD das três realizações. '+' MIX é uma tentativa nova que não demonstrou melhoria global; não foi promovida. Campo total fixo, integrações independentes de 200 Myr. A janela de 1 Gyr usada para sortear fases não é uma validação viva de 1 Gyr.')
fig,ax=plt.subplots(1,2,figsize=(14,6))
for seed in[2026,2027,2028]:
 rr=sorted([r for r in a['runs']if r['label']in['E','F']and r['seed']==seed and r['duration']==200],key=lambda r:r['nh']);draw(ax[0],[r['nh']for r in rr],[r['thinGrowth']for r in rr],str(seed),ls=styles[seed],marker='o');draw(ax[1],[r['nh']for r in rr],[100*r['thinLateHeightFraction']for r in rr],str(seed),ls=styles[seed],marker='o')
ax[0].set(xlabel='N do halo',ylabel='Δh50 fino, 0–200 Myr [%]');ax[1].set(xlabel='N do halo',ylabel='Δh50 fino, 100–200 / h50(0) [%]');finish(fig,ax,'13-convergencia','Resolução e deriva estrutural tardia',note+' Mesmos bárions e sementes pareadas de halo. Convergência exige equivalência e tendências controladas; proximidade de dois pontos não basta.')
fig,ax=plt.subplots(1,2,figsize=(14,6))
for x,pop in zip(ax,['thin','thick']):curve(x,['E','F'],pop,'h50',True,orbit=True);x.set(xlabel='Tempo / período circular solar (214,67 Myr)',ylabel='Δh50 [%]',title={'thin':'Disco fino','thick':'Disco espesso'}[pop])
finish(fig,ax,'14-dominio-orbital','Domínio efetivamente integrado em períodos orbitais',note+ensembleNote+' Este gráfico não inventa múltiplas órbitas: os dados terminam no horizonte executado. Campanhas de 400, 600 e 1000 Myr dependem da decisão científica registrada; janela de preparação não é evolução autogravitante.')
fig,ax=plt.subplots(1,2,figsize=(14,6))
for x,coordinate in zip(ax,['radial','vertical']):
 for pop in range(4):
  rows=[r for r in ic['Jeans']if r['population']==pop and r['hKpc']==.01 and r['zkpc']==.2];draw(x,[r['Rkpc']for r in rows],[r[coordinate+'Scaled']for r in rows],['Bojo','Fino','Espesso','Halo'][pop],marker='o')
 x.set(xlabel='R [kpc]',ylabel='Resíduo / soma dos módulos',title='Jeans '+coordinate,xscale='log');x.axhline(0,color='gray',lw=.8)
finish(fig,ax,'15-jeans','Resíduos espaciais das equações de Jeans','z=0,2 kpc, h=0,01 kpc; todos os termos e passos 0,04/0,02/0,01 estão no JSON. Densidades muito pequenas, quadratura dos momentos e ações aproximadas limitam a interpretação; resíduo normalizado não é uma porcentagem exata de desequilíbrio físico.')
fig,ax=plt.subplots(1,2,figsize=(14,6));curve(ax[0],['B-original','B-bulge2','B-thin2','B-thick2'],'thin','h50',True);curve(ax[1],['B-original','B-bulge2','B-thin2','B-thick2'],'thin','sigmaZ',True);ax[0].set(xlabel='Tempo [Myr]',ylabel='Δh50 fino [%]');ax[1].set(xlabel='Tempo [Myr]',ylabel='Δσz fino [%]');finish(fig,ax,'16-resolucao-barionica','Refinamento isolado de bojo e discos',note+' Faixas: média±SD de três realizações por refinamento. '+' Halo contínuo Plummer compatível; uma população ressampleada por vez, massas preservadas. Thin2 aqui dobra 7092 para 14184; nomes das versões anteriores não são intercambiáveis.')
qm=read('jeans-qmc.json');fig,ax=plt.subplots(1,2,figsize=(14,6));labels=[]
for panel,key in enumerate(['radialScaled','verticalScaled']):
 for j,(pop,R)in enumerate((pop,R)for pop in range(4)for R in[1.,8.122]):
  label=['Bojo','Fino','Espesso','Halo'][pop]+'\n'+str(R)
  if panel==0:labels.append(label)
  native=next(r for r in ic['Jeans']if r['population']==pop and r['Rkpc']==R and r['zkpc']==.2 and r['hKpc']==.01)
  draw(ax[panel],[j],[native[key]],'Nativo'if j==0 else'_nativo','#252525',ls='',marker='x')
  for power,color,offset,marker in[(14,'#3976ae',-.08,'o'),(16,'#bd7620',.08,'s')]:
   rows=[r for r in qm['rows']if r['population']==pop and r['Rkpc']==R and r['hKpc']==.01 and r['power']==power];values=np.array([r[key]for r in rows]);mean=float(values.mean());sd=float(values.std(ddof=1));name=f'Sobol 2^{power}'
   draw(ax[panel],[j+offset],[mean],name if j==0 else'_'+name,color,ls='',marker=marker);ax[panel].errorbar(j+offset,mean,yerr=sd,color=color,fmt='none',capsize=3);points.extend([[name+' mean-SD',panel,j+offset,mean-sd],[name+' mean+SD',panel,j+offset,mean+sd]])
 ax[panel].set_xticks(range(8),labels,fontsize=8);ax[panel].set(xlabel='População e R [kpc]',ylabel='Resíduo / soma dos módulos',title='Jeans radial'if panel==0 else'Jeans vertical');ax[panel].axhline(0,color='gray',lw=.8)
finish(fig,ax,'17-jeans-independente','Quadratura independente dos momentos de Jeans','Mesma DF e mesmo potencial, z=0,2kpc e h=0,01kpc. Barras: desvio entre quatro scrambles de Sobol, não entre galáxias. Duas resoluções de integração em velocidade e diferenças finitas comuns; limites de caudas/quadratura e de ações aproximadas permanecem. Bojo em R solar tem densidade muito baixa; não determina sozinho a qualificação global.')
sources['scripts/equilibrium-105/plot.py']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
for f in figs:f['sha256']={ext:hashlib.sha256((BASE/f[ext]).read_bytes()).hexdigest()for ext in['png','svg','csv']}
(OUT/'manifest.json').write_text(json.dumps({'schema':'stationarity-figures-105','figures':figs,'sources':sources},indent=2,ensure_ascii=False)+'\n',encoding='utf8');print('FIGURES105',len(figs),flush=True)



