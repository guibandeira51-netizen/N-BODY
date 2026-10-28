# Validação das condições iniciais 1.0.5

## Referência preservada

As DFs calibradas e o potencial Plummer da 1.0.2 usados pela1.0.4 permanecem originais. Massas por população[bojo,fino,espesso,halo] em M☉:[9200015467.282112, 39800000000.00001, 10699999999.999998, 1049129212118.5566]. A massa total do halo truncado não é confundida com a massa encerrada no raio de referência observacional. Os arquivos de configuração e os perfis contínuos são incluídos como fontes.

Parâmetros históricos de referência: bojo9,2×10⁹M☉; discos fino 3,98×10¹⁰M☉ e espesso1,07×10¹⁰M☉, escalas radiais2,43e3,88 kpc; halo NFW com massa8,2×10¹¹M☉ dentro do raio de referência 207 kpc e escala14,4 kpc. O modelo amostrado tem corte exponencial suave em 414 kpc, bojo esferizado e omite gás frio/CGM, sem transferir suas massas para estrelas. Os priors cinemáticos35/50km/s e a calibração vertical são escolhas explícitas do modelo, não novos ajustes observacionais. physical-parameters.json preserva os parâmetros, intervalos marginais e hashes; não sorteamos esses intervalos como erros independentes.

A iteração prepara rho_i=∫f_i(J[Phi_epsilon])d³v e Phi_epsilon=-G∫rho(x')/[|x-x'|²+epsilon²]¹ᐟ²d³x'. Convergência do potencial médio não torna as ações aproximadas integrais exatas, nem impõe todos os momentos de Jeans. A densidade física é distinta de sua convolução efetiva na equação de Poisson.

## Ações e estacionariedade de f(J)

As três auditorias nativas preservadas acompanharam128representantes orbitais independentes de cada população em 200 Myr no campo fixo. A tabela mostra quantis de abs(log[f200/f0]) da semente2026; as outras duas realizações e os41 estados constam nos arquivos nativos originais incluídos. Variação de f(J) ao longo de uma órbita exata do campo é um diagnóstico de sua estacionariedade aproximada, não um erro verdadeiro das ações contra um oráculo exato. Caudas com grandes mudanças de f podem amplificar pequenos erros de ações em regiões de forte gradiente da DF.

| População | q50 abs(log f200/f0), s2026 | q90, s2026 | q99, s2026 |
|---|---:|---:|---:|
| Bojo | 0.018488 | 0.101387 | 0.227658 |
| Fino | 0.009160 | 0.099679 | 0.659929 |
| Espesso | 0.004608 | 0.045654 | 0.115616 |
| Halo | 0.000309 | 0.006238 | 0.101473 |


Essas integrações não contêm encontros entre macro partículas. O erro orbital individual e os casos inválidos também são registrados, separadamente da variação de f. A quadratura independente105mostra que parte dos resíduos dos momentos persiste além da variação entre scrambles; não resolve, sozinha, a separação entre aproximação de ações, representação do potencial e fidelidade da DF.

## Tentativa de preparação105: MIX

Cada órbita original independente recebeu um tempo uniforme sorteado previamente em[0,001,1000]Myr no MESMO potencial total fixo. Foi integrada com DOP853 Float64, reconstruindo sua parceira antipodal. Pesos e órbitas originais foram preservados, sem esfriamento, seleção por h50 ou reescalonamento de velocidades. Foram preparadas três realizações completas de 89546 partículas, preservando fontes, tempos sorteados e testes individuais de energia e Lz.

Essa é uma tentativa finita de média orbital. Não há otimização de pesos à densidade nem solução nova de autoconsistência. Portanto não é denominada GALIC ou Schwarzschild completo. O campo original só pode ser mantido como referência de teste, até verificar sua compatibilidade com a nova distribuição.

Os controles contínuos novos integraram TODOS os9546bárions de cada tentativa por 200 Myr,41 estados, preservados em JSONL. O fino mudou-2.022 ± 2.988%; o espesso,2.488 ± 6.348%. Os intervalos não demonstram equivalência dentro dos critérios registrados. A maior mudança de distribuição radial binned atingiu5.660% entre a amostra original e a faseada. Também foram executados três controles de bárions vivos com halo fixo: h50 fino 11.451 ± 0.802%.

**Não foi obtida uma preparação aperfeiçoada globalmente validada.** A tentativa MIX permanece identificada e reprovada para promoção; não substitui a E104 nem foi promovida ao sistema totalmente vivo. A janela de 1Gyr de construção não é uma simulação autogravitante estável de 1Gyr.

## Compatibilidade observacional e alternativas

Não houve refit de massas, alturas-alvo ou dispersões observacionais. As distribuições radiais, alturas solares de amostra, dispersões R/phi/z e massas antes/depois estão em ic-audit.json. As medianas solares da densidade contínua original e suas diferenças dos alvos permanecem documentadas na1.0.4; pequenas amostras solares de partículas não substituem esses perfis. A tentativa rejeitada não é apresentada como novo ajuste da Via Láctea.

Uma próxima preparação mais forte pode exigir ajuste de pesos orbitais sob restrições de densidade e cinemática, ou melhor tratamento das ações no potencial achatado. As referências abaixo fornecem alternativas; implementá-las exige reproduzir a mesma gravidade suavizada e validar todas as populações. Não é justificável alterar velocidades até uma curva ficar horizontal.

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
