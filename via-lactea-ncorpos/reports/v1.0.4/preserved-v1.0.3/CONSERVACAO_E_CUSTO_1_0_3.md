# Conservação, precisão e custo — 1.0.3

## Hamiltonianas e medidas

C/D isolados: E=K−GΣ(i<j)mi mj/√(rij²+ε²). B: a mesma soma entre bárions mais ΣmiΦhalo, SEM fator1/2 no termo externo. A: só K+ΣmiΦtotal, sem energia de pares de partículas de teste. δE=[E(t)−E(0)]/|E(0)|. A soma direta Float64 compensada usa os pesos/estados efetivamente lidos da GPU f32; não recupera precisão perdida na trajetória.

Cadência de referência:0,5 Myr nos testes20;5 Myr nos testes200. Máximos, médias, amplitudes e RMS são amostrados e NÃO limitam excursões entre amostras. Não foram usados erros energéticos Barnes–Hut nesta campanha. A CPU interativa antiga continua identificada separadamente quando sua energia é aproximada.

## Separação dos erros

- Força: pares diretos GPU Float32; até32 IDs de cada população, em cada estado inicial, comparados com soma direta compensada Float64 dos mesmos pesos/posições e G/ε² efetivos. Maior erro vetorial nas sondas da campanha: 1.55929674e-05. A seleção de sondas não prova um limite uniforme para todas as partículas e tempos.
- Campo externo: referência WGSL independente em4.054 posições, mesmo interpolante escalar, erros e tentativas preservados.
- Integrador: Leapfrog KDK original, dt=0,05 Myr. Não foi alterado nem se priorizou reduzir dt. A convergência temporal direta da1.0.1 é evidência em seu domínio original; não é uma prova global para todos os novos estados f32.
- Diagnóstico: soma direta Float64 compensada, sem aproximação de árvore, incluindo o potencial externo correto. G nominal e os parâmetros GPU efetivos f32 estão registrados separadamente; a pequena diferença de representação não foi escondida como identidade exata das Hamiltonianas em aritmética real.

L, Lz, momento linear, COM e resíduos balísticos estão no JSON e no CSV de energia. No campo externo só as simetrias apropriadas são usadas: momento/COM vetoriais não são invariantes do subsistema bariônico; Lz é o invariante ideal axisimétrico. Extrapolações do campo fixo são contadas por amostra. A origem de potencial foi restaurada na energia após a codificação polinomial.

## Custo efetivamente medido

| Ensaio | tempo total, s | passos GPU, s | diagnósticos, s | máx. abs. δE |
|---|---:|---:|---:|---:|
| A-base-s2026-t20 | 2.046 | 0.000 | 0.000 | 6.70767e-11 |
| A-base-s2026-t200 | 3.534 | 0.000 | 0.000 | 1.03727e-10 |
| A-base-s2027-t20 | 2.105 | 0.000 | 0.000 | 2.49655e-11 |
| A-base-s2027-t200 | 3.446 | 0.000 | 0.000 | 2.68422e-11 |
| A-base-s2028-t20 | 2.063 | 0.000 | 0.000 | 3.47165e-11 |
| A-base-s2028-t200 | 3.475 | 0.000 | 0.000 | 9.96243e-11 |
| A-thin2-s2026-t200 | 5.528 | 0.000 | 0.000 | 9.15764e-11 |
| A-thin2-s2027-t200 | 5.507 | 0.000 | 0.000 | 4.14368e-11 |
| A-thin2-s2028-t200 | 5.520 | 0.000 | 0.000 | 8.84373e-11 |
| B-base-s2026-t20 | 10.647 | 0.588 | 9.645 | 5.86032e-08 |
| B-base-s2026-t200 | 15.840 | 4.936 | 9.621 | 7.42586e-08 |
| B-base-s2027-t20 | 10.037 | 0.575 | 9.065 | 7.03467e-08 |
| B-base-s2027-t200 | 15.575 | 4.905 | 9.525 | 6.29963e-08 |
| B-base-s2028-t20 | 10.108 | 0.593 | 9.061 | 7.60633e-08 |
| B-base-s2028-t200 | 15.714 | 4.935 | 9.536 | 6.16426e-08 |
| B-bulge2-s2026-t20 | 12.704 | 0.706 | 11.509 | 5.04095e-08 |
| B-bulge2-s2026-t200 | 20.018 | 6.064 | 12.726 | 6.78008e-08 |
| B-bulge2-s2027-t20 | 12.632 | 0.716 | 11.478 | 5.52955e-08 |
| B-bulge2-s2027-t200 | 19.324 | 6.035 | 12.039 | 4.56057e-08 |
| B-bulge2-s2028-t20 | 12.644 | 0.719 | 11.529 | 4.89304e-08 |
| B-bulge2-s2028-t200 | 19.376 | 6.026 | 12.019 | 6.96972e-08 |
| B-thick2-s2026-t20 | 12.390 | 0.686 | 11.310 | 6.22228e-08 |
| B-thick2-s2026-t200 | 18.949 | 5.605 | 11.980 | 8.80043e-08 |
| B-thick2-s2027-t20 | 12.442 | 0.690 | 11.343 | 7.17123e-08 |
| B-thick2-s2027-t200 | 18.891 | 5.696 | 11.981 | 7.06575e-08 |
| B-thick2-s2028-t20 | 12.468 | 0.723 | 11.349 | 8.28948e-08 |
| B-thick2-s2028-t200 | 18.802 | 5.611 | 11.966 | 8.12499e-08 |
| B-thin2-s2026-t20 | 20.483 | 0.890 | 19.186 | 3.24689e-08 |
| B-thin2-s2026-t200 | 29.038 | 7.436 | 20.130 | 7.91278e-08 |
| B-thin2-s2027-t20 | 20.390 | 0.888 | 19.088 | 5.44549e-08 |
| B-thin2-s2027-t200 | 32.736 | 7.453 | 23.572 | 4.00394e-08 |
| B-thin2-s2028-t20 | 20.454 | 0.909 | 19.108 | 9.27217e-08 |
| B-thin2-s2028-t200 | 29.643 | 7.482 | 20.553 | 1.03075e-07 |
| H-nh20000-b2026-h2026-t20 | 86.989 | 2.639 | 83.865 | 2.24687e-07 |
| H-nh20000-b2026-h2027-t20 | 86.878 | 2.658 | 83.705 | 2.13016e-07 |
| H-nh20000-b2026-h2028-t20 | 86.970 | 2.646 | 83.781 | 1.07558e-07 |
| H-nh4000-b2026-h2026-t20 | 18.693 | 0.950 | 17.432 | 2.28431e-07 |
| H-nh4000-b2026-h2026-t200 | 29.603 | 7.098 | 20.919 | 2.67812e-07 |
| H-nh4000-b2026-h2027-t20 | 18.588 | 0.928 | 17.356 | 2.77430e-07 |
| H-nh4000-b2026-h2027-t200 | 26.757 | 7.057 | 18.243 | 9.07349e-07 |
| H-nh4000-b2026-h2028-t20 | 17.805 | 0.944 | 16.525 | 8.53172e-07 |
| H-nh4000-b2026-h2028-t200 | 25.677 | 7.045 | 17.191 | 1.13145e-06 |
| H-nh40000-b2026-h2026-t20 | 254.859 | 6.040 | 248.073 | 5.92651e-08 |
| H-nh40000-b2026-h2026-t200 | 298.519 | 44.471 | 248.999 | 1.40905e-07 |
| H-nh40000-b2026-h2027-t20 | 257.367 | 6.024 | 250.564 | 9.10898e-08 |
| H-nh40000-b2026-h2027-t200 | 298.556 | 45.607 | 248.362 | 2.80494e-07 |
| H-nh40000-b2026-h2028-t20 | 254.432 | 6.013 | 247.631 | 9.12004e-08 |
| H-nh40000-b2026-h2028-t200 | 300.748 | 45.681 | 250.286 | 1.48025e-07 |
| H-nh8000-b2026-h2026-t20 | 29.489 | 1.319 | 27.819 | 3.13913e-07 |
| H-nh8000-b2026-h2027-t20 | 29.477 | 1.313 | 27.764 | 1.70414e-07 |
| H-nh8000-b2026-h2028-t20 | 29.586 | 1.356 | 27.883 | 3.21204e-07 |

O bloco diagnóstico inclui energia e análises estruturais; cada função interna não foi cronometrada isoladamente. Em Nh=40.000,Ntotal=46.000, o custo desse bloco domina o teste curto, enquanto os passos diretos GPU são muito menores. O overhead restante inclui inicialização, leituras, serialização e checkpoints. Os controles A têm outro algoritmo/Hamiltoniana e seus tempos nativos não são um benchmark equivalente de C.

Não foi necessário trocar a gravitação direta por Barnes–Hut/PM. A nova representação polinomial melhora a precisão do campo externo fixo, não altera a complexidade O(N²) dos pares vivos. Não se tentou aumentar consumo de VRAM como se fosse ganho de precisão. A RX7600 é o hardware informado pelo usuário; os tempos referem-se ao dispositivo WebGPU disponível nesta execução.
