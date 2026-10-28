# Refinamento isolado dos bárions — 1.0.3

## Modelo B e resolução

Halo externo fixo igual à média Plummer da densidade física corrigida do halo, ε=0,1 kpc. Não se reutilizou o campo Newtoniano antigo. Não há partículas de halo nem dupla contagem. B é um controle: remove granularidade e resposta dinâmica do halo; não é a galáxia completamente autogravitante C/D.

Foram executados 12 controles de20 Myr: base [1500,3546,954]; bojo×2 [3000,3546,954]; fino×2 [1500,7092,954]; espesso×2 [1500,3546,1908]; sementes bariônicas2026/2027/2028. Cada população não variada mantém valores iniciais exatos do controle da mesma semente. A população refinada é reamostrada da mesma DF, com massa individual Mi/Ni. Nenhuma quantidade desenhada substitui N integrado.

## Vinte Myr

| Grupo | N de ensaios | h50 global | h50 fino | h50 espesso | σ⊥ fino |
|---|---:|---:|---:|---:|---:|
| Base | 3 | +1.711% ± 2.484 pp | +4.287% ± 1.826 pp | -1.348% ± 9.633 pp | +0.809% ± 3.384 pp |
| Bojo ×2 | 3 | +1.915% ± 2.297 pp | +4.166% ± 2.475 pp | -1.246% ± 9.668 pp | +0.573% ± 3.309 pp |
| Fino ×2 | 3 | -0.697% ± 1.598 pp | +2.245% ± 1.501 pp | -1.530% ± 8.691 pp | +2.456% ± 1.069 pp |
| Espesso ×2 | 3 | +2.068% ± 1.794 pp | +4.324% ± 1.718 pp | -0.803% ± 5.588 pp | +0.535% ± 3.586 pp |

Duplicar o fino diminuiu seu h50 médio, mas não seu crescimento médio de dispersão perpendicular. Isso não prova que o refinamento fino seja fisicamente pior: a população reamostrada tem outra flutuação de fase. Três sementes e um fator2 não definem um limite assintótico. O bojo e o espesso também afetam o campo sentido pelo fino.

## Seleção cinemática pareada antes de200 Myr

| Variante | sementes com menor crescimento de σz² do fino | redução média de Δσz², (km/s)² | média da mudança radial absoluta relativa | maior δE absoluto |
|---|---:|---:|---:|---:|
| Bojo ×2 | 3/3 | +6.378534 | 2.3579% | 5.5296e-08 |
| Fino ×2 | 1/3 | -43.651799 | 2.0206% | 9.2722e-08 |
| Espesso ×2 | 3/3 | +7.196917 | 2.2976% | 8.2895e-08 |

σz aqui usa o eixo z de referência, média populacional removida. A seleção escolheu a população 2 para um contraste adicional, levando em conta variância nas mesmas sementes, mudança radial e erros energéticos, não somente h50. O benefício curto é pequeno; não há precisão suficiente para declarar um vencedor físico definitivo entre bojo e espesso. Todos os candidatos permanecem no registro.

## Duzentos Myr: seleção inicial e extensão adaptativa

Primeiro foram executados base e espesso×2. Como esse contraste quase não mudou o espessamento, `medium-extension.json` registrou, antes da execução, mais seis controles baratos: bojo×2/fino×2 nas mesmas três sementes. Essa extensão evita inferir prematuramente qual população domina o resíduo. O campo contínuo também recebeu três controles fino×2 de200 Myr, para separar a oscilação da nova amostra do efeito da autogravidade.

| Grupo | N de ensaios | h50 global | h50 fino | h50 espesso | σ⊥ fino |
|---|---:|---:|---:|---:|---:|
| Base | 3 | +13.461% ± 6.822 pp | +15.305% ± 10.510 pp | -4.503% ± 0.893 pp | +10.158% ± 2.215 pp |
| Bojo ×2 | 3 | +13.592% ± 2.540 pp | +14.550% ± 3.641 pp | -5.560% ± 0.498 pp | +10.869% ± 3.729 pp |
| Fino ×2 | 3 | +7.506% ± 2.264 pp | +11.157% ± 2.593 pp | -9.004% ± 0.369 pp | +8.922% ± 2.524 pp |
| Espesso ×2 | 3 | +13.924% ± 6.102 pp | +15.618% ± 7.714 pp | -1.299% ± 0.302 pp | +9.867% ± 2.119 pp |

| Ensaio | N | t, Myr | h50 global, variação | h50 fino, variação | h50 espesso, variação | σz fino cartesiano, variação | máx. abs. δE amostrado |
|---|---:|---:|---:|---:|---:|---:|---:|
| B-base-s2026-t20 | 6000 | 20 | +0.070% | +5.440% | +1.783% | +4.205% | 5.860322e-08 |
| B-base-s2026-t200 | 6000 | 200 | +15.006% | +20.312% | -5.325% | +10.969% | 7.425855e-08 |
| B-base-s2027-t20 | 6000 | 20 | +4.568% | +5.239% | +6.330% | -2.535% | 7.034672e-08 |
| B-base-s2027-t200 | 6000 | 200 | +19.378% | +22.376% | -3.552% | +7.620% | 6.299635e-08 |
| B-base-s2028-t20 | 6000 | 20 | +0.493% | +2.182% | -12.157% | +0.809% | 7.606332e-08 |
| B-base-s2028-t200 | 6000 | 200 | +5.999% | +3.228% | -4.632% | +11.769% | 6.164262e-08 |
| B-bulge2-s2026-t20 | 7500 | 20 | +0.678% | +5.419% | +2.242% | +4.031% | 5.040948e-08 |
| B-bulge2-s2026-t200 | 7500 | 200 | +13.980% | +14.897% | -5.824% | +14.235% | 6.780082e-08 |
| B-bulge2-s2027-t20 | 7500 | 20 | +4.565% | +5.765% | +6.193% | -2.543% | 5.529554e-08 |
| B-bulge2-s2027-t200 | 7500 | 200 | +15.915% | +18.005% | -4.985% | +7.011% | 4.560572e-08 |
| B-bulge2-s2028-t20 | 7500 | 20 | +0.501% | +1.315% | -12.174% | +0.267% | 4.893041e-08 |
| B-bulge2-s2028-t200 | 7500 | 200 | +10.880% | +10.747% | -5.871% | +11.321% | 6.969715e-08 |
| B-thick2-s2026-t20 | 6954 | 20 | +1.080% | +4.780% | +2.001% | +3.976% | 6.222283e-08 |
| B-thick2-s2026-t200 | 6954 | 200 | +7.738% | +10.142% | -1.581% | +11.410% | 8.800431e-08 |
| B-thick2-s2027-t20 | 6954 | 20 | +4.139% | +5.768% | +2.827% | -3.129% | 7.171228e-08 |
| B-thick2-s2027-t200 | 6954 | 200 | +19.938% | +24.440% | -1.336% | +7.461% | 7.065747e-08 |
| B-thick2-s2028-t20 | 6954 | 20 | +0.986% | +2.424% | -7.238% | +0.799% | 8.289483e-08 |
| B-thick2-s2028-t200 | 6954 | 200 | +14.096% | +12.274% | -0.980% | +10.686% | 8.124992e-08 |
| B-thin2-s2026-t20 | 9546 | 20 | -0.879% | +3.543% | +0.960% | +3.703% | 3.246891e-08 |
| B-thin2-s2026-t200 | 9546 | 200 | +7.646% | +13.567% | -8.912% | +11.720% | 7.912783e-08 |
| B-thin2-s2027-t20 | 9546 | 20 | -2.196% | +0.601% | +5.643% | +1.862% | 5.445493e-08 |
| B-thin2-s2027-t200 | 9546 | 200 | +5.175% | +8.414% | -9.411% | +6.817% | 4.003940e-08 |
| B-thin2-s2028-t20 | 9546 | 20 | +0.984% | +2.593% | -11.195% | +1.831% | 9.272171e-08 |
| B-thin2-s2028-t200 | 9546 | 200 | +9.697% | +11.490% | -8.690% | +8.253% | 1.030752e-07 |

Compare A e B com a MESMA semente e a MESMA população inicial antes de atribuir uma diferença a ruído. B da semente2026 é o par bariônico exato dos halos H. A média das três sementes B inclui três realizações bariônicas; a média H varia só o halo em bárions2026. Misturar essas médias como um efeito causal isolado seria incorreto.

A interpretação conjunta está em VALIDACAO_FINAL_1_0_3.md. Mais resolução bariônica ainda pode ser necessária; perfis por anel e coortes explicitam regiões com poucas partículas.
