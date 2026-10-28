# Campo, densidade, cinemática e estacionariedade — 1.0.3

## Preparação preservada

O potencial, as quatro DFs em ações e as massas independentes da versão1.0.2 foram reutilizados sem novo ajuste. O campo é Φε=−G∫ρ(x′)/√(|x−x′|²+ε²)d³x′. A construção anterior fazia DF→densidade física→campo médio Plummer, com nove iterações convergentes. Não se declarou exatidão global da DF ou ausência de modos físicos.

As validações1.0.2, preservadas, incluem potencial, aR,az, frequências Ω²/κ²/ν², gradientes, densidade de Poisson suavizada versus densidade física e momentos cinemáticos. Nas77 sondas, erro da expansão contra convolução refinada da mesma densidade <10⁻⁴; fechamento físico da densidade total em15 pontos tem máximo≈1,27%, e o bojo tem erros relativos grandes em caudas rarefeitas. A massa da malha difere da integral da DF: bojo+0,4995%, fino+0,00276%, espesso+0,00737%, halo+0,05236%. Esses resíduos não foram ocultados nem renormalizados para aparentar um equilíbrio exato.

Os priors observacionais continuam: fino Rd=2,43 kpc e σR solar de referência35 km/s; espesso Rd=3,88 kpc e σR de referência50 km/s. Medianas solares |z| do contínuo≈0,19999/0,59527 kpc, contra alvos0,20794/0,62383: preservar priors não equivale a ajustar exatamente todos os perfis observados. Os momentos radiais iniciais e suas convenções permanecem em reports/v1.0.2/corrected e kinematic-profiles.csv.

## Nova decomposição de campo

`field-ensembles.json` e `field-components.json` distinguem campo de preparação, média Plummer esperada, amostras instantâneas, desvio entre sementes, erro padrão e resíduo dos bárions fixos. A norma relativa deste último é 0.15155748. Ele pertence a uma realização finita e não é o viés sistemático do gerador. A média discreta de apenas três halos ainda tem incerteza.

## Halo fixo compatível e correção de precisão

Uma expansão escalar do halo foi construída a partir de sua densidade física corrigida, convolveda com Plummer, e comparada com quadratura refinada. A tabela Hermite tem385×385 nós e potencial/derivadas da mesma função. O resíduo herdado de massa da malha é explícito. Não há partículas vivas de halo no B.

A avaliação nodal Float32 apresentava cancelamento ao diferenciar valores próximos de um potencial grande. Subtrair uma constante do potencial melhorou parte do erro; a constante é restaurada na energia, sem derivada. A solução final converte o MESMO interpolante Hermite em coeficientes polinomiais locais usando Float64 e os armazena uma única vez em Float32. A GPU calcula derivadas sem subtrair os termos constantes grandes. Não se mudou densidade, força física alvo ou KDK.

Em4.054 sondas na GPU real, maior erro vetorial relativo contra o halo nativo Plummer = 1.83405344e-05; contra a mesma tabela em Float64 = 2.3617413e-06. As tentativas nodais anteriores e seus erros foram preservados em field-attempts. Este teste não certifica trajetórias longas. Os testes de gradiente analítico e invariância de força sob mudança da origem de potencial são independentes dos dados da galáxia.

## Modelo A: mesmos bárions no campo médio completo

Nove controles A: três sementes ×20/200 Myr na base e três controles de fino×2 em200 Myr, para comparar a nova amostra com seu próprio controle suave. DOP853 Float64, precisão10⁻¹⁰, campo total Plummer fixo, sem autogravidade. Posições, velocidades e pesos iniciais foram arredondados uma vez para f32 para corresponder ao upload inicial dos controles GPU; a evolução A permanece Float64. A controla a amostra de fases e a compatibilidade do potencial, não a resposta coletiva da galáxia.

| Ensaio | N | t, Myr | h50 global, variação | h50 fino, variação | h50 espesso, variação | σz fino cartesiano, variação | máx. abs. δE amostrado |
|---|---:|---:|---:|---:|---:|---:|---:|
| A-base-s2026-t20 | 6000 | 20 | -0.336% | +4.958% | +0.105% | +2.919% | 6.707669e-11 |
| A-base-s2026-t200 | 6000 | 200 | +0.298% | +1.951% | +0.319% | +6.397% | 1.037268e-10 |
| A-base-s2027-t20 | 6000 | 20 | +2.784% | +3.524% | +3.507% | -3.828% | 2.496552e-11 |
| A-base-s2027-t200 | 6000 | 200 | +6.420% | +5.388% | -2.693% | -3.502% | 2.684217e-11 |
| A-base-s2028-t20 | 6000 | 20 | -3.388% | -2.101% | -13.832% | -1.362% | 3.471654e-11 |
| A-base-s2028-t200 | 6000 | 200 | +2.068% | +0.751% | -8.197% | +3.786% | 9.962427e-11 |
| A-thin2-s2026-t200 | 9546 | 200 | +1.432% | +2.780% | +0.319% | +3.647% | 9.157636e-11 |
| A-thin2-s2027-t200 | 9546 | 200 | +1.538% | +0.154% | -2.693% | +1.003% | 4.143677e-11 |
| A-thin2-s2028-t200 | 9546 | 200 | +1.397% | +0.797% | -8.197% | +3.559% | 8.843734e-11 |

Uma amostra finita pode oscilar em h50/σ mesmo quando a DF contínua é estacionária. A versão1.0.2 também mediu deriva de f(J) ao longo de órbitas com ações aproximadas; seu limite numérico continua válido, sem ser reapresentado como um novo teste de1 Gyr. Nenhuma força instantânea foi ajustada para concordar artificialmente com o contínuo.
