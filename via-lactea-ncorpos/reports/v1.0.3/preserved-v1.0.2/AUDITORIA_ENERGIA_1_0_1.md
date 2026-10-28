# Auditoria da energia e dos invariantes — versão 1.0.1

## Escopo e Hamiltonianas

O padrão de referência é a energia de pares Plummer em Float64, com cada par contado uma vez. "Direta" significa ausência de aproximação espacial da soma, não ausência de arredondamento. As unidades internas são kpc, Myr e \(10^{10}M_\odot\); a unidade de energia é \(10^{10}M_\odot\,\mathrm{kpc}^2\mathrm{Myr}^{-2}\). O fator de conversão de velocidade está em `src/physics/constants.js`.

| Sistema | Energia diagnosticada | Invariantes contínuos gerais |
|---|---|---|
| Todas as componentes móveis, isolado | \(K-G\sum_{i<j}m_im_j/\sqrt{r_{ij}^2+\epsilon^2}\) | \(E,\mathbf P,\mathbf L\), movimento retilíneo do CM |
| Bárions móveis, halo axisimétrico estacionário | \(K+U_{\rm bar,\epsilon}+\sum_i m_i\Phi_h\) | \(E,L_z\) dos corpos móveis; não \(\mathbf P\) ou \(\mathbf L\) inteiro em geral |
| Partículas de teste, campo total estacionário | \(\sum_i m_i(v_i^2/2+\Phi_{\rm total})\) | Energia orbital; \(L_z\) se axisimétrico |
| Campo externo esférico | Hamiltoniana externa apropriada | Todo \(\mathbf L\) sobre o centro externo, além de \(E\) |

Não há autointeração em \(U\), nem fator \(1/2\) no potencial externo. A energia de uma realização com halo dinâmico e a dos bárions em halo fixo são Hamiltonianas diferentes. Comparar seus \(E\) absolutos não mede erro de integração.

## Inspeção da implementação preservada

| Arquivo/função | Resultado da inspeção |
|---|---|
| `src/physics/forces.js:directAccelerations` | Percorre \(i<j\), aplica as duas acelerações com massas respectivas, denominador \((r^2+\epsilon^2)^{3/2}\); pares coincidentes exigem \(\epsilon>0\) |
| `directPotentialEnergy` | Mesmo \(G,\epsilon\), \(i<j\), denominador \(\sqrt{r^2+\epsilon^2}\); compatível com a força |
| `barnesHutAccelerations` | Octree monopolar, exclui nós contendo o alvo, folhas diretas; \(\theta=0\) abre os nós até a soma de partículas |
| `barnesHutPotentialEnergy` | \(\frac12\sum_i m_i\phi_i^{\rm BH}\); aproximação dirigida por alvo, sem garantia de Hamiltoniana global ou ação–reação exatas |
| `src/physics/integrator.js` | KDK com passo físico fixo e velocidades sincronizadas nas saídas inteiras |
| `src/compute/gpu.js` | Força direta e KDK WGSL Float32; não há Barnes–Hut GPU |
| `src/physics/external-grid.js` | Potencial escalar Hermite axisimétrico; força obtida por suas derivadas; energia externa contada uma vez |
| `src/physics/fixed-halo.js` | Controle esférico histórico; interpola tabelas de massa efetiva e potencial separadamente. Não presumir consistência diferencial exata; não confundir com a grade AGAMA |

O método de força da evolução e o método que mede energia são campos distintos. Uma execução de força GPU direta pode ter energia histórica calculada por BH; essa energia não se torna exata porque a força era direta.

`src/physics/diagnostics.js:conservationError` histórico retorna erro energético absoluto, normaliza momento linear por \(\sum m|v|\) e momento angular por \(\sum|m\mathbf r\times\mathbf v|\). A auditoria 1.0.1 deve preservar adicionalmente \(\delta E\) assinado e máximos ao longo das amostras. Um indicador final absoluto histórico não permite reconstruir a envoltória entre saídas.

## Protocolo de auditoria

Para cada série, registrar \(t,K,U_{\rm self},U_{\rm ext},E,\delta E\), identificador do estado inicial, parâmetros efetivos, backend, precisão e método energético. A energia da época zero deve vir do estado que o backend realmente integrou; o upload Float32 altera posições, velocidades e massas por arredondamento. Registrar também a diferença inicial CPU/GPU, sem atribuí-la a deriva temporal.

A série deve informar \(\max\delta E\), \(\min\delta E\), \(\max|\delta E|\), erro final, amostragem temporal e estado final real. O máximo amostrado não limita o erro entre medições. Para estimar deriva secular, comparar uma tendência ajustada com as oscilações e o intervalo observado; poucas saídas não justificam uma extrapolação em 1 Gyr.

Nos estados auditados, separar:

\[
\Delta U_{\rm BH}=U_{\rm BH}-U_{\rm direta},\qquad
\Delta E_{\rm integração}=E_{\rm direta}(t)-E_{\rm direta}(0).
\]

O primeiro erro é do estimador espacial no mesmo snapshot. O segundo usa a Hamiltoniana direta aplicada à trajetória efetivamente produzida. Uma trajetória BH pode ter pequeno erro de seu próprio estimador e erro diferente perante a Hamiltoniana de pares. A contribuição de \(\epsilon\) ao campo médio é outro teste.

Somas diretas em snapshots grandes custam \(O(N^2)\), mas podem ser realizadas em poucas épocas. Ausência de soma direta em todos os instantes deve ser explícita; uma calibração em um snapshot não prova que o viés BH permanece constante.

## Momento linear, angular e centro

Exportar \(L_x,L_y,L_z,|\mathbf L|\), \(P_x,P_y,P_z\), \(\mathbf R_{\rm CM}\) e as escalas de normalização. Para sistema isolado, comparar CM com \(\mathbf R_0+t\mathbf P_0/M\). Para campo externo axisimétrico, monitorar os componentes sem exigir invariantes ausentes. Trocas entre componentes podem ser físicas; a soma é o teste de conservação global.

A identidade matemática de forças centrais implica conservação de \(\mathbf P,\mathbf L\) por kicks diretos e drifts em aritmética ideal. Float64/Float32 e ordenação de somas introduzem resíduos. Barnes–Hut dirigido pode introduzir torque e força líquidos de aproximação; isso deve ser medido com \(\theta\), não atribuído automaticamente ao KDK.

## Resultados novos efetivamente calculados

`reports/v1.0.1/cpu-summary.json` registra **14 integrações CPU Float64 novas e concluídas**: três controles binários até 200 Myr e onze ensaios galácticos até 20 Myr. `runs/*.json` contém energia em todo passo inteiro; os ensaios galácticos têm estrutura a cada 0,5 Myr. A avaliação de energia é direta Float64 com soma compensada, inclusive quando a força da trajetória é BH. O código novo está em `src/physics/validation-101.js`; ele é aditivo e não substitui o KDK ou a força histórica.

| Execução | N | h [Myr] | Duração [Myr] | \(\delta E\) final | \(\max|\delta E|\), amostrado |
|---|---:|---:|---:|---:|---:|
| `binary-dt0.1` | 2 | 0,1 | 200 | +1,30832 × 10⁻⁴ | 5,93924 × 10⁻³ |
| `binary-dt0.05` | 2 | 0,05 | 200 | +3,28828 × 10⁻⁵ | 1,49647 × 10⁻³ |
| `binary-dt0.025` | 2 | 0,025 | 200 | +8,23134 × 10⁻⁶ | 3,74853 × 10⁻⁴ |
| `C-f64-dt0.1` | 1.000 | 0,1 | 20 | +4,36579 × 10⁻⁶ | 8,05447 × 10⁻⁶ |
| `C-f64-dt0.05` | 1.000 | 0,05 | 20 | +1,09505 × 10⁻⁶ | 2,00562 × 10⁻⁶ |
| `C-f64-dt0.025` | 1.000 | 0,025 | 20 | +2,73970 × 10⁻⁷ | 5,01773 × 10⁻⁷ |
| `C-original-f64` | 1.000 | 0,05 | 20 | −1,47252 × 10⁻⁷ | 8,22533 × 10⁻⁶ |
| `B-fixed-f64` | 600 | 0,05 | 20 | −4,80276 × 10⁻⁸ | 5,23849 × 10⁻⁷ |
| `C-bh-theta0.5` | 1.000 | 0,05 | 20 | +2,11197 × 10⁻⁴ | 2,12460 × 10⁻⁴ |
| `C-bh-theta0.25` | 1.000 | 0,05 | 20 | +1,41694 × 10⁻⁵ | 1,41694 × 10⁻⁵ |
| `C-epsilon0.05` | 1.000 | 0,05 | 20 | +7,78220 × 10⁻⁷ | 5,54818 × 10⁻⁶ |
| `C-epsilon0.2` | 1.000 | 0,05 | 20 | +9,20328 × 10⁻⁷ | 1,36636 × 10⁻⁶ |
| `D-halo-refined-f64` | 1.400 | 0,05 | 20 | +5,70301 × 10⁻⁷ | 3,43092 × 10⁻⁶ |
| `E-baryons-refined-f64` | 1.600 | 0,05 | 20 | +3,61361 × 10⁻⁷ | 4,21571 × 10⁻⁶ |

Os controles binários evidenciam por que o erro final é insuficiente: com h=0,1 Myr o máximo foi aproximadamente **45 vezes** o erro final. O KDK não foi modificado para obter a redução com o passo. Os estados de fase iniciais comuns estão preservados; `snapshots/*.json` contém estados iniciais/finais e `protocol-cpu.json` foi escrito antes da evolução.

Na realização galáctica calibrada direta com h=0,05 Myr, \(\delta E\) percorreu de −2,00562 × 10⁻⁶ a +1,20053 × 10⁻⁶; amplitude pico a pico 3,20615 × 10⁻⁶ e RMS em torno da média 5,34056 × 10⁻⁷. Não se declara energia exatamente constante: essas são oscilações medidas em um domínio de 20 Myr.

No mesmo caso isolado, o máximo de \(|\Delta\mathbf L|/\sum|\mathbf L_i(0)|\) foi 1,70879 × 10⁻¹⁶, o máximo de \(|\Delta L_z|/|L_z(0)|\) 1,03267 × 10⁻¹⁴ e o máximo do resíduo balístico do CM 3,62405 × 10⁻¹⁷ kpc. O quiet start antipodal restringe esses valores; eles não são um limite universal para configurações arbitrárias. O caso BH \(\theta=0,5\) chegou a 9,27083 × 10⁻⁶ na normalização vetorial e 2,97572 × 10⁻⁴ em \(L_z\) relativo. Com \(\theta=0,25\), foram 1,70284 × 10⁻⁶ e 1,85632 × 10⁻⁵. A melhora com abertura mais estrita foi medida, sem restabelecer conservação exata.

No controle B, o máximo relativo de \(L_z\) foi 2,95681 × 10⁻¹⁶, mas o vetor completo variou até 2,61714 × 10⁻⁴ na escala \(\sum|\mathbf L_i(0)|\). Esse contraste é compatível com a simetria axisimétrica externa: não deve ser interpretado como falha do integrador por não preservar os componentes que não são invariantes. Não houve extrapolação da grade externa nos instantes diagnosticados (`externalExtrapolatedMax=0`).

## Comparação nova CPU Float64 e GPU Float32

Três execuções GPU reais de 1.000 partículas, cada uma até 20 Myr, foram concluídas e gravadas em `gpu/GPU-1000-dt*.json`. O adaptador informou AMD/rdna-3, sem modelo comercial. A energia direta Float64 foi medida a cada passo a partir do estado lido da GPU; a referência inicial é o **upload Float32 real**, evitando interpretar seu arredondamento como deriva posterior.

| h nominal [Myr] | Máximo energético CPU f64 | Máximo energético GPU f32 | Máximo angular GPU \(|\Delta\mathbf L|/\sum|\mathbf L_i(0)|\) | Máximo GPU \(|\Delta L_z|/|L_z(0)|\) |
|---:|---:|---:|---:|---:|
| 0,1 | 8,05447 × 10⁻⁶ | 8,01290 × 10⁻⁶ | 2,10711 × 10⁻⁷ | 2,64770 × 10⁻⁶ |
| 0,05 | 2,00562 × 10⁻⁶ | 1,85001 × 10⁻⁶ | 7,23264 × 10⁻⁷ | 3,16319 × 10⁻⁵ |
| 0,025 | 5,01773 × 10⁻⁷ | 6,18903 × 10⁻⁷ | 1,22014 × 10⁻⁶ | 9,29104 × 10⁻⁵ |

A energia melhora com h nesse intervalo, mas a redução GPU não segue exatamente quatro e o resíduo angular cresce ao fazer mais operações com h menor. Não atribuir à GPU uma ordem energética nova com apenas três passos e uma semente; a mistura de truncamento, arredondamento e fases de oscilação já impede exigir razão exatamente quatro. Os resíduos Float64 do mesmo teste são muito menores para os momentos; energia bem conservada não garante todos os invariantes na mesma precisão.

No h=0,025 Myr, o erro final GPU foi −6,77858 × 10⁻⁹, mas o máximo amostrado foi 6,18903 × 10⁻⁷, aproximadamente 91 vezes maior. Outra vez, um número final isolado ocultaria a envoltória.

**Convenção de parâmetros GPU:** os diagnósticos acima usam G e \(\epsilon\) nominais Float64, aplicados aos estados GPU arredondados. O kernel usa \(G_{32}=0,04498502239584923\) contra \(G=0,04498502151469553\), diferença relativa +1,95877 × 10⁻⁸; usa \((\epsilon^2)_{32}=0,009999999776482582\,\mathrm{kpc}^2\), equivalente a \(\epsilon_{32}=0,0999999988824129\) kpc, em vez de 0,1 kpc. h=0,1/0,05/0,025 Myr também é arredondado em +1,49012 × 10⁻⁸ relativo no kernel. Há, portanto, uma pequena diferença documentada entre a Hamiltoniana nominal diagnosticada e os coeficientes representáveis da força; ela não é uma diferença de lei física escolhida e não justifica chamar a GPU de aritmética exata. Uma comparação na escala de 10⁻⁸ precisa considerar essa convenção, além do arredondamento das operações e das massas.

No halo fixo AGAMA histórico, a GPU também arredondou a grade Hermite, suas derivadas tabuladas e escalas para Float32; a auditoria externa aplica a tabela nominal Float64 ao estado lido. As duas implementações seguem derivadas de um potencial escalar da mesma forma funcional, mas os coeficientes representados diferem. A energia externa nominal é, portanto, uma referência documentada; uma alegação de Hamiltoniana com os coeficientes GPU exatos exigiria também avaliar a grade arredondada, além de tratar o arredondamento por operação. Isso não afeta o controle B CPU Float64 novo, que usa a mesma tabela Float64 na força e na energia.

Também foram concluídas duas **novas** integrações GPU grandes em `gpu/GPU-10000-200Myr.json` e `gpu/GPU-50000-200Myr.json`: h=0,1 Myr, \(\epsilon=0,1\) kpc, semente 2026, 200 Myr reais. As séries energéticas densas são BH aproximadas: cadência de 1 Myr em 10k e 2 Myr em 50k. Seus máximos \(|\delta E_{\rm BH}|\) foram 5,73792 × 10⁻⁴ e 1,94973 × 10⁻⁴. Esses valores não são energia direta. Os estados completos de 0/20/200 Myr foram salvos para auditoria direta independente e a conclusão de conservação deve distinguir essas amostras esparsas das curvas BH.

## Viés BH no mesmo snapshot

### Auditoria concluída das duas novas trajetórias GPU grandes

`reports/v1.0.1/gpu-analysis-summary.json` e os cinco arquivos `gpu-analysis-GPU-*.json` registram a auditoria concluída de **12 estados completos de cinco novas execuções**. As posições, velocidades, massas e ordem iniciais foram verificadas contra a conversão Float32 do snapshot identificado por SHA-256. A tabela abaixo usa somente 0, 20 e 200 Myr:

| Nova trajetória | Máximo direto com parâmetros nominais | Máximo direto com G e ε² representáveis em Float32 | Máximo da série densa BH aproximada |
|---|---:|---:|---:|
| GPU 10.000, 200 Myr | 1,90776493 × 10⁻⁷ | 1,90961637 × 10⁻⁷ | 5,73792376 × 10⁻⁴, cadência 1 Myr |
| GPU 50.000, 200 Myr | 2,26070382 × 10⁻⁷ | 2,26131065 × 10⁻⁷ | 1,94973024 × 10⁻⁴, cadência 2 Myr |

As duas primeiras colunas são **máximos esparsos dos três estados**, e não envoltórias de toda a evolução. As diferenças entre as duas Hamiltonianas de referência foram medidas nos mesmos estados; arredondamentos por operação e por massa continuam presentes na trajetória. Não existe aqui uma afirmação de que as operações Float32 conservem exatamente qualquer uma dessas Hamiltonianas.

Os novos ensaios repetem realizações históricas preservadas, sem acrescentar sementes estatísticas independentes. A semelhança dos resultados é uma verificação de reprodução, não um aumento artificial do tamanho do ensemble. Os JSON da auditoria também separam o arredondamento inicial do upload da diferença final CPU–GPU, que combina esse arredondamento inicial com os erros de evolução.

`force-energy-audit.json` mede todas as 1.000 partículas dos estados iniciais original e calibrado. Para o calibrado, \(\epsilon=0,1\) kpc:

| \(\theta\) | \((U_{\rm BH}-U_{\rm direta})/|U_{\rm direta}|\) | RMS relativo de força, sem pesos | RMS relativo ponderado por massa |
|---:|---:|---:|---:|
| 0,5 | +2,85673 × 10⁻⁴ | 3,49962 × 10⁻³ | 3,60894 × 10⁻³ |
| 0,25 | +1,91289 × 10⁻⁸ | 2,25938 × 10⁻⁴ | 2,74672 × 10⁻⁴ |

Um viés energético particularmente pequeno em \(\theta=0,25\) pode conter cancelamento e não implica erro de força igualmente pequeno. Os ensaios BH da tabela anterior medem a Hamiltoniana **direta** em todas as épocas; por isso seu erro temporal não é mascarado por usar o estimador BH. A auditoria também contém \(\epsilon=0,05/0,2\) e o candidato original. São comparações no estado inicial, sem promessa de limites em todos os estados futuros.

## Status das evidências históricas e limites

Foi concluída uma **reanálise nova de 33 estados históricos, de 10 ensaios calibrados**, sem reexecutar ou modificar essas trajetórias. `historical-reanalysis-summary.json` e `historical-reanalysis-*.json` registram hashes de origem, energia direta Float64 dos estados GPU Float32 e diagnósticos por população. Converter o estado para leitura Float64 não recupera os dígitos perdidos na trajetória Float32.

| Trajetória histórica | Épocas diretas [Myr] | Máximo direto \(|\delta E|\), apenas nessas épocas | Máximo BH histórico, série de 5 Myr |
|---|---|---:|---:|
| Calibrado A 10k | 0, 20, 200, 1.000 | 1,91368 × 10⁻⁷ | 5,03867 × 10⁻⁴ |
| Calibrado A 50k | 0, 20, 200 | 2,26070 × 10⁻⁷ | 1,90515 × 10⁻⁴ |
| Calibrado A semente 2027 | 0, 20, 200 | 4,36674 × 10⁻⁷ | 6,00955 × 10⁻⁴ |
| Calibrado B 14k, halo dinâmico refinado | 0, 20, 200, 1.000 | 3,96793 × 10⁻⁷ | 7,10067 × 10⁻⁴ |
| Calibrado B 26k, halo dinâmico refinado | 0, 20, 200 | 2,36453 × 10⁻⁷ | 1,89581 × 10⁻⁴ |
| Calibrado h/2 | 0, 20, 200 | 3,68848 × 10⁻⁷ | 4,68777 × 10⁻⁴ |
| Calibrado \(\epsilon=0,2\) kpc | 0, 20, 200 | 5,31741 × 10⁻⁷ | 5,41637 × 10⁻⁴ |
| Calibrado \(\epsilon=0,05\) kpc | 0, 20, 200 | 1,37435 × 10⁻⁴ | 3,84046 × 10⁻⁴ |
| Calibrado halo fixo | 0, 20, 200, 1.000 | 2,15882 × 10⁻⁷ | 1,30258 × 10⁻⁴ |
| Calibrado velocidades Gaussianas | 0, 20, 200 | 5,63586 × 10⁻⁶ | 4,29361 × 10⁻⁴ |

**As duas colunas têm cadências diferentes.** O máximo direto de quatro ou três snapshots não é a envoltória de toda a evolução; nos casos de 1 Gyr há uma lacuna direta de 800 Myr. Não se subtrai ou divide esses máximos para inferir exatamente a melhora da integração. O desvio BH é medido também no **mesmo estado**: o máximo de \(|U_{\rm BH}-U_{\rm direta}|/|U_{\rm direta}|\) foi 4,25147 × 10⁻⁴ no A10k, 2,50155 × 10⁻⁴ no A50k e 2,01843 × 10⁻³ para a parte autogravitante do halo fixo. Sua dependência temporal pode dominar a variação do estimador BH.

A energia direta pequena nos snapshots A10k é compatível com o espessamento histórico +415,41% em 1 Gyr. Essa combinação reforça que redistribuição estrutural não exige grande criação de energia total. Por outro lado, o ensaio histórico \(\epsilon/2\) teve erro direto muito maior que os de \(\epsilon=0,1/0,2\) kpc nas épocas medidas; o passo h=0,1 Myr, encontros próximos e Float32 precisam de controles adicionais antes de aceitar sua evolução como igualmente precisa. Não se generaliza a boa conservação de um caso para todos os \(\epsilon\).

Os identificadores históricos `calibrated-B-14k` e `calibrated-B-26k` significam refinamento de halo **dinâmico** no protocolo 1.0. A letra B desse identificador antigo não corresponde ao experimento B de **halo fixo** da taxonomia 1.0.1; o halo fixo histórico tem ID `calibrated-fixed`.

A campanha histórica 1.0 foi concluída com 22 ensaios, mas a energia dos ensaios longos era BH \(\theta=0,5\), aproximadamente calculada. Seus resultados permanecem em `reports/v1.0.0/`; não são certificados retrospectivamente como soma direta em todas as épocas. Uma reanálise direta dos snapshots preservados deve indicar suas épocas esparsas e a origem histórica da trajetória.

**Classificação:** integração direta Float64 e ordem temporal **VALIDADAS NUMERICAMENTE no domínio de referência ensaiado**, com os erros acima. A conservação direta e a equivalência de precisão da galáxia grande em vários períodos orbitais continuam limitadas à cobertura real dos snapshots e séries. A estabilidade estrutural não foi validada: o mesmo calibrado 1.000/20 Myr com máximo energético 2,00562 × 10⁻⁶ aumentou sua espessura global de 0,210205 para 0,391310 kpc. Os dois resultados podem coexistir sem contradição.

## Reprodução e identidade

Os dois novos controles suaves A completaram 1 Gyr com 501 saídas cada: máximo energético orbital amostrado 2,48944 × 10⁻⁹ no original e 4,58950 × 10⁻⁹ no calibrado. A energia usada é a soma orbital no potencial total externo AGAMA real, sem soma de pares. São testes DOP853 adaptativos, não uma extensão da validação KDK de 20 Myr. O vetor angular pode mudar nesse potencial axisimétrico; seus máximos relativos de \(L_z\) foram 9,35448 × 10⁻¹⁰ e 1,50309 × 10⁻⁹. Séries e parâmetros estão em `runs/A-continuum-*.json` e `continuum/*-protocol.json`.

```text
node scripts/validation-101/run-cpu.mjs
```

O comando consome os snapshots 1.0 como entradas somente de leitura e grava os resultados novos em `reports/v1.0.1/`. O ambiente desta campanha usou Node v24.19.0, Windows. Os hashes de conteúdo das fontes estão em `code-identity.json`; cada execução registra `codeSHA256` e a origem do snapshot. As configurações do protocolo retêm status `planned` como intenção anterior à execução; o status real `completed` encontra-se nos arquivos de execução. Não confundir o protocolo prévio com o estado final da campanha.

## Relação com a ordem do integrador

Para uma força derivada de potencial consistente, fixa no tempo e resolvida pelo passo, o KDK é de segunda ordem e simplético em aritmética ideal. Não é um método de conservação energética exata. Oscilações limitadas e redução sistemática com \(dt\) apoiam a análise; um único erro final pequeno não demonstra esse comportamento. [Hairer, Lubich e Wanner](https://www.unige.ch/~hairer/preprints/gniverlet.html).

Diminuir \(dt\) não remove aproximação BH, erros de precisão, granularidade ou desequilíbrio da DF. Alterar a distribuição inicial tampouco melhora a ordem do integrador. A classificação final de conservação deve declarar o domínio ensaiado e permanecer separada da classificação estrutural.
