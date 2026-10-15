# Parâmetros, fontes e limites científicos

Este documento corresponde aos valores e métodos implementados em `src/physics/constants.js`, `models.js` e `initial.js`, conferidos em 10 de outubro de 2026. O TCC escrito foi lido como referência e preservado. O protótipo estuda uma galáxia idealizada, com três componentes de massa; não é uma reconstrução completa ou novo ajuste observacional da Via Láctea.

## 1. Extração do TCC e escolha de modelo

O TCC apresenta os modelos Hernquist, Miyamoto–Nagai e NFW, mas **não fornece valores numéricos de massas ou escalas dessas três componentes**, nem truncamento, dispersões, suavização ou passo temporal. O exemplo de `6×10^10 Msun` no raio solar é uma massa bariônica interior aproximada usada em motivação Kepleriana; não determina a massa total do disco. O valor ilustrativo de raio solar de 8,2 kpc e a faixa 220–240 km/s também não definem uma tabela observacional com incertezas.

Por isso adotamos um conjunto único de referência: **Gala MilkyWayPotential versão 1, reduzido a bojo, disco e halo**. Os parâmetros constam da Tabela 2 de [Marchetti (2021), Tabela 2](https://doi.org/10.1093/mnras/stab599). O modelo original contém ainda um núcleo Hernquist de 1,71×10^9 Msun e escala 0,07 kpc, aqui omitido. Sua massa não foi redistribuída silenciosamente. A comparação com/sem halo emprega o mesmo modelo reduzido.

[A documentação oficial do Gala](https://gala.adrian.pw/en/stable/supporting/define-milky-way-model.html) identifica a versão 1 como histórica, baseada em medições hoje desatualizadas. Ela foi escolhida por usar os perfis solicitados e permitir rastreabilidade. A versão 2 usa outra representação do disco e não foi adotada. Não atribuímos os números ao TCC nem aos artigos originais dos perfis.

| Símbolo / nome | Valor | Unidade física | Código, em 10^10 Msun quando massa | Origem; ano | Natureza; incerteza |
|---|---:|---|---:|---|---|
| Mb, massa total do bojo | 5×10^9 | Msun |0,5 | Marchetti Tabela 2;2021 | Modelo de referência; erro não fornecido na tabela |
| ab, escala Hernquist |1 |kpc |1 | Mesma tabela;2021 | Modelo de referência; erro não fornecido |
| Md, massa total do disco |6,8×10^10 |Msun |6,8 | Mesma tabela;2021 | Modelo de referência; erro não fornecido |
| ad, escala radial MN |3 |kpc |3 | Mesma tabela;2021 | Modelo de referência; erro não fornecido |
| bd, escala vertical MN |0,28 |kpc |0,28 | Mesma tabela;2021 | Modelo de referência; erro não fornecido |
| M_s, massa de escala NFW |5,4×10^11 |Msun |54 | Mesma tabela;2021 | Modelo de referência; erro não fornecido |
| rs, escala radial NFW |15,62 |kpc |15,62 | Mesma tabela;2021 | Modelo de referência; erro não fornecido |
| rho_s=M_s/(4πrs³) |≈1,12756×10^7 |Msun/kpc³ |Derivada | Relação matemática NFW | Derivado; incerteza global do modelo não estimada |

`M_s` **não é massa total ou massa virial**. Ela normaliza `M_NFW(<r)=M_s[ln(1+x)-x/(1+x)]`, com x=r/rs. O perfil não truncado tem massa total divergente. Cada partícula do halo representa uma fração da massa **efetivamente integrada do perfil truncado**, descrito abaixo.

## 2. Constantes e sistema de unidades

As unidades internas são **kpc, Myr e 10^10 massas solares nominais**. Velocidades têm unidade kpc/Myr; acelerações kpc/Myr²; energias em 10^10 Msun·kpc²/Myr². Usar kpc,kg e km/s no mesmo cálculo sem conversões seria inconsistente.

| Constante | Valor/convenção | Unidade | Fonte e natureza |
|---|---:|---|---|
| AU |149597870700 |m | Definição exata, IAU 2012 B2 |
| Parsec |AU×648000/π |m | Convenção angular; derivado |
| kpc |1000 parsecs≈3,08567758149×10^19 |m | Derivado |
| Ano juliano |365,25×86400 |s | Convenção de tempo; exato nesta conversão |
| Myr |31557600000000 |s | Um milhão de anos julianos; derivado |
| (GM)_sol nominal |1,3271244×10^20 |m³/s² | IAU 2015 B3; constante nominal exata |
| G interno |0,04498502151469553 |kpc³/(10^10 Msun·Myr²) | Derivado de(GM)_sol nominal e unidades |
| 1 km/s |0,001022712165045695 |kpc/Myr | Derivado das mesmas unidades |

Fontes oficiais: [IAU 2012](https://www.iau.org/static/resolutions/IAU 2012_English.pdf), [IAU 2015 B3](https://www.iau.org/static/resolutions/IAU 2015_English.pdf), [Prša et al. (2016)](https://arxiv.org/abs/1605.09788), DOI[10.3847/0004-6256/152/2/41](https://doi.org/10.3847/0004-6256/152/2/41). A constante nominal é uma convenção de conversão, não medição exata da massa solar. O motor usa diretamente o produto GM nominal e não precisa converter a massa solar para kg.

Se uma conversão para kg for necessária, [CODATA 2022/NIST](https://www.physics.nist.gov/cuu/pdf/wall_2022.pdf) fornece G=6,67430(15)×10^-11m³kg^-1s^-2. O TCC contém também o valor antigo6,672×10^-11; esse segundo valor não foi usado no motor.

## 3. Halo finito: convenção e massa

Definimos `r200c` pela densidade média interior igual a200 rhoCrit, com `rhoCrit=3H0²/(8πG)`. Usamos `H0=67,4±0,5km/s/Mpc`, valor inferido no modelo base ΛCDM de [Planck 2018, publicado em 2020](https://doi.org/10.1051/0004-6361/201833910). O motor usa 67,4 e não propaga sua incerteza. Esta escolha estabelece uma convenção de limite do halo; não modela expansão cosmológica.

Com os parâmetros adotados, o código resolve a equação NFW por bisseção e deriva:

| Quantidade derivada | Resultado de código | Significado |
|---|---:|---|
| rhoCrit |≈126,078 Msun/kpc³ | Densidade crítica da convenção cosmológica |
| r200c |206,6257986892013 kpc | Raio de referência do NFW original |
| c200c=r200c/rs |≈13,2283 | Concentração derivada |
| M200c |≈9,31778×10^11 Msun | Massa do NFW original interior a r200c |
| Raio externo do perfil usado |247,95095842704154 kpc |1,2 r200c |
| Massa total do halo truncado |≈9,76315764×10^11 Msun | Quadratura de `haloDensity`; não M_s ou M200c |

O NFW é preservado até r200c. Entre r200c e1,2 r200c, multiplicamos sua densidade por `T(u)=1-10u³+15u⁴-6u⁵`, onde `u=(r-r200c)/(0,2 r200c)`. Fora do raio externo a densidade é zero. T e suas duas primeiras derivadas são contínuas nas bordas. A largura0,2 é uma **escolha numérica do protótipo**, não medida galáctica; precisa de estudo de sensibilidade. A massa exterior à transição é retirada e a massa da transição é contada pela integral real do perfil.

[Baltz, Marshall & Oguri (2009)](https://doi.org/10.1088/1475-7516/2009/01/015), [apêndice A](https://arxiv.org/pdf/0705.0682), foram investigados como exemplo primário de truncamento suave finito. Seu perfil usa fatores `rt²/(r²+rt²)` elevados a 1 ou 2 e altera também o interior. **O taper quintic adotado não reproduz BMO**; não atribuímos sua largura ou forma àquele artigo.

O potencial finito inclui massa interior e cascas exteriores, com zero no infinito: `Phi_h(r)=-G[M(<r)/r+4π∫_r^rmax rho(s)s ds]`. A massa acumulada e integral das cascas são calculadas em tabela logarítmica de 4096 pontos, desde10^-6 kpc. Esses são parâmetros de quadratura, a convergir. O potencial NFW infinito não é usado como energia de escape do halo finito.

## 4. Distribuições de densidade e amostragem

As formas dos perfis vêm dos artigos originais: [Hernquist (1990)](https://doi.org/10.1086/168845), [Miyamoto & Nagai (1975)](https://doi.org/10.1093/pasj/27.4.533), [Navarro, Frenk & White (1997)](https://doi.org/10.1086/304888). As massas e escalas numéricas da seção 1 vêm do modelo Gala v1 documentado, não desses artigos.

RMS de tamanho e altura exportados são estatísticas da realização finita, sensíveis às caudas. O segundo momento radial de Hernquist e o segundo momento vertical da marginal MN não são finitos em seus perfis não truncados. Por isso a auditoria de estabilidade usa principalmente raios de meia massa e quantis de altura, em vez de interpretar o RMS como tamanho convergente da galáxia contínua.

Bojo: `rho_b=Mb ab/[2πr(r+ab)³]`, massa acumulada `Mb r²/(r+ab)²`. Amostragem radial por inversão exata `r=ab sqrt(U)/(1-sqrt(U))`, com direção esférica uniforme. Não há truncamento artificial do bojo, que já tem massa total finita.

Disco: definir `ζ=sqrt(z²+bd²)` e `A=ad+ζ`. Usamos a densidade exata de Miyamoto–Nagai:

`rho_d=Md bd²[adR²+(ad+3ζ)A²]/[4πζ³(R²+A²)^(5/2)]`.

A amostragem não substitui esse disco por exponencial. A marginal vertical é `p(z)=bd²/(2ζ³)`, cuja inversão é `z=bd u/sqrt(1-u²)` para u uniforme(-1,1). A distribuição condicional R é uma mistura com probabilidades ad/A eζ/A, com inversores `R=A sqrt[(1-U)^-2-1]` e `R=A sqrt[(1-U)^(-2/3)-1]`. A derivação foi conferida pela integração radial: `adR²+(ad+3ζ)A²=ad(R²+A²)+3ζA²`; as duas parcelas integram a ad/A eζ/A. Azimute uniforme. Não há cutoff radial ou vertical do MN. Caudas distantes são próprias do modelo, não erro visual.

Halo: amostragem da CDF da densidade NFW com taper, usando quadratura e inversão interpolada; direções uniformes na esfera. Todas essas partículas têm massa e participam da gravitação instantânea.

## 5. Velocidades iniciais implementadas

O inicializador é **aproximado, baseado em momentos de Jeans e Gaussiana local**. Ele não é implementação do GalIC ou AGAMA, não usa funções de distribuição em ações e não prova equilíbrio collisionless. Não afirmamos estabilidade inicial prolongada demonstrada. As densidades e velocidades médias podem reajustar-se durante a evolução.

Bojo e halo: resolução da equação de Jeans esférica isotrópica, `sigma²(r)=1/rho(r)∫_r^∞rho(s)g_total(s)ds`. O campo do disco é promediado angularmente por 32 amostras; logo temos uma **aproximação de monopolo para a cinemática esférica**, embora a força N-corpos subsequente seja tridimensional. A quadratura usa 2048 raios logarítmicos; no bojo o limite superior numérico é10^6 kpc e no halo é o raio externo. Cada componente cartesiana da velocidade é sorteada de Gaussiana com variância sigma²(r), sem rotação líquida imposta.

Disco: adotamos fechamento axisimétrico sem termo mistoRz, com `sigma_R²=sigma_z²`. A pressão vertical é `P(R,z)=rho sigma_z²=∫_|z|^∞rho(R,z') ∂Phi_total/∂z' dz'`, avaliada por 160 pontos mapeados para domínio infinito. Aplicamos **Satoh k=1**, com `mean(vphi)²=vc²+R/rho ∂P/∂R` e `sigma_phi²=sigma_R²=sigma_z²`. Rotação média e dispersão dependem do potencial total com/sem halo. Não usamos o fechamento epicíclico que pode fornecer dispersões radial e azimutal diferentes.

Tabela de pressão:160 raios × 112 alturas; domínio tabulado0,001–10^5 kpc emR e0–10^5 kpc em|z|, interpolação bilinear do logaritmo da pressão nas coordenadas transformadas. A interpolação logarítmica foi adotada após uma comparação independente com quadratura mais fina identificar viés na interpolação linear da pressão. Valores fora do domínio são limitados à borda da tabela para a interpolação; por isso caudas muito raras exigem monitoramento. Derivada radial por diferença com h=max(0,08R;0,0005 kpc). Todos esses números são **resolução do cálculo de momentos**, não dados da Via Láctea.

O código conta `clippedStreaming` quando a fórmula de rotação média ao quadrado fica negativa e limita o argumento da raiz a zero. Conta `unbound` para velocidades cujoEanalítico é positivo antes da mudança para o centro de massa. Os contadores devem permanecer expostos em diagnósticos; valores não nulos apontam limitações da aproximação, não estabilidade comprovada. Velocidades não são cortadas artificialmente no escape. Amostras são colocadas em pares antipodais, com posição e velocidade opostas, e depois transformadas para o referencial inercial do centro de massa. Essa estratégia reduz ruído de momento e preserva a distribuição de uma partícula em média, mas cria correlações entre pares.

Fontes metodológicas: [Yurin & Springel (2014)/GalIC](https://doi.org/10.1093/mnras/stu1421) utiliza ajustes iterativos de velocidades com resposta orbital de densidade; [Vasiliev (2019)/AGAMA](https://doi.org/10.1093/mnras/sty2672) usa funções de distribuição e construção autoconsistente e mostra limitações de prescrições de momentos em exemplos específicos. [Smet, Posacki & Ciotti (2015)](https://doi.org/10.1093/mnras/stv202) discute Jeans e decomposição de Satoh para discos MN em outro potencial de halo. Seus resultados analíticos não são transplantados como validação do halo NFW deste protótipo.

## 6. Número de partículas e massa por componente

Com halo, a distribuição numérica padrão é15% bojo, 45% disco e 40% halo, com arredondamento e ao menos uma partícula por componente. Sem halo,25% bojo e 75% disco. Essas são **frações de resolução**, não frações da massa galáctica. Massas são `m_b=Mb/Nb`, `m_d=Md/Nd`, `m_h=Mhalo_efetivo/Nh`; mudar N não muda massas físicas totais. Quantidades individuais reais, depois dos arredondamentos, são registradas.

Com N=1000, os counts são 150/450/400. Massas de partículas:≈3,3333×10^7 Msun no bojo,≈1,5111×10^8 Msun no disco e≈2,4408×10^9 Msun no halo. A grande diferença de massa de macro partículas pode aquecer numericamente o disco; o estudo de convergência comNé necessário. Não são estrelas individuais nem partículas elementares de matéria escura.

Nos modelos com/sem halo, cada sistema recalcula velocidades no seu próprio campo analítico inicial. Isso visa comparar duas inicializações aproximadas coerentes com seus campos; não constitui remoção instantânea do halo de uma galáxia anteriormente equilibrada.

## 7. Parâmetros numéricos padrão

| Parâmetro | Valor padrão | Natureza / razão de escolha |
|---|---:|---|
| dt |0,1 Myr | Passo inicial fixo; requer redução para 0,05 e 0,025 Myr na mesma condição inicial |
| epsilon Plummer |0,1 kpc | Reduz encontros fortes e ruído de discretização; requer estudo com epsilon/2e2epsilon |
| theta Barnes–Hut |0,5 | Abertura inicial; calibrar erros contra força direta, também em 0,25/0,75 |
| Semente |2026 | Convenção de reprodutibilidade; não parâmetro físico |
| Taper externo |0,2 r200c | Escolha numérica de truncamento contínuo; estudar outras larguras |
| Counts padrão |15/45/40% | Alocação de resolução; estudar ruído e relaxação por componente |

São valores de desenvolvimento, **não certificados para qualquer Nou duração**. Os limiares dos testes e medições são definidos em testes/relatórios e precisam ser interpretados no contexto desses cenários. Conservação do integrador, convergência temporal e estabilidade do modelo são verificações diferentes.

A suavização usa `a_i=-GΣ_(j!=i)m_j(ri-rj)/(rij²+epsilon²)^(3/2)`. Diagnósticos de energia devem usar o potencial Plummer coerente `U=-GΣ_(i<j)mi mj/sqrt(rij²+epsilon²)`. A força de árvore pode violar conservação exata de momento; medir o erro efetivo. A gravitação evolutiva principal utiliza posições instantâneas e massas das partículas, sem adicionar novamente os potenciais analíticos equivalentes.

## 8. Equações do TCC que exigem correção editorial

Foram conferidos textos e elementos OMML diretamente, evitando confundir extração sem raízes/frações com erro científico. O documento original não foi alterado.

- A convenção `r=r1-r2` na equação 1 é incompatível com os sinais da atração nas equações 3–6 e com os sinais de inversão do centro de massa nas equações 8–9. Implementamos gravidade atrativa coerente com `rj-ri`.
- A equação 66 contém literalmente `v²=rGM`; a forma dimensionalmente correta é `v²=GM/r`.
- A equação 72 contém `a=-∇` sem potencial; a forma correta é `a=-∇Phi`.
- A equação 95 contém `v_i(t+2Δt)=v_i(t)+2Δt a_i(t)`; o kick correto é `v_(n+1/2)=v_n+(Δt/2)a_n`.
- As duas equações 96 repetem a numeração. Drift e kick final devem ser numerados separadamente.
- Alguns desenvolvimentos do NFW misturam campo radial negativo com magnitude positiva de força. No código, `dPhi/dr=+GM(<r)/r²` e `a_r=-dPhi/dr`.
- Um potencial pontual `-GM/r` não representa o interior de qualquer distribuição esférica extensa; interior e cascas precisam ser contabilizados.
- A velocidade circular do disco é avaliada no plano z=0. Emz≠0a força vertical impede uma órbita circular paralela ao plano em geral.
- Diversas referências cruzadas e a numeração de capítulos estão desatualizadas.

As raízes nas equações 70, 86 e 87existem no DOCX e foram perdidas no achatamento do texto; não são ausência de raiz no documento. As fórmulas canônicas em código mantêm raízes e soma quadrática.

## 9. Limites de interpretação e validação

As curvas de referência calculadas nos relatórios usam a velocidade circular analítica de cada componente. A velocidade azimutal instantânea das partículas é uma grandeza distinta; o módulo tridimensional da velocidade também não é velocidade circular. Concordância pontual do modelo com um valor solar não valida o halo inteiro nem demonstra uma partícula de matéria escura.

Estabilidade inicial exige medir evolução de perfis de densidade, dispersões, espessura, virial e massas dentro de raios, para múltiplas sementes, resoluções e vários tempos dinâmicos. Energia conservada pode coexistir com relaxação artificial de condições iniciais. Os testes curtos do primeiro protótipo não devem ser descritos como prova de equilíbrio duradouro.

A GPU executa força em precisão simples quando suportada; a referência CPU usa Float64. A comparação CPU/GPU e força direta/Barnes–Hut deve acompanhar os relatórios reais, incluindoN,tolerância,passo,suavização e hardware exposto. Disponibilidade de WebGPU não certifica desempenho na RX7600. Quantidades grandes são tentativas condicionadas a memória, tempo e limites reais do navegador; não alegamos suporte a milhões sem medição.
