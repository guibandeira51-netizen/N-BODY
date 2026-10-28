# Validação final 1.0.5 — experimental

## Resultado principal

A campanha investigou as condições iniciais, realizou controles de campo contínuo e autogravidade, testou uma preparação alternativa e refinou o halo com bárions fixos. Não foi demonstrada estacionariedade estrutural global de longo prazo. Resultados negativos e limites são parte da conclusão científica.

19 integrações GPU novas concluídas:12 controles de bárions/halo contínuo, dois pilotos F de 2 Myr (custo e agendamento) e cinco ensaios vivos novos de 200 Myr. Três controles nativos completos novos de 200 Myr e três construções de fases orbitais complementam a campanha. Nove controles A/B/C históricos únicos foram reanalisados; a realização E/h2026 também serve à comparação pareada, sem ser contada novamente como integração. Preservação de 3238 arquivos históricos por hashes.

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


## Precisão e classificações independentes

- Conservação: orçamento energético amostrado satisfeito: sim; máximo novo 3.97014454e-07.
- Força inicial: máximo vetorial relativo2.61526152e-05; máximo do erro vertical normalizado pelo módulo da referência 1.80762410e-05. São probes fixos, até 32 por população, e não todos os pontos da trajetória.
- Equilíbrio inicial: parcial/aproximado, sem certificação global. Quadratura Sobol fornece verificação independente dos resíduos em regiões selecionadas.
- Estacionariedade estrutural: não demonstrada pelos critérios prospectivos e tendências medidas.
- Convergência: parcial; não é convergência global N→infinito ou ε→0.
- Instabilidade física: mecanismos coletivos não isolados conclusivamente.

## 1. As condições iniciais originais estavam suficientemente próximas do equilíbrio?

Próximas em algumas medidas do fino no campo médio; não suficientemente demonstradas como equilíbrio global. Os controles contínuos mudam menos que o sistema vivo, e os resíduos espaciais/independentes dos momentos impedem certificação exata.

## 2. Foi possível melhorar essa preparação?

Foi implementada e testada a tentativa MIX de fases orbitais. Ela não demonstrou melhoria consistente das populações e não foi promovida. Não há uma preparação aperfeiçoada globalmente validada nesta entrega.

## 3. Qual foi a contribuição identificável da granularidade do halo?

O refinamento mantém massas e bárions e mede a dependência com N; F−E em h50 fino=-0.790 p.p. A diferença entre halo vivo e fixo inclui sua resposta coletiva, portanto não é uma fração pura de aquecimento por encontros.

## 4. O bojo ou o disco espesso contribuíam significativamente?

Os nove controles isolados não estabelecem uma contribuição significativa separada com três sementes; os intervalos dos contrastes incluem zero. Também não demonstram contribuição nula. O aquecimento residual com halo contínuo exige investigar a resposta bariônica e a preparação.

## 5. Existe evidência de instabilidade física coletiva?

Há modos e movimentos coletivos mensuráveis, mas não uma instabilidade física específica isolada e validada quanto a coerência, ruído e convergência. Fourier não é automaticamente uma detecção de barra ou espiral.

## 6. Qual configuração apresentou a menor deriva estrutural?

Na comparação pareada E/F, F teve a menor mudança média absoluta de h50 fino em 200 Myr. A escolha depende desse indicador e não comprova melhor desempenho global. As tabelas incluem espesso, dispersões, raios e tendências.

## 7. Há convergência demonstrável com a resolução?

Há controles de força, energia, passo e dependência de N. A convergência estrutural global não foi demonstrada. Dois N de halo e uma realização bariônica fixa não estabelecem um limite assintótico.

## 8. Por quanto tempo a configuração foi efetivamente integrada?

200 Myr nos ensaios estruturais selecionados, com três halos por E/F; o piloto F tem2 Myr. Não há 400/600/1000 Myr novos.

## 9. A energia foi conservada no domínio exigido?

O máximo novo amostrado |ΔE|/|E0| foi 3.97014454e-07, frente ao orçamento 10⁻⁵. O critério energético foi atendido. O Hamiltoniano usa G e ε² efetivos f32 nos ensaios 105 e soma direta Float64; não é um limite dos picos entre amostras.

## 10. Podemos afirmar equilíbrio aproximado ou estacionariedade estrutural?

Podemos descrever uma preparação aproximada e qualificar separadamente os controles no domínio medido. Não podemos afirmar estacionariedade estrutural global nem estabilidade prolongada da galáxia viva. Não houve promoção científica de E/F.

## 11. Quais limitações impedem conclusões mais fortes?

Ações aproximadas e resíduos dos momentos; baixa resolução de algumas populações; variabilidade de apenas três halos com bárions fixos; dependência residual de N; domínios temporais curtos; precisão de trajetória Float32; ausência de uma separação causal única e de validação observacional nova completa.

## 12. Como apresentar à banca de Engenharia Física?

Apresente a hipótese de um modelo newtoniano com halo, o Hamiltoniano e as unidades, a preparação, os controles pareados, convergência/erro, resultados com incertezas e a decisão de não certificar estabilidade. O resultado científico é investigar consequências dinâmicas e limitações de representação. Não é prova da existência da matéria escura nem reprodução completa da Via Láctea real.

## Afirmação sugerida para a defesa

“Desenvolvemos e verificamos um simulador gravitacional N-corpos e uma campanha controlada de modelos semelhantes à Via Láctea. Quantificamos o espessamento do disco e sua dependência da discretização, confrontamos campos contínuos e sistemas vivos e encontramos limites da preparação inicial. A conservação numérica foi controlada no domínio medido; a estacionariedade estrutural global permaneceu não demonstrada.”

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
