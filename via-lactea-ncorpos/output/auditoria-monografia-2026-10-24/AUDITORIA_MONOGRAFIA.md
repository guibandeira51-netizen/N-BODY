# Auditoria da monografia e correspondência com o simulador

Documento examinado: `C:/Users/PC/Desktop/TCC/TCC.docx`, de Guilherme Aleixo Bandeira, orientador Adriano Manoel dos Santos. Revisão em 24/10/2026. O original e o código de produção não foram editados. As páginas abaixo correspondem à exportação do arquivo atual pelo Microsoft Word, com 44 páginas; sua paginação coincide com os números impressos a partir da introdução. O sumário armazenado está desatualizado.

## Escopo e conclusão

Foram lidos os 505 parágrafos não vazios extraídos do documento e inspecionados os 169 objetos matemáticos nativos, incluindo equações em linha. As páginas com os problemas matemáticos principais foram também renderizadas e verificadas visualmente, para não confundir perda de notação na extração com erro do original.

Os modelos básicos Hernquist, Miyamoto–Nagai e NFW e suas curvas circulares finais estão essencialmente corretos. Há erros reais nas etapas intermediárias de dois corpos, na derivação do potencial NFW, na equação 66, na equação 72 e no primeiro kick do Leapfrog escrito. A metodologia não documenta ainda a força suavizada, as unidades internas, os dois modos físicos do halo e os diagnósticos atuais. Resultados, conclusão, resumo e abstract precisam ser preenchidos. A prioridade é corrigir o texto e apresentar experimentos reprodutíveis existentes; acrescentar mais efeitos ao simulador não resolve essas lacunas.

Esta auditoria não certifica equilíbrio galáctico, não faz novo ajuste aos dados observacionais e não valida automaticamente todas as resoluções ou passos temporais.

## Erros matemáticos e ajustes de interpretação

### 1 Força vetorial incompleta

Página 10, equação 2: o lado esquerdo é vetorial, mas o direito contém apenas o módulo positivo `G m1 m2 / r²`. Escrever o módulo `F = G m1 m2/r²` ou definir explicitamente uma das forças vetoriais, com sinal e direção. O parágrafo imediatamente anterior também repete r1 onde deveria aparecer r2.

### 2 Convenção de posição relativa incompatível com as forças

Páginas 10–11, equações 1, 3–6, 8–11. A equação 1 define r = r1 − r2, enquanto as forças e as reconstruções das posições foram escritas predominantemente para r = r2 − r1. Isso inverte atração/repulsão se as expressões forem lidas literalmente como um único sistema.

Uma correção coerente, com poucas alterações, é adotar:

\[
\mathbf r=\mathbf r_2-\mathbf r_1,\quad r=|\mathbf r|,\quad M=m_1+m_2,
\]
\[
\ddot{\mathbf r}_1=Gm_2\frac{\mathbf r}{r^3},\qquad
\ddot{\mathbf r}_2=-Gm_1\frac{\mathbf r}{r^3},
\]
\[
\mathbf r_1=\mathbf R-\frac{m_2}{M}\mathbf r,\qquad
\mathbf r_2=\mathbf R+\frac{m_1}{M}\mathbf r.
\]

Nesse caso, a equação 11 deve ter sinal NEGATIVO no lado direito. Para obter M R̈ = 0, o texto deve explicar a soma ponderada: multiplicar a equação 10 por m1, a 11 por m2 e somar. A soma simples anunciada no texto não fornece a equação 12. A equação final 13, r̈ = −G M r/r³, está correta.

### 3 Relação do momento angular invertida

Página 14, parágrafo anterior à equação 22: consta r² θ̇ = μ/l. Deve ser r² θ̇ = l/μ, como já aparece corretamente na página 13. Definir também μ = m1 m2/(m1+m2). A relação escrita tem dimensões incorretas; l/μ tem dimensão L²/T. As equações 20, 22 e 23 e α = l²/(GMμ²) são compatíveis com a forma corrigida.

Na equação 23 pode-se declarar θ = 0 no periastro; caso contrário, escrever cos(θ−θ0).

### 4 Foco da órbita relativa

Página 14, comentário sobre a elipse: a equação 23 descreve a separação relativa r. Sua origem é o foco do problema relativo, e não automaticamente o centro de massa físico. As órbitas individuais em coordenadas baricêntricas são elipses escaladas com foco no baricentro. Diferenciar as duas construções.

### 5 Exemplo de 177 km/s é uma aproximação esférica

Páginas 15–16: a aritmética da estimativa de aproximadamente 177 km/s está adequada aos números usados. O problema é utilizá-la como previsão quantitativa do disco real: GM(<r)/r² vale para simetria esférica, e não para um disco achatado. A contribuição do disco deve ser obtida por −∂Φd/∂R. O valor solar isolado não demonstra a necessidade de um halo sem controlar a distribuição e a incerteza bariônica.

No código atual, em R = 8,2 kpc e z = 0, calculamos nesta revisão: bojo 45,64410 km/s; disco 168,96027 km/s; halo 148,37152 km/s; bojo+disco 175,01701 km/s; total 229,44512 km/s. Esses são valores teóricos do conjunto de parâmetros existente, não novas medições ou um ajuste. Usar toda a massa do disco atual como ponto central produziria 188,85482 km/s para a contribuição do disco, mostrando a importância da geometria.

### 6 Constante gravitacional inconsistente no texto

Página 10: G = 6,67430×10⁻¹¹ SI. Página 16, equação 28: G = 6,672×10⁻¹¹ SI. Padronizar o valor e a referência. O valor CODATA 2022 é 6,67430(15)×10⁻¹¹ m³ kg⁻¹ s⁻². No motor, a conversão usa o parâmetro gravitacional solar nominal, não uma multiplicação por uma massa solar medida em kg. A diferença entre os dois valores SI do texto é pequena, mas a inconsistência deve ser removida.

### 7 Potencial de uma distribuição esférica extensa

Página 20, explicação após a equação 40: −GM/r é o potencial de uma massa pontual ou da região exterior a uma distribuição esférica finita. Não é a fórmula geral dentro de uma distribuição esférica extensa. O próprio potencial Hernquist da equação 39 é um contraexemplo. A fórmula geral de uma fonte esférica, com zero no infinito, contém também o potencial das cascas externas.

### 8 Sinais e unidades na derivação do potencial NFW

Páginas 25–26, equações 53–61. A grandeza GM(r)/r² é uma aceleração, não uma força sem a massa do corpo de prova. Se f for a componente radial assinada, então f = −GM(r)/r². Se for o módulo positivo, não se pode conservar simultaneamente f = −dΦ/dr.

Adotar a derivação consistente:

\[
g_r=-\frac{GM(<r)}{r^2},\qquad \frac{d\Phi}{dr}=\frac{GM(<r)}{r^2},\qquad
\Phi(r)=-\int_r^\infty\frac{GM(<s)}{s^2}\,ds.
\]

Para a integral indefinida em x = r/rs:

\[
\Phi=+4\pi G\rho_0 r_s^2\int
\frac{\ln(1+x)-x/(1+x)}{x^2}\,dx+C.
\]

O sinal externo nas equações 56, 58 e 59 está invertido para chegar ao potencial final negativo apresentado. A primitiva do integrando é −ln(1+x)/x. Assim, as equações finais 60 e 61 estão corretas para NFW não truncado com Φ(∞)=0; a derivação intermediária precisa ser corrigida.

Na página 25, substituir ln(r) por uma expressão dimensionalmente definida, como ln(r/rs), ao discutir o limite assintótico. Na página 26, o sinal negativo do potencial, isoladamente, não prova atração: isso depende do gradiente; o zero do potencial é convencional.

### 9 Halo NFW infinito não é o halo finito do motor

Páginas 24–26 e 39: o NFW sem truncamento tem massa divergente, ainda que seu potencial possa tender a zero no infinito. A equação 61 é válida como referência analítica, mas não descreve toda a extensão do halo finito realmente usado.

O código conserva NFW até R200c e aplica T(u)=1−10u³+15u⁴−6u⁵ entre R200c e 1,2 R200c; depois a densidade é zero. Essa largura e essa forma de taper são hipóteses numéricas, não observações. O potencial finito deve ser compatível com a mesma massa integrada:

\[
\Phi_h(r)=-G\left[\frac{M(<r)}r+4\pi\int_r^{r_{\max}}\rho(s)s\,ds\right]
\]

para r dentro do suporte. Fora, Φh = −G Mh,total/r. Mesmo dentro de R200c, a retirada das cascas externas altera o nível do potencial em relação ao NFW infinito, embora não altere sua força interior esférica. Isso importa para energia e escape.

Verificação atual: Ms = 5,4×10¹¹ M☉; R200c = 206,62580 kpc; M200c = 9,31778×10¹¹ M☉; rmax = 247,95096 kpc; massa truncada = 9,76316×10¹¹ M☉. Ms = 4πρ0 rs³ é massa de escala, não massa total nem M200c.

### 10 Equação 66 dimensionalmente errada

Página 27: consta v² = rGM. Corrigir para v² = GM/r, ou v² = GM(<r)/r quando aplicável. GM r tem dimensão L⁴/T²; v² tem dimensão L²/T². A equação 67 seguinte já está correta no caso esférico.

### 11 Equação 72 incompleta

Página 29: consta a = −∇, sem o potencial. Corrigir para a = −∇Φ. O operador gradiente precisa atuar em uma função.

### 12 Velocidade circular não é velocidade média das partículas

Páginas 27–33: trocar o uso indiscriminado de “velocidade orbital das estrelas e do gás” por “velocidade circular do potencial” quando se tratar de vc² = R∂RΦ. As contribuições somam em vc², como na equação 63, mas isso não significa que todas as estrelas seguem órbitas circulares. Um disco com dispersão tem deriva assimétrica, e o código não resolve gás hidrodinâmico.

A equação 81 fornece R∂RΦ(R,z). Para chamá-la velocidade de uma órbita circular no plano simétrico, avaliar z = 0:

\[
v_{c,d}^2(R)=\frac{GM_d R^2}{[R^2+(a_d+b_d)^2]^{3/2}}.
\]

Em z diferente de zero existe também aceleração vertical. Em um halo triaxial, a média azimutal −R⟨aR⟩ usada pelo gráfico é um diagnóstico do campo; não implica a existência de órbitas circulares exatas globais.

### 13 Curva observada não é perfeitamente plana

Introdução e páginas 23 e 33: a descrição qualitativa de velocidades externas elevadas pode permanecer, mas evitar dizer que a Via Láctea tem curva exatamente constante. Eilers et al. medem uma queda suave em 5–25 kpc. Não extrapolar a restrição observacional desse intervalo até todo o halo.

### 14 Equações N-corpos sem suavização

Página 35, equações 89–92: corretas como lei Newtoniana pontual, mas incompletas para descrever o algoritmo empregado. Acrescentar explicitamente a força Plummer realmente calculada:

\[
\ddot{\mathbf r}_i=G\sum_{j\ne i}m_j
\frac{\mathbf r_j-\mathbf r_i}{(|\mathbf r_j-\mathbf r_i|^2+\varepsilon^2)^{3/2}}.
\]

Dizer que ε é uma regularização da interação entre macropartículas, não uma alteração cosmética da espessura. Não confundir ε = 0,1 kpc com bd = 0,28 kpc ou com a estatística h50.

### 15 Descrição exclusivamente por partículas omite o halo contínuo

Páginas 34–39: a descrição “exclusivamente por interações entre todas as partículas” é válida para o modo inteiramente vivo. O site também possui bojo/disco autogravitantes com halo NFW externo estático. Nesse caso:

\[
\ddot{\mathbf r}_i=\mathbf a_{\rm pares,bar,i}-\nabla\Phi_{h,\rm estatico}(\mathbf r_i).
\]

O halo contínuo é material e Newtoniano. Ele não é uma solução de Einstein e não gera matéria escura a partir de uma malha. Sua ausência de granularidade vem junto com ausência de resposta dinâmica do halo; não atribuir toda diferença de espessamento somente à resolução.

### 16 Geração espacial não está suficientemente reproduzível

Páginas 38–40: acrescentar os algoritmos de amostragem efetivamente usados. Bojo: inversão r = ab√u/(1−√u), direção isotrópica. Halo: inversão numérica da massa acumulada do perfil finito, direção isotrópica. Disco: amostragem da densidade Miyamoto–Nagai, não um disco exponencial substituído sem documentação. Dar as fórmulas da densidade do disco ou apontar a derivação por Poisson. Informar semente, pares antipodais, alocação por componente e massa de cada macropartícula Mc/Nc.

As frações numéricas de partículas não são frações físicas de massa. No halo vivo, refinamentos ×2 a ×32 multiplicam Nh e dividem a massa individual correspondente, preservando a massa do halo. No contínuo, o N digitado na interface representa a soma de bojo e disco; o halo não tem partículas massivas integradas.

### 17 Velocidades e equilíbrio aproximado não estão demonstrados pelo texto

Página 40: substituir “velocidades compatíveis com a dinâmica esperada” por uma descrição verificável. O inicializador principal é legacy: momentos Jeans, decomposição Satoh k=1 no disco, Gaussianas aproximadas, pares antipodais; bojo/halo usam aproximação monopolar do disco na Jeans esférica. Isso não estabelece uma função de distribuição estacionária no potencial suavizado N-corpos. Há ainda recorte de streaming negativo, registrado em clippedStreaming.

Explicar as hipóteses da integração vertical de pressão, por exemplo:

\[
\rho\sigma_z^2(R,z)=\int_z^\infty\rho(R,z')\frac{\partial\Phi}{\partial z'}\,dz'
\]

sob as hipóteses utilizadas, incluindo ausência do termo misto relevante no fechamento adotado. Não apresentar uma condição de momentos como prova completa de equilíbrio tridimensional. As geometrias não esféricas preservam os bariões iniciais para comparação e não foram reequilibradas separadamente para cada forma.

### 18 Unidades do documento não correspondem às internas

Página 40, tabela: kg, kpc e km/s podem ser unidades de apresentação, desde que convertidas. Atualmente não se explicam essas conversões. No motor: massa em 10¹⁰ M☉, distância em kpc, tempo em Myr, velocidade em kpc/Myr, aceleração em kpc/Myr², energia em 10¹⁰ M☉ kpc²/Myr². G = 0,04498502151469553 nessas unidades; 1 km/s = 0,001022712165045695 kpc/Myr. Distinguir unidades de armazenamento e de exibição.

### 19 Primeiro kick do Leapfrog incorreto

Página 41, equação 95: consta v(t+2Δt)=v(t)+2Δt a(t). Deve ser:

\[
\mathbf v^{n+1/2}=\mathbf v^n+\frac{\Delta t}{2}\mathbf a(\mathbf r^n),
\]
\[
\mathbf r^{n+1}=\mathbf r^n+\Delta t\mathbf v^{n+1/2},
\]
\[
\mathbf v^{n+1}=\mathbf v^{n+1/2}+\frac{\Delta t}{2}\mathbf a(\mathbf r^{n+1}).
\]

As duas equações seguintes estão corretas, mas ambas recebem número 96. Renumerar a última. No código, os kicks já usam 0,5 dt e as velocidades de diagnóstico são de passo completo. O erro escrito não demonstra defeito no integrador.

### 20 Conservação de energia e estabilidade estrutural

Página 42: “garantindo uma evolução estável durante todo o intervalo” é mais forte que a evidência apresentada. Substituir por resultados medidos e domínio validado. Incluir a Hamiltoniana realmente diagnosticada:

\[
E=\frac12\sum_i m_i|\mathbf v_i|^2-G\sum_{i<j}\frac{m_i m_j}{\sqrt{r_{ij}^2+\varepsilon^2}}.
\]

No halo contínuo estático, os pares são apenas bariônicos e acrescenta-se Σ mi Φh(ri), sem fator 1/2 no termo externo. A conservação da Hamiltoniana de partículas no campo estático não é a conservação do sistema completo com halo responsivo.

Registrar δE = [E(t)−E(0)]/|E(0)| e percentual 100δE. Energia aproximada BH e referência direta têm E0 próprios no mesmo estado inicial. GPU Float32 integra a trajetória; CPU Float64 avalia a energia dos snapshots. Essa distinção deve aparecer na monografia. Máximo entre snapshots amostrados não limita picos não medidos.

Definir h50 pela mediana ponderada de |(ri−c)·n|, com normal/plano próprio robustamente ajustados, seleção de partículas e intervalos radiais declarados. Não equiparar h50 ao parâmetro bd, nem interpretar engrossamento como escape gravitacional sem examinar órbitas/energias.

### 21 Contexto físico a moderar

Página 17: um bojo esférico isotrópico é uma hipótese do modelo; não uma descrição completa do bojo barrado da Via Láctea. A frase de que o bojo é composto majoritariamente por estrelas de baixa metalicidade precisa de fonte e revisão. A introdução não deve dizer que todo problema de três corpos é instável. A inexistência de uma solução geral elementar não impede soluções particulares estáveis nem equivale a provar caos em todas as condições.

Página 34: o limite contínuo colisionalmente desprezível continua sendo uma descrição física útil; não é necessário “abandonar o meio contínuo” como princípio. O N-corpos pode amostrar a dinâmica de campo médio Vlasov–Poisson. A granularidade das macropartículas é parcialmente numérica, não uma reprodução individual das estrelas ou da matéria escura microscópica.

### 22 Referências e estrutura incompletas

Resumo e abstract estão vazios. Na página 42, resultados, curvas de rotação, influência da matéria escura e conclusão estão apenas com títulos. O sumário conserva seções relativísticas e de espaço-tempo que não correspondem ao objetivo Newtoniano atual. Há numeração regressiva de capítulos e muitas referências cruzadas erradas, por exemplo página 24 menciona equações 53/54 ao discutir 48/49; página 26 menciona 65/66 ao discutir 61/62. Atualizar automaticamente títulos, campos e referências depois da revisão.

Miyamoto & Nagai (1975) não aparece na lista final, embora seja central. Halliday/Resnick/Walker, Newton, Moebs/Ling/Sanny e Cline aparecem no texto e também faltam na lista final. Acrescentar fontes dos dados observacionais, inicialização, integrador, parâmetro físico adotado e metodologia de validação efetivamente utilizados.

## O que já pode ser aproveitado no TCC

| Conteúdo | Estado atual verificado no código ou nos dados | Como usar |
|---|---|---|
| Curvas das cinco contribuições | Disco, bojo, halo, bojo+disco, total; soma em v² | Mostrar referência analítica e diagnóstico instantâneo separadamente |
| Comparação com Eilers 2019 | Observações e resíduos nos raios publicados | Quantificar ajuste/desvio com as limitações de sistemáticas e calibração prévia |
| Força vertical | Kz/(2πG) comparado a Bovy & Rix 2013 | Não chamar essa unidade equivalente de densidade superficial exata |
| Velocidade de escape | Profundidade instantânea em relação a 2R200; Roche et al. | Declarar fronteira, campo congelado e dependência do método observacional |
| Massa acumulada | Soma real em esferas, mais integral do halo contínuo | Evitar inferir massa do disco por Rvc²/G |
| Diagnósticos energéticos | BH aproximado e pares Float64 sobre snapshots | Separar aproximação diagnóstica, precisão da trajetória e erro de integração |
| Estrutura do disco | h50 no plano próprio e diagnósticos por anéis | Separar espessamento, inclinação, aquecimento e perda de massa |
| Halo vivo e contínuo | Modos distintos preservados | Explicitar halo responsivo versus fonte externa estática |
| Quatro formas contínuas | Esfera, oblato, prolato, triaxial; integral homeoidal | Tratar p e q como hipóteses experimentais, não forma medida da Via Láctea |
| Reprodução | Sementes, parâmetros, snapshots, CSV/JSON/SVG e campanhas históricas | Escolher realizações identificadas e preservar sua versão física |

## Resultados numéricos verificados nesta revisão

O script `verificacoes.mjs` executa controles pequenos sem alterar o simulador. Sua saída completa está em `verificacoes-numericas.json`.

1. Gradiente de potenciais fechados, calculado por diferenças centrais independentes, comparado a analyticAcceleration em três posições interiores a R200. Erros relativos da norma: 2,00649×10⁻⁸, 7,24239×10⁻¹¹ e 1,63685×10⁻¹⁰, com h=10⁻⁴ kpc. Esse teste confirma as derivadas nesses pontos; não valida quadratura elipsoidal ou toda a trajetória GPU.
2. Par de massas 2 e 3, separação 2 kpc e ε=0,1: U = −0,13478668635681698 nas unidades internas, idêntico à fórmula independente −G·2·3/√4,01 nesta avaliação Float64. Não é uma certificação universal de arredondamento.
3. Derivada NFW em r=8,2: dΦ/dr = +0,0028079805636238575 por diferença central; GM(<r)/r² = +0,0028079805635365987. A aceleração radial tem sinal negativo, confirmando o erro de sinal na derivação escrita.
4. Binária excêntrica controlada, massas 1 e 1, posições ±1 kpc, ε=0,005 kpc, velocidade inicial 0,65 da circular Plummer, 100 Myr, energia independente avaliada em TODOS os passos completos:

| dt em Myr | Maior erro energético absoluto em % |
|---:|---:|
| 0,1 | 0,2473845398 |
| 0,05 | 0,0621495236 |
| 0,025 | 0,0155468636 |

Razões sucessivas: 3,98047 e 3,99756. Isso é evidência de segunda ordem nesse controle CPU Float64, não uma previsão do erro de uma galáxia em GPU.

5. Suíte existente executada nesta revisão: 245 testes aprovados, zero falhas. Log em `testes-existentes.txt`. Aprovação da suíte não é prova de equilíbrio físico.

## Evidência histórica que já está disponível

Os dados abaixo foram conferidos em `reports/halo-shapes-2026-10-23/summary.csv` e na documentação da campanha. Não são novas simulações desta revisão. Foram usados 2048 bariões, 511 de bojo e 1537 de disco, semente 2026, ε=0,1 kpc e dt=0,1 Myr, com o mesmo estado bariônico inicial nas formas contínuas. As condições iniciais não foram reequilibradas para cada forma.

| Forma | p | q | h50 inicial kpc | h50 em 200 Myr kpc | h50 em 1200 Myr kpc |
|---|---:|---:|---:|---:|---:|
| Esférica | 1 | 1 | 0,180621 | 0,281401 | 0,426789 |
| Oblata | 1 | 0,8 | 0,180621 | 0,268902 | 0,455430 |
| Prolata | 1 | 1,25 | 0,180621 | 0,301326 | 0,485381 |
| Triaxial | 0,85 | 0,7 | 0,180621 | 0,239340 | 0,400123 |

Esses dados permitem uma discussão real sobre forma e resposta estrutural. Não demonstram equilíbrio nem superioridade observacional do triaxial. Também mostram por que pouca variação energética não basta para declarar estabilidade do disco. Nesta convenção p e q são escalas relativas dos eixos y e z ao eixo x, não necessariamente razões ordenadas de maior para menor semieixo; o caso prolato usa q>1.

A comparação observacional fixa já preservada em `COMPARACAO_OBSERVACIONAL_1_0_6.md` tem RMS de 71,58643 km/s para bojo+disco e 8,77188 km/s com halo. São resultados de um modelo de referência fixo, não um novo ajuste independente; os parâmetros históricos têm relação com restrições observacionais semelhantes. Não converter essa diferença diretamente em uma significância de detecção. Sem covariância publicada completa, os cenários de sistemáticas existentes são hipóteses de sensibilidade, não uma matriz observada.

## Prioridades de escrita e implementação

1. Corrigir as equações listadas e preencher metodologia/resultados/conclusão com figuras exportadas de realizações identificadas. Acrescentar tabela de massas, escalas, N por componente, massa por partícula, dt, ε, tempo, semente, precisão e fontes. Isso aproveita o site sem mudar a física.
2. No site, uma melhoria útil seria um resumo exportável por execução reunindo h50 inicial/final/máximo, σz e σR por anel, erro direto máximo amostrado, perdas de massa/partículas, parâmetros e versão. Há dados e infraestrutura para reaproveitar; verificar a cobertura atual das exportações antes de duplicá-las.
3. Reunir controles de dt, N e refinamento do halo em uma comparação padronizada no mesmo tempo físico. Reutilizar campanhas existentes quando os modelos, condições iniciais e convenções forem compatíveis. Não misturar AGAMA/Plummer histórico com a realização legacy como se fossem o mesmo ensaio.
4. Se desejar ajuste observacional novo, implementar primeiro uma análise controlada com poucos parâmetros e incertezas: parâmetros bariônicos rastreáveis, escala/massa do halo, resíduos, covariância quando conhecida e estudo de sensibilidade quando não conhecida. Separar dados de calibração e verificação quando possível. Para a configuração viva, ajustar o perfil inicial não valida automaticamente a realização evoluída.
5. Só depois de isolar o aquecimento numérico e a incompatibilidade inicial, avaliar outro gerador de condições iniciais ou função de distribuição com testes isolados. Não inserir amortecimento, reduzir z ou reescalar velocidades para aprovar uma condição arbitrária. GALIC e AGAMA são referências metodológicas, não certificados automáticos.

Não é necessário implementar Relatividade Geral, interação entre galáxias ou uma nova visualização de espaço-tempo para concluir o objetivo atual. A contribuição defensável é o modelo Newtoniano documentado, sua implementação e validação numérica, o confronto quantitativo condicionado com observações e a discussão honesta das limitações.

## Mapa de evidências do código

| Arquivo | Função ou região | Evidência |
|---|---|---|
| src/physics/constants.js | linhas 1–13 | Unidades, G, conversões e parâmetros |
| src/physics/models.js | hernquistDensity, diskDensity, diskAcceleration, haloDensity, haloMass, analyticAcceleration, analyticPotential, rotationCurve | Modelos analíticos, taper e potencial finito |
| src/physics/forces.js | directAccelerations | Pares Plummer, massas individuais, exclusão de auto interação |
| src/physics/initial-legacy.js | sampleHernquist, sampleDisk, sampleHalo, sphericalJeans, verticalPressure, diskJeans, createGalaxy | Amostragem e velocidades aproximadas |
| src/physics/initial.js | createGalaxy | Método principal legacy preservado; candidato alternativo distinto |
| src/physics/live-initial.js | liveResolution, createLiveGalaxy | Halo vivo ou campo externo; refinamento e identificação |
| src/live-particle-input.js | liveInputResolution | N da interface no halo contínuo representa todos os bariões solicitados |
| src/physics/halo-ellipsoid.js | ellipsoidalHaloDensity, ellipsoidalHaloAt | Geometria material, normalização e integral homeoidal |
| src/physics/integrator.js | Leapfrog.step | KDK CPU de referência |
| src/compute/gpu.js | kickDrift, finalKick e effectiveParameters | KDK GPU Float32 e parâmetros efetivos |
| src/physics/live-energy.js | energyBase, directEnergy, finishDirect, relativeEnergy | Hamiltoniana, externo sem meio, normalização |
| src/physics/disk-analysis.js | fitDiskPlane, moments, diskAnalysis | Plano próprio, h50 e dispersões |
| src/physics/observational-diagnostics.js | diagnóstico do snapshot e metadados | Rotação, resíduos, força vertical, escape e massa |
| src/observational-plots.js | painéis e notas | Interpretações e limites das comparações |

## Referências primárias consultadas

- Hernquist (1990), An analytical model for spherical galaxies and bulges. https://doi.org/10.1086/168845
- Miyamoto & Nagai (1975), Three-Dimensional Models for the Distribution of Mass in Galaxies. https://doi.org/10.1093/pasj/27.4.533
- Navarro, Frenk & White (1997), A Universal Density Profile from Hierarchical Clustering. https://arxiv.org/abs/astro-ph/9611107
- Eilers et al. (2019), The Circular Velocity Curve of the Milky Way from 5 to 25 kpc. https://arxiv.org/abs/1810.09466
- Bovy & Rix (2013), A direct dynamical measurement of the Milky Way's disk surface density profile, disk scale length, and dark matter profile. https://arxiv.org/abs/1309.0809v3
- Roche et al., The Escape Velocity Profile of the Milky Way from Gaia DR3, versão utilizada indicada no catálogo local. https://arxiv.org/html/2402.00108v2
- Yurin & Springel (2014), An iterative method for the construction of N-body galaxy models in collisionless equilibrium. https://arxiv.org/abs/1402.1623
- Vasiliev (2019), AGAMA. https://arxiv.org/abs/1802.08239
- Sellwood (2013), Relaxation in N-body simulations of disk galaxies. https://arxiv.org/abs/1303.4919
- NIST, CODATA 2022, constante gravitacional. https://physics.nist.gov/cuu/pdf/wall_2022.pdf
- Gala, documentação e código dos modelos da Via Láctea, distinguindo versão 1 histórica e versão 2. https://gala.adrian.pw/en/stable/supporting/define-milky-way-model.html

As páginas e equações se referem à cópia recebida; após as correções e a atualização dos campos do Word, a paginação e a numeração mudarão. Não foi feita uma nova campanha longa, inferência observacional ou auditoria integral de todos os caminhos históricos do código.
