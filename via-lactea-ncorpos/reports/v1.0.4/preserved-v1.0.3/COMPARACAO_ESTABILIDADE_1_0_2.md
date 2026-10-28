# Comparação de estabilidade — experimentos mínimos de 20 Myr

Esta entrega encerra a **etapa 1 solicitada**, antes dos refinamentos e otimizações secundárias. Não certifica a estabilidade de longo prazo nem a convergência não colisional. As etapas 2–4 permanecem pendentes. Não se adotou uma porcentagem universal aceitável de espessamento.

## Desenho

21 integrações concluídas: nove A no contínuo (N=1.000, três famílias × três sementes); seis C CPU Float64 direto (antigo/novo × três sementes, N=1.000); seis C GPU Float32 direto (antigo/novo × três sementes, N=10.000). Nos C, dt=0,05 Myr e ε=0,1 kpc. Não foi priorizada nova redução de dt.

A-baseline: IC antiga no próprio campo Newtoniano. A-baseline-softened: **mesma IC antiga** no campo Plummer da densidade antiga. A-corrected: nova IC no próprio campo Plummer convergido. A usa DOP853 Float64, precisão 10⁻¹⁰; não é autogravitante. C tem disco, bojo e halo ativos. B com halo fixo corrigido e D com halo refinado aguardam a etapa 2.

h50 é a mediana de distância absoluta ao plano instantâneo da população, na abertura e convenções registradas nas amostras. Plano fixo inicial, inclinação, coortes e diagnósticos regionais permanecem nos registros; o plano instantâneo ajuda a separar inclinação global de espessamento. Famílias usam as mesmas massas, parâmetros de DF e sementes; suas coordenadas não são idênticas, pois a distribuição de fase mudou.

## Resultados completos

| Modelo / família | N | Semente | h50(0), kpc | h50(20), kpc | Variação | máximo absoluto de δE amostrado |
|---|---:|---:|---:|---:|---:|---:|
| A / baseline | 1000 | 2026 | 0.210205 | 0.246650 | +17.338% | 7.808e-10 |
| A / baseline | 1000 | 2027 | 0.217827 | 0.252156 | +15.760% | 3.339e-10 |
| A / baseline | 1000 | 2028 | 0.257814 | 0.256803 | -0.392% | 6.500e-10 |
| A / baseline-softened | 1000 | 2026 | 0.210205 | 0.249405 | +18.649% | 1.870e-10 |
| A / baseline-softened | 1000 | 2027 | 0.217827 | 0.259947 | +19.337% | 3.105e-10 |
| A / baseline-softened | 1000 | 2028 | 0.257814 | 0.255909 | -0.739% | 2.073e-10 |
| A / corrected | 1000 | 2026 | 0.255910 | 0.246647 | -3.619% | 2.226e-10 |
| A / corrected | 1000 | 2027 | 0.237122 | 0.240333 | +1.354% | 2.879e-10 |
| A / corrected | 1000 | 2028 | 0.220670 | 0.253618 | +14.931% | 1.381e-10 |
| C-GPU / baseline | 10000 | 2026 | 0.234839 | 0.258552 | +10.097% | 4.347e-07 |
| C-GPU / baseline | 10000 | 2027 | 0.247914 | 0.271446 | +9.492% | 5.387e-07 |
| C-GPU / baseline | 10000 | 2028 | 0.241395 | 0.259878 | +7.657% | 5.410e-07 |
| C-GPU / corrected | 10000 | 2026 | 0.245317 | 0.255598 | +4.191% | 2.284e-07 |
| C-GPU / corrected | 10000 | 2027 | 0.232544 | 0.242798 | +4.409% | 2.742e-07 |
| C-GPU / corrected | 10000 | 2028 | 0.242621 | 0.256232 | +5.610% | 2.511e-06 |
| C-CPU / baseline | 1000 | 2026 | 0.210205 | 0.391310 | +86.156% | 2.006e-06 |
| C-CPU / baseline | 1000 | 2027 | 0.217827 | 0.434314 | +99.385% | 5.015e-04 |
| C-CPU / baseline | 1000 | 2028 | 0.257814 | 0.299863 | +16.310% | 1.037e-05 |
| C-CPU / corrected | 1000 | 2026 | 0.255910 | 0.417194 | +63.024% | 3.832e-04 |
| C-CPU / corrected | 1000 | 2027 | 0.237122 | 0.284752 | +20.087% | 3.448e-06 |
| C-CPU / corrected | 1000 | 2028 | 0.220670 | 0.301903 | +36.812% | 7.825e-06 |

## Populações e dispersão entre sementes

A média do crescimento global C-GPU caiu de 9.0821% para 4.7366%; não foi escolhida a melhor semente. Os três aumentos absolutos do fino antigo são 0,02685047 / 0,02384449 / 0,02709065 kpc, e os novos 0,01034596 / 0,00923072 / 0,00699071 kpc. O disco espesso não é estacionário em todas as sementes: a nova semente 2028 contrai de 0,59179 para 0,52511 kpc. A média global não representa cada população.

Nos C-CPU N=1.000, o crescimento médio foi 67,2835% → 39,9743%, mas a semente 2028 piorou de 16,3095% para 36,8119%. Há forte variação amostral: não se conclui estabilidade ou redução garantida para qualquer realização. A média dos controles A foi 10,9018% (original),12,4153% (IC original em Plummer),4,2218% (corrigido); medianas de uma amostra pequena oscilam mesmo no contínuo. A variação de f(J) oferece um diagnóstico adicional de compatibilidade, independente da aparência.

## Energia e temporalidade

CPU C: Hamiltoniana direta Float64 a cada 0,05 Myr; estrutura a cada 0,5 Myr. GPU C: estados físicos f32 lidos e energia direta Float64 a cada 0,5 Myr; estrutura global na mesma cadência. Estados completos em 0 e 20 Myr. Diagnósticos de fino/espesso GPU derivados desses estados só existem em duas épocas; a figura 3 usa pontos ligados, sem fingir séries densas. Nos A o potencial externo aparece na energia, sem U entre as partículas de teste.

Nem todo erro energético melhorou: C-GPU novo s2028 chega a 2,5109e−6, contra 5,4103e−7 antigo; C-CPU novo s2026 chega a 3,8315e−4, contra 2,0056e−6 antigo. Esses máximos amostrados são visíveis no CSV e na figura 6, e não provam erro limitado entre amostras. A energia global é dominada em parte pelo halo; não substitui medidas por população. Não se mudou dt para ocultar resultados adversos.

Os dados mostram redução preliminar do reajuste inicial no conjunto de maior N, com compatibilidade do campo muito melhor. Não se quantificou ainda separadamente aquecimento do halo, dos bárions e modos coletivos físicos. Não se classificou barra, flexão ou instabilidade como física por aparência. Esse diagnóstico exige dependência com resolução, semente e períodos orbitais maiores. 20 Myr não cobre vários períodos solares e não autoriza extrapolar a 200 Myr ou 1 Gyr.

## Figuras e dados

Oito figuras reais, em PNG/SVG/CSV, listadas em `reports/v1.0.2/figures/manifest.json`, com parâmetros, limitações e SHA-256 dos dados de origem. Figuras 1,2,3,6,7,8 estão disponíveis. A figura 9 tem apenas os modelos A/C medidos; B/D estão pendentes. A figura 10 mostra convergência da iteração e ruído entre sementes para N=1.000/10.000, não convergência de estabilidade em N/ε/método. Figuras 4 e 5 não foram fabricadas. `short-overview.csv`, `energy-series.csv`, `structure-series.csv` e `kinematic-profiles.csv` são derivados de dados efetivamente calculados.
