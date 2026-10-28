"""Measured scientific release, gated on the selected completed campaign."""
from pathlib import Path
import json,statistics,datetime,hashlib
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.3';KM=977.7922216807891
def load(p):return json.loads((ROOT/p).read_text(encoding='utf8'))
def doc(name,text):(ROOT/name).write_text(text.strip()+'\n',encoding='utf8')
summary=load('reports/v1.0.3/summary.json');runs=summary['runs'];groups=summary['groups'];campaign=load('reports/v1.0.3/campaign.json');decision=load('reports/v1.0.3/long-run-decision.json');prep=load('reports/v1.0.2/corrected/preparation.json');M=prep['dfMassesMsun'];noise=load('reports/v1.0.3/field-ensembles.json');components=load('reports/v1.0.3/field-components.json');force=load('reports/v1.0.3/halo-wgsl-force-validation.json');fa=load('reports/v1.0.3/force-audit.json');selection=load('reports/v1.0.3/medium-selection.json');figs=load('reports/v1.0.3/figures/manifest.json');modes=load('reports/v1.0.3/collective-modes.json');preservation=load('reports/v1.0.3/preservation-verification.json')
for p in campaign['runs']:
 if not any(r['id']==p['id']and r['durationMyr']==p['durationMyr']for r in runs):raise RuntimeError('Scientific campaign incomplete '+p['id'])
if len(runs)!=len(campaign['runs'])+6:raise RuntimeError('Expected six independent native A controls in addition to registered GPU experiments')
def mean(a):return statistics.mean(a)
def sd(a):return statistics.stdev(a)if len(a)>1 else 0
def fmt(x):return f'{x:+.3f}%'
def group_table(stage):
 out=['| Grupo | N de ensaios | h50 global | h50 fino | h50 espesso | σ⊥ fino |','|---|---:|---:|---:|---:|---:|']
 for g in sorted([g for g in groups if g['stage']==stage],key=lambda g:g['nh']if stage.startswith('halo')else -1 if g['refinedPopulation']is None else g['refinedPopulation']):
  name=f"Nh={g['nh']}"if stage.startswith('halo')else{None:'Base',0:'Bojo ×2',1:'Fino ×2',2:'Espesso ×2'}[g['refinedPopulation']]
  out.append(f"| {name} | {g['nRuns']} | {fmt(g['globalGrowthMean'])} ± {g['globalGrowthSD']:.3f} pp | {fmt(g['thinGrowthMean'])} ± {g['thinGrowthSD']:.3f} pp | {fmt(g['thickGrowthMean'])} ± {g['thickGrowthSD']:.3f} pp | {fmt(g['thinSigmaZGrowthMean'])} ± {g['thinSigmaZGrowthSD']:.3f} pp |")
 return '\n'.join(out)
def run_table(rows):return '\n'.join(['| Ensaio | N | t, Myr | h50 global, variação | h50 fino, variação | h50 espesso, variação | σz fino cartesiano, variação | máx. abs. δE amostrado |','|---|---:|---:|---:|---:|---:|---:|---:|']+[f"| {r['id']} | {r['n']} | {r['durationMyr']} | {fmt(r['growthPercent'])} | {fmt(r['thinGrowthPercent'])} | {fmt(r['thickGrowthPercent'])} | {fmt(r['thinCartesianSigmaZGrowthPercent'])} | {r['maxAbsEnergyError']:.6e} |"for r in rows])
halo=[r for r in runs if r['model']=='C'];bar=[r for r in runs if r['model']=='B'];continuous=[r for r in runs if r['model']=='A'];H=lambda nh,t:next(g for g in groups if g['stage']=='halo'+str(t)and g['nh']==nh)
counts={stage:len([r for r in runs if r['stage']==stage])for stage in sorted(set(r['stage']for r in runs))};mass_table='\n'.join(f'| {nh} | {6000+nh} | {M[3]/nh:.8e} | {(M[3]/nh)/(M[1]/3546):.6f} |'for nh in [4000,8000,20000,40000])
doc('REFINAMENTO_HALO_1_0_3.md',f'''# Refinamento isolado do halo — 1.0.3 experimental

## Controle físico e pareamento

Usou-se o candidato AGAMA Plummer ε=0,1 kpc da versão 1.0.2, sem refazer a DF nem alterar massas, escalas observacionais, forças entre pares ou KDK. Os mesmos 6.000 bárions da realização 2026 foram copiados em TODOS os ensaios H: 1.500 bojo,3.546 fino,954 espesso. Posições, velocidades e massas foram conferidas por digest canônico das matrizes, não apenas pela coincidência de sementes. Não houve recentramento dependente do halo.

Massa física do halo = {M[3]:.8f} M☉. A massa individual é Mh/Nh. Sementes do halo 2026/2027/2028, amostragem antipodal de N/2 pares independentes da MESMA DF no MESMO potencial convergido. Entre Nh diferentes, as amostras do halo não são obrigadas a ter as mesmas fases; os bárions são exatamente os mesmos. O tamanho do pool do amostrador cresce quando necessário e está registrado. A precisão f32 arredonda massas e parâmetros na GPU; os pesos efetivos estão lidos de volta em cada resultado. As massas físicas do arquivo inicial permanecem fixas.

| Nh | N total integrado | massa individual do halo, M☉ | m_h/m_fino |
|---:|---:|---:|---:|
{mass_table}

## Resultados em 20 Myr

{group_table('halo20')}

Os valores são média e desvio entre três sementes; pp significa pontos percentuais. σ⊥ é perpendicular ao plano próprio. σz cartesiano, σR, perfis, centros, inclinações e coortes estão nos dados. A diminuição do ruído NÃO produziu uma queda monotônica de h50 em 20 Myr. Não selecionar somente a semente ou o indicador favorável.

## Contraste selecionado em 200 Myr

Após os 24 controles curtos de halo/bárions, foram escolhidas as extremidades Nh=4.000/40.000: uma década na massa individual, três sementes em cada nível. A escolha não foi pelo menor h50, que favorecia outro grupo no curto. `medium-selection.json` foi escrito antes dos novos ensaios.

{group_table('halo200')}

{decision['interpretation']}

## Campo médio e ruído

Nas sondas fixas, a norma do desvio do campo entre sementes, dividida pela norma do campo médio TOTAL esperado, foi {noise['groups'][0]['normalizedHaloNoise']:.8f}, {noise['groups'][1]['normalizedHaloNoise']:.8f}, {noise['groups'][2]['normalizedHaloNoise']:.8f}, {noise['groups'][3]['normalizedHaloNoise']:.8f} para Nh=4/8/20/40 mil. O desajuste sistemático da preparação continua o da solução 1.0.2; isso é diferente do resíduo de uma amostra finita.

O resíduo do campo dos bárions fixos, nas mesmas sondas, tem norma relativa {components['haloGroups'][0]['normalizedFixedBaryonResidual']:.8f}. Mesmo que Nh→∞, este conjunto particular de bárions ainda é discreto. Três halos refinados não tornam sua distribuição um contínuo. O campo instantâneo não foi forçado a coincidir com o suave.

## Registros completos

{run_table(halo)}

Gravidade direta GPU f32, dt=0,05 Myr, ε=0,1 kpc. Energia direta Float64 a cada0,5 Myr no curto e5 Myr no contraste200; nenhum máximo entre amostras é inferido. Os estados completos em 0 e no fim, tabelas de parâmetros, hashes e tempos estão nos JSON. O simulador histórico continua como padrão.
''')
paired='\n'.join(f"| {['Bojo ×2','Fino ×2','Espesso ×2'][c['population']]} | {c['seedsWithReducedVarianceGrowth']}/3 | {c['meanVarianceGrowthReduction']*KM**2:+.6f} | {c['meanAbsRadialChange']*100:.4f}% | {c['maxEnergyError']:.4e} |"for c in selection['candidates'])
doc('REFINAMENTO_BARIONS_1_0_3.md',f'''# Refinamento isolado dos bárions — 1.0.3

## Modelo B e resolução

Halo externo fixo igual à média Plummer da densidade física corrigida do halo, ε=0,1 kpc. Não se reutilizou o campo Newtoniano antigo. Não há partículas de halo nem dupla contagem. B é um controle: remove granularidade e resposta dinâmica do halo; não é a galáxia completamente autogravitante C/D.

Foram executados 12 controles de20 Myr: base [1500,3546,954]; bojo×2 [3000,3546,954]; fino×2 [1500,7092,954]; espesso×2 [1500,3546,1908]; sementes bariônicas2026/2027/2028. Cada população não variada mantém valores iniciais exatos do controle da mesma semente. A população refinada é reamostrada da mesma DF, com massa individual Mi/Ni. Nenhuma quantidade desenhada substitui N integrado.

## Vinte Myr

{group_table('baryons20')}

Duplicar o fino diminuiu seu h50 médio, mas não seu crescimento médio de dispersão perpendicular. Isso não prova que o refinamento fino seja fisicamente pior: a população reamostrada tem outra flutuação de fase. Três sementes e um fator2 não definem um limite assintótico. O bojo e o espesso também afetam o campo sentido pelo fino.

## Seleção cinemática pareada antes de200 Myr

| Variante | sementes com menor crescimento de σz² do fino | redução média de Δσz², (km/s)² | média da mudança radial absoluta relativa | maior δE absoluto |
|---|---:|---:|---:|---:|
{paired}

σz aqui usa o eixo z de referência, média populacional removida. A seleção escolheu a população {selection['chosenBaryonPopulation']} para um contraste adicional, levando em conta variância nas mesmas sementes, mudança radial e erros energéticos, não somente h50. O benefício curto é pequeno; não há precisão suficiente para declarar um vencedor físico definitivo entre bojo e espesso. Todos os candidatos permanecem no registro.

## Duzentos Myr: base e variante selecionada

{group_table('baryons200')}

{run_table(bar)}

Compare A e B com a MESMA semente e a MESMA população inicial antes de atribuir uma diferença a ruído. B da semente2026 é o par bariônico exato dos halos H. A média das três sementes B inclui três realizações bariônicas; a média H varia só o halo em bárions2026. Misturar essas médias como um efeito causal isolado seria incorreto.

A interpretação conjunta está em VALIDACAO_FINAL_1_0_3.md. Mais resolução bariônica ainda pode ser necessária; perfis por anel e coortes explicitam regiões com poucas partículas.
''')
doc('COMPATIBILIDADE_E_EQUILIBRIO_1_0_3.md',f'''# Campo, densidade, cinemática e estacionariedade — 1.0.3

## Preparação preservada

O potencial, as quatro DFs em ações e as massas independentes da versão1.0.2 foram reutilizados sem novo ajuste. O campo é Φε=−G∫ρ(x′)/√(|x−x′|²+ε²)d³x′. A construção anterior fazia DF→densidade física→campo médio Plummer, com nove iterações convergentes. Não se declarou exatidão global da DF ou ausência de modos físicos.

As validações1.0.2, preservadas, incluem potencial, aR,az, frequências Ω²/κ²/ν², gradientes, densidade de Poisson suavizada versus densidade física e momentos cinemáticos. Nas77 sondas, erro da expansão contra convolução refinada da mesma densidade <10⁻⁴; fechamento físico da densidade total em15 pontos tem máximo≈1,27%, e o bojo tem erros relativos grandes em caudas rarefeitas. A massa da malha difere da integral da DF: bojo+0,4995%, fino+0,00276%, espesso+0,00737%, halo+0,05236%. Esses resíduos não foram ocultados nem renormalizados para aparentar um equilíbrio exato.

Os priors observacionais continuam: fino Rd=2,43 kpc e σR solar de referência35 km/s; espesso Rd=3,88 kpc e σR de referência50 km/s. Medianas solares |z| do contínuo≈0,19999/0,59527 kpc, contra alvos0,20794/0,62383: preservar priors não equivale a ajustar exatamente todos os perfis observados. Os momentos radiais iniciais e suas convenções permanecem em reports/v1.0.2/corrected e kinematic-profiles.csv.

## Nova decomposição de campo

`field-ensembles.json` e `field-components.json` distinguem campo de preparação, média Plummer esperada, amostras instantâneas, desvio entre sementes, erro padrão e resíduo dos bárions fixos. A norma relativa deste último é {components['haloGroups'][0]['normalizedFixedBaryonResidual']:.8f}. Ele pertence a uma realização finita e não é o viés sistemático do gerador. A média discreta de apenas três halos ainda tem incerteza.

## Halo fixo compatível e correção de precisão

Uma expansão escalar do halo foi construída a partir de sua densidade física corrigida, convolveda com Plummer, e comparada com quadratura refinada. A tabela Hermite tem385×385 nós e potencial/derivadas da mesma função. O resíduo herdado de massa da malha é explícito. Não há partículas vivas de halo no B.

A avaliação nodal Float32 apresentava cancelamento ao diferenciar valores próximos de um potencial grande. Subtrair uma constante do potencial melhorou parte do erro; a constante é restaurada na energia, sem derivada. A solução final converte o MESMO interpolante Hermite em coeficientes polinomiais locais usando Float64 e os armazena uma única vez em Float32. A GPU calcula derivadas sem subtrair os termos constantes grandes. Não se mudou densidade, força física alvo ou KDK.

Em4.054 sondas na GPU real, maior erro vetorial relativo contra o halo nativo Plummer = {force['globalRelativeQuantiles50_90_99_Max'][-1]:.9g}; contra a mesma tabela em Float64 = {force['GPUvsCPUGridRelativeQuantiles50_90_99_Max'][-1]:.9g}. As tentativas nodais anteriores e seus erros foram preservados em field-attempts. Este teste não certifica trajetórias longas. Os testes de gradiente analítico e invariância de força sob mudança da origem de potencial são independentes dos dados da galáxia.

## Modelo A: mesmos bárions no campo médio completo

Seis controles A, três sementes ×20/200 Myr: DOP853 Float64, precisão10⁻¹⁰, campo total Plummer fixo, sem autogravidade. Posições, velocidades e pesos iniciais foram arredondados uma vez para f32 para corresponder ao upload inicial dos controles GPU; a evolução A permanece Float64. A controla a amostra de fases e a compatibilidade do potencial, não a resposta coletiva da galáxia.

{run_table(continuous)}

Uma amostra finita pode oscilar em h50/σ mesmo quando a DF contínua é estacionária. A versão1.0.2 também mediu deriva de f(J) ao longo de órbitas com ações aproximadas; seu limite numérico continua válido, sem ser reapresentado como um novo teste de1 Gyr. Nenhuma força instantânea foi ajustada para concordar artificialmente com o contínuo.
''')
cost='\n'.join(f"| {r['id']} | {r['wallSeconds']:.3f} | {r['timing'].get('stepSeconds',0):.3f} | {r['timing'].get('diagnosticSeconds',0):.3f} | {r['maxAbsEnergyError']:.5e} |"for r in runs)
doc('CONSERVACAO_E_CUSTO_1_0_3.md',f'''# Conservação, precisão e custo — 1.0.3

## Hamiltonianas e medidas

C/D isolados: E=K−GΣ(i<j)mi mj/√(rij²+ε²). B: a mesma soma entre bárions mais ΣmiΦhalo, SEM fator1/2 no termo externo. A: só K+ΣmiΦtotal, sem energia de pares de partículas de teste. δE=[E(t)−E(0)]/|E(0)|. A soma direta Float64 compensada usa os pesos/estados efetivamente lidos da GPU f32; não recupera precisão perdida na trajetória.

Cadência de referência:0,5 Myr nos testes20;5 Myr nos testes200. Máximos, médias, amplitudes e RMS são amostrados e NÃO limitam excursões entre amostras. Não foram usados erros energéticos Barnes–Hut nesta campanha. A CPU interativa antiga continua identificada separadamente quando sua energia é aproximada.

## Separação dos erros

- Força: pares diretos GPU Float32; até32 IDs de cada população, em cada estado inicial, comparados com soma direta compensada Float64 dos mesmos pesos/posições e G/ε² efetivos. Maior erro vetorial nas sondas da campanha: {max(p['relative']for r in fa['runs']for p in r['points']):.9g}. A seleção de sondas não prova um limite uniforme para todas as partículas e tempos.
- Campo externo: referência WGSL independente em4.054 posições, mesmo interpolante escalar, erros e tentativas preservados.
- Integrador: Leapfrog KDK original, dt=0,05 Myr. Não foi alterado nem se priorizou reduzir dt. A convergência temporal direta da1.0.1 é evidência em seu domínio original; não é uma prova global para todos os novos estados f32.
- Diagnóstico: soma direta Float64 compensada, sem aproximação de árvore, incluindo o potencial externo correto. G nominal e os parâmetros GPU efetivos f32 estão registrados separadamente; a pequena diferença de representação não foi escondida como identidade exata das Hamiltonianas em aritmética real.

L, Lz, momento linear, COM e resíduos balísticos estão no JSON e no CSV de energia. No campo externo só as simetrias apropriadas são usadas: momento/COM vetoriais não são invariantes do subsistema bariônico; Lz é o invariante ideal axisimétrico. Extrapolações do campo fixo são contadas por amostra. A origem de potencial foi restaurada na energia após a codificação polinomial.

## Custo efetivamente medido

| Ensaio | tempo total, s | passos GPU, s | diagnósticos, s | máx. abs. δE |
|---|---:|---:|---:|---:|
{cost}

O bloco diagnóstico inclui energia e análises estruturais; cada função interna não foi cronometrada isoladamente. Em Nh=40.000,Ntotal=46.000, o custo desse bloco domina o teste curto, enquanto os passos diretos GPU são muito menores. O overhead restante inclui inicialização, leituras, serialização e checkpoints. Os controles A têm outro algoritmo/Hamiltoniana e seus tempos nativos não são um benchmark equivalente de C.

Não foi necessário trocar a gravitação direta por Barnes–Hut/PM. A nova representação polinomial melhora a precisão do campo externo fixo, não altera a complexidade O(N²) dos pares vivos. Não se tentou aumentar consumo de VRAM como se fosse ganho de precisão. A RX7600 é o hardware informado pelo usuário; os tempos referem-se ao dispositivo WebGPU disponível nesta execução.
''')
mode_table='\n'.join(f"| {r['id']} | {r['initialM2MaxR2to12']:.6f} | {r['finalM2MaxR2to12']:.6f} |"for r in modes['runs'])
doc('MODOS_COLETIVOS_1_0_3.md',f'''# Populações, coortes e modos coletivos — 1.0.3

As etiquetas físicas fino/espesso são herdadas do snapshot e nunca redefinidas pela altura atual. Cada população tem plano próprio, h50, σ perpendicular e medidas no eixo z fixo. São registrados σR, raio de meia massa, centro do plano, inclinação, média de altura/velocidade normal, densidades e anéis instantâneos. Coortes dos anéis INICIAIS mantêm os mesmos IDs, complementando os anéis que permitem entrada/saída por migração.

`cohort-series.csv` inclui contagens, número máximo de pares independentes e uma indicação de baixa contagem (<60 partículas). Esse corte é aviso amostral, não limiar de estabilidade. Os testes de software verificam que deslocar rigidamente o plano não gera espessamento intrínseco e que migração radial não redefine as coortes.

## Modos azimutais e verticais

m=1..4, amplitudes e fases por anel, referência condicional de ruído por pares e alterações de planos estão em collective-modes.csv/json. O início antipodal suprime modos ímpares: ausência de m=1 não demonstra estabilidade geral. Testes ao longo do tempo são correlacionados e a referência aproximada não é uma significância temporal calibrada.

| Ensaio | maior amplitude m2 inicial, anéis2–12 kpc | maior amplitude m2 final, mesmos limites instantâneos |
|---|---:|---:|
{mode_table}

O máximo entre anéis não é a amplitude de uma barra global nem evidencia, sozinho, uma fase coerente. As medidas de inclinação, altura e velocidade normal por anel ajudam a distinguir translação, inclinação, flexão e aquecimento; subtrair a média populacional de velocidade não remove todo movimento coerente espacial.

## Toomre Q e interpretação

O proxy usa σR κinicial/(3,36 GΣ), com frequências iniciais do campo Plummer e densidade superficial amostrada. O coeficiente3,36 pertence à aproximação de disco fino sem suavização; espessura finita, mistura de populações, suavização e evolução do potencial limitam seu uso. Não se usa Q=1 como critério automático de estabilidade deste modelo.

{decision['interpretation']}

Uma instabilidade física exige persistência e convergência de resolução/semente/perfil, além de coerência espacial/temporal apropriada. Não se injetaram braços, barra, modos, damping ou correções de órbitas. Os intervalos200 Myr ainda não cobrem vários períodos solares. As mudanças observadas permanecem nos dados, sem serem suprimidas para melhorar a aparência.
''')
doc('COMPARACAO_VERSOES_1_0_3.md',f'''# Comparação das versões1.0.1,1.0.2 e1.0.3

A1.0.1 demonstrou que boa conservação energética não eliminava reajustes e que reduzir dt não resolvia o aquecimento. A1.0.2 mudou efetivamente a preparação para o campo médio Plummer, mantendo as DFs/priors: crescimento médio global em20 Myr,N=10.000, passou de9,082089% para4,736551% em três realizações bariônicas distintas.

A1.0.3 não trocou silenciosamente o modelo físico. Mantém a solução1.0.2 e varia a discretização. No refinamento do halo, TODOS os bárions são da semente2026, enquanto o halo usa2026/27/28. Portanto, a média H-Nh4000({H(4000,20)['globalGrowthMean']:.6f}%) não é a média histórica1.0.2 de4,736551%: os protocolos têm amostras bariônicas diferentes. H-Nh4000-h2026 reproduziu a trajetória curta de referência corrigida s2026, crescimento global4,190688%.

{group_table('halo20')}

{group_table('halo200')}

Os novos200 Myr não foram extrapolados dos20 Myr. A versão1.0.2 anterior só havia testado o candidato corrigido por20 Myr; os antigos200/1.000 Myr tinham outra preparação e não foram relabelados. A figura10 separa esses desenhos. A comparação com B tem campo Plummer novo e não usa a antiga tabela de halo Newtoniana.

{decision['explanation']}

{preservation['unchangedFiles']} arquivos históricos e os pacotes anteriores foram verificados por SHA-256; as fontes anteriores estão em preserved-v1.0.2. As funções anteriores do site e o modelo padrão foram preservados. A página1.0.3 e o seletor opt-in identificam o candidato como experimental. Não foi feita publicação remota nesta tarefa.
''')
doc('VALIDACAO_FINAL_1_0_3.md',f'''# Validação científica1.0.3 — domínio efetivamente medido

**{decision['publicConclusion']}**

## Campanha concluída

{len(runs)} integrações reais: {counts}. Os24 controles curtos de halo/bárions precederam a seleção de200 Myr. Os seis A independentes usam as mesmas condições bariônicas no campo contínuo completo. Os12 ensaios selecionados200 Myr preservam dt/ε/massas e registram custos, hashes, estados e checkpoints.

{decision['interpretation']}

{decision['explanation']}

## Qualificação independente

- Compatibilidade inicial: mesma solução aproximada de campo/DF Plummer da1.0.2; testes de densidade/cinemática preservados, novos testes de campo discreto e halo externo. Resíduos de malha/DF e amostragem permanecem explícitos.
- Conservação: energia direta Float64 das trajetórias efetivas, invariantes adequados a cada Hamiltoniana, cadências declaradas. Não se afirma energia exata nem se usa δE isoladamente para certificar estrutura.
- Estrutura: fino/espesso, σz e σ⊥, σR, R50, planos, densidades, anéis/coortes e modos medidos. h50 global não é o único critério.
- Convergência: quatro resoluções do halo no curto e contraste de uma década em massa no intervalo200; três sementes por grupo. O refinamento bariônico é isolado. Isso não estabelece um limite assintótico conjunto em N,ε,método e várias realizações bariônicas.
- Software:101 testes Node passados, incluindo migração/coortes, deslocamento rígido e gradiente polinomial/cambio da origem de potencial. São verificações de implementação, não a razão da conclusão científica.

## Preservação e entrega

{preservation['unchangedFiles']} arquivos históricos intactos por hash; código anterior preservado. O padrão histórico não foi substituído. Novo seletor vivo da1.0.3 é explicitamente experimental. B é identificado como controle com halo fixo e não é apresentado como galáxia viva.

Onze figuras PNG/SVG/CSV e os dados brutos acompanham a entrega. As tentativas incompletas de gravação e os erros de interpolação anteriores permanecem separados dos resultados concluídos. Não há curvas fabricadas, períodos não simulados ou seleção exclusiva de sementes favoráveis.

## Referências e alcance

[Ludlow et al.,2021](https://arxiv.org/abs/2105.03561) investigam aquecimento espúrio de discos por halos discretizados, com dependência de massa individual e condições locais. Esse mecanismo motiva o controle, mas a conclusão desta galáxia depende das medidas acima. [AGAMA, Vasiliev](https://arxiv.org/abs/1802.08239) e o [manual](https://arxiv.org/abs/1802.08255) fundamentam o uso de DFs em ações e iteração do campo. A convolução e a avaliação GPU desta implementação foram verificadas separadamente.
''')
doc('REPRODUCAO_1_0_3.md',r'''# Reprodução1.0.3

Pacote `granularidade-1.0.3.zip`: complemento do projeto preservado. Inclui fontes, entradas/snapshots necessários, dados integrais, figuras, manifestos e SHA256SUMS. Os pacotes completos anteriores continuam separados. Reproduza em uma cópia de trabalho limpa para reports/v1.0.3, mantendo a preparação1.0.2; não sobrescreva as entradas que já sustentam os resultados entregues.

Node>=20.11, sem dependências Node externas. Neste ambiente npm não está no PATH: use `node scripts/test.mjs`, `node scripts/build.mjs`, `node scripts/serve.mjs`. Acesse localhost:4180/granularidade103.html. O navegador precisa de WebGPU para refazer a gravitação GPU; visualizar os relatórios não requer AGAMA.

Offline: Python3.12.14, AGAMA1.0.161 commit f302756b8af2b763db58e278e30478517dc8eea3, NumPy2.5.4, SciPy1.18.1, Matplotlib3.11.2. Configure as dependências/PYTHONPATH em seu ambiente. A preparação de DF é a1.0.2 já convergida, não uma nova calibração.

```powershell
node scripts/granularity-103/preserve.mjs
python scripts/granularity-103/prepare.py --stage halo
node scripts/granularity-103/campaign.mjs
node scripts/granularity-103/identity.mjs
node scripts/granularity-103/collector.mjs
```

O coletor escuta SOMENTE127.0.0.1:4185 e aceita as IDs registradas e a origem local4180. Na aba /tests/browser-granularity-103.html?stage=halo20, execute o botão. Os12 halos devem terminar antes de registrar os controles B. Preparação de arquivos de B/campo e verificação independente podem ocorrer enquanto H evolui; B não inicia antes de completar H.

```powershell
python scripts/granularity-103/prepare.py --stage baryons
python scripts/granularity-103/prepare_field.py
python scripts/granularity-103/field_statistics.py
python scripts/granularity-103/field_components.py
```

Abra /tests/browser-granularity-force-103.html, execute a força e salve os dados completos como reports/v1.0.3/halo-wgsl-force-validation.json. O relatório entregue já inclui a saída real e os erros das tentativas anteriores. O portão de append-baryons verifica hash da tabela e o erro de referência antes de liberar B.

```powershell
node scripts/granularity-103/append-baryons.mjs
node scripts/granularity-103/identity.mjs
```

Execute /tests/browser-granularity-103.html?stage=baryons20. A seguir, os A nativos independentes e a seleção de200, depois de inspecionar os24 resultados curtos:

```powershell
python scripts/granularity-103/continuum.py --duration 20
node scripts/granularity-103/analyze-continuum.mjs
node scripts/granularity-103/analyze.mjs
node scripts/granularity-103/append-200.mjs
python scripts/granularity-103/continuum.py --duration 200
node scripts/granularity-103/analyze-continuum.mjs
```

Execute /tests/browser-granularity-103.html?stage=medium200. São somente os12 contrastes selecionados, com energia/estrutura a cada5 Myr e dt ainda0,05 Myr. Resultados concluídos são retomados por identidade e recusam substituição por dados diferentes. Checkpoints guardam o estado parcial mais recente; o executor atual retoma automaticamente ensaios concluídos, não promete retomar uma trajetória a partir de qualquer checkpoint parcial.

```powershell
node scripts/granularity-103/analyze.mjs
node scripts/granularity-103/force-audit.mjs
node scripts/granularity-103/collective.mjs
python scripts/granularity-103/plot.py
node scripts/granularity-103/preserve.mjs --verify
```

`long-run-decision.json` registra uma avaliação científica dos resultados, não uma certificação gerada pelos testes de software. O gerador de relatórios exige os ensaios registrados concluídos e essa decisão explícita. `report.py`, a auditoria de artefatos e `package.py` consolidam a entrega. Feche o coletor após a campanha; o servidor4180 pode continuar.

As fontes foram preservadas por épocas/identidade antes de mudanças posteriores: a execução H curta começou com a versão inicial do harness; B e200 usam a extensão polinomial validada. Isso só afeta o campo externo de B, não os pares diretos de H. O JSON de cada execução identifica os hashes realmente carregados. Fontes/entradas históricas permanecem intactas; reprodutibilidade de fase depende da versão do AGAMA e trajetórias f32 podem variar entre dispositivos.
''')
assessment={'schema':'granularity-assessment-103','UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'experimental-measured-domain','publicConclusion':decision['publicConclusion'],'domain':f'{len(runs)} integrações concluídas:12 halos e12 controles bariônicos de20 Myr,12 contrastes selecionados de200 Myr e6 controles contínuos independentes. dt N-corpos=0,05 Myr; ε=0,1 kpc.','groups':groups,'completedIntegrations':len(runs),'counts':counts,'longRunDecision':decision,'fieldNoise':noise['groups'],'figures':figs['figures'],'qualification':'Measured domain only. Software passing cannot certify physical equilibrium.'}
(BASE/'assessment.json').write_text(json.dumps(assessment,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print('Eight scientific reports and measured assessment written; runs',len(runs))
