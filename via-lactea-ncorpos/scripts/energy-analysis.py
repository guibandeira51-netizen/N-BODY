from pathlib import Path
import json,csv,math,statistics,hashlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'reports/energy-audit';F=B/'figures';F.mkdir(exist_ok=True)
load=lambda name:json.loads((B/name).read_text(encoding='utf-8'))
ex=load('experiments.json');resolved=load('resolved-controls.json');obs=load('observed-run-before.json');initial=load('observed-initial-reference.json');precision=load('precision-calibration.json');gpu=load('gpu-controls.json');gb=load('gpu-binary-controls.json')
allcost={};legacy=[]
with (B/'trajectories.csv').open(newline='') as f:
 for r in csv.DictReader(f):
  allcost.setdefault(r['id'],[]).append(float(r['direct_ms']))
  if r['id'].startswith('legacy'):legacy.append({k:float(v) if k!='id' else v for k,v in r.items()})
for s in ex['summaries']:
 a=allcost[s['id']];s['directDiagnosticCostMs']={'mean':statistics.mean(a),'maximum':max(a),'samples':len(a)}
o0=obs['laboratory']['samples'][0]['conservation'];observed=[{'time_Myr':s['timeMyr'],'K':s['conservation']['kinetic'],'U_BH':s['conservation']['potential'],'E_BH':s['conservation']['energy'],'deltaE_BH_percent':100*(s['conservation']['energy']-o0['energy'])/abs(o0['energy'])} for s in obs['laboratory']['samples']]
def writecsv(name,rows):
 with (B/name).open('w',newline='',encoding='utf-8') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
writecsv('observed-80000.csv',observed)
gpurows=[]
for name,result in [('legacy96',gpu),('resolved-binary',gb)]:
 for r in result['rows']:
  q={**r,'model':name};L=q.pop('L');q.update(dict(zip(['Lx','Ly','Lz'],L)));gpurows.append(q)
writecsv('gpu-controls.csv',gpurows)
summary={'observed':{'configuration':obs['laboratory']['configuration'],'samples':len(observed),'lastTimeMyr':observed[-1]['time_Myr'],'maxAbsBHPercent':max(abs(r['deltaE_BH_percent']) for r in observed),'lastSignedBHPercent':observed[-1]['deltaE_BH_percent'],'directLaterAvailable':False,'claimed1_6PercentReproduced':False},'initial80000':{'KMatch':initial['kineticMatchesObserved'],'oldBHMatch':initial['oldBHMatchesObserved'],'directEnergy':initial['direct']['energy'],'deltaU':initial['baselineDeltaU'],'relativeUPercent':100*initial['relativeU'],'biasRelativeDirectEnergyPercent':100*initial['baselineDeltaU']/abs(initial['direct']['energy']),'directCostMs':initial['direct']['diagnosticCostMs']},'experiments':ex['summaries'],'resolvedControls':resolved['summaries'],'precision':precision,'gpuLegacy':gpu['summaries'],'gpuResolvedBinary':gb['summaries']}
for s in summary['experiments']:
 s.pop('finalPositions',None);s.pop('finalVelocities',None)
(B/'analysis.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False,'figure.dpi':130,'svg.fonttype':'none'})
manifest=[]
def save(name,title,datafiles,caption):
 fig=plt.gcf();fig.suptitle(title,fontsize=13);fig.text(.5,.015,caption,ha='center',fontsize=8);fig.tight_layout(rect=(0,.05,1,.95));fig.savefig(F/(name+'.svg'));fig.savefig(F/(name+'.png'));plt.close(fig);manifest.append({'id':name,'title':title,'svg':name+'.svg','png':name+'.png','data':datafiles,'caption':caption,'code':'scripts/energy-analysis.py','units':{'time':'Myr','energy':'1e10 Msun kpc2 Myr-2','energyError':'percent unless explicit dimensionless label'},'noSmoothing':True})
plt.figure(figsize=(9,4));plt.plot([r['time_Myr'] for r in observed],[r['deltaE_BH_percent'] for r in observed],'o-',label='Estimativa BH histórica, θ=0,5');plt.xlabel('Tempo físico [Myr]');plt.ylabel('ΔE / |E₀| [%]');plt.legend();plt.grid(alpha=.2);save('observed-80000','Execução preservada: 80.000 corpos, GPU Float32',['observed-80000.csv','observed-run-before.json'],'Oito medições; sem referência direta dos estados posteriores. Não representa erro de 1,6%.')
fig,ax=plt.subplots(1,2,figsize=(11,4))
for dt in [.1,.05,.025]:
 a=[r for r in legacy if r['id']=='legacy96-direct-dt'+str(dt)]
 for k,key in enumerate(['deltaE_direct','deltaE_BH']):ax[k].plot([r['time_Myr'] for r in a],[100*r[key] for r in a],label=f'dt={dt} Myr')
for a,t in zip(ax,['Hamiltoniana direta Float64','Estimativa Barnes–Hut θ=0,5']):a.set_title(t);a.set_xlabel('Tempo [Myr]');a.set_ylabel('ΔE / |E₀| [%]');a.legend();a.grid(alpha=.2)
save('legacy-dt','Mesmas condições iniciais legacy, N=96, força direta CPU',['trajectories.csv','experiments.json'],'Cadência 5 Myr; máximos amostrados. Não é reprodução da realização N=80.000.')
with (B/'theta-snapshots.csv').open() as f:th=[{k:float(v) if k!='id' else v for k,v in r.items()} for r in csv.DictReader(f)]
plt.figure(figsize=(9,4))
for t in [0,500,1000]:
 a=[r for r in th if r['id']=='legacy256-direct-dt0.05' and abs(r['time_Myr']-t)<1e-6 and r['theta']>0];plt.loglog([r['theta'] for r in a],[max(r['relative_U_error']*100,1e-15) for r in a],'o-',label=f't≈{t} Myr')
plt.xlabel('Abertura θ');plt.ylabel('|U_BH − U_direto| / |U_direto| [%]');plt.legend();plt.grid(alpha=.2);save('theta-calibration','Erro da árvore em snapshots idênticos: N=256',['theta-snapshots.csv'],'Calibração determinística pontual; a diferença varia com θ e com o estado. Sem faixa estatística.')
fig,ax=plt.subplots(1,2,figsize=(10,4))
for kind in ['circular','eccentric']:
 a=[s for s in resolved['summaries'] if s['kind']==kind];ax[0].loglog([s['dt'] for s in a],[s['maxAbsDirectEveryStep'] for s in a],'o-',label=kind);ax[1].loglog([s['dt'] for s in a],[s['maxTrajectoryErrorFirst100Myr'] for s in a],'o-',label=kind)
ax[0].set_ylabel('Máximo |ΔE/|E₀|| [adimensional]');ax[1].set_ylabel('Máxima diferença de posições [kpc]')
for a in ax:a.set_xlabel('dt [Myr]');a.legend();a.grid(alpha=.2)
save('binary-convergence','Convergência em binárias resolvidas: CPU Float64',['resolved-controls.json','resolved-controls.csv'],'Energia avaliada em cada passo por 1 Gyr; trajetória comparada a dt=0,003125 Myr nos primeiros 100 Myr.')
for name,result in [('gpu-legacy',gpu),('gpu-binary',gb)]:
 fig,ax=plt.subplots(1,3,figsize=(12,4),sharex=True)
 for a,dt in zip(ax,[.1,.05,.025]):
  for backend in ['GPU Float32','CPU Float64']:
   q=[r for r in result['rows'] if r['dt']==dt and r['backend']==backend];a.plot([r['time_Myr'] for r in q],[100*r['deltaE_direct'] for r in q],label=backend)
  a.set_title(f'dt={dt} Myr');a.set_xlabel('Tempo [Myr]');a.grid(alpha=.2)
 ax[0].set_ylabel('Desvio direto [%]');ax[0].legend(fontsize=8);save(name,'Hamiltoniana direta: GPU Float32 × CPU Float64'+(' · legacy N=96' if name=='gpu-legacy' else ' · binária excêntrica N=2'),['gpu-controls.csv',('gpu-controls.json' if name=='gpu-legacy' else 'gpu-binary-controls.json')],'Estados iniciais e parâmetros efetivos coincidem. Cadência 10 Myr; picos entre amostras não são limitados.')
(F/'manifest.json').write_text(json.dumps({'figures':manifest,'sourceIdentities':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [B/'experiments.json',B/'gpu-controls.json',B/'gpu-binary-controls.json',B/'resolved-controls.json',B/'observed-run-before.json']}},indent=2),encoding='utf-8')
def fmt(x):return f'{x:.7g}'
cpu='\n'.join(f"|{s['id']}|{s['n']}|{s['dt']}|{100*s['maxAbsDirect']:.6g}|{100*s['finalDirect']:.6g}|{100*s['maxAbsBH']:.6g}|{100*s['maxRelativeU']:.6g}|" for s in ex['summaries'])
resolvedtable='\n'.join(f"|{s['kind']}|{s['dt']}|{100*s['maxAbsDirectEveryStep']:.7g}|{s['maxTrajectoryErrorFirst100Myr']:.7g}|{s['maxAngularChange']:.3g}|" for s in resolved['summaries'])
gputable='\n'.join(f"|{r['model']}|{r['dt']}|{s['backend']}|{100*s['maxAbsDirect']:.6g}|{100*s['finalDirect']:.6g}|{s['maxAngularChange']:.3g}|" for result in [gpu,gb] for r in result['summaries'] for s in r['summary'])
audit=f'''# Auditoria de energia N-corpos — realização legacy

Data: 2026-10-17. Revisão aditiva do diagnóstico; integradores e massas históricos preservados. Projeto de TCC: Modelagem Computacional de Sistemas N-Corpos Aplicada ao Estudo da Matéria Escura.

## Evidência original, antes da alteração

A execução exportada da aba ativa tinha N=80.000, halo vivo, semente 2026, dt=0,1 Myr, ε=0,1 kpc, θ=0,5, backend efetivo GPU WebGPU direto Float32 e energia por árvore CPU Float64. Foram preservadas oito amostras de 0 a {observed[-1]['time_Myr']:.6f} Myr em `reports/energy-audit/observed-run-before.json`. O maior desvio BH nesses registros é **{summary['observed']['maxAbsBHPercent']:.8f}%**; o último é **{summary['observed']['lastSignedBHPercent']:.8f}%**, assinado. **A alegação de 1,6% não foi reproduzida nesse histórico.** O eixo já estava em porcentagem; 0,016 no eixo percentual equivale a 0,016%, não a 1,6%. Isso é uma explicação possível para a leitura, não uma afirmação sobre a origem da alegação.

O usuário já havia encerrado o motor. Posições e velocidades posteriores não estavam no JSON antigo, portanto a decomposição retroativa entre erro BH e erro da integração **não é identificável**. O estado inicial pôde ser regenerado, quantizado como no upload Float32, e reproduziu K e U_BH históricos exatamente no código antigo. Não foi fabricada uma referência direta para épocas posteriores.

## Caminho executado e diagnóstico encontrado

|Responsabilidade|Fonte auditada|Resultado|
|K, U e E originais|`src/physics/diagnostics.js`, `forces.js`|K=.5 Σm v²; U direto i<j; E=K+U. Fórmula Plummer correta, mas acumulação antiga simples.|
|Árvore energética|`forces.js`, `barnesHutPotentialEnergy`|Monopolo, folhas de 8, θ do usuário, .5 Σm_i Φ_i; sem auto-interação. Aproximação dirigida, sem limite de erro calibrado por estado.|
|Força CPU|`integrator.js`, `forces.js`|Direta simétrica Float64 ou BH dirigido Float64, conforme seleção. Energia direta pode auditar ambas as trajetórias.|
|Força GPU|`compute/gpu.js`, FORCE_WGSL|Soma direta em Float32; não é uma força BH. InverseSqrt e acumulação Float32 introduzem arredondamento.|
|Escolha do diagnóstico antigo|`main.js`, gpuDiagnosticOptions|Troca independente entre energia direta e BH por custo estimado. No registro observado, força GPU direta e energia BH.|
|Defeito de parâmetros|Entrada ao vivo → Worker|G e ε² efetivos só chegavam à rotação; energia usava valores nominais. Corrigido no diagnóstico aditivo; a força não foi alterada.|
|GPU readback|GPUBackend.snapshot|Espera a fila e lê posições, massas, velocidades e acelerações após o kick final. Conversão Float32→Float64 não restaura dígitos perdidos.|
|E₀ e gráfico|LaboratoryHistory, live-diagnostics|Primeiro estado da sessão, preservado ao reduzir histórico. Gráfico assinado em %, painel antigo absoluto em %. Não havia remoção artificial de tendência.|

G nominal = **0.04498502151469553** kpc³/(Myr²·10¹⁰ M☉). GPU: G={initial['actualParameters']['G']}, ε²={initial['actualParameters']['epsilonSquared']} kpc², dt=f32(0,1)=0,10000000149011612 Myr. O relógio GPU histórico acumula o dt solicitado, enquanto o shader usa dt Float32: diferença relativa 1,49×10⁻⁸, registrada nos ensaios. O diagnóstico direto usa o ε² armazenado, sem fazer sqrt e quadrado novamente. A árvore preservada recebe sqrt(ε²), logo pode haver um arredondamento adicional de um ulp ao elevar novamente ao quadrado; ambos os valores são explicitados e a árvore permanece uma estimativa.

## Hamiltoniana e sincronização

Para o sistema isolado vivo, H = .5 Σm_i|v_i|² − G Σ_(i<j) m_i m_j / sqrt(|r_i−r_j|²+ε²). A derivada dá a força Plummer −Gm_j(r_i−r_j)/(r²+ε²)^(3/2). Cada par aparece uma vez; nenhuma autointeração. As massas individuais efetivas são as lidas do estado, inclusive o arredondamento de upload na GPU. Unidades: kpc, Myr, 10¹⁰ M☉; v em kpc/Myr; energia em 10¹⁰ M☉ kpc²/Myr². Não há força não conservativa nem campo dependente do tempo na realização principal auditada.

CPU KDK: v_(n+1/2)=v_n+(dt/2)a_n; r_(n+1)=r_n+dt v_(n+1/2); recalcula a_(n+1); v_(n+1)=v_(n+1/2)+(dt/2)a_(n+1). O estado devolvido tem r e v no mesmo passo completo. A GPU usa três passes separados e snapshot após finalKick. O teste novo verifica a identidade de ambos os kicks numericamente. **Nenhum erro de sincronização foi encontrado; o integrador não foi modificado.**

## Halo fixo e campos externos: escopo separado

O halo da aba auditada é constituído por partículas vivas. O modelo bariônico simplesmente não inclui partículas de halo. A aba não adiciona simultaneamente um halo analítico. Nos controles históricos de halo fixo, fixedHaloDiagnostics soma U_self + ΣmΦ_ext sem fator 1/2; validateFixedHaloState rejeita halo massivo simultâneo. ExternalGrid usa o potencial escalar interpolado e seu gradiente; o fallback externo e a extrapolação têm limitações registradas. A tabela radial histórica fixed-halo interpola massa e potencial independentemente: o gradiente da interpolação de Φ não é exatamente G M_interp/r² dentro de cada célula. Assim, esse controle não é um oráculo Hamiltoniano exato e requer calibração da tabela. **Esses dados históricos não foram reescritos nem usados para certificar a realização legacy.**

validationSnapshot preservado já oferece ΣmΦ_ext, rejeição de dupla contagem, simetria e condições de conservação. Um teste novo verifica o fator externo sem 1/2 e a rejeição de halo duplicado. Para campos dependentes do tempo, dH/dt=Σm∂Φ/∂t; forças não conservativas acrescentam Σm v·a_nc. Energia das partículas não é então um invariante automático. O novo diagnóstico ao vivo isolado rejeita opções externas para evitar uso silencioso da Hamiltoniana errada.

## Alteração entregue

- `physics/live-energy.js`: K compensado reutilizado de validationSnapshot; BH rápido rotulado; parâmetros efetivos; referência direta i<j compensada de pairEnergyRange; normalização explícita.
- `compute/live-energy-reference.js` e Worker: até quatro Workers independentes, partições de linhas sem repetição, redução compensada, estimativa por piloto, progresso por partição concluída e cancelamento por término dos Workers.
- Worker da aba guarda o estado inicial real; captura consistente seleciona o estado atual e retoma a integração se ela estava rodando. Encerrar preserva os endpoints para auditoria; reiniciar limpa a referência da sessão.
- Um gráfico de energia: linha BH, pontos diretos sem segmentos interpolados, comparação U_BH−U_direto no mesmo estado, referência E₀ própria para cada método, máximos amostrados e épocas explícitas. Nenhuma faixa de incerteza inventada.
- JSON energético preserva snapshots auditados completos; CSV preserva energias e parâmetros, e SVG exporta o gráfico. Não há soma direta por quadro nem referência automática em N grande.
- Não houve reescala de v, amortecimento, ajuste de massa, deslocamento de partículas, correção forçada de E, suavização visual ou remoção de tendência. Demais abas mantêm o design.

## Precisão e incerteza

No snapshot legacy N=96, o cálculo independente Decimal com 80 dígitos, usando os valores binários exatos armazenados, encontrou erro relativo de E **{precision['errors']['energy']['relative']:.4g}** e de U **{precision['errors']['potential']['relative']:.4g}**. Isso calibra a avaliação naquele caso, não a trajetória nem um limite universal para N=80.000. Soma compensada reduz erro de acumulação; não é aritmética exata. A fundamentação das técnicas de soma está em [Ogita, Rump e Oishi (2005), Accurate Sum and Dot Product](https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf), seção 1.1. Nenhum resultado desta entrega afirma reproduzir os algoritmos avançados SumK do artigo ou herdar automaticamente seus limites.

As diferenças BH/direto são calibrações determinísticas nos pontos medidos, não intervalos de confiança. Não existe limite formal para o erro aritmético de toda referência em N arbitrário nem para o arredondamento da força GPU. A redução do dt deve ser testada: mais passos também acumulam mais arredondamento, e sistemas caóticos com encontros próximos podem divergir entre trajetórias.

## Dados, código e reprodução

Veja `reports/energy-audit/analysis.json`, `figures/manifest.json`, os CSV e os dois relatórios complementares. Identidade do código e SHA-256 das evidências são registrados no diretório da auditoria. As técnicas de 1.0.4/1.0.5 reutilizadas são a partição de pares, compensação, validationSnapshot e o limite analítico da convenção G/ε² (`hamiltonian-bounds-105.js`). Nenhum valor de conservação AGAMA–Plummer foi transferido para a realização legacy.
'''
(ROOT/'AUDITORIA_ENERGIA_NCORPOS.md').write_text(audit,encoding='utf-8')
comparison=f'''# Comparação entre energia direta e Barnes–Hut

## Resultado identificável na execução original

Oito registros BH, N=80.000, GPU direta Float32, θ=0,5: máximo |δE| **{summary['observed']['maxAbsBHPercent']:.8f}%**, último **{summary['observed']['lastSignedBHPercent']:.8f}%** em {observed[-1]['time_Myr']:.3f} Myr. A variação de 1,6% não consta do histórico exportado.

No estado inicial real regenerado: K={initial['direct']['kinetic']:.17g}, U_direto={initial['direct']['potential']:.17g}, U_BH={initial['fast']['potential']:.17g}, E_direto={initial['direct']['energy']:.17g}. δU=U_BH−U_direto={initial['baselineDeltaU']:.12g}; ε_U={initial['relativeU']:.12g}, isto é **{100*initial['relativeU']:.8f}% de |U|**. O deslocamento equivale a {summary['initial80000']['biasRelativeDirectEnergyPercent']:.8f}% de |E_direto(0)|. Custo direto medido: {initial['direct']['diagnosticCostMs']/1000:.3f} s, um processo CPU, 3.199.960.000 pares. Esse custo motiva referências selecionadas e paralelas.

Um viés inicial não é uma deriva. Com b(t)=U_BH(t)−U_direto(t), ΔE_BH=ΔE_direto+b(t)−b(0). Os erros normalizados usam ainda denominadores iniciais diferentes. Sem estados posteriores, **não é possível atribuir uma fração numérica dos alegados 1,6% à árvore**, nem provar que os 0,01847% observados são todos diagnósticos ou todos integração. O viés inicial é da mesma ordem do desvio estimado, o que torna necessária a comparação direta posterior; não autoriza subtrair um valor constante do gráfico.

## Comparação em snapshots idênticos

`theta-snapshots.csv`: trajetórias diretas legacy N=96 e N=256, estados de 0, 500 e 1000 Myr; em cada estado θ=1, 0,7, 0,5, 0,25, 0,1 e 0. A força da trajetória não muda durante essa varredura diagnóstica. `trajectories.csv` preserva energia direta e BH, com os mesmos estados e a mesma época inicial, ao longo das trajetórias. O erro da árvore varia com a configuração e θ, sem monotonicidade temporal universal. θ=0 é um controle sem aceitação de monopolos distantes, sujeito à ordem da soma Float64.

|Ensaio CPU|N|dt [Myr]|Máx. direto [%]|Último direto [%]|Máx. BH [%]|Máx. erro de U [%]|
|---|---:|---:|---:|---:|---:|---:|
{cpu}

Os controles de força BH são identificados no nome do ensaio; sua energia direta diagnostica a trajetória da força aproximada. Aumentar precisão do diagnóstico não torna a força BH simétrica nem garante uma Hamiltoniana global da árvore. Nos demais ensaios a força é direta. Para legacy a cadência é 5 Myr; para as binárias compactas de estresse, cada passo. Os ensaios compactos r=0,1 kpc não resolvem adequadamente encontros em dt grosseiro; resultados muito grandes são preservados e classificados como falhas de resolução, não escondidos.

## Convenção nominal e efetiva da GPU

O limite analítico preservado de 1.0.5 é aplicável à convenção de parâmetros de qualquer soma Plummer positiva, sem importar a dinâmica AGAMA. Para G e ε² desta GPU, a razão |U_efetivo|/|U_nominal| fica entre 1,0000000195877132 e 1,0000000307635846, em aritmética ideal. Trata-se de cerca de 2–3×10⁻⁸ relativamente a U: é uma inconsistência real a corrigir, mas sua escala não explica 1,6%. Esse limite não calibra BH, inverseSqrt ou acumulação GPU.

![Erro da árvore](reports/energy-audit/figures/theta-calibration.png)

Os SVG estão junto aos PNG; dados, unidades e hashes constam de `figures/manifest.json`. Não há faixa de incerteza não fundamentada.
'''
(ROOT/'COMPARACAO_ENERGIA_DIRETA_BH.md').write_text(comparison,encoding='utf-8')
validation=f'''# Validação da conservação de energia

## O que foi demonstrado

O integrador KDK original permaneceu intacto. r e v são síncronos no passo completo. A Hamiltoniana direta Plummer é compatível com a força ideal de pares. Energia direta do estado GPU é calculada em CPU Float64, com os valores efetivamente armazenados de G, ε², massas, posições e velocidades. Isso não converte a trajetória em Float64 nem elimina arredondamento da força.

Os ensaios foram executados com os três passos solicitados (0,1; 0,05; 0,025 Myr), até 1000 Myr, em sistemas controlados. G físico é 0,04498502151469553 nas unidades internas. A realização principal de 80.000 corpos teve apenas o estado inicial regenerado e auditado diretamente; seu histórico original permanece separado. Não se executou uma nova campanha galáctica extensa.

## Segunda ordem e amostragem ao longo da trajetória

Binária resolvida: massas individuais de 10¹⁰ M☉, posições iniciais ±1 kpc, ε=0,005 kpc. Circular: velocidade circular Plummer exata inicial. Excêntrica: 0,65 dessa velocidade. Para energia, **cada passo completo** foi avaliado em 1 Gyr. Para trajetória, compara-se com CPU Float64 dt=0,003125 Myr nos mesmos tempos inteiros de 0 a 100 Myr. Referência refinada é numérica, não solução analítica independente. A circular fornece também um invariante e frequência inicial analíticos.

|Órbita|dt [Myr]|Maior erro absoluto em todos os passos [%]|Máxima diferença de posição [kpc]|Máxima variação relativa de L|
|---|---:|---:|---:|---:|
{resolvedtable}

Na excêntrica resolvida, o máximo erro energético cai aproximadamente por 4 ao reduzir dt pela metade, e o erro de trajetória também: evidência da ordem 2 no regime examinado. A circular tem erro de energia com cancelamento de ordem superior (aproximadamente dt⁴), enquanto a trajetória mantém ordem 2; não se deve inferir a ordem do integrador apenas pela energia circular. Os controles compactos de estresse r=0,1 kpc mostram falhas reais em passos grandes e não certificam estabilidade; estão integralmente em `experiments.json` e `trajectories.csv`.

No legacy N=96, força direta CPU Float64, máximos diretos amostrados em 1 Gyr: dt=0,1 → 3,64344%; 0,05 → 0,300102%; 0,025 → 0,0939405%. Isso demonstra melhora nessa realização, sem impor uma lei dt² universal em sistema com encontros e evolução estrutural. Há variação real da Hamiltoniana de pares: a árvore não é a única fonte possível do sinal. A amostragem a cada 5 Myr pode perder picos; os máximos são explicitamente amostrados.

## GPU Float32 e CPU Float64

Cada comparação começa no **mesmo estado lido da GPU**, com massas e coordenadas Float32 preservadas. A CPU usa G, ε² e dt efetivos da GPU. O relógio CPU acompanha dt efetivo; o controlador GPU mostra dt solicitado (diferença de 1,49×10⁻⁸ no tempo relativo). Os ensaios têm 101 medições por trajetória, a cada 10 Myr solicitados. A CPU refaz sqrt(ε²) para sua interface de força; o residual de um ulp ao quadrar é explicitado, sem relevância para alegação percentual. Não foram subtraídas tendências nem normalizados estados depois dos passos.

|Modelo|dt [Myr]|Backend|Maior erro direto amostrado [%]|Último desvio direto [%]|Maior variação relativa de L|
|---|---:|---|---:|---:|---:|
{gputable}

Na binária, a CPU amostrada mantém aproximadamente redução por 4; a GPU chega a um regime em que diminuir dt aumenta o máximo amostrado (mais operações Float32). No legacy N=96 a GPU teve erro real grande e não monotônico, chegando a cerca de 10,97% amostrados em dt=0,05. Isso **não é erro da árvore de energia** e não pode ser escondido. Também não é uma previsão do erro de N=80.000: mudam a granularidade, os encontros e a trajetória. A divergência das posições entre CPU e GPU ao longo de 1 Gyr é registrada, sem ser usada como estimativa de incerteza energética. Não há convergência global Float32 certificada para a galáxia viva.

As binárias GPU e CPU foram amostradas a cada 10 Myr; esses máximos não são comparáveis diretamente aos máximos CPU medidos em todos os passos. Picos de periastro podem ocorrer entre as amostras. Toda tabela declara sua cadência, e nenhum valor final isolado é tomado como certificação do integrador.

## Precisão do diagnóstico

O oracle Decimal-80 de `energy-precision.py` usa `Decimal.from_float` sobre os dados binários exatos, sem trocar ε² por uma constante decimal diferente. Para N=96, o erro relativo de U foi {precision['errors']['potential']['relative']:.5g}; de E, {precision['errors']['energy']['relative']:.5g}. É evidência de precisão da avaliação naquele snapshot, não limite formal universal. Os testes preservados de partição, pares com massas diferentes e limites de convenção também passaram. A versão 1.0.5 é reutilizada metodologicamente; seus resultados AGAMA não são tratados como resultados da página legacy.

## Interface e normalização

δE=(E(t)−E₀)/|E₀|; percentual=100δE; absoluto=|δE|. Se |E₀|≤64·EPS·(K₀+|U₀|), usa-se K₀+|U₀|, explicitado no resumo. Se nem essa escala é positiva e finita, o resultado é indisponível. Máximos são amostrados. Cada método compara seu E₀ no mesmo estado físico inicial. A linha BH permanece estimativa; pontos diretos não são unidos. A comparação δU usa exatamente o mesmo snapshot. Quando não há referência, a interface diz que a conservação ainda não foi verificada diretamente. Somente o ponto inicial tampouco certifica conservação temporal.

Clique **Estimar referência direta**, examine as épocas selecionadas e o custo; depois **Calcular referência direta**. A captura pausa o motor até o passo completo e retoma quando apropriado. O custo é projetado por piloto, pode diferir devido a cópias, aquecimento, concorrência e cache. O progresso avança por partição concluída. **Cancelar referência** termina seus Workers e descarta resultados incompletos; não altera a trajetória. Os resultados completos já obtidos permanecem. JSON energético inclui as partículas auditadas; CSV inclui energias, parâmetros e custos; SVG conserva os pontos reais.

## Reprodução

1. `node scripts/test.mjs` — regressão e contratos físicos de energia.
2. `node scripts/energy-experiments.mjs` — CPU legacy e estresse binário; em uma nova pasta ou após preservar o diretório de resultados desta entrega.
3. `node scripts/energy-resolved-controls.mjs` — binárias resolvidas e comparação temporal.
4. Abra `tests/browser-energy-audit.html` no servidor local; execute cada modelo e preserve o JSON visível. GPU/driver podem alterar resultados Float32; não se presume reprodução bit a bit.
5. Python: `scripts/energy-precision.py` e `scripts/energy-analysis.py` (matplotlib para as figuras).
6. `node scripts/interface-106/site.mjs`, `node scripts/interface-106/identity.mjs`, `node scripts/build.mjs` — gerar a interface e o build estático GitHub/Vercel. Nenhuma publicação remota foi feita.

CSV: `trajectories.csv`, `theta-snapshots.csv`, `resolved-controls.csv`, `gpu-controls.csv`, `observed-80000.csv`. SVG/PNG: seis figuras em `reports/energy-audit/figures`; manifesto com fontes e hashes. `analysis.json` reúne parâmetros, energia inicial/final, máximos, custos e limitações; os registros GPU completos têm dados de cada época.

## Uso na banca

É defensável apresentar a Hamiltoniana, a auditoria do KDK, a calibração da árvore nos estados medidos, a convergência em controles resolvidos e os limites de Float32 e da resolução temporal. **Não é defensável afirmar conservação certificada em N=80.000 por 1 Gyr, atribuir uma fração conhecida dos 1,6% à árvore ou declarar a galáxia estruturalmente estável.** Para a execução da apresentação, audite o início e épocas posteriores com o botão direto e preserve o JSON. Os controles explicitam falhas em regimes não resolvidos, permitindo discutir critérios de convergência em vez de ocultar os erros.
'''
(ROOT/'VALIDACAO_CONSERVACAO_ENERGIA.md').write_text(validation,encoding='utf-8')
print(json.dumps({'figures':len(manifest),'observed':summary['observed'],'precision':precision['errors'],'CPUexperiments':len(ex['summaries']),'resolvedControls':len(resolved['summaries']),'GPUruns':len(gpu['summaries'])+len(gb['summaries'])}))
