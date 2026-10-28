"""Publish the measured FIRST milestone; never manufacture later-stage results."""
from pathlib import Path
import json,csv,math,hashlib,datetime
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.2'
def load(p):return json.loads((ROOT/p).read_text(encoding='utf8'))
def save(p,obj):(BASE/p).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def doc(name,text):(ROOT/name).write_text(text.strip()+'\n',encoding='utf8')
overview=load('reports/v1.0.2/short-overview.json');prep=load('reports/v1.0.2/corrected/preparation.json');trace=load('reports/v1.0.2/corrected/iterations.json');figs=load('reports/v1.0.2/figures/manifest.json');masses=load('reports/v1.0.2/df-validation/closure.json')['fixedActionDFMassesMsun']
gpu=[r for r in overview if r['model']=='C-GPU'];mean=lambda a:sum(a)/len(a)
growth={f:mean([r['growthPercent'] for r in gpu if r['family']==f])for f in ['baseline','corrected']}
absolute={f:mean([r['h20']-r['h0'] for r in gpu if r['family']==f])for f in ['baseline','corrected']}
thin={f:mean([r['thin20']-r['thin0'] for r in gpu if r['family']==f])for f in ['baseline','corrected']}
def table(rows):
 return '\n'.join(['| Modelo / família | N | Semente | h50(0), kpc | h50(20), kpc | Variação | máximo absoluto de δE amostrado |','|---|---:|---:|---:|---:|---:|---:|']+[f"| {r['model']} / {r['family']} | {r['n']} | {r['seed']} | {r['h0']:.6f} | {r['h20']:.6f} | {r['growthPercent']:+.3f}% | {r['maxAbsEnergyError']:.3e} |" for r in rows])
common='''Esta entrega encerra a **etapa 1 solicitada**, antes dos refinamentos e otimizações secundárias. Não certifica a estabilidade de longo prazo nem a convergência não colisional. As etapas 2–4 permanecem pendentes. Não se adotou uma porcentagem universal aceitável de espessamento.'''
doc('CORRECAO_EQUILIBRIO_1_0_2.md',f'''# Correção física 1.0.2 — primeira etapa experimental

{common}

## Mudança efetiva

O gerador anterior `scripts/equilibrium/generate_agama.py` construía as DFs de ação em um potencial Newtoniano suave da densidade física. O motor `src/physics/forces.js` e o kernel WGSL em `src/compute/gpu.js` aplicam interação de Plummer. O novo gerador `scripts/equilibrium-102/generate_softened.py` faz a iteração **DF → densidade física → campo médio Plummer → novas ações**, até a convergência numérica. O integrador KDK e a lei de força de evolução foram preservados.

As mesmas funções f_i(J), seus parâmetros de massa, escalas radiais e priors cinemáticos foram mantidos. As ações são recalculadas no potencial suavizado. Isso muda conjuntamente as distribuições espaciais e de velocidade; não é um multiplicador de velocidades. Nenhuma medida de espessamento da evolução entra na solução inicial.

Em cada iteração, `scm.potential=current` invalida o ActionFinder anterior; `scm.iterate()` calcula densidades físicas no campo suavizado e emite um potencial Newtoniano intermediário. Esse resultado é convolvedo antes da próxima avaliação de DF. O potencial Newtoniano intermediário nunca se torna o próximo campo de preparação. O campo final é uma expansão escalar nativa AGAMA, com força derivada do mesmo potencial. Não se confundem densidade física e densidade efetiva de Poisson.

## Convergência e admissibilidade

Foram necessárias {len(trace)} iterações; mudanças máximas de força nas duas últimas: {trace[-2]['maxRelativeForceChange']:.9g} e {trace[-1]['maxRelativeForceChange']:.9g}. Ambas abaixo da tolerância numérica anterior 0,001, em duas iterações consecutivas. Essa tolerância não é um critério de estabilidade estrutural. A solução continua aproximada: malha de densidade, quadratura, expansão e ações têm erros distintos, medidos no relatório de compatibilidade.

Seis snapshots reproduzíveis: N=1.000 (150 bojo / 354 fino / 96 espesso / 400 halo) e N=10.000 (1.500 / 3.546 / 954 / 4.000), sementes 2026, 2027 e 2028. O manifesto `reports/v1.0.2/corrected/snapshots.json` inclui hashes, pesos M/N e testes amostrais de DF finita, positiva e órbitas ligadas no contínuo. Isso verifica a amostra, não a positividade global analítica. Nenhuma velocidade foi reduzida durante a evolução.

Massas independentes das DFs, em M☉: bojo {masses[0]:.6f}; fino {masses[1]:.6f}; espesso {masses[2]:.6f}; halo {masses[3]:.6f}. O halo total truncado não é a massa dentro do raio observacional de referência: ambos seguem a parametrização anterior. Todos os ensaios usam os mesmos pesos físicos por população; a GPU arredonda esses pesos para f32, registrados por leitura real.

## Resultado do mínimo

Em três controles C com N=10.000, 20 Myr, dt=0,05 Myr, ε=0,1 kpc e força direta GPU, a média do crescimento global de h50 passou de {growth['baseline']:.6f}% para {growth['corrected']:.6f}% (redução descritiva de {100*(1-growth['corrected']/growth['baseline']):.2f}%). A média da mudança de altura em kpc passou de {absolute['baseline']:.8f} para {absolute['corrected']:.8f}. O aumento médio de h50 do disco fino caiu de {thin['baseline']:.8f} para {thin['corrected']:.8f} kpc ({100*(1-thin['corrected']/thin['baseline']):.2f}% menor).

Essas médias de três sementes não são uma estimativa precisa do efeito causal isolado: as famílias têm amostras diferentes de fase, porque o potencial de preparação mudou. O controle A1 usa **as mesmas condições antigas** em outro campo e isola esse desajuste no contínuo. Os controles C não isolam granularidade de halo e bárions. A amostra de 1.000 partículas é muito ruidosa e uma semente piorou. Consulte todos os resultados, sem seleção da melhor semente.

## Uso e preservação

O padrão anterior foi mantido. `correcao102.html` oferece o candidato como EXPERIMENTAL e `equilibrio.html?modelo=softened-102` apenas o seleciona; é preciso carregar e iniciar explicitamente. A preparação exige ε=0,1 kpc; a interface bloqueia uma Hamiltoniana incompatível. Importar esse snapshot não o certifica como estável. A CPU interativa usa Barnes–Hut e sua energia é aproximada; as evidências C desta etapa usam força e energia diretas.

Fontes anteriores foram copiadas para `reports/v1.0.2/preserved-v1.0.1`. A verificação por SHA-256 abrange 931 arquivos históricos. Os relatórios e pacotes 0.9, 1.0 e 1.0.1 permanecem separados. A correção está disponível localmente e no build; publicação remota não foi realizada.

## Referências

[AGAMA — artigo do autor](https://arxiv.org/abs/1802.08239), [manual técnico](https://arxiv.org/abs/1802.08255). Código AGAMA local usado: commit `f302756b8af2b763db58e278e30478517dc8eea3`, módulo 1.0.161. As fontes permitem potenciais personalizados e DFs em ações num potencial iterado; a convolução Plummer desta entrega é uma implementação adicional, cuja identidade e testes estão arquivados.
''')
doc('COMPATIBILIDADE_CAMPO_SUAVIZADO.md',r'''# Compatibilidade do campo médio suavizado — 1.0.2

## Operador e unidades

Para a densidade física ρ, o operador implementado é

\[
\Phi_\epsilon(\mathbf x)=-G\int\rho(\mathbf y)(|\mathbf x-\mathbf y|^2+\epsilon^2)^{-1/2}\,d^3y.
\]

A identidade usada é Φε = Wε * ΦNewton[ρ], com Wε(r) = 3ε² / [4π(r²+ε²)^(5/2)]. Sua integral espacial é 1 e ∇²Φε=4πG(Wε*ρ). Ela segue da equação de Poisson do potencial de uma massa Plummer e das condições de contorno no infinito. A densidade física que entra na DF continua sendo ρ, não Wε*ρ. Forças são −∇Φ e usam a mesma convolução.

O operador `plummer_mean.py` integra deslocamentos isotrópicos, r=ε tanθ, peso radial 3 sin²θ cosθ. Quadratura principal 24×8×16, referência 48×16×32. As expansões Multipole/CylSpline do AGAMA permitem usar um potencial escalar nativo e ações no laço de densidade. Não há força artificial na evolução. Comprimento kpc, tempo Myr, massa interna 10¹⁰ M☉; o gerador registra explicitamente a conversão de km/s para o G nominal do motor. A GPU herda o arredondamento f32 de G, ε e massas, sem alegar identidade bit a bit com o contínuo f64.

## Campo anterior e novo

Na densidade antiga, em R=8,122 kpc e z=0,1 kpc, a_z Newtoniano = −428,67786 e média Plummer = −398,84336 (km/s)²/kpc: redução de módulo de 6,96%. Em R=1,z=0,1, a mudança é cerca de 8,05%; no centro a diferença pode ser muito maior. O erro não é um único fator constante. `field-proof/proof.json` retém potencial, forças, sondas e ordens de quadratura.

No campo corrigido, 77 sondas com R=0,25–20 kpc e z=0–2 kpc: erro relativo vetorial da expansão nativa contra convolução refinada, percentis 50/90/máximo = 2,919e−5 / 5,519e−5 / 9,934e−5. Isso mede a representação de um campo de uma dada densidade de malha, não todo o erro da DF física. A concordância entre densidade de Poisson e Wε*ρ tem resíduos absolutos relativos 50/90/máximo de 0,0331% / 0,1443% / 0,5563%.

`field-validation/frequencies.json` registra Ω²=−aR/R, κ²=4Ω²+R dΩ²/dR, ν²=−∂az/∂z, e gradientes por diferenças finitas, antes/depois. Sinais e frequências são consequências do campo total, não parâmetros ajustados para produzir um disco fino. A figura 1 mostra forças, potencial e ν²; as tabelas contêm os demais diagnósticos.

## Fechamento DF, densidade e observações

Integrações independentes em velocidade em 15 pontos fora da malha: erro absoluto relativo da densidade física TOTAL, mediana 0,0993%, p90 0,8131%, máximo 1,2708%. A população do bojo apresenta erro relativo local de até cerca de 80% em sua cauda muito rarefeita; os valores absolutos e relativos de cada população estão em `df-validation/closure.json`. Não se declara precisão universal de 10⁻⁴ da solução física.

A massa da representação de densidade difere da integral independente da DF em: bojo +0,49947%; fino +0,002759%; espesso +0,007373%; halo +0,052365%. Os pesos das partículas usam as integrais de DF preservadas, sem renormalizar silenciosamente as massas para a malha. Esse resíduo permanece como limite do fechamento campo/amostra.

As DFs e seus priors observacionais são os mesmos: fino R_d=2,43 kpc, σR solar de referência 35 km/s; espesso R_d=3,88 kpc, σR de referência 50 km/s; alvos de altura exponencial 0,3 e 0,9 kpc. A nova densidade solar tem medianas |z| de 0,19999162 e 0,59526889 kpc, contra 0,197089 e 0,593090 anteriores e alvos 0,20794415 e 0,62383246. Os resíduos em relação aos alvos são aproximadamente −3,83% e −4,58%. Preservar os priors não equivale a reproduzir exatamente toda a densidade e cinemática observacional.

`kinematic-profiles.csv` contém densidade, rotação média, σR, σφ e σz no plano para as quatro populações e 24 raios. Os segundos momentos foram convertidos em variâncias subtraindo o quadrado da média. `corrected/kinematic-moments.json` guarda os dados AGAMA originais. As densidades radiais iniciais/finais amostradas e perfis contínuos estão nas figuras/tabelas. Não se fez um novo ajuste observacional nem se promete que o perfil radial final seja exatamente exponencial. Antes da campanha longa, ajustar simultaneamente densidade e cinemática com incertezas observacionais continua necessário.

## Ruído discreto e viés

Três realizações por família, N=1.000 e 10.000, nas mesmas sondas fixas. `field-validation/ensemble.json` separa referência Plummer da densidade, campo de preparação, média das forças discretas, desvio entre sementes e erro padrão. A norma relativa do desajuste sistemático de preparação caiu de 0,058035 para 0,00003949, contra a densidade representada. O erro da média discreta em N=10.000 foi 0,13854 antigo e 0,16023 novo; o desvio entre realizações foi 0,27929 e 0,358996. Não se esconde que a nova amostragem ainda pode ser mais ruidosa. Com apenas três sementes, a ausência de viés de amostragem não está demonstrada. Não há obrigação de cada força instantânea coincidir com o campo médio.

## Estacionariedade no contínuo

A variação de f(J) foi medida ao longo de órbitas de 20 Myr com ações aproximadas. Média entre sementes dos percentis 50/90 de |Δln f| no fino: antigo em seu próprio campo 0,003813/0,05557; mesmas condições antigas no campo Plummer 0,02244/0,10045; novo em seu campo Plummer 0,004002/0,06161. A preparação corrigida recupera aproximadamente o nível de compatibilidade do controle original nesse diagnóstico; não torna as ações exatas. Bojo, espesso e halo estão em `df-validation/f-along-orbits.json`.

Quatro testes independentes em `test_plummer_mean.py`: normalização/axisimetria, gradiente do potencial, referência esférica por integração direta da densidade física com o Green suavizado, e limite ε=0/parâmetros inválidos. A referência esférica não usa a mesma convolução de potenciais, evitando um teste circular.
''')
halo='\n'.join(f'| {n:,} | {masses[3]/n:.6e} | {(masses[3]/n)/(masses[1]/3546):.4f} |'.replace(',','.') for n in [4000,8000,20000,40000])
doc('REFINAMENTO_HALO_1_0_2.md',f'''# Refinamento do halo — etapa posterior

**Estado: não executado nesta entrega.** {common}

A primeira correção melhorou três controles de 10 mil partículas, mas não removeu a granularidade. Não se atribui toda a melhora ou todo o aquecimento ao halo. O modelo D ainda não foi medido com as novas DFs.

## Protocolo para a próxima etapa

Congelar bytes das posições, velocidades, massas e etiquetas de todos os bárions de cada realização corrigida. Amostrar a MESMA DF do halo no MESMO potencial convergido para Nh=4.000,8.000,20.000,40.000, com pelo menos sementes de halo 2026/2027/2028, independentes dos bárions. Manter Mh={masses[3]:.6f} M☉ e massa individual Mh/Nh. Não reconstruir nem recentrar os bárions separadamente para cada halo. Medir o momento/COM inicial próprio de cada amostra e acompanhar os resíduos balísticos.

| Nh planejado | massa de cada partícula, M☉ | razão m_h / m_fino |
|---:|---:|---:|
{halo}

Estes valores são apenas aritmética do desenho experimental, **não resultados de aquecimento**. Os controles corrigidos atuais têm Nh=400 ou 4.000 junto de resoluções bariônicas diferentes; não isolam o efeito de Nh. Não se usa sua diferença como curva de convergência do halo.

Integrar primeiro 20 Myr e depois 200 Myr, conservando dt, ε e método para os pares; registrar força, energia direta em snapshots, h50 global/fino/espesso, dispersões, perfis, modos m=1–4, inclinação e custo por passo. Diferenciar flutuações entre halos de tendência média antes de selecionar uma resolução. A figura solicitada 4 permanece pendente até existirem esses ensaios. Não foi implementado halo multimassa nem refinamento interno nesta etapa, portanto não há hipótese de peso/amostragem ainda não testada.
''')
doc('REFINAMENTO_BARIONS_1_0_2.md',f'''# Refinamento dos bárions — etapa posterior

**Estado: não executado nesta entrega.** {common}

O modelo B novo deverá ter halo externo fixo igual à contribuição **Plummer** da densidade física corrigida do halo. Não reutilizar silenciosamente a tabela Newtoniana antiga. B não terá partículas de halo e não é uma galáxia totalmente autogravitante. Sua energia deve incluir ΣmΦhalo, sem fator 1/2; U dos pares bariônicos tem contagem i<j. Modelo A não tem autogravidade; C e D têm todas as componentes dinâmicas.

Partir de 1.500 bojo,3.546 fino,954 espesso, mantendo as massas físicas. Aumentar isoladamente fino, espesso e bojo por fatores 2 e 4, mantendo os outros componentes idênticos por bytes e pelo menos três realizações independentes; em seguida comparar combinações. Reamostrar da DF original corrigida, com pesos M_i/N_i, sem duplicação de posições. Primeiro 20 Myr, depois 200 Myr somente quando os controles justificarem.

Avaliar bins radiais internos/solares, h50 com etiquetas populacionais fixas, σR/σφ/σz, resolução vertical, razão ε/altura, perturbações do bojo, equilíbrio de Jeans e deriva de densidade. Não confundir pontos desenhados com N integrado. A massa macro atual do bojo é {masses[0]/1500:.6e} M☉; fino {masses[1]/3546:.6e}; espesso {masses[2]/954:.6e}.

Não se dispõe de novos B na 1.0.2. Os B anteriores permanecem históricos, com outra preparação. A figura solicitada 5 aguarda as novas medidas. Não inferir um resultado a partir de um plano de resolução.
''')
doc('COMPARACAO_ESTABILIDADE_1_0_2.md',f'''# Comparação de estabilidade — experimentos mínimos de 20 Myr

{common}

## Desenho

21 integrações concluídas: nove A no contínuo (N=1.000, três famílias × três sementes); seis C CPU Float64 direto (antigo/novo × três sementes, N=1.000); seis C GPU Float32 direto (antigo/novo × três sementes, N=10.000). Nos C, dt=0,05 Myr e ε=0,1 kpc. Não foi priorizada nova redução de dt.

A-baseline: IC antiga no próprio campo Newtoniano. A-baseline-softened: **mesma IC antiga** no campo Plummer da densidade antiga. A-corrected: nova IC no próprio campo Plummer convergido. A usa DOP853 Float64, precisão 10⁻¹⁰; não é autogravitante. C tem disco, bojo e halo ativos. B com halo fixo corrigido e D com halo refinado aguardam a etapa 2.

h50 é a mediana de distância absoluta ao plano instantâneo da população, na abertura e convenções registradas nas amostras. Plano fixo inicial, inclinação, coortes e diagnósticos regionais permanecem nos registros; o plano instantâneo ajuda a separar inclinação global de espessamento. Famílias usam as mesmas massas, parâmetros de DF e sementes; suas coordenadas não são idênticas, pois a distribuição de fase mudou.

## Resultados completos

{table(overview)}

## Populações e dispersão entre sementes

A média do crescimento global C-GPU caiu de {growth['baseline']:.4f}% para {growth['corrected']:.4f}%; não foi escolhida a melhor semente. Os três aumentos absolutos do fino antigo são 0,02685047 / 0,02384449 / 0,02709065 kpc, e os novos 0,01034596 / 0,00923072 / 0,00699071 kpc. O disco espesso não é estacionário em todas as sementes: a nova semente 2028 contrai de 0,59179 para 0,52511 kpc. A média global não representa cada população.

Nos C-CPU N=1.000, o crescimento médio foi 67,2835% → 39,9743%, mas a semente 2028 piorou de 16,3095% para 36,8119%. Há forte variação amostral: não se conclui estabilidade ou redução garantida para qualquer realização. A média dos controles A foi 10,9018% (original),12,4153% (IC original em Plummer),4,2218% (corrigido); medianas de uma amostra pequena oscilam mesmo no contínuo. A variação de f(J) oferece um diagnóstico adicional de compatibilidade, independente da aparência.

## Energia e temporalidade

CPU C: Hamiltoniana direta Float64 a cada 0,05 Myr; estrutura a cada 0,5 Myr. GPU C: estados físicos f32 lidos e energia direta Float64 a cada 0,5 Myr; estrutura global na mesma cadência. Estados completos em 0 e 20 Myr. Diagnósticos de fino/espesso GPU derivados desses estados só existem em duas épocas; a figura 3 usa pontos ligados, sem fingir séries densas. Nos A o potencial externo aparece na energia, sem U entre as partículas de teste.

Nem todo erro energético melhorou: C-GPU novo s2028 chega a 2,5109e−6, contra 5,4103e−7 antigo; C-CPU novo s2026 chega a 3,8315e−4, contra 2,0056e−6 antigo. Esses máximos amostrados são visíveis no CSV e na figura 6, e não provam erro limitado entre amostras. A energia global é dominada em parte pelo halo; não substitui medidas por população. Não se mudou dt para ocultar resultados adversos.

Os dados mostram redução preliminar do reajuste inicial no conjunto de maior N, com compatibilidade do campo muito melhor. Não se quantificou ainda separadamente aquecimento do halo, dos bárions e modos coletivos físicos. Não se classificou barra, flexão ou instabilidade como física por aparência. Esse diagnóstico exige dependência com resolução, semente e períodos orbitais maiores. 20 Myr não cobre vários períodos solares e não autoriza extrapolar a 200 Myr ou 1 Gyr.

## Figuras e dados

Oito figuras reais, em PNG/SVG/CSV, listadas em `reports/v1.0.2/figures/manifest.json`, com parâmetros, limitações e SHA-256 dos dados de origem. Figuras 1,2,3,6,7,8 estão disponíveis. A figura 9 tem apenas os modelos A/C medidos; B/D estão pendentes. A figura 10 mostra convergência da iteração e ruído entre sementes para N=1.000/10.000, não convergência de estabilidade em N/ε/método. Figuras 4 e 5 não foram fabricadas. `short-overview.csv`, `energy-series.csv`, `structure-series.csv` e `kinematic-profiles.csv` são derivados de dados efetivamente calculados.
''')
doc('VALIDACAO_FINAL_1_0_2.md',f'''# Validação da primeira etapa 1.0.2

**Classificação: correção de campo implementada e testada; melhora preliminar em 20 Myr; candidato experimental, estabilidade longa não validada.**

{common}

## Evidências

- Gerador de condições iniciais realmente modificado; campo médio Plummer, ε=0,1 kpc; nove iterações convergentes; seis novos snapshots com hashes e parâmetros.
- Validação independente do operador, densidade, potencial, forças, frequências, gradientes, momentos e f(J). Erro da expansão <10⁻⁴ nas sondas da referência da mesma densidade; fechamento físico da DF tem erros maiores e explicitados.
- 21 integrações reais até 20 Myr. C-GPU N=10.000 melhora nas três sementes; média de crescimento de h50 {growth['baseline']:.6f}% → {growth['corrected']:.6f}%. Não há garantia universal nem estabilidade longa.
- 96 testes Node (incluindo três sobre compatibilidade da preparação) e quatro testes Python independentes do operador. Consulte os logs `node-tests.tap` e `python-tests.txt` e a auditoria final de build/artefatos para o estado efetivamente verificado.
- 931 arquivos históricos identificados na preservação; `preservation-verification.json` é a prova da verificação final por SHA-256, não a data desta redação.

## Limites que continuam abertos

Granularidade de halo e bárions, diferenças de resolução vertical, ações aproximadas, fechamento da densidade e cinemática observacional, instabilidades coletivas, estabilidade por vários períodos, convergência de N/ε/método e integrações 200/1.000 Myr. A massa física e os priors foram preservados, mas as densidades resultantes não são exatamente idênticas aos alvos. O modelo padrão não foi substituído.

Os relatórios de refinamento descrevem protocolos pendentes e números aritméticos das massas. Não representam experimentos realizados. A sequência seguinte é halos pareados → bárions com halo fixo Plummer → seleção por convergência → integração longa. Otimização WGSL/árvore/PM permanece fora desta primeira etapa; não houve alegação de ganho de precisão por VRAM.

## Reprodução e proveniência

Consulte `reports/v1.0.2/REPRODUCAO.md`. A pasta `executed-source` contém cópias identificadas dos códigos dos ensaios; os JSON registram as fontes e hashes de entrada. O gerador recebeu uma extensão de CLI `--sample-only` e mesclagem do manifesto enquanto a solução inicial rodava. Isso não alterou o operador/iteração carregados por aquele processo. `generation-epoch-0` conserva a fonte exata reconstruída daquela época, e `preparation-scm-epoch0.json`/`protocol-scm-epoch0.json` conservam os metadados da primeira execução. A preparação corrente registra a chamada de amostragem de 10.000, cujo tempo não deve ser confundido com os 954,686 s da preparação antes da amostragem (a primeira chamada completa levou aproximadamente 978 s).

Não se relabelou o hash de uma versão posterior como se fosse o código carregado na primeira iteração. O núcleo numérico é idêntico nas duas épocas; a extensão apenas permite amostrar a solução já convergida. Os snapshots que alimentaram os ensaios permanecem intactos. `SHA256SUMS.txt` no pacote identifica os bytes entregues. Código, dados brutos e documentação são verificáveis, sem necessidade de confiar em um selo de equilíbrio.
''')
# Extra human-friendly data: native AGAMA order vxx,vyy,vzz,vxy,vxz,vyz.
mom=load('reports/v1.0.2/corrected/kinematic-moments.json')
with (BASE/'kinematic-profiles.csv').open('w',newline='',encoding='utf8')as f:
 w=csv.writer(f);w.writerow(['population','R_kpc','rho_Msun_kpc3','mean_vphi_km_s','sigma_R_km_s','sigma_phi_km_s','sigma_z_km_s'])
 for name,p in zip(['bulge','thin','thick','halo'],mom['populations']):
  for R,rho,v,v2 in zip(mom['radiusKpc'],p['densityMsunKpc3'],p['meanXYZKmS'],p['secondMoments']):w.writerow([name,R,rho,v[1],*[math.sqrt(max(0,v2[i]-v[i]**2))for i in range(3)]])
with (BASE/'structure-series.csv').open('w',newline='',encoding='utf8')as f:
 w=csv.writer(f);w.writerow(['run','family','time_Myr','population','plane','h50_kpc','sigma_normal_kpc_Myr','cadence_note'])
 for folder in ['runs','gpu','gpu-populations']:
  for file in sorted((BASE/folder).glob('*.json')):
   r=json.loads(file.read_text(encoding='utf8'))
   for s in r.get('samples',[]):
    for pop,d in [('global',s['disk']),*s.get('populations',{}).items()]:
     for plane in ['instant','fixed']:
      v=d.get(plane,{})
      if 'h50'in v:w.writerow([r['id'],r.get('family','see_run'),s['timeMyr'],pop,plane,v['h50'],v.get('sigmaNormal'), 'only saved endpoints'if folder=='gpu-populations'else '0.5 Myr'])
save('assessment.json',{'schema':'softened-stage1-assessment-102','generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'experimental-short-tests-completed','milestone':1,'durationMyr':20,'completedIntegrations':len(overview),'seeds':[2026,2027,2028],'gpuGrowthMeanPercent':growth,'gpuMeanHeightChangeKpc':absolute,'thinMeanHeightChangeKpc':thin,'relativeGrowthReductionPercent':100*(1-growth['corrected']/growth['baseline']),'publicConclusion':'Correção do campo implementada; redução preliminar do reajuste em 20 Myr. Estabilidade longa não validada.','pending':['B: halo fixo Plummer corrigido','D: halo refinado e sementes pareadas','refinamento bariônico','200 Myr e 1 Gyr','convergência estrutural N/epsilon/método','ajuste simultâneo observacional densidade/cinemática'],'figures':figs['figures'],'pendingRequestedFigures':figs['pendingRequestedFigures']})
doc('reports/v1.0.2/REPRODUCAO.md',r'''# Reprodução da etapa 1

O pacote `correcao-equilibrio-1.0.2.zip` complementa a árvore preservada; contém os dados e fontes necessários a esta etapa, incluindo as entradas AGAMA históricas usadas. Os antigos downloads completos continuam separados. Não extraia sobre seu histórico sem uma cópia, se quiser conservar a interface anterior; ela também está em preserved-v1.0.1.

Node >=20.11: `node scripts/test.mjs`, `node scripts/build.mjs`, `node scripts/serve.mjs`. Se npm estiver instalado, os atalhos equivalentes são `npm test`, `npm run build`, `npm run dev`. Nesta máquina npm não estava no PATH; o build foi executado pelo script Node real. O servidor local usa 4180 e não requer AGAMA para visualizar ou evoluir os snapshots. Abrir `/correcao102.html`; nova configuração é opt-in. Não há dependências Node externas nem mudança da gravitação.

Preparação offline: Python 3.12.14, AGAMA 1.0.161 (commit f302756b8af2b763db58e278e30478517dc8eea3), NumPy 2.5.4, SciPy 1.18.1, Matplotlib 3.11.2. O ambiente exato está nos metadados de preparação; caminhos locais dos módulos não são portáteis. Instale/compile as versões indicadas e configure PYTHONPATH quando necessário. Não se exige enviar dados a serviços externos.

Execute a partir da raiz, usando `python` desse ambiente. Os diretórios de produção já entregues não devem ser sobrescritos: faça uma cópia da árvore para reproduzir o caminho padrão, ou use --out onde a CLI oferece essa opção.

```powershell
python scripts/equilibrium-102/test_plummer_mean.py
python scripts/equilibrium-102/probe_field.py
python scripts/equilibrium-102/generate_softened.py --threads 4 --counts 150 450 400 --seeds 2026 2027 2028
python scripts/equilibrium-102/generate_softened.py --resume --sample-only --counts 1500 4500 4000 --seeds 2026 2027 2028
python scripts/equilibrium-102/prepare_baseline.py
node scripts/equilibrium-102/run_minimum.mjs --family=baseline
node scripts/equilibrium-102/run_minimum.mjs --family=corrected
python scripts/equilibrium-102/run_smooth.py
python scripts/equilibrium-102/validate_field.py
python scripts/equilibrium-102/validate_df.py
```

Os comandos acima usam os padrões registrados nas CLIs; confira `--help` nos scripts Python. O controle GPU exige WebGPU real: inicie `node scripts/equilibrium-102/collector.mjs` (coletor só em loopback 4184, aceita exclusivamente as seis IDs/duração esperadas), depois abra `/tests/browser-softened-minimum-102.html` e use seu botão de execução. Os dados brutos já presentes são retomados/recusados em vez de substituídos por resultados diferentes. Feche o coletor ao fim.

```powershell
node scripts/equilibrium-102/analyze_short.mjs
python scripts/equilibrium-102/plot.py
python scripts/equilibrium-102/report.py
node scripts/equilibrium-102/preserve.mjs --verify
```

Saídas: seis snapshots corrigidos e seis referências antigas; 21 integrações (A:9,C-CPU:6,C-GPU:6); séries temporais, estados 0/20 Myr, estatística de campo, densidades, momentos, frequências e gradientes; oito figuras com SVG/PNG/CSV. Não há novas integrações B/D/200/1.000 Myr. O hash científico das entradas e o código executado estão em cada protocolo. Reprodutibilidade amostral depende também da versão/compilação do AGAMA; GPU f32 pode variar entre dispositivos, portanto igualdade bit a bit de trajetórias não é prometida.
''')
print('Six reports, assessment, reproduction and derived CSVs written.')
