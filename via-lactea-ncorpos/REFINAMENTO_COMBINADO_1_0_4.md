# Refinamento combinado 1.0.4 — experimental

O refinamento combinado reduz o espessamento, mas a versão 1.0.4 ainda não demonstra estabilidade estrutural de longo prazo nem convergência global. O halo de 80 mil é o candidato experimental mais promissor para novos testes de resolução, sem promoção a modelo estacionário.

## Comparação fatorial e domínio

34 integrações GPU novas concluídas, três controles contínuos novos do fino quadruplicado, três auditorias nativas f(J) das quatro populações e 12 controles históricos de 200 Myr verificados por fase/hash. Tempo máximo novo: 200 Myr. As três sementes diagonais variam simultaneamente a realização bariônica e a do halo; não constituem nove combinações independentes.

A: Nh4.000/fino3.546; B: Nh40.000/fino3.546; C: Nh4.000/fino7.092; D: Nh40.000/fino7.092. Bojo1.500 e espesso954 em todos. Três pares de sementes2026/2027/2028. Massas físicas e DFs fixas, ε = 0,1 kpc, dt0,05 Myr, Plummer direta WebGPU Float32, leapfrog KDK. Os 12 ensaios20 Myr e os 12 ensaios200 Myr são integrações separadas, iniciadas nas mesmas condições; não são 24 realizações estatisticamente independentes.

| Família | N total | Δh50 fino [%] | Δh50 espesso [%] | Δσ perpendicular fino [%] | Δh50 fino,100–200 [kpc] |
|---|---:|---:|---:|---:|---:|
| A | 10000 | 103.070 ± 12.674 | 34.698 ± 7.605 | 44.154 ± 10.294 | 0.078 ± 0.025 |
| B | 46000 | 26.371 ± 1.443 | 0.624 ± 9.518 | 13.993 ± 2.464 | 0.019 ± 0.002 |
| C | 13546 | 105.427 ± 18.898 | 33.843 ± 8.497 | 46.723 ± 13.446 | 0.095 ± 0.024 |
| D | 49546 | 23.286 ± 2.340 | -0.602 ± 7.257 | 13.238 ± 3.558 | 0.018 ± 0.012 |

Média±desvio padrão amostral de três sementes; sem intervalo de confiança assintótico. h50 é uma mediana ponderada em massa no plano próprio da população. σ perpendicular usa esse plano; σz usa o eixo cartesiano fixo. A mediana global contém fino+espesso e não substitui as duas populações.

A interação D−C−B+A no crescimento do fino foi -5.442 ± 3.933 pontos percentuais em 200 Myr. Valor calculado por semente, sem supor soma dos ganhos; três realizações limitam a inferência.

Contrastes de halo B−A e D−C preservam todos os bárions por valores exatos. Contrastes C−A e D−B preservam bojo, espesso e halo; o fino foi novamente amostrado da mesma DF em 1.0.3. A resolução não foi aumentada com clones coincidentes. Semente pareada não significa que partículas finas de resoluções distintas tenham os mesmos IDs físicos. O início antipodal reduz ruído ímpar e introduz correlação entre pares; N não conta órbitas independentes.

## Rastreabilidade

`reports/v1.0.4/initial-manifest.json` registra hashes dos12 inputs e das quatro populações, pais1.0.3 e contagens. Metadados `meta.version104` e os arrays/manifestos descrevem a realização atual; campos herdados de `meta.preparation` e sementes genéricas dos pais descrevem a preparação anterior, sem substituir a proveniência atual. Os hashes pareados foram verificados antes de integrar.

Os 12 controles contínuos/halo fixo de 200 Myr são resultados preservados 1.0.3 reutilizados, não12 novas integrações. Os bárions dos controles de halo fixo coincidem exatamente com o upload novo. No AGAMA, as conversões de unidades introduzem diferenças iniciais da ordem de ulps Float64, tolerância de verificação1e−13 relativa/absoluta na escala de 1; o input quantizado antes da evolução é o mesmo. Referências em `control-references.json`.

Halo fixo remove granularidade e resposta dinâmica. Campo completo fixo remove toda a resposta autogravitante. Diferenças desses controles não são uma medida pura de encontros de duas partículas. Os contrastes vivos de N, a cinemática e os modos completam a interpretação.

## Consistência entre observáveis

D melhora h50 do fino diante de B nas três sementes, com diferenças−5,5352;−3,3791;−0,3400 p.p. A diferença das mudanças de variância vertical D−B foi+34,6295;−8,0074;−65,1761 (km/s)²: a melhora cinemática não foi uniforme. O espesso também não melhora uniformemente entre B/D, e os refinamentos adicionais não corrigem todas as componentes. Portanto não se promove o sistema usando apenas a mediana de altura mais favorável.

## Contrastes de mecanismos nas mesmas fases

| Família | Δσz² vivo−halo fixo [(km/s)²] | Δσz² halo fixo−campo total fixo [(km/s)²] |
|---|---:|---:|
|A|1259.5383 ±284.7084|217.6668 ±88.0599|
|B|121.3851 ±68.0490|217.6668 ±88.0599|
|C|1437.9602 ±505.3969|170.5013 ±49.2378|
|D|142.8312 ±50.5095|170.5013 ±49.2378|
|E|127.5121 ±71.0259|170.5013 ±49.2378|

As diferenças telescopam algebricamente, mas não são frações causais independentes de encontros: também mudam a resposta dinâmica do halo e a autogravidade/modos dos bárions. Os valores individuais e fontes estão em mechanism-contrasts.json/CSV. A resoluçãoE conserva exatamente os mesmos bárions D; G possui novos controles contínuos dedicados.
