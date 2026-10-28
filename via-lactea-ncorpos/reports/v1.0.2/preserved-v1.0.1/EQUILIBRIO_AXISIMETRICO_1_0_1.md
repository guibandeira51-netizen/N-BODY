# Equilíbrio aproximadamente axisimétrico — versão 1.0.1

## Critério físico

Equilíbrio não colisional estacionário exige \(\partial_t f=0\) na equação de Boltzmann e autoconsistência de Poisson no mesmo campo. Uma DF de ações aproximadas e uma iteração AGAMA convergida são uma preparação candidata. A transformação desse candidato em partículas de Plummer muda o campo, acrescenta flutuações e pode revelar instabilidades. A classificação aqui é estrutural e não decorre da energia sozinha. [Vasiliev, 2019](https://arxiv.org/abs/1802.08239).

Nenhuma população é artificialmente mantida fina. Não se corrige velocidade ou posição durante a evolução. Plano ajustado, centro instantâneo e anéis são operações diagnósticas que não exercem forças.

## Componentes e definições de medida

O modelo AGAMA preservado distingue bojo, disco fino, disco espesso e halo; as duas populações estelares têm etiqueta de componente 1 e rótulos de subpopulação próprios. Deve-se preservar esses rótulos nas séries 1.0.1. Massas e perfis continuam em `MASSAS_VIA_LACTEA_1_0.md` e nos snapshots; a alocação de N não é a fração de massa.

| Grandeza | Definição e interpretação |
|---|---|
| Densidade radial do disco | \(\Sigma(R)=\Delta M/[\pi(R_+^2-R_-^2)]\), bordas e massas explícitas |
| Densidade radial esférica | \(\rho(r)=\Delta M/[4\pi(r_+^3-r_-^3)/3]\), adequada a bojo/halo sem supor esfericidade perfeita |
| Densidade vertical | Massa por volume/intervalo em z ou altura normal, com abertura radial e normalização declaradas |
| Raio de meia massa | Quantil de massa, distinguindo raio esférico e cilíndrico |
| Espessura \(h_{50}\) | Mediana ponderada da distância absoluta ao plano especificado |
| \(\sigma_R,\sigma_\phi,\sigma_n\) | Desvio quadrático de cada velocidade em relação à média do grupo, não em relação a zero |
| Rotação média | \(\bar v_\phi\), distinta de \(v_c\) e \(\sqrt{\langle v^2\rangle}\) |
| Inclinação/warp | Normal global, normal por anel e posição média/mediana local |
| Centro/CM | Centro usado no ajuste e centro de massa físico, registrados separadamente |

Usar pesos de massa é essencial: partículas de disco e halo têm massas diferentes, e mesmo fino/espesso podem ter pesos levemente diferentes. Uma mediana não ponderada responde à alocação amostral.

## Inclinação, warp, migração e aquecimento

Quatro efeitos podem produzir uma espessura global maior:

1. Inclinação rígida em relação ao plano original, sem crescimento da espessura no plano próprio.
2. Warp ou flexão: planos locais diferem e aumentam a dispersão em torno de um único plano global.
3. Redistribuição radial: as estrelas amostradas em um anel mudam, alterando seus momentos.
4. Mudança real da distribuição vertical, acompanhada de dispersões e perfis compatíveis.

Comparar \(h_{50}\) no plano inicial, global instantâneo e local por anel; acompanhar dispersão normal e perfis; usar também coortes de estrelas definidas no início. Crescimento de \(\sigma_n\) favorece interpretação de aquecimento, mas correntes coerentes, precessão e covariâncias também precisam ser examinadas. Ajustar um plano não equivale a provar que todo o movimento coerente foi removido.

A análise histórica usa ajuste robusto de plano por PCA iterativa, mediana geométrica e abertura de 20 kpc, descritos no objeto `plane.method`. Anéis instantâneos não são coortes fixas. A campanha nova deve manter a convenção explicitamente no arquivo, para que diferenças de estimador não sejam confundidas com física.

## Modos azimutais e ruído

Para cada anel, registrar

\[
C_m=\frac{\sum_i m_ie^{im\phi_i}}{M_R},\quad A_m=|C_m|,
\quad\varphi_m=\arg(C_m),\qquad m=1,2,3,4.
\]

A amplitude está entre zero e um. Uma população axisimétrica amostrada com N finito não tem amplitude exatamente zero. Para azimutes independentes, \(A_{m,\rm rms}=\sqrt{\sum_i m_i^2}/\sum_i m_i\). O quiet start usa pares antipodais \((\mathbf x,\mathbf v),(-\mathbf x,-\mathbf v)\): há apenas N/2 sorteios independentes e modos ímpares se cancelam inicialmente em aritmética ideal. Modos pares têm correlações diferentes. A comparação de ruído deve reconhecer os grupos de pares e a seleção dos anéis.

Nem \(A_2>0\), nem uma fase em uma época prova barra/espiral. Persistência, coerência radial e temporal, comparação com sementes e convergência são necessárias para essa interpretação. A fase é definida módulo \(2\pi\); velocidades de padrão exigem cadência suficiente para excluir aliasing e identificação do mesmo padrão. Se a não axisimetria crescer fisicamente, declarar a saída do regime aproximadamente axisimétrico naquele intervalo, sem remover a estrutura.

## Toomre Q como diagnóstico condicional

O proxy local estelar é \(Q=\sigma_R\kappa/(3,36G\Sigma)\). A derivação original trata perturbações locais axisimétricas de um disco estelar fino em rotação. Usar \(Q\) calculado da mistura fino/espesso e frequências do potencial inicial congelado exige declarar essas aproximações. Não é teste global de barra, warp ou estabilidade de halo e bojo. Valores ausentes por baixa ocupação, \(\kappa^2\le0\) ou falta de campo consistente devem permanecer ausentes. [Toomre, 1964](https://adsabs.harvard.edu/pdf/1964ApJ...139.1217T).

## Evidência histórica preservada

Os 22 ensaios de `reports/v1.0.0/assessment.json` já concluídos não validaram o equilíbrio N-corpos de longa duração. Em 200 Myr:

| Modelo | N | \(\Delta h_{50}\) global |
|---|---:|---:|
| Legado | 10.000 | +162,96% |
| AGAMA original | 10.000 | +41,80% |
| AGAMA original | 50.000 | +12,56% |
| AGAMA calibrado | 10.000 | +91,95% |
| AGAMA calibrado | 50.000 | +32,39% |

Os percentuais são históricos, da mistura dos discos, e não substituem a análise fino/espesso por anel. O calibrado 10k/semente 2026 chegou a +415,41% em 1 Gyr; no campo total suave congelado, a mesma família variou −1,188% em 1 Gyr. Isso localiza uma diferença relevante entre protocolos, sem demonstrar que toda ela decorre de granularidade do halo.

O original tem maior espessura inicial. Comparar crescimento relativo deve ser acompanhado de alturas absolutas e dispersões. A calibração vertical ajustou uma propriedade espacial inicial; não foi um aprimoramento do integrador ou uma certificação de estabilidade.

## Novas medidas estruturais CPU Float64

Foram concluídas onze integrações galácticas novas de 20 Myr, além dos três controles binários. `runs/*.json` preserva estrutura a cada 0,5 Myr, perfis de cada componente, populações fino/espesso com planos e anéis próprios, centros, momentos e modos m=1–4. A realização base tem 150 partículas de bojo, 354 fino, 96 espesso e 400 de halo; é uma referência pequena para integração, muito granular para certificar a galáxia collisionless.

No caso C calibrado com h=0,05 Myr e \(\epsilon=0,1\) kpc:

| População, plano próprio instantâneo | N | \(h_{50}(0)\) [kpc] | \(h_{50}(20)\) [kpc] | \(\sigma_n(0)\) [km/s] | \(\sigma_n(20)\) [km/s] |
|---|---:|---:|---:|---:|---:|
| Fino | 354 | 0,176082 | 0,349513 | 33,201 | 44,687 |
| Espesso | 96 | 0,537284 | 0,726548 | 48,593 | 50,201 |
| Mistura, plano global | 450 | 0,210205 | 0,391310 | 36,950 | 46,004 |

O aumento de altura não desaparece ao ajustar o plano próprio e acompanha aumento da dispersão normal, especialmente no fino. A inclinação global mudou de 0,137° para 2,371°; o uso de altura em z fixo sozinho misturaria os efeitos. Ainda assim, essa medida não separa aquecimento aleatório de todas as formas de movimento coerente. As séries por anel e perfis são a evidência complementar.

Os raios esféricos de meia massa mudaram de 1,55545 para 2,10847 kpc no bojo, 4,78320 para 5,55248 kpc no disco e 87,2679 para 85,7815 kpc no halo. A energia direta teve máximo relativo 2,00562 × 10⁻⁶ nesse mesmo ensaio. O sistema conserva bem a Hamiltoniana do problema discreto no intervalo, enquanto se reorganiza estruturalmente.

O halo fixo B, com os mesmos bárions, produziu \(h_{50}=0,296300\) kpc na mistura ao final: fino 0,269339 kpc e espesso 0,537689 kpc, com dispersões normais 34,932 e 54,360 km/s. A altura do espesso quase constante não significa cinemática estacionária; a dispersão mudou. Também nesse controle os bárions se reajustam, logo retirar macro partículas do halo não resolve automaticamente todos os efeitos.

O refinamento D chegou a 0,350727 kpc e E a 0,362022 kpc na mistura, com estados iniciais e amostragem explicitados em `CONVERGENCIA_NUMERICA_1_0_1.md`. Não se usa essa comparação de uma semente e 20 Myr para anunciar convergência com N.

No anel de raio central 7 kpc do caso C, \(A_2(20)=0,15970\) e a escala condicional de ruído é 0,16667. Em 9 kpc, \(A_2=0,28918\) e escala 0,17678; amplitudes e ruído isolados não certificam padrão persistente. Os modos ímpares ficaram muito pequenos por simetria antipodal, não por uma demonstração geral de estabilidade a perturbações ímpares. Os proxies Q iniciais nesses anéis foram 1,485 e 2,089, respectivamente; a evolução estrutural observada confirma que esses números não são um certificado global.

As velocidades circulares contínuas de referência foram 0,236917 e 0,237526 kpc/Myr em 7 e 9 kpc, com períodos de aproximadamente 185,64 e 238,07 Myr. Assim, 20 Myr cobre somente 0,108 e 0,084 períodos nessas regiões. O ensaio curto não demonstra estabilidade por vários períodos, mesmo que muitas órbitas centrais sejam mais curtas.

## Controle suave novo: a mediana global não basta

A reanálise estrutural de estados históricos também separou os discos sem alterar a trajetória: no calibrado A10k, o fino mudou de 0,194009 a 1,152008 kpc e o espesso de 0,609321 a 1,384006 kpc em 1 Gyr. No calibrado A50k em 200 Myr, foram 0,202629→0,270670 kpc e 0,577386→0,665478 kpc. Essas alturas são de planos próprios por população, distintas da medida global histórica. Os dados e rótulos conferidos contra snapshots estão em `historical-reanalysis-calibrated-A-10k.json` e `historical-reanalysis-calibrated-A-50k.json`. O aumento da população fina persiste na medida que remove sua inclinação global; isso não é uma explicação causal única, mas evita confundir toda a mudança com inclinação rígida.

Os novos controles A têm 1.000 partículas de teste em seus próprios campos AGAMA totais, com DOP853 Float64 até 1 Gyr e cadência de 2 Myr. O original variou de 0,475213 para 0,438925 kpc (−7,635%) e o calibrado de 0,210205 para 0,217880 kpc (+3,651%) na mistura. Esses valores são distintos dos controles suaves históricos 10k.

No novo calibrado, o fino mudou de 0,176082 para 0,180323 kpc e o espesso de 0,537284 para 0,472124 kpc; suas dispersões normais passaram de 33,201 a 36,056 e de 48,593 a 56,680 km/s. No original, o espesso mudou de 1,523179 a 0,905529 kpc e de 72,562 a 98,543 km/s. A pequena amostra do espesso, as oscilações de fase e as limitações das ações aproximadas exigem ensemble e análise temporal antes de atribuir uma causa. Esses controles não recebem certificação global de equilíbrio apenas porque a mediana da mistura variou pouco. Dados completos: `runs/A-continuum-agama*.json`.

## Status científico e cobertura

As novas integrações GPU grandes de 200 Myr estão concluídas, independentemente da reanálise histórica:

| Nova execução, calibrado/semente 2026 | \(h_{50}(0)\) global [kpc] | \(h_{50}(200)\) global [kpc] | Variação |
|---|---:|---:|---:|
| `GPU-10000-200Myr` | 0,234839 | 0,450779 | +91,95% |
| `GPU-50000-200Myr` | 0,237865 | 0,314916 | +32,39% |

As duas usam força direta Float32, KDK, h=0,1 Myr e \(\epsilon=0,1\) kpc. A proximidade com os resultados históricos decorre de repetir o mesmo modelo/semente; os registros novos têm proveniência e estados próprios. A comparação mostra sensibilidade à resolução total e reproduz a evolução estrutural desfavorável. Não é um ensemble de novas sementes nem prova de um limite em N. As épocas 0/20/200 Myr são estados completos; as séries estruturais estão disponíveis a cada 1/2 Myr, respectivamente.

As medições novas pertencem a `reports/v1.0.1/`, identificadas por snapshot, semente, backend, Hamiltoniana e duração realmente concluída. A cobertura de 20, 200 e 1.000 Myr deve ser informada por execução, sem extrapolar ensaios curtos. Comparar também períodos orbitais da região: um único tempo global não representa o mesmo número de órbitas em todos os anéis.

Uma classificação **PRÓXIMO DO EQUILÍBRIO** precisa de perfis e momentos aproximadamente estacionários no intervalo testado, robustez estatística e controles numéricos. O modelo completo permanece **NÃO VALIDADO** enquanto houver aquecimento/reestruturação relevante, dependência não convergida ou cobertura insuficiente. Não se usa uma porcentagem universal de expansão como aprovação. A conservação e a convergência recebem classificações próprias nos relatórios correspondentes.
