# Aquecimento numérico e mecanismos 1.0.5

## Evidência medida

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

## Refinamento isolado dos bárions

Foram executados nove controles novos de 200 Myr, três sementes por componente alterada: bojo1500→3000; fino 7092→14184; espesso954→1908. As massas totais e as outras populações foram preservadas. Cada componente alterada foi amostrada da mesma DF, sem clones. O halo contínuo compatível remove sua granularidade e sua resposta dinâmica.

| Refinamento no halo contínuo | Δcrescimento h50 fino[p.p.] | IC95% | Δaumento σz²[(km/s)²] | IC95% |
|---|---:|---|---:|---|
| B-bulge2 | -1.517 ± 1.848 | [-6.109, 3.075] | -27.942 ± 58.627 | [-173.581, 117.696] |
| B-MIX | 0.294 ± 2.554 | [-6.050, 6.638] | -40.184 ± 104.458 | [-299.673, 219.304] |
| B-thick2 | -1.460 ± 2.857 | [-8.558, 5.638] | 17.611 ± 77.521 | [-174.962, 210.184] |
| B-thin2 | -1.582 ± 4.010 | [-11.543, 8.379] | -45.186 ± 175.946 | [-482.260, 391.888] |


Os intervalos dos contrastes de bojo/espesso incluem zero; estas amostras não isolam uma contribuição significativa de cada uma ao aquecimento residual. Isso não demonstra contribuição nula. A duplicação de uma componente muda simultaneamente sua massa por partícula e sua realização discreta. Não foi promovido um refinamento bariônico ao sistema vivo com base em redução média pequena sem evidência robusta. Os candidatos vivos selecionados para esta campanha mantêm os bárions originais e refinam o halo. O experimento vivo G104 do fino quadruplicado continua preservado como evidência histórica distinta, com halo40000.

## Halo e comparações pareadas

E: Nh 80000, N89546; F: Nh 160000, N169546. Massas por macro partícula de halo:13114115.151482 e6557057.575741 M☉. Somente halo e sua amostragem mudam. O contraste F−E de crescimento fino foi-0.790 ± 3.872 p.p., IC95%[-10.408, 8.829]; o contraste de aumento de variância foi-4.171 ± 47.066(km/s)². Não foi ajustada uma lei de potência ou extrapolação N→infinito a dois níveis.

Nas realizações E/F, as massas por partícula dos bárions são: bojo6133343.645 M☉, fino 5611957.135 M☉, espesso11215932.914 M☉. Em F, a macro partícula do espesso é mais massiva que a do halo. Essa comparação motiva os controles bariônicos, mas não substitui os contrastes medidos nem demonstra que uma população seja a causa dominante.

## Flexão, respiração, modos e migração

Os modos de densidade m=1,2,3,4 têm amplitudes, fases e referências condicionais de ruído por anel. A triagem considera regiões adjacentes e persistência, sem transformar significância condicional ou épocas correlacionadas em detecção de uma barra. O início antipodal suprime modos ímpares de densidade e não representa a amostragem genérica de uma galáxia real.

| Modelo | Halo-semente | Máx.A2 em 2–12 kpc | Máx.anéis adjacentes na triagem | Maior sequência de épocas |
|---|---:|---:|---:|---:|
| E | 2026 | 0.19201 | 2 | 0 |
| E | 2027 | 0.18605 | 2 | 0 |
| E | 2028 | 0.25815 | 3 | 3 |
| F | 2026 | 0.23283 | 3 | 2 |
| F | 2027 | 0.19641 | 2 | 0 |
| F | 2028 | 0.20998 | 2 | 0 |


A sequência conta épocas consecutivas com pelo menos três anéis adjacentes acima da referência condicional. Não é um teste de significância temporal. pattern-geometry.json também guarda coerência radial de fase, ajustes condicionais de geometria e diferenças de fase com verificação de aliasing sob frequências iniciais. Ajustes aceitos em uma época ou a compatibilidade com fase constante são candidatos descritivos, sem identificação única de barra, braço ou mecanismo de aquecimento. Dados correlacionados, múltiplos padrões e mudanças de plano limitam a interpretação.

Momentos verticais complexos ⟨z exp(im phi)⟩ e ⟨vz exp(im phi)⟩ investigam deformações, inclusive quando a média global cancela por simetria. Respiração é descrita por b=Cov(z,vz)/Var(z); a identidade Var(vz)=b²Var(z)+Var(vz-bz) separa apenas o fluxo linear ajustado. A variância residual ainda pode conter movimentos coletivos não lineares e não é calor colisional puro. O diagnóstico nunca modifica velocidades integradas.

As coortes originais mantêm IDs ao longo do tempo. A decomposição nos extremos usa Var[vz(t)|It]−Var[vz(0)|I0]={Var[vz(t)|It]−Var[vz(0)|It]}+{Var[vz(0)|It]−Var[vz(0)|I0]}. A primeira parcela acompanha a seleção final de volta ao início; a segunda muda apenas a composição inicial. Isso separa seleção e evolução descritivamente, sem remover toda a física coletiva. Análises por plano próprio, por plano inicial e por anel complementam o eixo cartesiano fixo.

O Q=sigmaR*kappa/(3,36G Sigma) usa frequências iniciais e a hipótese idealizada de disco fino, não suavizado e de uma só população. Não é aplicado como certificado tridimensional global.

## Energia entre populações

K e Kz por população são registrados ao longo dos ensaios novos. Eles mostram redistribuição cinemática, mas não equivalem à energia total transferida pelo halo: a atribuição da energia potencial de interação entre componentes depende de convenção. Não foi calculada uma decomposição completa de trabalho gravitacional por componente. Conservação global e contrastes de controles não identificam uma fração causal única para cada mecanismo.

| Modelo | População | ΔK0–200 | ΔKz0–200 |
|---|---|---:|---:|
| E | Bojo | 0.0000701 ± 0.0004232 | -0.0002433 ± 0.0002502 |
| E | Fino | 0.0008567 ± 0.0017981 | 0.0008032 ± 0.0000363 |
| E | Espesso | -0.0002706 ± 0.0002781 | -0.0000771 ± 0.0002282 |
| E | Halo | -0.0050547 ± 0.0122855 | 0.0003464 ± 0.0010959 |
| F | Bojo | 0.0005152 ± 0.0006367 | -0.0002461 ± 0.0004168 |
| F | Fino | 0.0013824 ± 0.0011087 | 0.0007945 ± 0.0000949 |
| F | Espesso | -0.0001528 ± 0.0001800 | -0.0000741 ± 0.0000084 |
| F | Halo | -0.0052907 ± 0.0120592 | 0.0001755 ± 0.0046894 |


Unidades da tabela:10¹⁰M☉ kpc²/Myr²; média±SD de três halos, bárions fixos. As somas por população nos extremos foram recalculadas a partir dos estados completos e fecham o K global registrado. Kz inclui movimentos coerentes. A referência E/h2026 tem extremos completos preservados, ainda que a nova série por componente não estivesse instrumentada naquele ensaio histórico. Os novos ensaios mantêm as séries completas; mudanças de K devem ser analisadas junto de U, sem atribuir automaticamente sua origem a outra população. Nos controles B, não há energia cinética dinâmica do halo externo representada por partículas.

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
