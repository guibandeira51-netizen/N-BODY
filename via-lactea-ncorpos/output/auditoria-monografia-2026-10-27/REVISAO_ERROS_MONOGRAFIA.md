# Revisão dos erros e das pendências da monografia

Revisão de 27/10/2026. Arquivo examinado: C:/Users/PC/Desktop/TCC/TCC.docx. SHA-256 da versão lida: f92ecaecd2e7c927a4ed89e783cb0552ba0c2feec801ead3ba81abf4ec0c4484. Leitura de 646 parágrafos não vazios e 230 objetos matemáticos nativos, incluindo expressões em linha. A exportação de leitura pelo Microsoft Word tem 58 páginas. As páginas abaixo são dessa exportação, com conferência visual dos trechos centrais. O original e o código de produção não foram editados.

Esta é uma revisão do texto e de sua correspondência com o código. Não se executaram novas campanhas galácticas nem se certificou o equilíbrio das condições iniciais. Lacunas de capítulos ainda em elaboração estão separadas dos erros confirmados. Resultados planejados não são tratados como resultados já obtidos.

## O que já está corrigido ou matematicamente coerente

- Convenção r = r2 − r1 e sinais das equações 3–13, com a ressalva sobre a soma ponderada explicada abaixo.
- Relação r² θdot = l/μ, equação orbital e parâmetro α, com a interpretação do foco a esclarecer.
- Equação 66: v² = GM/r.
- Equação 72: a = −grad Φ.
- Equações 95–97: meios passos do Leapfrog KDK corretos e numeração corrigida nessa sequência.
- Equações 98–99: força e potencial Plummer compatíveis. É necessário uniformizar a notação vetorial.
- Equações 105–107: refinamento de contagem e massa individual compatível com a função refineLegacyHalo.
- Fórmulas finais dos perfis Hernquist, Miyamoto–Nagai e NFW e suas contribuições circulares esféricas/axissimétricas, com os domínios de aplicação descritos abaixo.
- Valores principais de massas, escalas, constante interna G e conversão de velocidades correspondem às constantes do código atual.

## Problemas confirmados e correções sugeridas

### 1 Derivação do potencial NFW com sinais incompatíveis

Local: páginas 29–30, equações 53–61. Prioridade alta; erro matemático.

O texto combina f = −dΦ/dr com f = +GM(<r)/r². Para um potencial por unidade de massa, a componente radial assinada da aceleração é g_r = −GM(<r)/r². Logo dΦ/dr = +GM(<r)/r².

Uma derivação consistente, com zero no infinito, é:

\[
\Phi(r)=-\int_r^\infty\frac{GM(<s)}{s^2}\,ds.
\]

Caso se mantenha a apresentação por integrais indefinidas das equações 56, 58 e 59, o fator externo deve ser positivo:

\[
\Phi=+4\pi G\rho_0 r_s^2\int\frac{\ln(1+x)-x/(1+x)}{x^2}\,dx+C.
\]

Como a primitiva do integrando é −ln(1+x)/x, chega-se corretamente a Φ = −4πGρ0 rs² ln(1+x)/x para o NFW infinito com a constante escolhida. As equações finais 60 e 61 estão corretas; não inverter seu sinal. Não trocar um sinal isolado sem atualizar a definição de f e toda a sequência.

### 2 Aceleração chamada de força

Local: página 29, texto antes da equação 55. Erro de identificação da grandeza.

GM(<r)/r² tem dimensão de aceleração. Uma força sobre um corpo de prova exigiria sua massa. Adotar g_r ou a_r para a componente radial assinada, e distinguir de F_r = m g_r.

### 3 Soma que produz a equação 12 não é uma soma simples

Local: página 12, frase entre as equações 11 e 12. Erro na justificativa algébrica.

Substituir “Somando as equações (10) e (11)” por “Multiplicando a equação (10) por m1 e a equação (11) por m2 e somando, obtém-se...”. Isso cancela os termos de aceleração relativa e as forças e fornece (m1+m2) Rddot = 0. As equações 10–13 finais não precisam de novos sinais.

### 4 A força da equação 2 não identifica sobre qual corpo atua

Local: página 11, equação 2. Ambiguidade de definição, não fórmula universalmente errada.

Com r = r2−r1, a expressão −Gm1m2 rhat/r² corresponde à força sobre o corpo 2. Identificar como F_(2←1), e definir F_(1←2)=−F_(2←1). Caso a intenção seja escrever a força sobre o corpo 1, seu sinal é positivo nessa convenção. Não confundir as forças de sentidos opostos.

### 5 Dois valores diferentes de G no mesmo texto

Local: página 11 e página 18, equação 28. Inconsistência numérica.

Constam 6,67430×10⁻¹¹ e 6,672×10⁻¹¹ SI. Padronizar e citar a convenção adotada. A constante interna da equação 103 é derivada do parâmetro gravitacional solar nominal; não confundir a exatidão dessa convenção de conversão com uma determinação física exata de G ou da massa solar.

### 6 Potencial −GM/r generalizado indevidamente

Local: página 23, comentário após a equação 40. Erro de domínio de validade.

A expressão é adequada a uma massa pontual ou à região exterior ao suporte de uma distribuição esférica finita. Não é o potencial geral dentro de uma distribuição esférica extensa. As cascas exteriores contribuem ao potencial, embora não à força esférica interior. O próprio potencial Hernquist apresentado mostra essa diferença.

### 7 Exemplo de 177 km/s não é a previsão exata do disco achatado

Local: páginas 17–18, equações 24–29. Limitação da aproximação a declarar.

A aritmética é coerente com os valores usados. Entretanto, GM(<r)/r² exige simetria esférica. Explicitar que o exemplo é uma aproximação ilustrativa e que o cálculo quantitativo do disco usa −∂Φd/∂R. O intervalo de velocidade solar isolado não demonstra uma detecção independente de matéria escura sem controlar distribuição e incertezas bariônicas.

### 8 Foco da órbita relativa confundido com o baricentro

Local: página 16, explicação após a equação 23. Erro de interpretação de coordenadas.

A equação 23 descreve o vetor relativo entre os corpos. Não identificar automaticamente sua origem com o centro de massa físico. As órbitas individuais no referencial baricêntrico são elipses escaladas com foco no baricentro. Diferenciar a elipse da coordenada relativa das duas órbitas individuais.

### 9 Conservação do momento angular não explica sozinha a coplanaridade de muitos planetas

Local: página 14, parágrafo sobre sistemas planetários. Excesso de interpretação.

Uma força central conserva o plano de cada órbita, mas não obriga órbitas inicialmente diferentes a compartilhar o mesmo plano. Limitar a conclusão matemática ao movimento de dois corpos; a origem de planos próximos em sistemas planetários exige discussão da formação e das condições iniciais, se for mantida.

### 10 Logaritmo dimensional e sinal do potencial

Local: página 29, equação 52; página 30, comentário do potencial. Ajustes de rigor.

Trocar a forma esquemática ln(r) por ln(r/rs) ao apresentar a assíntota. O sinal negativo do potencial, por si só, não demonstra atração, pois pode ser alterado por uma constante. É o gradiente que determina a força. Declarar Φ(∞)=0 na referência infinita.

### 11 O potencial negativo não diminui numericamente ao aumentar o raio

Local: página 25, comentário após o potencial Miyamoto–Nagai. Erro de redação matemática.

Quando o denominador cresce, Φ negativo se aproxima de zero: seu módulo diminui, mas seu valor aumenta. Substituir por “o módulo do potencial diminui, tendendo a zero a grandes distâncias”.

### 12 Velocidade circular, velocidade estelar e plano de simetria

Local: páginas 31–39, principalmente equação 81 na página 35. Domínio físico a explicitar.

vc² = R∂RΦ caracteriza a velocidade circular do potencial axissimétrico no plano apropriado, não a velocidade média de todas as partículas. Para a curva do disco no plano, apresentar explicitamente:

\[
v_{c,d}^2(R)=\frac{GM_dR^2}{[R^2+(a_d+b_d)^2]^{3/2}},\qquad z=0.
\]

A expressão geral R∂RΦ(R,z) também pode ser usada como diagnóstico da força radial, mas em z≠0 há aceleração vertical e não se demonstra uma órbita circular mantida naquela altura. No triaxial, uma média azimutal do campo não é uma curva de órbitas circulares exatas. O simulador não resolve a hidrodinâmica do gás.

### 13 Curvas externas apresentadas como universalmente constantes

Local: introdução, páginas 17 e 26–39. Generalização observacional excessiva.

Usar “velocidades elevadas ou aproximadamente planas em determinados intervalos radiais”, respeitando a amostra citada. Para a Via Láctea, a curva de Eilers et al. em 5–25 kpc é suavemente decrescente. Não afirmar constância exata ou extrapolar essa medição a todo o halo.

### 14 Bojo real da Via Láctea descrito como simplesmente pobre em metais e isotrópico

Local: página 19, início da seção 3.1. Afirmação empírica inadequadamente generalizada.

O bojo tem populações com ampla distribuição de metalicidades. A escolha de um bojo Hernquist esférico e da cinemática aproximada é uma hipótese simplificadora do modelo, não uma dedução de que o bojo real é uniformemente esférico, isotrópico ou predominantemente pobre em metais. Revisar o trecho e acrescentar fonte específica ou retirar a caracterização química que não é usada no cálculo.

### 15 Descrição exclusivamente por partículas contradiz a campanha com halo contínuo

Local: seções 5.1–5.4, especialmente páginas 40 e 44–45; comparar com página 55. Inconsistência metodológica.

Qualificar a afirmação de evolução exclusivamente por pares como válida para o modo de halo vivo. No modo contínuo: bojo/disco permanecem autogravitantes e soma-se o campo externo estático do halo. O perfil contínuo não é abandonado nesse modo. O limite contínuo também continua fisicamente relevante para sistemas aproximadamente não colisionais; N-corpos não exige negar essa descrição.

### 16 Condições iniciais de velocidade pouco especificadas

Local: página 48, seção 5.5. Lacuna de reprodução.

O texto “velocidades compatíveis com a dinâmica esperada” não identifica o algoritmo. Documentar o inicializador realmente utilizado: momentos de Jeans, fechamento e hipótese de distribuição de velocidades; no legacy há Satoh k=1 no disco, amostragem Gaussiana aproximada e pares antipodais. Informar as aproximações de campo usadas no bojo e halo e a existência de streaming recortado quando aplicável. Isso não demonstra uma função de distribuição estacionária no potencial N-corpos suavizado.

### 17 Estabilidade prometida sem domínio demonstrado

Local: páginas 48 e 50. Afirmação a restringir.

Substituir “garantindo uma evolução estável do sistema durante todo o intervalo simulado” por “a adequação do passo foi avaliada por testes de conservação e convergência apresentados nos resultados”. Descrever as condições iniciais como uma aproximação cuja evolução estrutural é testada. Energia bem conservada e equilíbrio estrutural são critérios distintos. Não transformar a escolha de dt em garantia automática.

### 18 Tabela de variáveis e unidades internas não estão alinhadas

Local: página 47, Tabela 1; páginas 53–54, seção 5.8. Inconsistência de apresentação.

A primeira tabela apresenta kg, kpc, km/s. A seção posterior declara massa em 10¹⁰ M☉ e velocidade em kpc/Myr. Há duas soluções: adotar as unidades internas na Tabela 1 ou separar explicitamente unidades internas de unidades de apresentação. A mistura não prova erro no motor, mas a tabela não pode sugerir que kg e km/s entram diretamente nas equações com G interno sem conversão.

### 19 Contagens e refinamento ×32 incompatíveis

Local: páginas 54–55, tabela de configuração. Erro confirmado pela função liveResolution.

Base N0=80.000: Nb=12.000, Nd=36.000, Nh,base=32.000. Com fator ×32: Nh=1.024.000 e Ntotal=1.072.000. A massa individual do halo passa de aproximadamente 3,0510×10⁷ M☉ a 9,5343×10⁵ M☉. Se a execução foi de 80.000 corpos totais com as contagens da tabela, o fator é ×1. Selecionar os valores a partir do arquivo efetivamente usado, sem pressupor qual ensaio foi executado.

### 20 Contagens do halo contínuo não correspondem exatamente ao alocador

Local: páginas 54–55, coluna “Quatro geometrias”. Inconsistência de contagem/precisão.

O código atual, para N solicitado=80.000 no contínuo, retorna Nb=19.999 e Nd=60.001. As massas de 2,50013×10⁵ e 1,13331×10⁶ M☉ correspondem a essas contagens, não exatamente a 20.000 e 60.000. Preferir contagens reais; se os números forem apenas aproximados, não apresentá-los como contagens exatas. Conferir o export da versão usada.

### 21 Campanhas futuras descritas como registradas

Local: página 55, “Duração registrada: até 2.000 Myr” e “geometrias avaliadas”. Evidência a confirmar, não resultado declarado falso.

Pelo contexto fornecido pelo autor, os novos ensaios ainda seriam iniciados. Se ainda não foram executados, usar “configuração planejada” e “duração prevista”; atualizar após os resultados. Não atribuir registros antigos de 2.048 corpos à nova campanha de 80.000. Se já houver execução nova, identificar o arquivo e seus metadados. Esta revisão não verificou resultados novos de 80.000 em quatro geometrias até 2.000 Myr.

### 22 Exemplo f=10 não é uma opção implementada

Local: página 56. Divergência entre exemplo genérico e programa.

A álgebra do exemplo é válida para um fator genérico, mas a interface atual oferece ×1, ×2, ×4, ×8, ×16 e ×32; a função também rejeita fatores que não sejam potências de dois. Trocar por f=4 ou f=16 se o texto descreve o simulador efetivamente utilizado. Não chamar a identidade matemática de errada.

### 23 Fonte dos números físicos e identificação de R200 incompletas

Local: páginas 52–54. Rastreabilidade incompleta.

Os artigos originais dos perfis fundamentam suas formas funcionais, não todas as massas e escalas escolhidas. Identificar MilkyWayPotential v1 e a tabela de Marchetti (2021) como origem do conjunto numérico documentado. Explicar a omissão da componente nuclear do modelo Gala, sem redistribuição de sua massa.

Preferir R200c e informar a convenção 200ρcrit e o H0 utilizado. Para o halo elipsoidal, R200c é a referência radial do modelo esférico; o taper e o limite são aplicados à coordenada elipsoidal. Registrar p, q e orientação de cada ensaio. A largura 0,2R200c e a função quíntica são escolhas numéricas, não parâmetros observacionais medidos.

### 24 Referências cruzadas desatualizadas

Erros concretos:

| Página | Texto atual | Referência adequada |
|---|---|---|
| 28 | Perfil NFW (53), integral (54) | Perfil (48), integral (49) |
| 29 | Integrando a equação (57) | Relação (53), se mantida a sequência de derivação |
| 29 | (55) chamada de massa, remissões a (59)/(58) | Massa (50), aceleração (55), integração (54) |
| 29–30 | x definido em (61) | x definido em (57) |
| 30 | Potencial NFW identificado como (65) | Potencial NFW (61) |
| 31 | Combinação de potenciais (30), (39), (52), (63) | Rever para (39), (47), (61), na soma (30) |
| 31 | Potencial total chamado de (66) | Potencial total (62) |
| 45 | Hernquist apresentado na seção 4.4 | Seção 3.1 |

Usar referências cruzadas do Word para reduzir o risco de novas divergências.

### 25 Bibliografia sem obras efetivamente citadas

Local: página 58 e citações ao longo do texto. Falha de referências.

Faltam, entre outras, entradas para Halliday/Resnick/Walker, Newton, Moebs/Ling/Sanny, Cline, Dehnen (2001), Power et al. (2003), Marchetti (2021) e Miyamoto & Nagai (1975). Acrescentar também as fontes das convenções de conversão e do modelo Gala. Completar volume/páginas/identificadores conforme a edição realmente consultada. As referências futuras dos dados observacionais devem acompanhar os resultados que as utilizarem.

Dehnen discute erros e escolhas de suavização; Power estuda convergência de halos cosmológicos. Essas referências não certificam que ε=0,1 kpc seja adequado a todo ensaio deste projeto. A justificativa precisa vir de controles compatíveis.

### 26 Erros textuais e notação a uniformizar

- Página 10: r1 repetido onde deveria aparecer r2.
- Página 11: o período que define as massas contém um fragmento corrompido (“respectivamente, definidos em relação à origem ... o e m2”). Reescrever: “m1 e m2 são as massas dos corpos; r é o módulo da separação entre eles”.
- Página 11: “igual a massa” → “igual à massa”.
- Página 13: explicar a componente tangencial da aceleração, em vez de dizer que “a coordenada teta é nula”. A aceleração tangencial é nula; θ pode variar.
- Equações 14–15: reconstruir os acentos se necessário para deixar inequívocos os produtos r θdot² e 2 rdot θdot. Não usar um único acento que possa ser lido como derivada de todo o produto.
- Padronizar vetores em negrito ou com seta nas equações 89–99 e no KDK.
- Página 41: rj−ri é vetor separação; |rj−ri| é distância.
- Página 38: “o disco contribuem” → “o disco contribui”.
- Página 50: “auto consistente” → “autoconsistente”.
- Página 56: há LaTeX literal visível “\(f\)” no corpo do texto; converter para equação em linha ou f formatado.
- Página 56: “massa distribuída uniformemente” deve significar repartida igualmente entre macropartículas, não densidade espacial uniforme. Preferir “massa total repartida igualmente entre Nh macropartículas”.
- Usar vírgula decimal no texto em português de forma uniforme; reservar o formato de software aos arquivos de dados.

### 27 Numeração e paginação de tabelas e capítulos

Local: sumário, páginas 53–57. Erros editoriais.

Há duas “Tabela 2”: a tabela de parâmetros físicos e a de configurações. Renumerar a segunda para 3 e atualizar remissões. A segunda tabela se divide nas páginas 54–55 sem repetir cabeçalho; a primeira também atravessa páginas. Repetir o cabeçalho e, conforme o manual institucional adotado, identificar continuação. Evitar perder os nomes das colunas na página seguinte.

Depois do capítulo 5, aparecem “4. Dinâmica Galáctica e Resultados” e “5. Conclusão”. Ajustar para capítulos 6 e 7, com subseções coerentes. A equação 107 foi duplicada depois do título da conclusão na página 57; remover a cópia acidental. Atualizar o sumário ao final, porque suas páginas finais ainda apontam 54 enquanto os títulos estão na página 57 da exportação atual.

## Lacunas próprias da versão em elaboração

Resumo, abstract, resultados e conclusão ainda não foram preenchidos. Isso não é contado como erro de resultado, porque o autor informou que os experimentos novos ainda seriam iniciados.

Antes de interpretar os resultados, inserir as definições da Hamiltoniana e do erro relativo de energia, h50, dispersões e curvas de rotação. No halo externo estático, E = K + U_pares_bariônicos + Σ mi Φh(ri), sem fator 1/2 no termo externo. No halo inteiramente vivo, usar a energia de todos os pares. Distinguir trajetória Float32, referência energética Float64 e energia aproximada BH.

A descrição de geração das partículas precisa do método concreto de amostragem, semente, alocação e geração de velocidades. A identidade do código, arquivos de entrada e resultados deve acompanhar cada execução. As quatro formas contínuas precisam de tabela de p, q e orientação, e de registro de que as velocidades não foram reequilibradas individualmente para cada forma quando esse for o protocolo escolhido.

A introdução promete uma análise específica do problema de três corpos. Manter essa promessa apenas se o experimento correspondente fizer parte do escopo final; a ausência de solução fechada simples não prova instabilidade em toda configuração. Em caso contrário, apresentar o problema como motivação e concentrar os objetivos na dinâmica galáctica efetivamente estudada.

## Fontes primárias consultadas e evidências locais

- NFW: https://arxiv.org/abs/astro-ph/9611107
- Eilers et al.: https://arxiv.org/abs/1810.09466
- Gala, distinguindo v1 e v2 e o núcleo adicional: https://gala.adrian.pw/en/stable/supporting/define-milky-way-model.html
- Dehnen (2001): https://arxiv.org/abs/astro-ph/0011568
- Power et al. (2003): https://arxiv.org/abs/astro-ph/0201544
- Populações do bojo: Zoccali et al., https://arxiv.org/abs/1807.06377 e GIBS https://doi.org/10.1051/0004-6361/201629805

Código conferido: src/physics/constants.js; src/physics/initial-legacy.js; src/physics/live-initial.js; src/physics/halo-resolution.js; src/live-particle-input.js; src/physics/live-energy.js. A chamada atual a liveInputResolution confirmou 19.999/60.001 no contínuo com N=80.000 e 12.000/36.000/1.024.000 no halo vivo de base 80.000 com fator 32.

Não foi feita uma certificação de normas ABNT ou do manual específico da UEMS. Recomendações de layout e uniformidade devem ser conciliadas com esse manual. A localização dos apontamentos mudará após a edição e a atualização dos campos.
