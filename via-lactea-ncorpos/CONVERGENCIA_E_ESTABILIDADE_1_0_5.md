# Convergência e estabilidade 1.0.5

## Critérios antes dos resultados novos

| Indicador | Critério prospectivo em 200 Myr |
|---|---|
| h50 fino e espesso | IC95% da mudança dentro de±5% |
| Variância vertical | IC95% dentro de±10% |
| Deriva100–200 Myr de h50 / h0 | IC95% dentro de±2,5% |
| Deriva100–200 Myr de variância / variância0 | IC95% dentro de±5% |
| Raios de meia massa | IC95% da mudança dentro de±5% |
| Distância de massa radial em bins(TV) | limite superior do IC95%≤5% |
| Energia | máximo amostrado relativo≤10⁻⁵ |
| Força de referência | q99 vetorial e vertical/|a|≤10⁻³ |


Os limites foram registrados após conhecer a1.0.4 e antes de observar os resultados novos. São objetivos de precisão deste estudo: controlar espessura a5% para distinguir mudanças estruturais da ordem de dezenas de porcento, reservando metade desse orçamento à deriva tardia de 100 Myr. Não são tolerâncias universais, erros observacionais ou critérios ajustados para aprovar o candidato. A análise combina variação total, tendência tardia, dispersão entre sementes e resolução; equivalência exige o intervalo dentro do orçamento.

| Experimento | n | Δh50 fino[%] | Δh50 espesso[%] | Δσz² fino[(km/s)²] | Δh tardia/h0[%] |
|---|---:|---:|---:|---:|---:|
| A: potencial total fixo | 3 | 1.244 ± 1.369 | -3.524 ± 4.318 | 71.895 ± 39.311 | 0.889 |
| B: halo contínuo+bárions vivos | 3 | 11.157 ± 2.593 | -9.004 ± 0.369 | 242.397 ± 69.820 | 5.814 |
| C: E da 1.0.4, sementes diagonais | 3 | 17.893 ± 0.813 | -3.742 ± 1.318 | 369.909 ± 14.565 | 9.356 |
| A: tentativa MIX | 3 | -2.022 ± 2.988 | 2.488 ± 6.348 | 3.690 ± 45.287 | -0.661 |
| B: tentativa MIX | 3 | 11.451 ± 0.802 | -5.788 ± 4.487 | 202.212 ± 87.107 | 6.415 |
| B: bojo×2 | 3 | 9.640 ± 2.034 | -5.854 ± 2.881 | 214.454 ± 11.325 | 3.706 |
| B: fino 7092→14184 | 3 | 9.575 ± 2.308 | -5.602 ± 7.960 | 197.211 ± 120.802 | 4.888 |
| B: espesso×2 | 3 | 9.697 ± 2.003 | -0.386 ± 0.790 | 260.007 ± 93.264 | 4.670 |
| E105: Nh 80000, bárions fixos | 3 | 19.077 ± 1.071 | -2.314 ± 1.314 | 385.898 ± 17.444 | 12.272 |
| F105: Nh 160000, bárions fixos | 3 | 18.287 ± 3.143 | -2.889 ± 2.163 | 381.727 ± 45.587 | 12.897 |


## Comparação de resolução

E/F usam exatamente os mesmos bárions da semente2026 e três sementes de halo. E104/A/B originais variam três realizações bariônicas: suas incertezas não são intercambiáveis. A trajetória E/h2026 é reutilizada por referência e não contada como uma nova integração.

O candidatoF tem a menor mudança média absoluta de h50 fino na comparação E/F. Isso não significa melhor desempenho de todas as populações. O arquivo decision.json enumera cada teste, orçamento e intervalo; não houve promoção global. A equivalência do contraste de h50 entre E/F não foi demonstrada. Mesmo um contraste pequeno de espessura entre dois N não demonstra convergência de dispersões, perfis e modos nem ausência de deriva.

A referência E/h2026 reutilizada tem limite analítico de deriva energética sob G/epsilon² efetivos de 1.44522249e-07, abaixo do orçamento 10⁻⁵. A expressão limita a mudança de convenção do Hamiltoniano, sem inventar estados intermediários ou reescrever a medida histórica.

## Precisão temporal e suavização

Foram reutilizados os ensaios D/2026 da 1.0.4 com dt0,1/0,05/0,025 Myr, mantendo as mesmas fases. As espessuras finais próximas e o espessamento persistente indicam que dt isolado não explica o comportamento. Esse controle de uma realização D não certifica todas as sementes de F; seria necessário ampliar a convergência temporal antes de uma promoção final. ε=0,1 kpc foi mantido. Nenhuma outra suavização foi usada sem preparação compatível.

## Custo, método e memória

O piloto F integrou2 Myr. Previu728.3s para200 Myr e3592.6s para1Gyr por realização, antes da medição longa. São estimativas; tempos reais estão nos resultados. A admissão estimou46.89 MiB de buffers/estado e exclui driver, navegador, fragmentação e outras aplicações; não é medição da VRAM total. O hardware informado pelo usuário é Ryzen7 5700X,16 GB RAM,RX7600 8 GB; o navegador reporta AMD/rdna-3 e16processadores lógicos, sem identificação completa da placa.

A campanha registrou falhas de acesso ao coletor isolado e perdas da instância WebGPU antes do primeiro checkpoint F200. Os resultados E concluídos foram preservados. Comandos GPU longos foram considerados uma possível causa, sem diagnóstico independente do driver. A execução passou a enviar no máximo quatro passos KDK por comando, com os mesmos shaders e força. Um segundo piloto F de 2 Myr mostrou igualdade bit a bit de TODAS as posições, velocidades e acelerações das169546 partículas com o piloto original. O registro scheduling-validation.json distingue essa correção operacional de qualquer alteração física ou estabilização. As tentativas falhas não são contadas como integrações concluídas.

H/Nh 320000 não foi lançado: o escalonamento operacional do piloto F previa2751.6s por 200 Myr, acima do teto prospectivo de 1200s por realização. Isso não é um resultado medido de H nem uma limitação física universal. A força direta foi mantida nos candidatos medidos. O piloto do Barnes–Hut CPU existente, três theta, avalia custo e precisão inicial; não valida sua conservação ou evolução estrutural. PM e árvore GPU não foram implementados nem promovidos sem referências. Energia usa seis workers CPU; os pilotos não são benchmarks de máquina dedicada.

| theta | Uma forçaCPU completa[s] | q99 erro vetorial/|a| | q99 erro vertical/|a| |
|---:|---:|---:|---:|
| 0.5 | 4.7952 | 6.994888e-03 | 3.918184e-03 |
| 0.3 | 16.1410 | 1.476669e-03 | 9.152460e-04 |
| 0.2 | 44.4867 | 4.220855e-04 | 2.901482e-04 |


A média do lote de 32 avaliações diretas GPU do piloto foi 0.113961s por força. Os tempos incluem modalidades diferentes de submissão, construção da árvore e aquecimento do código; servem à triagem operacional, sem razão universal de aceleração. O erro de força do Barnes–Hut não é tratado como erro temporal ou energia exata.

## Horizonte

Todos os novos resultados estruturais terminam em 200 Myr. Não foram iniciados400,600ou1000 Myr porque os critérios globais e de deriva não foram satisfeitos. O período circular solar é214,668 Myr:200 Myr≈0,932período, insuficiente para falar em vários períodos orbitais. A janela orbital de preparação MIX e o experimento legacy antigo de≈1,51Gyr, Jeans+Satoh e80000 partículas totais, não são a família E104 e não validam E/F.

## Convenções e limites de interpretação

Comprimento: kpc; tempo: Myr; massa interna:10¹⁰ massas solares nominais. Energia interna:10¹⁰ M☉ kpc²/Myr². Velocidades em gráficos são convertidas para km/s; o gerador preserva a conversão nominal de G registrada na preparação. h50 é a mediana ponderada de distância absoluta ao plano próprio da população. σz usa o eixo cartesiano original; σ perpendicular e inclinações são guardadas separadamente. Espessuras globais, por anel e alturas solares da densidade contínua são grandezas diferentes.

As partículas representam macro massas, não estrelas individuais nem partículas microscópicas de matéria escura. O modelo é newtoniano, isolado e sem gás ou perturbações externas explicitamente modeladas. Massas totais não foram reajustadas. Evolução usa KDK, ε=0,1 kpc e dt nominal 0,05 Myr. Não houve amortecimento, recentering, reposicionamento, congelamento oculto, multiplicador gravitacional ou correção vertical da trajetória.

Três realizações permitem médias, desvios amostrais e intervalos t com 2 graus de liberdade; não demonstram uma distribuição assintótica. Intervalos de 95% são por indicador, sob hipótese aproximada de normalidade das médias de realização, sem garantia conjunta para todas as grandezas. Épocas correlacionadas não contam como novas sementes. Ausência de significância não equivale a equivalência.

No sistema isolado vivo, E, P e L vetorial são invariantes ideais. Nos controles com campo externo axisimétrico fixo, energia e Lz são os invariantes pertinentes; não se exige conservação de P, L vetorial ou movimento balístico do centro de massa dos traçadores/bárions. As condições de simetria estão em cada diagnóstico. A suavização Plummer é uma regularização da gravitação pontual nas escalas próximas de 100 pc; convergir em N a epsilon fixo não demonstra o limite newtoniano não suavizado.
