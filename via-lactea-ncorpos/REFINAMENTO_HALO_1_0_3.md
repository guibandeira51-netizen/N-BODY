# Refinamento isolado do halo — 1.0.3 experimental

## Controle físico e pareamento

Usou-se o candidato AGAMA Plummer ε=0,1 kpc da versão 1.0.2, sem refazer a DF nem alterar massas, escalas observacionais, forças entre pares ou KDK. Os mesmos 6.000 bárions da realização 2026 foram copiados em TODOS os ensaios H: 1.500 bojo,3.546 fino,954 espesso. Posições, velocidades e massas foram conferidas por digest canônico das matrizes, não apenas pela coincidência de sementes. Não houve recentramento dependente do halo.

Massa física do halo = 1049129212118.55664062 M☉. A massa individual é Mh/Nh. Sementes do halo 2026/2027/2028, amostragem antipodal de N/2 pares independentes da MESMA DF no MESMO potencial convergido. Entre Nh diferentes, as amostras do halo não são obrigadas a ter as mesmas fases; os bárions são exatamente os mesmos. O tamanho do pool do amostrador cresce quando necessário e está registrado. A precisão f32 arredonda massas e parâmetros na GPU; os pesos efetivos estão lidos de volta em cada resultado. As massas físicas do arquivo inicial permanecem fixas.

| Nh | N total integrado | massa individual do halo, M☉ | m_h/m_fino |
|---:|---:|---:|---:|
| 4000 | 10000 | 2.62282303e+08 | 23.368167 |
| 8000 | 14000 | 1.31141152e+08 | 11.684083 |
| 20000 | 26000 | 5.24564606e+07 | 4.673633 |
| 40000 | 46000 | 2.62282303e+07 | 2.336817 |

## Resultados em 20 Myr

| Grupo | N de ensaios | h50 global | h50 fino | h50 espesso | σ⊥ fino |
|---|---:|---:|---:|---:|---:|
| Nh=4000 | 3 | +3.743% ± 2.797 pp | +4.656% ± 1.902 pp | +1.822% ± 0.467 pp | +5.473% ± 2.691 pp |
| Nh=8000 | 3 | +1.979% ± 2.266 pp | +4.643% ± 2.298 pp | +1.629% ± 1.602 pp | +3.905% ± 2.386 pp |
| Nh=20000 | 3 | +2.858% ± 1.920 pp | +5.471% ± 2.865 pp | +0.581% ± 1.065 pp | +4.902% ± 0.774 pp |
| Nh=40000 | 3 | +2.225% ± 2.279 pp | +5.363% ± 1.420 pp | +0.984% ± 0.577 pp | +3.320% ± 0.945 pp |

Os valores são média e desvio entre três sementes; pp significa pontos percentuais. σ⊥ é perpendicular ao plano próprio. σz cartesiano, σR, perfis, centros, inclinações e coortes estão nos dados. A diminuição do ruído NÃO produziu uma queda monotônica de h50 em 20 Myr. Não selecionar somente a semente ou o indicador favorável.

## Contraste selecionado em 200 Myr

Após os 24 controles curtos de halo/bárions, foram escolhidas as extremidades Nh=4.000/40.000: uma década na massa individual, três sementes em cada nível. A escolha não foi pelo menor h50, que favorecia outro grupo no curto. `medium-selection.json` foi escrito antes dos novos ensaios.

| Grupo | N de ensaios | h50 global | h50 fino | h50 espesso | σ⊥ fino |
|---|---:|---:|---:|---:|---:|
| Nh=4000 | 3 | +93.096% ± 13.658 pp | +105.729% ± 17.444 pp | +39.062% ± 3.834 pp | +41.093% ± 5.918 pp |
| Nh=40000 | 3 | +25.288% ± 2.283 pp | +29.483% ± 1.581 pp | +4.867% ± 8.293 pp | +17.599% ± 4.609 pp |

Com os mesmos bárions e a mesma física contínua, refinar o halo de 4.000 para 40.000 partículas reduziu o crescimento médio de h50 do fino em 200 Myr de 105.729463% para 29.483456% (72.11% menor), e o aumento médio de σ perpendicular de 41.092723% para 17.598522% (57.17% menor). As três sementes refinadas aqueceram menos que seus contrastes grosseiros. Isso demonstra uma contribuição importante da discretização do halo ao excesso de aquecimento deste domínio, incluindo ruído e respostas que ele pode excitar; não quantifica uma fração universal puramente colisional. O resíduo com halo fixo e os contrastes bariônicos mostram outra contribuição: o excesso médio de crescimento de variância vertical do fino B−A, com controles suaves das mesmas fases, foi 217,666789(km/s)² na base e 170,501303(km/s)² com o fino duplicado. Essa redução é preliminar, com apenas três sementes; B−A inclui autogravidade/resposta coletiva dos bárions, não apenas encontros de duas partículas. Refinar só bojo ou espesso não trouxe melhora estrutural/cinemática uniforme. Não se identifica ainda uma causa única para todo o resíduo do modelo refinado.

## Campo médio e ruído

Nas sondas fixas, a norma do desvio do campo entre sementes, dividida pela norma do campo médio TOTAL esperado, foi 0.32545356, 0.20293884, 0.14478484, 0.09471212 para Nh=4/8/20/40 mil. O desajuste sistemático da preparação continua o da solução 1.0.2; isso é diferente do resíduo de uma amostra finita.

O resíduo do campo dos bárions fixos, nas mesmas sondas, tem norma relativa 0.15155748. Mesmo que Nh→∞, este conjunto particular de bárions ainda é discreto. Três halos refinados não tornam sua distribuição um contínuo. O campo instantâneo não foi forçado a coincidir com o suave.

## Registros completos

| Ensaio | N | t, Myr | h50 global, variação | h50 fino, variação | h50 espesso, variação | σz fino cartesiano, variação | máx. abs. δE amostrado |
|---|---:|---:|---:|---:|---:|---:|---:|
| H-nh20000-b2026-h2026-t20 | 26000 | 20 | +5.006% | +8.775% | -0.447% | +5.713% | 2.246868e-07 |
| H-nh20000-b2026-h2027-t20 | 26000 | 20 | +1.309% | +3.669% | +1.680% | +4.156% | 2.130164e-07 |
| H-nh20000-b2026-h2028-t20 | 26000 | 20 | +2.259% | +3.969% | +0.509% | +4.977% | 1.075578e-07 |
| H-nh4000-b2026-h2026-t20 | 10000 | 20 | +4.191% | +4.983% | +2.361% | +2.488% | 2.284311e-07 |
| H-nh4000-b2026-h2026-t200 | 10000 | 200 | +87.040% | +97.041% | +43.281% | +43.177% | 2.678119e-07 |
| H-nh4000-b2026-h2027-t20 | 10000 | 20 | +6.289% | +6.374% | +1.544% | +5.954% | 2.774297e-07 |
| H-nh4000-b2026-h2027-t200 | 10000 | 200 | +83.513% | +94.336% | +35.790% | +42.907% | 9.073493e-07 |
| H-nh4000-b2026-h2028-t20 | 10000 | 20 | +0.749% | +2.611% | +1.560% | +7.781% | 8.531717e-07 |
| H-nh4000-b2026-h2028-t200 | 10000 | 200 | +108.734% | +125.811% | +38.114% | +47.966% | 1.131450e-06 |
| H-nh40000-b2026-h2026-t20 | 46000 | 20 | +0.432% | +3.727% | +1.650% | +3.903% | 5.926510e-08 |
| H-nh40000-b2026-h2026-t200 | 46000 | 200 | +26.065% | +27.851% | +11.440% | +16.735% | 1.409045e-07 |
| H-nh40000-b2026-h2027-t20 | 46000 | 20 | +1.455% | +6.269% | +0.679% | +3.786% | 9.108975e-08 |
| H-nh40000-b2026-h2027-t200 | 46000 | 200 | +22.718% | +29.592% | -4.450% | +23.111% | 2.804936e-07 |
| H-nh40000-b2026-h2028-t20 | 46000 | 20 | +4.790% | +6.093% | +0.624% | +2.219% | 9.120044e-08 |
| H-nh40000-b2026-h2028-t200 | 46000 | 200 | +27.080% | +31.008% | +7.610% | +13.969% | 1.480252e-07 |
| H-nh8000-b2026-h2026-t20 | 14000 | 20 | +0.218% | +2.552% | +2.070% | +4.394% | 3.139128e-07 |
| H-nh8000-b2026-h2027-t20 | 14000 | 20 | +4.535% | +7.104% | +2.966% | +5.864% | 1.704139e-07 |
| H-nh8000-b2026-h2028-t20 | 14000 | 20 | +1.184% | +4.275% | -0.147% | +1.292% | 3.212042e-07 |

Gravidade direta GPU f32, dt=0,05 Myr, ε=0,1 kpc. Energia direta Float64 a cada0,5 Myr no curto e5 Myr no contraste200; nenhum máximo entre amostras é inferido. Os estados completos em 0 e no fim, tabelas de parâmetros, hashes e tempos estão nos JSON. O simulador histórico continua como padrão.
