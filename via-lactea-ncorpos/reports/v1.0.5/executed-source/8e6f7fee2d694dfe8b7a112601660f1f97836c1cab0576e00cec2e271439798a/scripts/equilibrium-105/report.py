"""Generate the six requested scientific documents from completed measurements."""
from pathlib import Path
import json,sys,platform,hashlib,datetime,re
import numpy as np
import agama,scipy,matplotlib
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.5';read=lambda n:json.loads((BASE/n).read_text(encoding='utf-8-sig'));a=read('analysis.json');d=read('decision.json');p=read('preregistered-protocol.json');ic=read('ic-audit.json');prep=read('preparation-decision.json');force=read('force-audit.json');collective=read('collective-diagnosis.json');history=read('preservation.json');qmc=read('jeans-qmc.json');pilot=read('pilot-decision-F.json');cpu=read('cpu-method-pilot.json');H=read('halo-H-decision.json');groups={g['label']:g for g in a['groups']};new=[r for r in a['runs']if r['path'].startswith('reports/v1.0.5/runs/')];source=read('code-identity.json');best=d['selectedLabel'];fixed='E/F usam exatamente os mesmos bárions da semente2026 e três sementes de halo. E104/A/B originais variam três realizações bariônicas: suas incertezas não são intercambiáveis. A trajetória E/h2026 é reutilizada por referência e não contada como uma nova integração.'
names={'A-original':'A: potencial total fixo','B-original':'B: halo contínuo+bárions vivos','E104':'C: E da1.0.4, sementes diagonais','A-MIX':'A: tentativa MIX','B-MIX':'B: tentativa MIX','B-bulge2':'B: bojo×2','B-thin2':'B: fino7092→14184','B-thick2':'B: espesso×2','E':'E105: Nh80000, bárions fixos','F':'F105: Nh160000, bárions fixos'}
def fmt(x,n=3):return f'{x:.{n}f}'if x is not None else'—'
def stat(label,key):
 x=groups[label]['metrics'][key];return f'{fmt(x["mean"])} ± {fmt(x["sd"])}'
def ci(x):return'—'if x['CI95']is None else'['+', '.join(fmt(v)for v in x['CI95'])+']'
table='| Experimento | n | Δh50 fino[%] | Δh50 espesso[%] | Δσz² fino[(km/s)²] | Δh tardia/h0[%] |\n|---|---:|---:|---:|---:|---:|\n'
for label,g in groups.items():table+=f'| {names.get(label,label)} | {g["n"]} | {stat(label,"thinGrowth")} | {stat(label,"thickGrowth")} | {stat(label,"thinVarianceChange")} | {100*g["metrics"]["thinLateHeightFraction"]["mean"]:.3f} |\n'
references='''
## Fontes primárias e alcance

- [Cautun et al.2020, Tabela2, coluna NFW](https://arxiv.org/abs/1911.04557): referência dos parâmetros históricos de massa e escala. O modelo reduzido sem gás/CGM não é uma reprodução do ajuste observacional completo.
- [Vasiliev, AGAMA](https://arxiv.org/abs/1802.08239): funções de distribuição em ações, momentos e construção autoconsistente. A biblioteca não certifica a realização deste trabalho.
- [Ludlow et al.2021](https://arxiv.org/abs/2105.03561): estudos publicados de aquecimento espúrio por macro partículas de halo; motivação do teste de resolução. Seus resultados não são apresentados como medições da nossa galáxia.
- [Vasiliev2013, SMILE/Schwarzschild](https://arxiv.org/abs/1307.8116): superposição orbital com ajuste de pesos à densidade. Nosso ensaio MIX não implementa esse ajuste e não é denominado Schwarzschild completo.
- [Yurin & Springel2014, GALIC](https://arxiv.org/abs/1402.1623): alternativa que otimiza a resposta de densidade orbital com restrições cinemáticas. Foi investigada metodologicamente, não instalada ou executada aqui; adaptação ao mesmo potencial suavizado e às restrições observacionais exigiria validação própria.
- [Toomre1964](https://adsabs.harvard.edu/pdf/1964ApJ...139.1217T): critério local para um disco estelar idealizado. O Q calculado aqui é somente um indicador limitado.
'''
common='''
## Convenções e limites de interpretação

Comprimento:kpc; tempo:Myr; massa interna:10¹⁰ massas solares nominais. Energia interna:10¹⁰ M☉ kpc²/Myr². Velocidades em gráficos são convertidas para km/s; o gerador preserva a conversão nominal de G registrada na preparação. h50 é a mediana ponderada de distância absoluta ao plano próprio da população. σz usa o eixo cartesiano original; σ perpendicular e inclinações são guardadas separadamente. Espessuras globais, por anel e alturas solares da densidade contínua são grandezas diferentes.

As partículas representam macro massas, não estrelas individuais nem partículas microscópicas de matéria escura. O modelo é newtoniano, isolado e sem gás ou perturbações externas explicitamente modeladas. Massas totais não foram reajustadas. Evolução usa KDK, ε=0,1kpc e dt nominal0,05Myr. Não houve amortecimento, recentering, reposicionamento, congelamento oculto, multiplicador gravitacional ou correção vertical da trajetória.

Três realizações permitem médias, desvios amostrais e intervalos t com2graus de liberdade; não demonstram uma distribuição assintótica. Intervalos de95% são por indicador, sob hipótese aproximada de normalidade das médias de realização, sem garantia conjunta para todas as grandezas. Épocas correlacionadas não contam como novas sementes. Ausência de significância não equivale a equivalência.

No sistema isolado vivo, E, P e L vetorial são invariantes ideais. Nos controles com campo externo axisimétrico fixo, energia e Lz são os invariantes pertinentes; não se exige conservação de P, L vetorial ou movimento balístico do centro de massa dos traçadores/bárions. As condições de simetria estão em cada diagnóstico. A suavização Plummer é uma regularização da gravitação pontual nas escalas próximas de100pc; convergir em N a epsilon fixo não demonstra o limite newtoniano não suavizado.
'''
modelcfg=json.loads((ROOT/'reports/v1.0.2/corrected/preparation.json').read_text());masses=modelcfg['dfMassesMsun'];version={'python':sys.version,'agama':agama.__version__,'numpy':np.__version__,'scipy':scipy.__version__,'matplotlib':matplotlib.__version__,'platform':platform.platform(),'sourceIdentity':source['codeSHA256'],'UTC':datetime.datetime.now(datetime.timezone.utc).isoformat()};(BASE/'software.json').write_text(json.dumps(version,indent=2)+'\n',encoding='utf8')
kinetic=read('component-kinetic-contrasts.json');referenceBound=read('reference-energy-bound.json');nativeDF=[json.loads((ROOT/f'reports/v1.0.4/native-df/s{seed}.json').read_text())for seed in[2026,2027,2028]];actionTable='| População | q50 abs(log f200/f0), s2026 | q90, s2026 | q99, s2026 |\n|---|---:|---:|---:|\n'
for pop in range(4):
 row=next(r for r in nativeDF[0]['checks']if r['population']==pop and r['timeMyr']==200);v=row['absLogFChangeQ50_90_99_Max'];actionTable+=f'| {["Bojo","Fino","Espesso","Halo"][pop]} | {v[0]:.6f} | {v[1]:.6f} | {v[2]:.6f} |\n'
qsummary=[]
for pop in range(4):
 for R in[1.,8.122]:
  for h in[.02,.01]:
   for power in[14,16]:
    rows=[r for r in qmc['rows']if r['population']==pop and r['Rkpc']==R and r['hKpc']==h and r['power']==power];qsummary.append({'population':pop,'Rkpc':R,'zkpc':.2,'hKpc':h,'power':power,'nScrambles':len(rows),**{k:{'mean':float(np.mean([r[k]for r in rows])),'sd':float(np.std([r[k]for r in rows],ddof=1))}for k in['radialScaled','verticalScaled']}})
(BASE/'jeans-qmc-summary.json').write_text(json.dumps({'rows':qsummary,'qualification':'Independent randomized quadrature of same approximate DF. Scatter of four scrambles is integration scatter, not scatter between galaxies.'},indent=2)+'\n',encoding='utf8')
qtable='| População | R[kpc] | Resíduo radial | Resíduo vertical |\n|---|---:|---:|---:|\n'
for r in qsummary:
 if r['hKpc']==.01 and r['power']==16:qtable+=f'| {["Bojo","Fino","Espesso","Halo"][r["population"]]} | {r["Rkpc"]} | {r["radialScaled"]["mean"]:.6f} ± {r["radialScaled"]["sd"]:.6f} | {r["verticalScaled"]["mean"]:.6f} ± {r["verticalScaled"]["sd"]:.6f} |\n'
contrasts='| Refinamento no halo contínuo | Δcrescimento h50 fino[p.p.] | IC95% | Δaumento σz²[(km/s)²] | IC95% |\n|---|---:|---|---:|---|\n'
for c in a['contrasts']:contrasts+=f'| {c["label"]} | {fmt(c["height"]["mean"])} ± {fmt(c["height"]["sd"])} | {ci(c["height"])} | {fmt(c["variance"]["mean"])} ± {fmt(c["variance"]["sd"])} | {ci(c["variance"])} |\n'
modeTable='| Modelo | Halo-semente | Máx.A2 em2–12kpc | Máx.anéis adjacentes na triagem | Maior sequência de épocas |\n|---|---:|---:|---:|---:|\n'
for r in sorted(collective['runs'],key=lambda r:(r['label'],r['seed'],r['duration'])):
 if r['label']in['E','F']and r['duration']==200:modeTable+=f'| {r["label"]} | {r["seed"]} | {r["maximumM2"]:.5f} | {r["maximumConditionalAdjacent"]} | {r["longestConditionalStreak"]} |\n'
cpuTable='| theta | Uma forçaCPU completa[s] | q99 erro vetorial/|a| | q99 erro vertical/|a| |\n|---:|---:|---:|---:|\n'
for r in cpu['rows']:cpuTable+=f'| {r["theta"]} | {r["seconds"]:.4f} | {r["vectorQ50_90_99_Max"][2]:.6e} | {r["verticalQ50_90_99_Max"][2]:.6e} |\n'
kineticTable='| Modelo | População | ΔK0–200 | ΔKz0–200 |\n|---|---|---:|---:|\n'
for r in kinetic['groups']:kineticTable+=f'| {r["label"]} | {["Bojo","Fino","Espesso","Halo"][r["population"]]} | {r["deltaK"]["mean"]:.7f} ± {r["deltaK"]["sd"]:.7f} | {r["deltaKz"]["mean"]:.7f} ± {r["deltaKz"]["sd"]:.7f} |\n'
diag=f'''# Diagnóstico do equilíbrio dinâmico1.0.5

## Conclusão

A preparação original é próxima da estacionariedade em algumas medidas do disco fino no campo médio, mas não foi demonstrada como equilíbrio global das quatro populações. O sistema vivo continua apresentando evolução estrutural em200Myr. A conservação numérica não resolve essa distinção.

{table}

{fixed}

## Experimentos A, B e C

A: traçadores no potencial total contínuo Plummer fixo, AGAMA DOP853 Float64, precisão solicitada10⁻¹⁰. B: mesmos bárions com autogravidade direta GPU e halo contínuo fixo compatível. C: todas as componentes vivas, referência E104. Os nove controles preservados foram reanalisados com verificação das fases iniciais, massas e tags. As épocas20,50,100,200Myr estão efetivamente medidas; as séries completas têm suas cadências declaradas.

No contínuo original, h50 fino mudou{stat('A-original','thinGrowth')}%; com bárions vivos e halo contínuo,{stat('B-original','thinGrowth')}%; no sistema E104 vivo,{stat('E104','thinGrowth')}%. Esses contrastes mostram mudanças mesmo sem granularidade do halo. Ao trocar os controles também removemos resposta coletiva, e A usa outro integrador/precisão. Não se trata de uma decomposição causal única em encontros, migração e modos físicos.

## Onde a preparação exige cuidado

Foram acrescentadas216avaliações nativas dos momentos de Jeans: quatro populações, seis raios por população, três alturas e três passos. As amostras cobrem o bojo interno até0,1kpc, discos até20kpc e halo até100kpc. Os termos dimensionais, densidades, momentos e sensibilidade espacial estão em ic-audit.json. As frequências positivas e a convergência do campo médio anteriores foram preservadas como evidência parcial.

A quadratura independente de Sobol usa quatro embaralhamentos independentes (scrambles) e16384/65536velocidades por ponto, com números aleatórios comuns nos estênceis de diferenciação. Ela integra a mesma DF de ações aproximadas; não ajusta partículas ou funções de distribuição. A tabela mostra h=0,01kpc,z=0,2kpc,Nq=65536, média±desvio entre scrambles:

{qtable}

Resíduos são somas assinadas divididas pela soma dos módulos dos termos de Jeans. Os resíduos do espesso em R=1kpc persistem na quadratura independente, fortalecendo a evidência de uma limitação de preparação/ações naquele domínio. O bojo solar tem densidade muito baixa e não determina a qualidade global. O halo exige examinar a sensibilidade dos passos e da quadratura. Esses valores não são porcentagens exatas de desequilíbrio físico.

Não há evidência de uma explosão numérica no primeiro passo. Há evidência de uma preparação aproximada e de reorganização ao longo das primeiras épocas, com efeitos adicionais quando introduzida a autogravidade. Não foi medido um diagnóstico completo em cada passo de0,05Myr: as cadências dos controles são explícitas.
'''+common+references
initial=f'''# Validação das condições iniciais1.0.5

## Referência preservada

As DFs calibradas e o potencial Plummer da1.0.2 usados pela1.0.4 permanecem originais. Massas por população[bojo,fino,espesso,halo] em M☉:{masses}. A massa total do halo truncado não é confundida com a massa encerrada no raio de referência observacional. Os arquivos de configuração e os perfis contínuos são incluídos como fontes.

Parâmetros históricos de referência: bojo9,2×10⁹M☉; discos fino3,98×10¹⁰M☉ e espesso1,07×10¹⁰M☉, escalas radiais2,43e3,88kpc; halo NFW com massa8,2×10¹¹M☉ dentro do raio de referência207kpc e escala14,4kpc. O modelo amostrado tem corte exponencial suave em414kpc, bojo esferizado e omite gás frio/CGM, sem transferir suas massas para estrelas. Os priors cinemáticos35/50km/s e a calibração vertical são escolhas explícitas do modelo, não novos ajustes observacionais. physical-parameters.json preserva os parâmetros, intervalos marginais e hashes; não sorteamos esses intervalos como erros independentes.

A iteração prepara rho_i=∫f_i(J[Phi_epsilon])d³v e Phi_epsilon=-G∫rho(x')/[|x-x'|²+epsilon²]¹ᐟ²d³x'. Convergência do potencial médio não torna as ações aproximadas integrais exatas, nem impõe todos os momentos de Jeans. A densidade física é distinta de sua convolução efetiva na equação de Poisson.

## Ações e estacionariedade de f(J)

As três auditorias nativas preservadas acompanharam128representantes orbitais independentes de cada população em200Myr no campo fixo. A tabela mostra quantis de abs(log[f200/f0]) da semente2026; as outras duas realizações e os41estados constam nos arquivos nativos originais incluídos. Variação de f(J) ao longo de uma órbita exata do campo é um diagnóstico de sua estacionariedade aproximada, não um erro verdadeiro das ações contra um oráculo exato. Caudas com grandes mudanças de f podem amplificar pequenos erros de ações em regiões de forte gradiente da DF.

{actionTable}

Essas integrações não contêm encontros entre macro partículas. O erro orbital individual e os casos inválidos também são registrados, separadamente da variação de f. A quadratura independente105mostra que parte dos resíduos dos momentos persiste além da variação entre scrambles; não resolve, sozinha, a separação entre aproximação de ações, representação do potencial e fidelidade da DF.

## Tentativa de preparação105: MIX

Cada órbita original independente recebeu um tempo uniforme sorteado previamente em[0,001,1000]Myr no MESMO potencial total fixo. Foi integrada com DOP853 Float64, reconstruindo sua parceira antipodal. Pesos e órbitas originais foram preservados, sem esfriamento, seleção por h50 ou reescalonamento de velocidades. Foram preparadas três realizações completas de89546partículas, preservando fontes, tempos sorteados e testes individuais de energia e Lz.

Essa é uma tentativa finita de média orbital. Não há otimização de pesos à densidade nem solução nova de autoconsistência. Portanto não é denominada GALIC ou Schwarzschild completo. O campo original só pode ser mantido como referência de teste, até verificar sua compatibilidade com a nova distribuição.

Os controles contínuos novos integraram TODOS os9546bárions de cada tentativa por200Myr,41estados, preservados em JSONL. O fino mudou{stat('A-MIX','thinGrowth')}%; o espesso,{stat('A-MIX','thickGrowth')}%. Os intervalos não demonstram equivalência dentro dos critérios registrados. A maior mudança de distribuição radial binned atingiu{100*prep['trial']['maximumRadialMassTV']:.3f}% entre a amostra original e a faseada. Também foram executados três controles de bárions vivos com halo fixo: h50 fino{stat('B-MIX','thinGrowth')}%.

**Não foi obtida uma preparação aperfeiçoada globalmente validada.** A tentativa MIX permanece identificada e reprovada para promoção; não substitui a E104 nem foi promovida ao sistema totalmente vivo. A janela de1Gyr de construção não é uma simulação autogravitante estável de1Gyr.

## Compatibilidade observacional e alternativas

Não houve refit de massas, alturas-alvo ou dispersões observacionais. As distribuições radiais, alturas solares de amostra, dispersões R/phi/z e massas antes/depois estão em ic-audit.json. As medianas solares da densidade contínua original e suas diferenças dos alvos permanecem documentadas na1.0.4; pequenas amostras solares de partículas não substituem esses perfis. A tentativa rejeitada não é apresentada como novo ajuste da Via Láctea.

Uma próxima preparação mais forte pode exigir ajuste de pesos orbitais sob restrições de densidade e cinemática, ou melhor tratamento das ações no potencial achatado. As referências abaixo fornecem alternativas; implementá-las exige reproduzir a mesma gravidade suavizada e validar todas as populações. Não é justificável alterar velocidades até uma curva ficar horizontal.
'''+common+references
heating=f'''# Aquecimento numérico e mecanismos1.0.5

## Evidência medida

{table}

{fixed}

## Refinamento isolado dos bárions

Foram executados nove controles novos de200Myr, três sementes por componente alterada: bojo1500→3000; fino7092→14184; espesso954→1908. As massas totais e as outras populações foram preservadas. Cada componente alterada foi amostrada da mesma DF, sem clones. O halo contínuo compatível remove sua granularidade e sua resposta dinâmica.

{contrasts}

Os intervalos dos contrastes de bojo/espesso incluem zero; estas amostras não isolam uma contribuição significativa de cada uma ao aquecimento residual. Isso não demonstra contribuição nula. A duplicação de uma componente muda simultaneamente sua massa por partícula e sua realização discreta. Não foi promovido um refinamento bariônico ao sistema vivo com base em redução média pequena sem evidência robusta. Os candidatos vivos selecionados para esta campanha mantêm os bárions originais e refinam o halo. O experimento vivo G104 do fino quadruplicado continua preservado como evidência histórica distinta, com halo40000.

## Halo e comparações pareadas

E: Nh80000, N89546; F: Nh160000, N169546. Massas por macro partícula de halo:{masses[3]/80000:.6f} e{masses[3]/160000:.6f}M☉. Somente halo e sua amostragem mudam. O contraste F−E de crescimento fino foi{fmt(d['contrasts']['thinGrowthDifference']['mean'])} ± {fmt(d['contrasts']['thinGrowthDifference']['sd'])}p.p., IC95%{ci(d['contrasts']['thinGrowthDifference'])}; o contraste de aumento de variância foi{fmt(d['contrasts']['thinVarianceDifference']['mean'])} ± {fmt(d['contrasts']['thinVarianceDifference']['sd'])}(km/s)². Não foi ajustada uma lei de potência ou extrapolação N→infinito a dois níveis.

Nas realizações E/F, as massas por partícula dos bárions são: bojo{masses[0]/1500:.3f}M☉, fino{masses[1]/7092:.3f}M☉, espesso{masses[2]/954:.3f}M☉. Em F, a macro partícula do espesso é mais massiva que a do halo. Essa comparação motiva os controles bariônicos, mas não substitui os contrastes medidos nem demonstra que uma população seja a causa dominante.

## Flexão, respiração, modos e migração

Os modos de densidade m=1,2,3,4 têm amplitudes, fases e referências condicionais de ruído por anel. A triagem considera regiões adjacentes e persistência, sem transformar significância condicional ou épocas correlacionadas em detecção de uma barra. O início antipodal suprime modos ímpares de densidade e não representa a amostragem genérica de uma galáxia real.

{modeTable}

A sequência conta épocas consecutivas com pelo menos três anéis adjacentes acima da referência condicional. Não é um teste de significância temporal. pattern-geometry.json também guarda coerência radial de fase, ajustes condicionais de geometria e diferenças de fase com verificação de aliasing sob frequências iniciais. Ajustes aceitos em uma época ou a compatibilidade com fase constante são candidatos descritivos, sem identificação única de barra, braço ou mecanismo de aquecimento. Dados correlacionados, múltiplos padrões e mudanças de plano limitam a interpretação.

Momentos verticais complexos ⟨z exp(im phi)⟩ e ⟨vz exp(im phi)⟩ investigam deformações, inclusive quando a média global cancela por simetria. Respiração é descrita por b=Cov(z,vz)/Var(z); a identidade Var(vz)=b²Var(z)+Var(vz-bz) separa apenas o fluxo linear ajustado. A variância residual ainda pode conter movimentos coletivos não lineares e não é calor colisional puro. O diagnóstico nunca modifica velocidades integradas.

As coortes originais mantêm IDs ao longo do tempo. A decomposição nos extremos usa Var[vz(t)|It]−Var[vz(0)|I0]={{Var[vz(t)|It]−Var[vz(0)|It]}}+{{Var[vz(0)|It]−Var[vz(0)|I0]}}. A primeira parcela acompanha a seleção final de volta ao início; a segunda muda apenas a composição inicial. Isso separa seleção e evolução descritivamente, sem remover toda a física coletiva. Análises por plano próprio, por plano inicial e por anel complementam o eixo cartesiano fixo.

O Q=sigmaR*kappa/(3,36G Sigma) usa frequências iniciais e a hipótese idealizada de disco fino, não suavizado e de uma só população. Não é aplicado como certificado tridimensional global.

## Energia entre populações

K e Kz por população são registrados ao longo dos ensaios novos. Eles mostram redistribuição cinemática, mas não equivalem à energia total transferida pelo halo: a atribuição da energia potencial de interação entre componentes depende de convenção. Não foi calculada uma decomposição completa de trabalho gravitacional por componente. Conservação global e contrastes de controles não identificam uma fração causal única para cada mecanismo.

{kineticTable}

Unidades da tabela:10¹⁰M☉ kpc²/Myr²; média±SD de três halos, bárions fixos. As somas por população nos extremos foram recalculadas a partir dos estados completos e fecham o K global registrado. Kz inclui movimentos coerentes. A referência E/h2026 tem extremos completos preservados, ainda que a nova série por componente não estivesse instrumentada naquele ensaio histórico. Os novos ensaios mantêm as séries completas; mudanças de K devem ser analisadas junto de U, sem atribuir automaticamente sua origem a outra população. Nos controles B, não há energia cinética dinâmica do halo externo representada por partículas.
'''+common+references
budgetTable='| Indicador | Critério prospectivo em200Myr |\n|---|---|\n| h50 fino e espesso | IC95% da mudança dentro de±5% |\n| Variância vertical | IC95% dentro de±10% |\n| Deriva100–200Myr de h50 / h0 | IC95% dentro de±2,5% |\n| Deriva100–200Myr de variância / variância0 | IC95% dentro de±5% |\n| Raios de meia massa | IC95% da mudança dentro de±5% |\n| Distância de massa radial em bins(TV) | limite superior do IC95%≤5% |\n| Energia | máximo amostrado relativo≤10⁻⁵ |\n| Força de referência | q99 vetorial e vertical/|a|≤10⁻³ |\n'
convergence=f'''# Convergência e estabilidade1.0.5

## Critérios antes dos resultados novos

{budgetTable}

Os limites foram registrados após conhecer a1.0.4 e antes de observar os resultados novos. São objetivos de precisão deste estudo: controlar espessura a5% para distinguir mudanças estruturais da ordem de dezenas de porcento, reservando metade desse orçamento à deriva tardia de100Myr. Não são tolerâncias universais, erros observacionais ou critérios ajustados para aprovar o candidato. A análise combina variação total, tendência tardia, dispersão entre sementes e resolução; equivalência exige o intervalo dentro do orçamento.

{table}

## Comparação de resolução

{fixed}

O candidato{best} tem a menor mudança média absoluta de h50 fino na comparação E/F. Isso não significa melhor desempenho de todas as populações. O arquivo decision.json enumera cada teste, orçamento e intervalo; não houve promoção global. A equivalência do contraste de h50 entre E/F foi{d['convergenceHeightEquivalence']}. Mesmo um contraste pequeno de espessura entre dois N não demonstra convergência de dispersões, perfis e modos nem ausência de deriva.

A referência E/h2026 reutilizada tem limite analítico de deriva energética sob G/epsilon² efetivos de{referenceBound['maxRelativeDriftBound']:.8e}, abaixo do orçamento10⁻⁵. A expressão limita a mudança de convenção do Hamiltoniano, sem inventar estados intermediários ou reescrever a medida histórica.

## Precisão temporal e suavização

Foram reutilizados os ensaios D/2026 da1.0.4 com dt0,1/0,05/0,025Myr, mantendo as mesmas fases. As espessuras finais próximas e o espessamento persistente indicam que dt isolado não explica o comportamento. Esse controle de uma realização D não certifica todas as sementes de F; seria necessário ampliar a convergência temporal antes de uma promoção final. ε=0,1kpc foi mantido. Nenhuma outra suavização foi usada sem preparação compatível.

## Custo, método e memória

O piloto F integrou2Myr. Previu{pilot['estimated200Seconds']:.1f}s para200Myr e{pilot['estimated1000Seconds']:.1f}s para1Gyr por realização, antes da medição longa. São estimativas; tempos reais estão nos resultados. A admissão estimou{pilot['resources']['estimate']['estimatedBytes']/1024**2:.2f}MiB de buffers/estado e exclui driver, navegador, fragmentação e outras aplicações; não é medição da VRAM total. O hardware informado pelo usuário é Ryzen7 5700X,16GB RAM,RX7600 8GB; o navegador reporta AMD/rdna-3 e16processadores lógicos, sem identificação completa da placa.

A campanha registrou falhas de acesso ao coletor isolado e perdas da instância WebGPU antes do primeiro checkpoint F200. Os resultados E concluídos foram preservados. Comandos GPU longos foram considerados uma possível causa, sem diagnóstico independente do driver. A execução passou a enviar no máximo quatro passos KDK por comando, com os mesmos shaders e força. Um segundo piloto F de2Myr mostrou igualdade bit a bit de TODAS as posições, velocidades e acelerações das169546partículas com o piloto original. O registro scheduling-validation.json distingue essa correção operacional de qualquer alteração física ou estabilização. As tentativas falhas não são contadas como integrações concluídas.

H/Nh320000 não foi lançado: o escalonamento operacional do piloto F previa{H['estimated200Seconds']:.1f}s por200Myr, acima do teto prospectivo de1200s por realização. Isso não é um resultado medido de H nem uma limitação física universal. A força direta foi mantida nos candidatos medidos. O piloto do Barnes–Hut CPU existente, três theta, avalia custo e precisão inicial; não valida sua conservação ou evolução estrutural. PM e árvore GPU não foram implementados nem promovidos sem referências. Energia usa seis workers CPU; os pilotos não são benchmarks de máquina dedicada.

{cpuTable}

A média do lote de32avaliações diretas GPU do piloto foi{cpu['GPUForceMeanBatchSeconds']:.6f}s por força. Os tempos incluem modalidades diferentes de submissão, construção da árvore e aquecimento do código; servem à triagem operacional, sem razão universal de aceleração. O erro de força do Barnes–Hut não é tratado como erro temporal ou energia exata.

## Horizonte

Todos os novos resultados estruturais terminam em200Myr. Não foram iniciados400,600ou1000Myr porque os critérios globais e de deriva não foram satisfeitos. O período circular solar é214,668Myr:200Myr≈0,932período, insuficiente para falar em vários períodos orbitais. A janela orbital de preparação MIX e o experimento legacy antigo de≈1,51Gyr, Jeans+Satoh e80000partículas totais, não são a família E104 e não validam E/F.
'''+common
answers=[
('As condições iniciais originais estavam suficientemente próximas do equilíbrio?','Próximas em algumas medidas do fino no campo médio; não suficientemente demonstradas como equilíbrio global. Os controles contínuos mudam menos que o sistema vivo, e os resíduos espaciais/independentes dos momentos impedem certificação exata.'),
('Foi possível melhorar essa preparação?','Foi implementada e testada a tentativa MIX de fases orbitais. Ela não demonstrou melhoria consistente das populações e não foi promovida. Não há uma preparação aperfeiçoada globalmente validada nesta entrega.'),
('Qual foi a contribuição identificável da granularidade do halo?',f'O refinamento mantém massas e bárions e mede a dependência com N; F−E em h50 fino={fmt(d["contrasts"]["thinGrowthDifference"]["mean"])}p.p. A diferença entre halo vivo e fixo inclui sua resposta coletiva, portanto não é uma fração pura de aquecimento por encontros.'),
('O bojo ou o disco espesso contribuíam significativamente?', 'Os nove controles isolados não estabelecem uma contribuição significativa separada com três sementes; os intervalos dos contrastes incluem zero. Também não demonstram contribuição nula. O aquecimento residual com halo contínuo exige investigar a resposta bariônica e a preparação.'),
('Existe evidência de instabilidade física coletiva?','Há modos e movimentos coletivos mensuráveis, mas não uma instabilidade física específica isolada e validada quanto a coerência, ruído e convergência. Fourier não é automaticamente uma detecção de barra ou espiral.'),
('Qual configuração apresentou a menor deriva estrutural?',f'Na comparação pareada E/F, {best} teve a menor mudança média absoluta de h50 fino em200Myr. A escolha depende desse indicador e não comprova melhor desempenho global. As tabelas incluem espesso, dispersões, raios e tendências.'),
('Há convergência demonstrável com a resolução?','Há controles de força, energia, passo e dependência de N. A convergência estrutural global não foi demonstrada. Dois N de halo e uma realização bariônica fixa não estabelecem um limite assintótico.'),
('Por quanto tempo a configuração foi efetivamente integrada?','200Myr nos ensaios estruturais selecionados, com três halos por E/F; o piloto F tem2Myr. Não há400/600/1000Myr novos.'),
('A energia foi conservada no domínio exigido?',f'O máximo novo amostrado |ΔE|/|E0| foi{d["maxNewSampledEnergyError"]:.8e}, frente ao orçamento10⁻⁵. A aprovação desse critério foi{d["conservationPass"]}. O Hamiltoniano usa G e ε² efetivos f32 nos ensaios105 e soma direta Float64; não é um limite dos picos entre amostras.'),
('Podemos afirmar equilíbrio aproximado ou estacionariedade estrutural?','Podemos descrever uma preparação aproximada e qualificar separadamente os controles no domínio medido. Não podemos afirmar estacionariedade estrutural global nem estabilidade prolongada da galáxia viva. Não houve promoção científica de E/F.'),
('Quais limitações impedem conclusões mais fortes?','Ações aproximadas e resíduos dos momentos; baixa resolução de algumas populações; variabilidade de apenas três halos com bárions fixos; dependência residual de N; domínios temporais curtos; precisão de trajetória Float32; ausência de uma separação causal única e de validação observacional nova completa.'),
('Como apresentar à banca de Engenharia Física?','Apresente a hipótese de um modelo newtoniano com halo, o Hamiltoniano e as unidades, a preparação, os controles pareados, convergência/erro, resultados com incertezas e a decisão de não certificar estabilidade. O resultado científico é investigar consequências dinâmicas e limitações de representação. Não é prova da existência da matéria escura nem reprodução completa da Via Láctea real.')]
answerText='\n\n'.join(f'## {i}. {title}\n\n{text}'for i,(title,text)in enumerate(answers,1))
final=f'''# Validação final1.0.5 — experimental

## Resultado principal

A campanha investigou as condições iniciais, realizou controles de campo contínuo e autogravidade, testou uma preparação alternativa e refinou o halo com bárions fixos. Não foi demonstrada estacionariedade estrutural global de longo prazo. Resultados negativos e limites são parte da conclusão científica.

{len(new)}integrações GPU novas concluídas:12controles de bárions/halo contínuo, dois pilotos F de2Myr (custo e agendamento) e cinco ensaios vivos novos de200Myr. Três controles nativos completos novos de200Myr e três construções de fases orbitais complementam a campanha. Nove controles A/B/C históricos únicos foram reanalisados; a realização E/h2026 também serve à comparação pareada, sem ser contada novamente como integração. Preservação de{len(history['files'])}arquivos históricos por hashes.

{table}

## Precisão e classificações independentes

- Conservação: orçamento energético amostrado satisfeito={d['conservationPass']}; máximo novo{d['maxNewSampledEnergyError']:.8e}.
- Força inicial: máximo vetorial relativo{d['forceMaximumVectorRelative']:.8e}; máximo do erro vertical normalizado pelo módulo da referência{d['forceMaximumVerticalOverVectorNorm']:.8e}. São probes fixos, até32por população, e não todos os pontos da trajetória.
- Equilíbrio inicial: parcial/aproximado, sem certificação global. Quadratura Sobol fornece verificação independente dos resíduos em regiões selecionadas.
- Estacionariedade estrutural: não demonstrada pelos critérios prospectivos e tendências medidas.
- Convergência: parcial; não é convergência global N→infinito ou ε→0.
- Instabilidade física: mecanismos coletivos não isolados conclusivamente.

{answerText}

## Afirmação sugerida para a defesa

“Desenvolvemos e verificamos um simulador gravitacional N-corpos e uma campanha controlada de modelos semelhantes à Via Láctea. Quantificamos o espessamento do disco e sua dependência da discretização, confrontamos campos contínuos e sistemas vivos e encontramos limites da preparação inicial. A conservação numérica foi controlada no domínio medido; a estacionariedade estrutural global permaneceu não demonstrada.”
'''+common+references
reproduction=f'''# Reprodução1.0.5

## Conteúdo e histórico

Esta entrega complementa o projeto preservado. Os ZIP1.0.1–1.0.4 e todos os relatórios históricos continuam intactos. O pacote105 contém fontes, entradas efetivas, resultados novos, referências históricas usadas, controles contínuos brutos, protocolos, figuras com pontos CSV e hashes. Checkpoints parciais permanecem locais e têm hashes; resultados completos e seus estados inicial/final estão incluídos. Confira package-audit.json e SHA256SUMS.txt no ZIP.

As famílias E104 e o legacy de80000partículas totais/Jeans+Satoh são experimentos diferentes. E/F105 mantêm a preparação física original104 e massas; somente a população refinada é amostrada novamente. MIX é explicitamente uma tentativa105não promovida.

## Ambiente verificado

Python:{sys.version.split()[0]}; AGAMA:{agama.__version__}; NumPy:{np.__version__}; SciPy:{scipy.__version__}; Matplotlib:{matplotlib.__version__}. Node foi registrado no manifesto de código. AGAMA é a biblioteca nativa oficial previamente compilada; sua instalação e os pacotes científicos são dependências externas, sem instalações silenciosas. O arquivo software.json registra versões; o módulo e seu código-fonte oficial precisam estar disponíveis no PYTHONPATH para recomputação nativa. As fontes AGAMA utilizadas no ambiente têm referência de commit no histórico1.0.4. Não há garantia de bit-identidade de trajetórias Float32 em outro adaptador gráfico.

## Ordem de reprodução em uma cópia nova

1. Preserve o projeto original e verifique os hashes. Rode `node scripts/equilibrium-105/preserve.mjs --verify` somente onde o histórico completo indicado no manifesto está disponível. Ele confere arquivos e nunca atualiza o baseline. Não substitua resultados existentes para refazer uma campanha.
2. Confira preregistered-protocol.json, phase-a.json e preparation-decision.json antes de novos N. `phase-a.mjs` verifica fases, tags, massas e hashes dos controles preservados.
3. Para repetir a preparação nativa em uma pasta105nova, execute phase-mix.py, continuous.py, analyze-continuous.mjs, ic-audit.py e jeans-qmc.py nessa ordem; todos os geradores de estados recusam sobrescrita. A análise pode ser recalculada a partir dos dados preservados. Os tempos de construção em phase-times-s*.npz são os sorteados, não tempos de uma galáxia viva.
4. Prepare controles com prepare-resolution.py --stage baryons e, somente depois da decisão física, --stage halo --families E F. O manifesto descreve sementes, contagens, massa e origem. Não há clones; blocos inalterados são copiados. A referência E/h2026 vem da mesma trajetória104, com fases verificadas.
5. Servidor estático: `node scripts/serve.mjs`, local4180. Coletor: `node scripts/equilibrium-105/collector.mjs`, somente127.0.0.1:4187, CORS restrito ao servidor local. Em ambientes isolados, ambos precisam estar acessíveis ao mesmo navegador. O coletor valida ID, fonte e protocolo e recusa substituir um resultado concluído diferente.
6. Abra tests/browser-equilibrium-105.html?stage=baryon200 e pressione o botão da etapa registrada. Depois use stage=pilot-F e, após medir/validar, stage=halo200. Os registros completos já presentes são lidos, não refeitos. Para recalcular as trajetórias sem substituir dados, execute, por exemplo, `node scripts/equilibrium-105/reproduce.mjs halo-F200 verificacao01` e abra a etapa `reproduce-verificacao01` no navegador. O registrador copia a hipótese e os hashes iniciais, cria IDs e família separados e marca a repetição como reprodução, não como novas sementes independentes. Nenhum dado original é apagado. Não use evaluate/automação para fabricar resultados. O botão executa o código real WebGPU e seis workers de energia.
7. Recalcule native-vertical.mjs antes de analyze.mjs; depois force-audit.mjs, force-components.mjs, collective.mjs, migration.mjs, kinetic-contrast.mjs e reference-energy-bound.mjs. `cpu-pilot.mjs` é uma triagem de força única do Barnes–HutCPU, não uma evolução certificada. `decision.mjs` exige três resultados por E/F e avalia os critérios. H só pode ser registrado com decisão de custo/precisão própria; não foi executado.
8. Rode identity.mjs antes de uma nova época de execução; hashes das fontes também são guardados por resultado. Para a entrega, rode report.py, playback.mjs e plot.py, testes com `node scripts/test.mjs`, auditoria, package.py e build. Os scripts não devem ser executados indiscriminadamente contra o histórico preservado.

## Dados e auditoria

`analysis.json` liga cada série à fonte e SHA. IDs de apresentação usam um prefixo de grupo; nativeId mantém o ID bruto. A referência E/h2026 aparece em dois grupos com interpretações distintas, sem duplicar uma integração ou aumentar n dentro de um grupo. Médias±SD e intervalos por semente estão nos JSON/CSV. Campos herdados em meta.preparation e meta.method referem-se à preparação original; meta.version105, manifestos e arrays definem a realização nova.

Toda nova força viva usa os mesmos kernels diretos e KDK. Os diagnósticos105 usam G=Math.fround(Gnominal), epsilon=sqrt(Math.fround(0,1²)); o kernel recebe epsilon²f32. O tempo nominal de saída permanece o definido pelo protocolo; dt efetivo f32 causa uma diferença de arredondamento declarada e calculável. Controles históricos mantêm seu Hamiltoniano nominal registrado. A soma direta é Float64 compensada, com erro de aritmética finita; readback não torna a trajetória Float64. A referência E/h2026 preserva o Hamiltoniano nominal original. reference-energy-bound.json limita analiticamente a mudança de convenção dos pares Plummer para G/epsilon² efetivos, sem recomputar estados não registrados: cada razão de potencial está entre os extremos r=0 e r=infinito, e a soma de pares positivos herda esses limites. O limite de deriva é inferior ao orçamento energético; não é um limite de arredondamento da força GPU nem uma prova rigorosa de aritmética intervalar. Energia de campo fixo soma m_iPhi_ext sem fator1/2; entre pares vivos usa i<j exatamente uma vez.

O painel equilibr io105.html (arquivo `equilibrio105.html`) mostra os estados registrados, com hashes de buffers e sem interpolação. Gráficos17PNG/SVG/CSV cobrem as medidas reais; o gráfico de domínio orbital explicita que vários períodos não foram medidos. Escala vertical física preservada.

Hardware e tempos são de uma sessão interativa: diagnósticos e outras tarefas podem coexistir. Tempos extrapolados de pilotos não são tempos de integrações realizadas. Acesso a VRAM total e memória total do navegador não foi medido; somente buffers/estimativas e limites da API são registrados.
'''+common+references
for name,text in[('DIAGNOSTICO_EQUILIBRIO_1_0_5.md',diag),('VALIDACAO_CONDICOES_INICIAIS_1_0_5.md',initial),('AQUECIMENTO_NUMERICO_1_0_5.md',heating),('CONVERGENCIA_E_ESTABILIDADE_1_0_5.md',convergence),('VALIDACAO_FINAL_1_0_5.md',final),('REPRODUCAO_1_0_5.md',reproduction)]:
 text=text.replace('equilibr io105.html','equilibrio105.html');text=re.sub(r'(\d)(Myr|kpc|MiB|GB|M☉|graus|avaliações|estados|velocidades|integrações|controles|realizações|arquivos|PNG|partículas)',r'\1 \2',text);text=text.replace('dinâmico1.0.5','dinâmico 1.0.5').replace('iniciais1.0.5','iniciais 1.0.5').replace('mecanismos1.0.5','mecanismos 1.0.5').replace('estabilidade1.0.5','estabilidade 1.0.5').replace('final1.0.5','final 1.0.5').replace('Reprodução1.0.5','Reprodução 1.0.5');(ROOT/name).write_text(text,encoding='utf8')
assessment={'schema':'scientific-assessment-105','conclusion':'Conservação numérica controlada; estacionariedade estrutural global ainda não demonstrada. A preparação alternativa MIX não foi promovida.','domain':f'{len(new)} integrações GPU novas e três controles nativos completos; horizonte estrutural máximo200Myr. '+fixed,'selectedLabel':best,'horizonDecision':'400,600e1000Myr não foram iniciados: deriva e convergência global ainda não satisfazem os critérios registrados. H320mil não executado por custo estimado.','groups':a['groups'],'classifications':[{'title':'Conservação numérica','text':f'Máximo novo amostrado |δE|={d["maxNewSampledEnergyError"]:.3e}; orçamento10⁻⁵. Força direta auditada com referência Float64.'},{'title':'Equilíbrio inicial','text':'Aproximado e parcialmente consistente; resíduos espaciais dos momentos e limites das ações impedem certificação global.'},{'title':'Estacionariedade estrutural','text':'Não demonstrada. Avaliar mudança total, deriva tardia, perfis e incertezas separadamente.'},{'title':'Convergência','text':'Controles de N, força e passo; sem certificação global ou limite assintótico.'},{'title':'Instabilidade física','text':'Modos e fluxos coletivos acompanhados; mecanismo físico específico ainda não isolado.'}],'answers':[{'question':t,'answer':v}for t,v in answers]};(BASE/'assessment.json').write_text(json.dumps(assessment,indent=2,ensure_ascii=False)+'\n',encoding='utf8');print('Six scientific documents and assessment generated',flush=True)







