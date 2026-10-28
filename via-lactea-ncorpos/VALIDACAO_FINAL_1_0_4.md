# Validação final 1.0.4 — experimental

O refinamento combinado reduz o espessamento, mas a versão 1.0.4 ainda não demonstra estabilidade estrutural de longo prazo nem convergência global. O halo de 80 mil é o candidato experimental mais promissor para novos testes de resolução, sem promoção a modelo estacionário.

34 integrações GPU novas concluídas, três controles contínuos novos do fino quadruplicado, três auditorias nativas f(J) das quatro populações e 12 controles históricos de 200 Myr verificados por fase/hash. Tempo máximo novo: 200 Myr. As três sementes diagonais variam simultaneamente a realização bariônica e a do halo; não constituem nove combinações independentes.

| Família | N total | Δh50 fino [%] | Δh50 espesso [%] | Δσ perpendicular fino [%] | Δh50 fino,100–200 [kpc] |
|---|---:|---:|---:|---:|---:|
| A | 10000 | 103.070 ± 12.674 | 34.698 ± 7.605 | 44.154 ± 10.294 | 0.078 ± 0.025 |
| B | 46000 | 26.371 ± 1.443 | 0.624 ± 9.518 | 13.993 ± 2.464 | 0.019 ± 0.002 |
| C | 13546 | 105.427 ± 18.898 | 33.843 ± 8.497 | 46.723 ± 13.446 | 0.095 ± 0.024 |
| D | 49546 | 23.286 ± 2.340 | -0.602 ± 7.257 | 13.238 ± 3.558 | 0.018 ± 0.012 |

## Classificações separadas

**Conservação energética:** Demonstrada numericamente no domínio amostrado: máximo |δE|=2.5109e-06. Hamiltoniano direto Float64 da trajetória GPU; cadências declaradas. Não é conservação exata nem limite de picos não amostrados.

**Equilíbrio inicial:** Evidências insuficientes para estacionariedade exata de todas as componentes. Campo médio convergido e DF admissível são evidências parciais; controles contínuos, f(J) ao longo de órbitas e Jeans expõem resíduos e limitações de ações/quadratura.

**Estabilidade estrutural:** Não demonstrada no domínio medido. Avaliar espessura, dispersões, perfis e tendências tardias separadamente; crescimento menor não certifica estabilidade.

**Convergência numérica:** Parcial: força direta e energia foram verificadas; há controles de N e passo temporal. A dependência residual da resolução e o horizonte temporal limitado impedem uma certificação global.

## Decisão sobre o horizonte

Em 200 Myr, os crescimentos médios de h50 fino foram A: 103,0699%, B: 26,3711%, C: 105,4268% e D: 23,2864%. Com halo de 80 mil/fino×2, E chegou a 17,8935% ±0,8127 p.p.; halo de 40 mil/fino×4, G chegou a 21,3570% ±3,3907 p.p. E melhora a espessura frente a D nas três sementes, mas a mudança de variância vertical não melhora uniformemente: Δσz²(E−D)=[−126,9160; +0,7193; +80,2395](km/s)². De 100 a 200 Myr, todas as sementes D/E/G ainda aumentam h50 e variância vertical. Em E, o aumento tardio médio de h50 é 0,019184 kpc e de σz² é 172,0118 (km/s)²; o último é maior que a média tardia D: 135,4547, com variabilidade de sementes. G não melhora uniformemente o espesso/bojo. Não há patamar estrutural em N nem redução uniforme da taxa tardia. Por isso não foram iniciados 400–600 Myr ou1 Gyr. A decisão usa tendências, controles e variabilidade, sem porcentagem universal aceitável de espessamento. O passo temporal é auditado separadamente; melhorar energia/passo não elimina a dependência de N.

A interação D−C−B+A no crescimento do fino foi -5.442 ± 3.933 pontos percentuais em 200 Myr. Valor calculado por semente, sem supor soma dos ganhos; três realizações limitam a inferência.

Os dados não foram extrapolados. Não foram usados amortecimento, congelamento de partículas do modelo vivo, reposicionamento, correção de velocidades, ajuste cosmético de espessura ou alteração das massas observacionais. Os campos fixos são controles científicos separados, explicitamente identificados, e não substituem o modelo vivo.

As versões históricas e seus pacotes foram preservados e verificados por SHA-256. O novo ZIP é um complemento reproduzível ao projeto preservado; inclui os inputs, fontes e evidências da 1.0.4 e os controles históricos específicos que ela referencia. Pacotes históricos completos permanecem separados. A página e o candidato são opt-in experimentais e não substituem automaticamente o padrão histórico.
