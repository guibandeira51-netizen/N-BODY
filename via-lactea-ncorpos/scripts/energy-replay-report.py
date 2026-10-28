from pathlib import Path
import json,csv,hashlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'reports/energy-audit';F=B/'figures'
r=json.loads((B/'replay-80000-analysis.json').read_text(encoding='utf-8'));rows=r['rows'];peak=r['peakApparent'];last=rows[-1]
a=json.loads((B/'analysis.json').read_text(encoding='utf-8'));a['replay80000']=r;a['observed']['originalLaterParticleSnapshotsAvailable']=False;a['observed']['directLaterAvailableInControlledReplay']=True;(B/'analysis.json').write_text(json.dumps(a,indent=2),encoding='utf-8')
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none'})
fig,ax=plt.subplots(2,1,figsize=(10,7),sharex=True)
ax[0].plot([x['time_Myr'] for x in rows],[x['delta_BH_effective_percent'] for x in rows],'-o',color='#318a67',label='Energia estimada — Barnes–Hut, θ=0,5')
ax[0].scatter([x['time_Myr'] for x in rows],[x['delta_direct_percent'] for x in rows],color='#c07b25',s=40,label='Energia direta Float64 · 8 estados',zorder=4)
ax[0].set_ylabel('ΔE / |E₀| [%]');ax[0].legend();ax[0].grid(alpha=.2)
zoom=ax[0].inset_axes([.56,.13,.34,.28]);zoom.scatter([x['time_Myr'] for x in rows],[x['delta_direct_percent'] for x in rows],color='#c07b25',s=16);zoom.set_title('Referência direta · ampliação [%]',fontsize=8);zoom.tick_params(labelsize=7);zoom.ticklabel_format(axis='y',style='sci',scilimits=(0,0));zoom.grid(alpha=.2)
ax[1].plot([x['time_Myr'] for x in rows],[x['relative_U_percent'] for x in rows],'o-',color='#427dbc');ax[1].set_ylabel('|U_BH − U_direto| / |U_direto| [%]');ax[1].set_xlabel('Tempo físico [Myr]');ax[1].grid(alpha=.2)
fig.suptitle('Legacy N=80.000 · mesma trajetória auditada, GPU direta Float32',fontsize=13)
fig.text(.5,.015,'K e U históricos reproduzidos exatamente nas 8 épocas. Pontos diretos sem interpolação; máximos entre épocas não limitados.',ha='center',fontsize=8);fig.tight_layout(rect=(0,.04,1,.95))
for ext in ['svg','png']:fig.savefig(F/('replay-80000-energy.'+ext),dpi=140)
plt.close(fig)
fig,ax=plt.subplots(figsize=(8,4))
for t in [0,rows[-1]['time_Myr']]:
 a=[x for x in r['thetaRows'] if x['time_Myr']==t];ax.loglog([x['theta'] for x in a],[x['relative_U_percent'] for x in a],'o-',label=f't={t:.1f} Myr')
ax.set_xlabel('Abertura θ');ax.set_ylabel('|U_BH − U_direto| / |U_direto| [%]');ax.grid(alpha=.2);ax.legend();fig.suptitle('Calibração da árvore no tamanho real: N=80.000');fig.tight_layout()
for ext in ['svg','png']:fig.savefig(F/('replay-80000-theta.'+ext),dpi=140)
plt.close(fig)
m=json.loads((F/'manifest.json').read_text(encoding='utf-8'));m['figures']=[x for x in m['figures'] if not x['id'].startswith('replay-80000')]
for name in ['replay-80000-snapshots.json','replay-80000-analysis.json','replay-80000.csv','replay-80000-theta.csv']:m['sourceIdentities'][name]=hashlib.sha256((B/name).read_bytes()).hexdigest()
for name,data in [('replay-80000-energy','replay-80000.csv'),('replay-80000-theta','replay-80000-theta.csv')]:m['figures'].append({'id':name,'svg':name+'.svg','png':name+'.png','data':[data,'replay-80000-analysis.json','replay-80000-snapshots.json'],'code':'scripts/energy-replay-report.py','units':{'time':'Myr','relativeEnergy':'percent','energy':'1e10 Msun kpc2 Myr-2'},'calibration':'selected snapshots, no statistical band','directPointsInterpolated':False})
(F/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
table='\n'.join(f"|{x['time_Myr']:.1f}|{x['delta_BH_historical_percent']:+.9f}|{x['delta_BH_effective_percent']:+.9f}|{x['delta_direct_percent']:+.9f}|{x['relative_U_percent']:.7f}|" for x in rows)
section=f'''## Repetição controlada que reproduziu os oito registros originais

Uma única repetição, com o mesmo N=80.000, semente 2026, halo vivo, dt=0,1 Myr, ε=0,1 kpc, shader direto Float32 e parâmetros efetivos, integrou até 1124,6 Myr. K e U calculados pelo diagnóstico antigo foram **exatamente iguais aos oito valores exportados anteriormente**, incluindo todas as épocas posteriores. Isso fornece evidência forte de reprodução local da trajetória; os estados originais encerrados não existem para uma comparação bit a bit das partículas.

Nos mesmos estados da repetição, foram calculados BH e pares diretos Float64 compensados, em {r['parallelWorkers']} Workers. Os oito snapshots completos foram preservados em `replay-80000-snapshots.json`, com hashes de posições, velocidades, massas e componentes em `replay-80000.csv`. A referência inicial paralela concorda com a avaliação serial anterior. O integrador, o shader, as massas e os passos não foram alterados.

|Tempo [Myr]|Desvio BH histórico [%]|Desvio BH com parâmetros efetivos [%]|Desvio direto [%]|Erro relativo de U_BH [%]|
|---|---:|---:|---:|---:|
{table}

O maior desvio direto amostrado foi **{r['maximumSampledDirectPercent']:.9f}%** (fração {r['maximumSampledDirectPercent']/100:.9g}); o último foi **{r['lastDirectPercent']:+.9f}%**. Energia inicial direta: {r['initialEnergy']:.17g}; final: {r['finalEnergy']:.17g}, nas unidades internas. A variação medida é pequena e não nula. O maior erro angular amostrado, normalizado por Σ|m r×v| inicial, foi {r['maximumAngularChange']:.6g}.

No máximo aparente em {peak['time_Myr']:.1f} Myr, a curva histórica era **{peak['delta_BH_historical_percent']:+.9f}%**; a referência direta deu **{peak['delta_direct_percent']:+.9f}%**. Com G e ε² corrigidos, a linha BH dá {peak['delta_BH_effective_percent']:+.9f}%; a diferença entre essa linha e o ponto direto é {peak['delta_BH_effective_percent']-peak['delta_direct_percent']:.9f} ponto percentual. A contribuição dominante da variação aparente nessa época é o diagnóstico por árvore. O residual direto tem sinal oposto. Não se expressa essa oposição como uma porcentagem causal artificial limitada a 100%.

Defina b(t)=U_BH(t)−U_direto(t). Na mesma escala |E_direto(0)|, a decomposição é exata: ΔE_BH/|E_direto(0)| = ΔE_direto/|E_direto(0)| + [b(t)−b(0)]/|E_direto(0)|. No pico, os termos percentuais são {peak['delta_direct_percent']:+.9f}% + {peak['estimator_change_common_scale_percent']:+.9f}% = {peak['fast_change_common_scale_percent']:+.9f}%. A curva BH exibida usa seu próprio |E_BH(0)|, o que explica a pequena diferença de denominador. Nenhum desses termos é removido ou ajustado na interface.

O erro de U_BH com θ=0,5 variou de {min(x['relative_U_percent'] for x in rows):.7f}% a {max(x['relative_U_percent'] for x in rows):.7f}%. A varredura θ=0,25; 0,5; 0,75; 1 foi repetida no tamanho real, nos estados inicial e final, sem reintegrar órbitas: `replay-80000-theta.csv`. Custo médio direto assíncrono: {r['directCostMs']['mean']/1000:.3f} s/estado; máximo {r['directCostMs']['maximum']/1000:.3f} s. A repetição completa, com diagnósticos e esperas, durou {r['wallMs']/1000:.1f} s. Custos refletem esta execução e carga do computador, não benchmarks isolados comparáveis ao ensaio serial em Node.

Os oito pontos não limitam excursões entre épocas nem separam o residual entre erro de truncamento KDK e arredondamento GPU. Isso exige outros controles. Os ensaios pequenos de dt e precisão permanecem separados. A repetição não valida estabilidade estrutural e não sustenta conservação exata durante todos os passos de bilhões de anos.

![Energia estimada e direta da repetição](reports/energy-audit/figures/replay-80000-energy.png)

SVG e dados: `reports/energy-audit/figures/replay-80000-energy.svg`, `replay-80000.csv`, `replay-80000-theta.csv` e `replay-80000-analysis.json`.

'''
# Rewrite the earlier initial-only interpretation; its draft is preserved in interim-initial-only/.
p=ROOT/'AUDITORIA_ENERGIA_NCORPOS.md';s=p.read_text(encoding='utf-8');old='O usuário já havia encerrado o motor. Posições e velocidades posteriores não estavam no JSON antigo, portanto a decomposição retroativa entre erro BH e erro da integração **não é identificável**. O estado inicial pôde ser regenerado, quantizado como no upload Float32, e reproduziu K e U_BH históricos exatamente no código antigo. Não foi fabricada uma referência direta para épocas posteriores.'
s=s.replace(old,'O motor original estava encerrado e o JSON antigo não continha partículas posteriores. Primeiro foi regenerado e conferido o início; depois uma única repetição controlada reproduziu exatamente K e U originais nas oito épocas e permitiu auditar diretamente seus novos snapshots. Isso fornece uma decomposição medida na repetição, com a limitação de não comparar bit a bit os estados originais indisponíveis. Os detalhes e os dados completos seguem abaixo.');s=s.replace('## Caminho executado e diagnóstico encontrado',section+'## Caminho executado e diagnóstico encontrado');p.write_text(s,encoding='utf-8')
p=ROOT/'COMPARACAO_ENERGIA_DIRETA_BH.md';s=p.read_text(encoding='utf-8');start=s.index('Um viés inicial não é uma deriva.');end=s.index('## Comparação em snapshots idênticos');s=s[:start]+section+s[end:];p.write_text(s,encoding='utf-8')
p=ROOT/'VALIDACAO_CONSERVACAO_ENERGIA.md';s=p.read_text(encoding='utf-8');s=s.replace('A realização principal de 80.000 corpos teve apenas o estado inicial regenerado e auditado diretamente; seu histórico original permanece separado. Não se executou uma nova campanha galáctica extensa.','A realização de 80.000 corpos foi repetida uma vez, reproduzindo exatamente os oito K e U originais e acrescentando referência direta nos mesmos estados da repetição. Seu histórico original permanece preservado. Não se executou uma nova campanha galáctica extensa.');s=s.replace('## Segunda ordem e amostragem ao longo da trajetória',section+'## Segunda ordem e amostragem ao longo da trajetória');s=s.replace('**Não é defensável afirmar conservação certificada em N=80.000 por 1 Gyr, atribuir uma fração conhecida dos 1,6% à árvore ou declarar a galáxia estruturalmente estável.**','**É defensável informar o máximo direto amostrado de 0,000136555% nesta repetição de 80.000 corpos até 1,1246 Gyr.** Os 1,6% não constam dos registros originais. Não há limite sobre picos entre os oito pontos, partição quantitativa do residual entre KDK e Float32 nem validação da estabilidade estrutural.');s=s.replace('seis figuras em','oito figuras em');s=s.replace('`observed-80000.csv`.','`observed-80000.csv`, `replay-80000.csv` e `replay-80000-theta.csv`.');s=s.replace('## Uso na banca','Para repetir a auditoria N=80.000, abra `tests/browser-energy-replay.html`, inicie uma vez, exporte pelo botão e preserve o arquivo como `reports/energy-audit/replay-80000-snapshots.json` em uma cópia de trabalho. Execute `node scripts/energy-replay-analysis.mjs`, depois Python `scripts/energy-analysis.py` e `scripts/energy-replay-report.py`, nesta ordem. O relatório inicial é complementado pela repetição; os dados desta entrega devem ser preservados antes de qualquer regeneração.\n\n## Uso na banca');p.write_text(s,encoding='utf-8')
print(json.dumps({'completed':True,'exactAggregates':r['aggregateReproductionExact'],'maximumDirectPercent':r['maximumSampledDirectPercent'],'lastDirectPercent':r['lastDirectPercent'],'thetaRows':len(r['thetaRows'])}))
