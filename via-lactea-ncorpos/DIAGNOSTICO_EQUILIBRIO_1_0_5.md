# Diagnóstico do equilíbrio dinâmico 1.0.5

## Conclusão

A preparação original é próxima da estacionariedade em algumas medidas do disco fino no campo médio, mas não foi demonstrada como equilíbrio global das quatro populações. O sistema vivo continua apresentando evolução estrutural em 200 Myr. A conservação numérica não resolve essa distinção.

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


E/F usam exatamente os mesmos bárions da semente2026 e três sementes de halo. E104/A/B originais variam três realizações bariônicas: suas incertezas não são intercambiáveis. A trajetória E/h2026 é reutilizada por referência e não contada como uma nova integração.

## Experimentos A, B e C

A: traçadores no potencial total contínuo Plummer fixo, AGAMA DOP853 Float64, precisão solicitada10⁻¹⁰. B: mesmos bárions com autogravidade direta GPU e halo contínuo fixo compatível. C: todas as componentes vivas, referência E104. Os nove controles preservados foram reanalisados com verificação das fases iniciais, massas e tags. As épocas20,50,100,200 Myr estão efetivamente medidas; as séries completas têm suas cadências declaradas.

No contínuo original, h50 fino mudou1.244 ± 1.369%; com bárions vivos e halo contínuo,11.157 ± 2.593%; no sistema E104 vivo,17.893 ± 0.813%. Esses contrastes mostram mudanças mesmo sem granularidade do halo. Ao trocar os controles também removemos resposta coletiva, e A usa outro integrador/precisão. Não se trata de uma decomposição causal única em encontros, migração e modos físicos.

## Onde a preparação exige cuidado

Foram acrescentadas216 avaliações nativas dos momentos de Jeans: quatro populações, seis raios por população, três alturas e três passos. As amostras cobrem o bojo interno até 0,1 kpc, discos até 20 kpc e halo até 100 kpc. Os termos dimensionais, densidades, momentos e sensibilidade espacial estão em ic-audit.json. As frequências positivas e a convergência do campo médio anteriores foram preservadas como evidência parcial.

A quadratura independente de Sobol usa quatro embaralhamentos independentes (scrambles) e16384/65536 velocidades por ponto, com números aleatórios comuns nos estênceis de diferenciação. Ela integra a mesma DF de ações aproximadas; não ajusta partículas ou funções de distribuição. A tabela mostra h=0,01 kpc,z=0,2 kpc,Nq=65536, média±desvio entre scrambles:

| População | R[kpc] | Resíduo radial | Resíduo vertical |
|---|---:|---:|---:|
| Bojo | 1.0 | -0.001594 ± 0.000019 | 0.058287 ± 0.000420 |
| Bojo | 8.122 | -0.002455 ± 0.000035 | -0.425581 ± 0.000142 |
| Fino | 1.0 | -0.001177 ± 0.000027 | 0.010045 ± 0.000009 |
| Fino | 8.122 | -0.000047 ± 0.000012 | -0.002954 ± 0.000019 |
| Espesso | 1.0 | -0.009252 ± 0.000022 | 0.083596 ± 0.000230 |
| Espesso | 8.122 | 0.000167 ± 0.000001 | -0.014372 ± 0.000027 |
| Halo | 1.0 | -0.009179 ± 0.001436 | 0.045453 ± 0.013774 |
| Halo | 8.122 | 0.004047 ± 0.000194 | -0.050179 ± 0.000672 |


Resíduos são somas assinadas divididas pela soma dos módulos dos termos de Jeans. Os resíduos do espesso em R=1 kpc persistem na quadratura independente, fortalecendo a evidência de uma limitação de preparação/ações naquele domínio. O bojo solar tem densidade muito baixa e não determina a qualidade global. O halo exige examinar a sensibilidade dos passos e da quadratura. Esses valores não são porcentagens exatas de desequilíbrio físico.

Não há evidência de uma explosão numérica no primeiro passo. Há evidência de uma preparação aproximada e de reorganização ao longo das primeiras épocas, com efeitos adicionais quando introduzida a autogravidade. Não foi medido um diagnóstico completo em cada passo de 0,05 Myr: as cadências dos controles são explícitas.

## Convenções e limites de interpretação

Comprimento: kpc; tempo: Myr; massa interna:10¹⁰ massas solares nominais. Energia interna:10¹⁰ M☉ kpc²/Myr². Velocidades em gráficos são convertidas para km/s; o gerador preserva a conversão nominal de G registrada na preparação. h50 é a mediana ponderada de distância absoluta ao plano próprio da população. σz usa o eixo cartesiano original; σ perpendicular e inclinações são guardadas separadamente. Espessuras globais, por anel e alturas solares da densidade contínua são grandezas diferentes.

As partículas representam macro massas, não estrelas individuais nem partículas microscópicas de matéria escura. O modelo é newtoniano, isolado e sem gás ou perturbações externas explicitamente modeladas. Massas totais não foram reajustadas. Evolução usa KDK, ε=0,1 kpc e dt nominal 0,05 Myr. Não houve amortecimento, recentering, reposicionamento, congelamento oculto, multiplicador gravitacional ou correção vertical da trajetória.

Três realizações permitem médias, desvios amostrais e intervalos t com 2 graus de liberdade; não demonstram uma distribuição assintótica. Intervalos de 95% são por indicador, sob hipótese aproximada de normalidade das médias de realização, sem garantia conjunta para todas as grandezas. Épocas correlacionadas não contam como novas sementes. Ausência de significância não equivale a equivalência.

No sistema isolado vivo, E, P e L vetorial são invariantes ideais. Nos controles com campo externo axisimétrico fixo, energia e Lz são os invariantes pertinentes; não se exige conservação de P, L vetorial ou movimento balístico do centro de massa dos traçadores/bárions. As condições de simetria estão em cada diagnóstico. A suavização Plummer é uma regularização da gravitação pontual nas escalas próximas de 100 pc; convergir em N a epsilon fixo não demonstra o limite newtoniano não suavizado.

## Fontes primárias e alcance

- [Cautun et al. 2020, Tabela 2, coluna NFW](https://arxiv.org/abs/1911.04557): referência dos parâmetros históricos de massa e escala. O modelo reduzido sem gás/CGM não é uma reprodução do ajuste observacional completo.
- [Vasiliev, AGAMA](https://arxiv.org/abs/1802.08239): funções de distribuição em ações, momentos e construção autoconsistente. A biblioteca não certifica a realização deste trabalho.
- [Ludlow et al. 2021](https://arxiv.org/abs/2105.03561): estudos publicados de aquecimento espúrio por macro partículas de halo; motivação do teste de resolução. Seus resultados não são apresentados como medições da nossa galáxia.
- [Vasiliev 2013, SMILE/Schwarzschild](https://arxiv.org/abs/1307.8116): superposição orbital com ajuste de pesos à densidade. Nosso ensaio MIX não implementa esse ajuste e não é denominado Schwarzschild completo.
- [Yurin & Springel 2014, GALIC](https://arxiv.org/abs/1402.1623): alternativa que otimiza a resposta de densidade orbital com restrições cinemáticas. Foi investigada metodologicamente, não instalada ou executada aqui; adaptação ao mesmo potencial suavizado e às restrições observacionais exigiria validação própria.
- [Toomre 1964](https://adsabs.harvard.edu/pdf/1964ApJ...139.1217T): critério local para um disco estelar idealizado. O Q calculado aqui é somente um indicador limitado.
