# Comparação AGAMA contínuo, halo fixo e halo dinâmico — versão 1.0.1

## Famílias preservadas

As realizações `agama` e `agama-calibrated`, snapshots, configurações e resultados 1.0 não foram substituídos. O candidato original usa parâmetros verticais da DF \(H_{\rm disk}=0,3/0,9\) kpc; o calibrado usa \(0,186457867/0,498329086\) kpc para fino/espesso. Esses parâmetros não são alturas exponenciais impostas. A calibração resolveu a mediana vertical inicial no potencial de referência, sem usar o espessamento evoluído como objetivo. Os modelos possuem massas e perfis diferentes do inicializador histórico, logo a comparação legado–AGAMA não isola apenas a distribuição de velocidades.

AGAMA calcula DFs em ações, seus momentos e modelos multicomponentes autoconsistentes; o motor N-corpos local continua com gravidade Plummer e Leapfrog KDK. Uma mudança na DF inicial não é melhoria da ordem temporal do integrador. [Vasiliev, 2019](https://arxiv.org/abs/1802.08239), [documentação do AGAMA](https://arxiv.org/abs/1802.08255).

## O que os três campos testam

| Protocolo | Fontes de força | Energia | Limite da inferência |
|---|---|---|---|
| A: AGAMA total congelado | Potencial contínuo final, sem retroação | \(\sum m(v^2/2+\Phi_{\rm total})\) | Estacionariedade no campo de preparação; não é sistema N-corpos autogravitante |
| B: halo AGAMA fixo | Bojo/discos de partículas + potencial do halo final | \(K+U_{\rm bar,\epsilon}+\sum m\Phi_h\) | Remove ruído e resposta do halo; campo externo não suavizado difere do halo de partículas |
| C: halo dinâmico | Todas as macro partículas de bojo/discos/halo | \(K+U_{\rm total,\epsilon}\) | Evolução completa no Hamiltoniano discreto escolhido |

O halo fixo AGAMA vem do halo final convergido, que pode estar achatado. O controle esférico histórico NFW da 0.9 é outro experimento. Somente \(L_z\) é invariante angular geral no campo fixo axisimétrico; em campo esférico há simetria adicional. Em todos os casos a contribuição externa é contada uma vez, sem \(1/2\), e o halo externo não pode coexistir com sua duplicação em partículas massivas.

## Auditoria histórica do contínuo

Os seguintes valores foram efetivamente calculados na versão 1.0 e continuam em `reports/v1.0.0/assessment.json`:

| Medida | AGAMA original | Calibração vertical |
|---|---:|---:|
| Maior variação final de força SCM | 0,04979% | 0,05458% |
| Mediana solar \(|z|\), fino [kpc] | 0,366169 | 0,197089 |
| Mediana solar \(|z|\), espesso [kpc] | 1,245467 | 0,593090 |
| Resíduo de Poisson, mediana | 0,0640% | 0,1867% |
| Resíduo de Poisson, p90 | 0,6515% | 1,2447% |
| Resíduo de Poisson, máximo sondado | 4,3606% | 1,8647% |

Os alvos exponenciais solares são 0,207944 e 0,623832 kpc, diferentes da mediana global da mistura de discos. O resíduo de Poisson foi sondado em 32 pontos meridionais independentes; os máximos não são limites em todo o espaço. As variações de \(f(\mathbf J)\) ao longo de órbitas também têm caudas não desprezíveis, documentadas por população e semente em `VALIDACAO_EQUILIBRIO_1_0.md`. Convergir a iteração em uma malha não elimina erros da DF, ações e representação do potencial.

## Comparações históricas em épocas iguais

Espessura abaixo é a mediana ponderada da distância ao plano instantâneo da mistura de discos; a análise fina/espessa permanece necessária.

| Família/controle | N móvel | Época [Myr] | Variação \(h_{50}\) |
|---|---:|---:|---:|
| Legado, halo dinâmico | 10.000 | 200 | +162,96% |
| AGAMA original, halo dinâmico | 10.000 | 200 | +41,80% |
| AGAMA original, halo dinâmico | 50.000 | 200 | +12,56% |
| Calibrado, halo dinâmico | 10.000 | 200 | +91,95% |
| Calibrado, halo dinâmico | 50.000 | 200 | +32,39% |

| Família/semente 2026 | Campo | Época [Myr] | \(h_{50}(0)\) [kpc] | \(h_{50}(t)\) [kpc] | Variação |
|---|---|---:|---:|---:|---:|
| AGAMA original | Total suave congelado | 1.000 | aproximadamente 0,4510 | 0,4363 | −3,273% |
| AGAMA original | Halo fixo, bárions móveis | 1.000 | 0,4510 | 0,5228 | +15,90% |
| AGAMA original | Todas as componentes móveis, 10k | 1.000 | 0,4510 | 1,4859 | +229,43% |
| Calibrado | Total suave congelado | 1.000 | aproximadamente 0,2348 | 0,2320 | −1,188% |
| Calibrado | Halo fixo, bárions móveis | 1.000 | 0,2348 | 0,3593 | +53,00% |
| Calibrado | Todas as componentes móveis, 10k | 1.000 | 0,2348 | 1,2104 | +415,41% |

Os valores arredondados iniciais não devem ser usados para recalcular mais casas decimais dos percentuais. O controle congelado foi integrado com DOP853 Float64 do AGAMA, enquanto os ensaios livres longos usaram GPU direta Float32, Plummer e energia BH aproximada. A comparação mistura propósito físico e backend; por isso ela não isola, sozinha, apenas o halo granular. Os snapshots e tabelas históricas são a fonte de precisão integral.

Em semente 2027, o controle suave variou +3,129% no original e +1,018% no calibrado em 1 Gyr. São duas realizações correlacionadas por quiet start, insuficientes para um intervalo universal de estabilidade. Os controles suaves apoiam estacionariedade aproximada de certas propriedades no potencial de construção, sem certificar todas as órbitas ou o sistema discreto.

## Hipóteses investigáveis

O contraste contínuo/discreto é compatível com uma combinação de viés da suavização, flutuação do halo, granulação dos bárions, resposta coletiva e resíduos do equilíbrio inicial. O halo 10k tem macro partículas muito mais massivas que as estrelas; refinar apenas o halo com a mesma realização bariônica testa parte da hipótese. Refinar os bárions com halo controlado investiga a parte complementar.

O original começa mais espesso e apresenta menor crescimento relativo; o calibrado começa mais próximo das medianas verticais pretendidas e aquece mais em alguns ensaios. Não há critério que permita declarar um deles estável apenas com esses percentuais. A escolha para estudos posteriores deve usar alturas absolutas, perfis por população, dispersões, erros numéricos, sementes e escalas orbitais.

## Novas integrações suaves 1.0.1

Foram executados novamente os dois campos totais contínuos com **AGAMA real, DOP853 adaptativo Float64, accuracy=10⁻¹⁰**, até 1.000 Myr e saídas a cada 2 Myr. Cada caso usa o snapshot preservado de **1.000 partículas, semente 2026**, como partículas de teste independentes: não é o controle congelado histórico de 10k da tabela anterior. Os protocolos, hashes dos potenciais, versões Python/NumPy/AGAMA e estados estão em `continuum/*-protocol.json` e `continuum/*.jsonl`; a análise está em `runs/A-continuum-*.json`.

| Novo controle A, N=1.000 | \(h_{50}(0)\) [kpc] | \(h_{50}(1\,\mathrm{Gyr})\) [kpc] | Variação global | Máximo \(|\delta E_{\rm orbital}|\) amostrado |
|---|---:|---:|---:|---:|
| AGAMA original | 0,475213 | 0,438925 | −7,635% | 2,48944 × 10⁻⁹ |
| AGAMA calibrado | 0,210205 | 0,217880 | +3,651% | 4,58950 × 10⁻⁹ |

O baixo erro orbital confirma integração precisa nesse campo fixo, não a estacionariedade de toda a DF. As populações mostram mudanças que a mediana global esconde:

| Novo controle A, população | \(h_{50}(0)\) [kpc] | \(h_{50}(1\,\mathrm{Gyr})\) [kpc] | \(\sigma_n(0)\) [km/s] | \(\sigma_n(1\,\mathrm{Gyr})\) [km/s] |
|---|---:|---:|---:|---:|
| Original, fino | 0,388954 | 0,356405 | 45,850 | 46,283 |
| Original, espesso | 1,523179 | 0,905529 | 72,562 | 98,543 |
| Calibrado, fino | 0,176082 | 0,180323 | 33,201 | 36,056 |
| Calibrado, espesso | 0,537284 | 0,472124 | 48,593 | 56,680 |

Há somente 96 partículas do espesso (48 pares independentes). Oscilações e variabilidade dessa amostra precisam de sementes e perfis/coortes; não se atribui toda mudança de quantil a um erro da DF, mas também não se declara equilíbrio de todas as populações a partir de +3,651% global. O controle novo constitui evidência adicional com suas próprias limitações.

## Compatibilidade real do campo contínuo e discreto

`continuum-discrete-field-mismatch.json` compara, **nas mesmas posições iniciais**, a força AGAMA total não suavizada com a força direta Plummer das partículas. Para N=1.000 e \(\epsilon=0,1\) kpc:

| Família/população | RMS da diferença vetorial / RMS da força contínua | RMS da diferença vertical / RMS da força vertical contínua |
|---|---:|---:|
| Original, bojo | 0,80470 | 0,66970 |
| Original, fino | 0,57538 | 0,59026 |
| Original, espesso | 0,59303 | 0,33818 |
| Original, halo | 0,24337 | 0,15435 |
| Calibrado, bojo | 0,48331 | 0,40090 |
| Calibrado, fino | 1,43760 | 2,03209 |
| Calibrado, espesso | 2,93373 | 0,71252 |
| Calibrado, halo | 0,52518 | 0,57661 |

Esses valores medem **suavização + discreção de todas as componentes + particular realização**, não erro Barnes–Hut, pois a referência discreta é direta. Tampouco medem erro temporal, pois não houve integração nessa comparação. Uma diferença relativa maior que um é possível quando a diferença RMS supera a força RMS de referência. O arquivo inclui \(\epsilon=0,05/0,2\) kpc; não decompõe o viés de suavização puro do ruído sem ensemble ou quadratura contínua suavizada.

As diferenças grandes no teste reduzido explicam por que a verificação no campo AGAMA não certifica o estado inicial no campo que será realmente integrado. Elas não fornecem automaticamente o valor do erro em N=10k ou 50k e não justificam uma taxa universal de aquecimento.

## Comparação nova em 20 Myr e classificação

Com os mesmos bárions calibrados do N=1.000, o controle B fixo terminou em \(h_{50}=0,296300\) kpc, o C dinâmico direto Float64 em 0,391310 kpc e o D halo refinado em 0,350727 kpc, a partir de 0,210205 kpc. São novas integrações curtas, cujos detalhes estão em `runs/B-fixed-f64.json`, `runs/C-f64-dt0.05.json` e `runs/D-halo-refined-f64.json`. O controle A tem série de 2 Myr e permite a comparação nas mesmas épocas; comparações entre 20 Myr e 1 Gyr não devem ser lidas como contraste de um único instante.

## Identificação de origem e classificação

As novas repetições GPU calibradas de 200 Myr completaram N=10k e 50k, com alturas globais finais 0,450779 e 0,314916 kpc, a partir de 0,234839 e 0,237865 kpc. Elas confirmam a diferença de resolução observada historicamente, sem eliminar o espessamento. Os arquivos novos são `gpu/GPU-10000-200Myr.json` e `gpu/GPU-50000-200Myr.json`; não devem ser contados como novas sementes estatísticas, pois usam as mesmas realizações iniciais preservadas.

A reanálise 1.0.1 dos estados históricos calibrados cobre 10 trajetórias e 33 snapshots, com energia direta Float64, referências BH e populações fino/espesso. Ela confirma que o grande aquecimento histórico pode coexistir com pequena diferença da Hamiltoniana nos estados observados: em A10k, o máximo direto em 0/20/200/1.000 Myr é 1,91368 × 10⁻⁷, enquanto o fino chegou a 1,152008 kpc e o espesso a 1,384006 kpc. O máximo da série BH histórica de 5 Myr era 5,03867 × 10⁻⁴. As cadências diferem; não se anuncia esse máximo direto esparso como limite de todo o intervalo. O caso \(\epsilon/2\) é adverso, com erro direto 1,37435 × 10⁻⁴ em 200 Myr, conforme a auditoria completa.

As novas execuções ficam em `reports/v1.0.1/`. Arquivos históricos consumidos por uma nova análise devem estar identificados como entrada histórica; replotar ou recalcular um diagnóstico não transforma uma trajetória 1.0 em nova integração. Uma soma direta aplicada a um snapshot antigo produz um diagnóstico novo daquele estado, sem alterar a trajetória preservada.

A auditoria concluída das novas repetições GPU de 10k e 50k encontrou máximos diretos nominais de 1,90776 × 10⁻⁷ e 2,26070 × 10⁻⁷ nos estados de 0/20/200 Myr. As duas populações mantêm respostas distintas: no novo 10k, o fino vai de aproximadamente 0,194009 a 0,412214 kpc e o espesso de 0,609321 a 0,711575 kpc. Essas repetições usam as mesmas realizações iniciais históricas e não contam como novas sementes. A pequena diferença energética nos instantes medidos continua compatível com o espessamento e não certifica equilíbrio.

O modelo autogravitante completo permanece **NÃO VALIDADO** para equilíbrio de longa duração enquanto os dados não demonstrarem estacionariedade e convergência no domínio pretendido. O eixo de conservação pode ser validado em uma referência controlada ao mesmo tempo em que o eixo estrutural continua não validado. Os relatórios `AUDITORIA_ENERGIA_1_0_1.md` e `CONVERGENCIA_NUMERICA_1_0_1.md` documentam esses domínios separadamente.

Para reproduzir o controle suave, usar o ambiente Python com AGAMA oficial compilado registrado nos protocolos:

```text
python scripts/validation-101/prepare-continuum.py
node scripts/validation-101/analyze-continuum.mjs
```

`prepare-continuum.py` consome os potenciais e snapshots históricos sem modificá-los. A integração DOP853 adaptativa pertence ao controle A; a demonstração de ordem KDK pertence aos controles CPU do outro relatório. As duas coisas são complementares.
