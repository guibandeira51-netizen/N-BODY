# Estabilidade galáctica e conservação — relatório matemático do TCC, versão 1.0.1

**TCC: Modelagem Computacional de Sistemas N-Corpos Aplicada ao Estudo da Matéria Escura.**

Esta versão investiga três questões independentes: a fidelidade da integração, a estacionariedade da galáxia e a convergência dos resultados. Conservar energia não prova equilíbrio; uma distribuição longe do equilíbrio também obedece às leis de conservação. Os ensaios históricos da versão 1.0 permanecem em `reports/v1.0.0/`. As novas medições e a identificação do código executado pertencem exclusivamente a `reports/v1.0.1/`.

## 1. O que significa uma galáxia em equilíbrio

Uma galáxia não colisional é descrita pela função de distribuição de massa no espaço de fases, \(f_c(\mathbf x,\mathbf v,t)\), para cada componente \(c\). A massa em um elemento é \(f_c\,d^3x\,d^3v\), e

\[
\rho_c(\mathbf x,t)=\int f_c(\mathbf x,\mathbf v,t)\,d^3v,
\qquad \rho=\sum_c\rho_c.
\]

O limite não colisional negligencia encontros individuais como termo de colisão e mantém a força gravitacional coletiva. A evolução de uma população é

\[
\boxed{\frac{\partial f_c}{\partial t}
+\mathbf v\cdot\nabla_{\mathbf x}f_c
-\nabla\Phi\cdot\nabla_{\mathbf v}f_c=0.}
\]

As características dessa equação são as órbitas \(\dot{\mathbf x}=\mathbf v\), \(\dot{\mathbf v}=-\nabla\Phi\); pela regra da cadeia, \(df_c/dt=0\) ao longo delas. Para uma galáxia isolada Newtoniana autoconsistente, o mesmo potencial deve satisfazer

\[
\boxed{\nabla^2\Phi=4\pi G\sum_c\int f_c\,d^3v.}
\]

A condição de equilíbrio estacionário é \(\partial f_c/\partial t=0\), portanto \(\{f_c,H\}=0\), com \(H=|\mathbf v|^2/2+\Phi\) a energia específica orbital. Isso não exige \(\mathbf v=0\), nem que cada estrela tenha velocidade constante. As estrelas continuam circulando e oscilando; a distribuição estatística de posições e velocidades permanece a mesma. Em uma órbita circular, o módulo da velocidade pode ser constante enquanto sua direção gira. A velocidade circular \(v_c^2=R\partial_R\Phi(R,0)\), a rotação média \(\langle v_\phi\rangle\) e o módulo \(|\mathbf v|\) são grandezas distintas.

Uma DF que dependa somente de integrais exatas do movimento é estacionária no potencial em que essas integrais foram definidas. Na construção com ações \(f(\mathbf J)\), erros nas ações, quadraturas e expansão do potencial tornam a afirmação aproximada. O AGAMA itera a densidade da DF e a equação de Poisson; sua convergência interna não testa automaticamente a realização discreta suavizada usada depois. [Vasiliev, AGAMA, 2019](https://arxiv.org/abs/1802.08239), [documentação matemática do AGAMA](https://arxiv.org/abs/1802.08255).

Equilíbrio e estabilidade também diferem. Uma solução estacionária pode amplificar perturbações pequenas, formando uma barra ou outra estrutura. A preparação de um equilíbrio aproximado é condição inicial; a resposta a perturbações e ao ruído de partículas é uma questão dinâmica posterior.

## 2. Do modelo contínuo ao sistema discreto

A realização tem massas \(m_i\), posições \(\mathbf r_i\) e velocidades \(\mathbf v_i\). Uma macro partícula representa muitas estrelas ou uma parcela do halo; não é uma estrela individual. As massas físicas permanecem fixas ao variar a alocação de partículas, com \(m_c=M_c/N_c\) em cada população de peso uniforme.

Com suavização de Plummer constante \(\epsilon\), o sistema isolado integrado satisfaz

\[
\ddot{\mathbf r}_i=G\sum_{j\ne i}m_j
\frac{\mathbf r_j-\mathbf r_i}
{\left(|\mathbf r_j-\mathbf r_i|^2+\epsilon^2\right)^{3/2}}.
\]

Esse campo não coincide exatamente com o potencial Newtoniano contínuo de preparação, mesmo com \(N\) infinito a \(\epsilon\) fixo. No contínuo, o núcleo de Plummer corresponde a

\[
W_\epsilon(r)=\frac{3\epsilon^2}{4\pi(r^2+\epsilon^2)^{5/2}},
\quad
\Phi_\epsilon(\mathbf x)=-G\int
\frac{\rho(\mathbf y)}{\sqrt{|\mathbf x-\mathbf y|^2+\epsilon^2}}d^3y,
\]

de modo que \(\nabla^2\Phi_\epsilon=4\pi G(\rho*W_\epsilon)\), em vez de \(4\pi G\rho\). A identidade resulta de aplicar o Laplaciano ao núcleo. Ela explica por que a mesma DF Newtoniana pode se reajustar após a troca de lei gravitacional. Diminuir \(\epsilon\) reduz parte desse viés e aumenta as flutuações e a exigência temporal; escolher o menor espessamento não determina um \(\epsilon\) cientificamente ótimo. [Dehnen, 2001](https://arxiv.org/abs/astro-ph/0011568).

Há, portanto, erros e mudanças distintos:

| Origem | O que muda | Controle necessário |
|---|---|---|
| Amostragem finita | Flutuações do campo, encontros entre macro partículas | Várias sementes e diferentes \(N_c\), massas fixas |
| Suavização | Hamiltoniana e força média | Comparação de campo Newtoniano/suavizado, escalas físicas e \(\epsilon\) |
| Barnes–Hut | Aproximação espacial da soma de forças | Referência direta Float64 e variação de \(\theta\) |
| Float32 | Representação e somas arredondadas | Mesma realização em CPU Float64 e GPU Float32 |
| Passo temporal | Aproximação do fluxo da Hamiltoniana escolhida | Mesmos estados, campo e duração, variando \(dt\) |
| DF e potencial de preparação | Estacionariedade aproximada do contínuo | Poisson, \(f\) ao longo de órbitas, controle suave |

Nenhum desses controles, isoladamente, identifica a causa completa do aquecimento.

## 3. Energia do sistema isolado

A energia mecânica correspondente à força de Plummer é

\[
E=K+U,\qquad K=\frac12\sum_i m_i|\mathbf v_i|^2,
\qquad
U=-G\sum_{i<j}\frac{m_i m_j}{\sqrt{r_{ij}^2+\epsilon^2}}.
\]

A restrição \(i<j\) conta cada par uma vez e exclui a autointeração. O fator \(1/2\) aparece se escrevermos \(U=\frac12\sum_i m_i\Phi_{\ne i}(\mathbf r_i)\), pois nesse caso cada par aparece duas vezes. Uma soma direta Float64 é a referência finita para essa expressão; ela ainda tem arredondamento, e não é uma avaliação aritmética exata.

Para demonstrar a conservação contínua, seja \(\mathbf F_{ij}\) a força de \(j\) sobre \(i\). A lei central satisfaz \(\mathbf F_{ji}=-\mathbf F_{ij}\) e \(\mathbf F_{ij}=-\nabla_i U_{ij}\). Assim,

\[
\dot K=\sum_i\mathbf v_i\cdot\mathbf F_i,
\qquad
\dot U=\sum_i\nabla_iU\cdot\mathbf v_i=-\sum_i\mathbf F_i\cdot\mathbf v_i,
\qquad \boxed{\dot E=0.}
\]

Isso pressupõe massas, \(G\) e \(\epsilon\) constantes, ausência de forças dissipativas e de dependência explícita do potencial com o tempo. A demonstração é da equação diferencial, não uma promessa de erro zero do computador.

O diagnóstico temporal é

\[
\delta E(t)=\frac{E(t)-E(0)}{|E(0)|},\quad
e_{\max,\mathrm{amostras}}=\max_{t_k}|\delta E(t_k)|.
\]

Devem ser mantidos o sinal, o valor final, os máximos positivo e negativo, a envoltória e a cadência dos \(t_k\). O máximo amostrado é um limite inferior do máximo contínuo; não detecta automaticamente oscilações entre saídas. Se \(E(0)\) quase se anular por cancelamento, a normalização relativa fica mal condicionada e deve ser acompanhada de \(\Delta E\) absoluto e de uma escala como \(K(0)+|U(0)|\).

Para potencial externo, fixar a convenção de zero de \(\Phi\) em todas as comparações. Um deslocamento constante não muda forças nem \(\Delta E\), mas muda o denominador \(|E(0)|\). A energia total de sistemas com leis ou componentes diferentes também não deve ser diretamente comparada como se tivesse a mesma normalização física.

## 4. Campos externos e o fator correto

No controle com halo fixo, só bojo e discos aparecem como fontes móveis de autogravitação:

\[
E_{\rm mov}=K+U_{\rm bar,\epsilon}+
\underbrace{\sum_{i\in\mathrm{bárions}}m_i\Phi_{\rm halo}(\mathbf r_i)}_{U_{\rm ext}}.
\]

Não há fator \(1/2\) em \(U_{\rm ext}\): o halo externo não é somado como outra população móvel. Não se acrescenta uma segunda realização massiva do mesmo halo. O campo fixo não responde às estrelas; seu controle remove simultaneamente granularidade e resposta dinâmica, podendo ainda ter lei não suavizada. Seu resultado não isola apenas o efeito de \(m_{\rm halo}\).

No controle de partículas de teste no potencial **total** congelado, a grandeza conservada é

\[
E_{\rm teste}=\sum_i m_i\left(\frac{|\mathbf v_i|^2}{2}+\Phi_{\rm total}(\mathbf r_i)\right).
\]

Não existe autogravitação adicionada entre essas partículas. Os pesos servem ao diagnóstico da distribuição. Tanto a contribuição externa como sua aceleração devem vir do mesmo potencial escalar. Se uma tabela interpolar força e potencial independentemente, essa consistência precisa ser medida; não decorre do nome do modelo.

## 5. Momento angular, momento linear e referencial

Em uma origem inercial fixa,

\[
\mathbf P=\sum_i m_i\mathbf v_i,\qquad
\mathbf L=\sum_i m_i\mathbf r_i\times\mathbf v_i,\qquad
\mathbf R_{\rm CM}=\frac{\sum_i m_i\mathbf r_i}{M}.
\]

Em um sistema isolado com forças de pares centrais,

\[
\dot{\mathbf P}=\sum_{i<j}(\mathbf F_{ij}+\mathbf F_{ji})=0,
\quad
\dot{\mathbf L}=\sum_{i<j}(\mathbf r_i-\mathbf r_j)\times\mathbf F_{ij}=0.
\]

Consequentemente, \(\mathbf R_{\rm CM}(t)=\mathbf R_{\rm CM}(0)+t\mathbf P(0)/M\). Centro de massa constante só é esperado se \(\mathbf P(0)=0\). O momento angular interno pode ser registrado separadamente:

\[
\mathbf L_{\rm int}=\mathbf L-\mathbf R_{\rm CM}\times\mathbf P.
\]

A origem usada não deve ser alterada durante a integração para esconder deriva. Ajustar um plano e um centro durante a análise é uma transformação do diagnóstico, sem modificar estados físicos.

Para \(\Phi_{\rm ext}(R,z)\) estacionário axisimétrico, \(\partial\Phi_{\rm ext}/\partial\phi=0\), logo

\[
\dot L_z=-\sum_i m_i\partial_\phi\Phi_{\rm ext}=0.
\]

Em geral \(L_x\), \(L_y\), \(|\mathbf L|\) e \(\mathbf P\) dos corpos móveis não são invariantes nesse campo. Um campo externo esférico é um caso adicionalmente simétrico e conserva todo o vetor angular sobre seu centro. Os invariantes da galáxia completa também não precisam se conservar separadamente em cada componente: torques físicos transferem momento angular entre disco e halo.

Como quiet starts podem ter \(|\mathbf P(0)|\) quase nulo, não normalizar por ele. Uma escala útil é \(\sum_i m_i|\mathbf v_i(0)|\). Para \(\Delta\mathbf L\), registrar valores absolutos e uma escala explícita; quando \(L_z(0)\) for significativo, \(\Delta L_z/|L_z(0)|\) também é informativo.

## 6. Dedução do Leapfrog Kick–Drift–Kick

Use os momentos canônicos \(\mathbf p_i=m_i\mathbf v_i\) e a Hamiltoniana separável

\[
H(\mathbf r,\mathbf p)=T(\mathbf p)+V(\mathbf r).
\]

O fluxo de \(V\) mantém posições fixas e muda \(\mathbf p\) por \(-h\nabla V\) (kick). O fluxo de \(T\) mantém momentos fixos e muda \(\mathbf r\) por \(h\mathbf p/m\) (drift). Compondo meio kick, drift inteiro e meio kick:

\[
\begin{aligned}
\mathbf v_i^{n+1/2}&=\mathbf v_i^n+\frac h2\mathbf a_i(\mathbf r^n),\\
\mathbf r_i^{n+1}&=\mathbf r_i^n+h\mathbf v_i^{n+1/2},\\
\mathbf a_i^{n+1}&=\mathbf a_i(\mathbf r^{n+1}),\\
\mathbf v_i^{n+1}&=\mathbf v_i^{n+1/2}+\frac h2\mathbf a_i^{n+1}.
\end{aligned}
\]

As velocidades \(\mathbf v^n\) e posições \(\mathbf r^n\) estão sincronizadas na época inteira. Por isso a energia deve usar esse par, não uma velocidade de meio passo com a posição final.

Se \(A\) e \(B\) denotam os operadores dos fluxos cinético e potencial, a composição simétrica é \(e^{hB/2}e^{hA}e^{hB/2}\). A expansão de Baker–Campbell–Hausdorff tem expoente \(h(A+B)+O(h^3)\). O erro local é \(O(h^3)\), e o global em um intervalo fixo é \(O(h^2)\), sob regularidade e passo que resolva as frequências relevantes. A simetria da composição implica reversibilidade em aritmética ideal. Cada subfluxo Hamiltoniano é simplético; sua composição também é.

O método não conserva exatamente \(H\). A análise por equação modificada produz formalmente \(\widetilde H=H+h^2H_2+h^4H_4+\cdots\), que explica oscilações pequenas de energia em condições adequadas. A extensão temporal dessa quase conservação depende das hipóteses de regularidade, escalas, ressonâncias e arredondamento; ela deve ser testada no problema concreto. [Hairer, Lubich e Wanner, análise de Störmer–Verlet](https://www.unige.ch/~hairer/preprints/gniverlet.html).

Para a soma direta de pares centrais, cada kick também preserva os momentos lineares e angulares em aritmética ideal; o drift preserva \(\mathbf r\times\mathbf p\), pois \((\mathbf r+h\mathbf p/m)\times\mathbf p=\mathbf r\times\mathbf p\). Em Float64 permanece arredondamento. A força Barnes–Hut dirigida por alvo não satisfaz exatamente ação e reação nem se identifica automaticamente com o gradiente de uma Hamiltoniana global; trocar apenas o nome do integrador não recupera essas garantias. Na GPU, Float32 adiciona arredondamento no upload, nas somas e em cada kick/drift.

## 7. Estabilidade estrutural observável

Para cada componente, acompanhar densidade radial e vertical, raio de meia massa, centro de massa e dispersões. Para cada disco fino/espesso, medir separadamente:

\[
h_{50}=\operatorname{mediana}_{m}\left(|(\mathbf r_i-\mathbf c)\cdot\mathbf n|\right),
\qquad
\sigma_\alpha^2=\frac{\sum_i m_i(v_{\alpha,i}-\bar v_\alpha)^2}{\sum_i m_i}.
\]

O vetor \(\mathbf n\) é a normal do plano ajustado e \(\mathbf c\) seu centro. Comparar plano fixo, plano global instantâneo e planos locais por anel: inclinar um disco rígido pode aumentar \(|z|\) sem aquecê-lo; um warp pode aumentar a altura global sem igual aumento de espessura local. A dispersão normal remove a velocidade média do grupo, mas uma simples projeção não subtrai automaticamente a velocidade de um referencial precessante. Redistribuição radial também pode mudar a espessura global. Seleções instantâneas em anéis e coortes com rótulos iniciais respondem a perguntas diferentes e são complementares.

Para modos azimutais:

\[
A_m(R,t)=\frac{\left|\sum_{i\in R}m_i e^{im\phi_i}\right|}{\sum_{i\in R}m_i},
\qquad m=1,2,3,4.
\]

Registrar amplitudes e fases, ocupação dos anéis e ruído esperado. A antipodalidade inicial correlaciona pares e suprime modos ímpares; \(1/\sqrt N\) para amostras independentes não descreve sozinho esse quiet start. Crescimento de \(A_2\) não identifica automaticamente uma barra persistente, nem prova estrutura espiral. Se surgir não axisimetria significativa e convergente, deve ser mantida e investigada, não suprimida.

A referência local de Toomre para uma população estelar fina, aproximadamente em equilíbrio, é

\[
Q=\frac{\sigma_R\kappa}{3.36G\Sigma},\qquad
\kappa^2=R\frac{d\Omega^2}{dR}+4\Omega^2,
\quad \Omega=v_c/R.
\]

É um critério local de perturbações axisimétricas no regime derivado. Mistura fino/espesso, espessura finita, frequências iniciais congeladas, não axisimetria e suavização limitam o uso de um único \(Q\). \(Q>1\) não demonstra estabilidade global ou ausência de barras. [Toomre, 1964](https://adsabs.harvard.edu/pdf/1964ApJ...139.1217T).

O virial também exige cuidado: para Plummer, a grandeza \(W=\sum_i\mathbf r_i\cdot\mathbf F_i=-G\sum_{i<j}m_im_jr_{ij}^2/(r_{ij}^2+\epsilon^2)^{3/2}\) não é igual a \(U\). A condição média estacionária envolve \(2K+W\), com termos externos e de contorno quando aplicáveis. Usar \(2K+U=0\) como certificado exato no modelo suavizado seria incorreto.

## 8. Experimentos que separam hipóteses

| Experimento | Campo | Pergunta e limite |
|---|---|---|
| A — suave total congelado | Potencial contínuo total, partículas de teste | A DF permanece aproximadamente estacionária no campo de preparação? Não testa retroação ou granularidade |
| B — halo fixo | Bojo/disco autogravitantes + halo externo | Qual a evolução sem partículas de halo e sem sua resposta? Não isola somente ruído do halo |
| C — halo dinâmico | Todas as componentes móveis | Evolução N-corpos completa no Hamiltoniano suavizado |
| D — halo refinado | Mesmo estado bariônico, \(N_h\) maior | Sensibilidade à massa das macro partículas do halo, massa total fixa |
| E — bárions refinados | \(N_b,N_d\) variados, halo controlado | Sensibilidade à discretização do disco e bojo |

Ensaios de \(dt=0,1;0,05;0,025\) Myr devem partir do mesmo snapshot. Variar \(N\) requer novas amostras da mesma DF e pesos consistentes; variar \(\epsilon\) muda a lei física efetiva. Comparar durações iguais em Myr e em número de períodos \(T_{\rm orb}(R)=2\pi R/v_c(R)\). As regiões internas completam mais órbitas que as externas no mesmo tempo.

## 9. Interpretação dos resultados e classificações

Os valores históricos conhecidos continuam identificados como **campanha 1.0**: em 200 Myr, espessamento global do legado 10k +162,96%, AGAMA original 10k +41,80%, original 50k +12,56%, calibrado 10k +91,95% e calibrado 50k +32,39%. Em 1 Gyr, o calibrado 10k/semente 2026 cresceu +415,41%, enquanto o controle suave correspondente variou aproximadamente −1,19%. O original começou mais espesso; percentuais menores não bastam para classificá-lo como melhor equilíbrio. Os dados originais estão em `reports/v1.0.0/assessment.json` e `VALIDACAO_EQUILIBRIO_1_0.md`; não são novas execuções da versão 1.0.1.

Esses resultados motivam investigar a transição contínuo–discreto, mas não decompõem sua causa de forma única. Um \(\delta E\) pequeno permite transferência entre energia de rotação, dispersões, energia potencial e componentes, podendo coexistir com aquecimento, expansão e formação de barra.

As novas referências CPU Float64 concluíram três controles binários até 200 Myr e onze ensaios galácticos até 20 Myr. No binário, \(\max|\delta E|\) caiu de 5,93924 × 10⁻³ para 1,49647 × 10⁻³ e 3,74853 × 10⁻⁴ ao usar h=0,1; 0,05; 0,025 Myr. Na mesma galáxia calibrada de 1.000 partículas, caiu de 8,05447 × 10⁻⁶ para 2,00562 × 10⁻⁶ e 5,01773 × 10⁻⁷. As razões próximas de quatro evidenciam segunda ordem no domínio medido.

A cobertura nova total é **21 integrações concluídas**: 14 referências CPU, dois controles suaves AGAMA até 1 Gyr e cinco ensaios GPU (três N=1.000/20 Myr, dois N=10k/50k até 200 Myr). Soma-se uma reanálise, sem nova integração, de dez trajetórias históricas/33 estados. A galáxia autogravitante grande não foi reexecutada em Float64 por 1 Gyr; isso permanece uma limitação explícita. As novas GPU grandes reproduziram espessamento global de +91,95% em 10k e +32,39% em 50k a 200 Myr, com energia BH densa e snapshots diretos esparsos tratados separadamente.

Apesar disso, no calibrado/h=0,05 Myr, a mediana global ao plano instantâneo passou de 0,210205 a 0,391310 kpc em 20 Myr; o fino passou de 0,176082 a 0,349513 kpc e sua dispersão normal de 33,201 a 44,687 km/s. A redução adicional de h preservou praticamente a mesma evolução estrutural. A conservação numérica da referência é demonstrável, mas o modelo discreto pequeno não ficou próximo de um equilíbrio estrutural. Essa distinção é central para a defesa.

Os resultados detalhados devem ser lidos junto com `AUDITORIA_ENERGIA_1_0_1.md`, `EQUILIBRIO_AXISIMETRICO_1_0_1.md`, `CONVERGENCIA_NUMERICA_1_0_1.md` e `COMPARACAO_AGAMA_1_0_1.md`. A classificação usa três eixos:

| Eixo | Classificação justificável | Evidência exigida |
|---|---|---|
| Conservação/integração | **VALIDADO NUMERICAMENTE no domínio testado** ou **NÃO VALIDADO** | Série energética consistente, referência direta e erro quantificado, invariantes apropriados |
| Estrutura | **PRÓXIMO DO EQUILÍBRIO no intervalo testado** ou **NÃO VALIDADO** | Perfis e momentos aproximadamente estacionários, sementes e escalas orbitais suficientes |
| Convergência | **VALIDADO NUMERICAMENTE no domínio testado** ou **NÃO VALIDADO** | Tendências controladas com \(dt,N,\epsilon,\theta\) e precisão; pisos de erro separados |

Não se adota uma porcentagem universal de expansão. Uma afirmação é restrita ao modelo, às regiões, resoluções, parâmetros e duração medidos. Resultados ausentes não são zeros nem aprovação. O propósito científico é produzir uma conclusão defensável, inclusive quando a conclusão for insuficiência de evidência ou instabilidade.

O parecer da versão 1.0.1 é:

| Avaliação | Parecer efetivo | Domínio e motivo |
|---|---|---|
| Conservação de energia | **VALIDADO NUMERICAMENTE na referência direta Float64** | Binário até 200 Myr e galáxia N=1.000 até 20 Myr, três h e energia direta em todo passo; erros e invariantes quantificados. Não certifica todos os backends/durações |
| Estabilidade dinâmica | **NÃO VALIDADO** | A galáxia autogravitante muda espessura, dispersões e perfis; as populações e o teste suave não autorizam certificação global |
| Convergência numérica global | **NÃO VALIDADO / INCOMPLETO** | A ordem temporal do controle foi demonstrada; convergência estrutural conjunta em N, suavização, precisão e sementes não foi estabelecida |

Portanto, a meta de demonstrar um algoritmo de referência com conservação quantificada foi alcançada nesse domínio; a meta de uma galáxia completa próxima do equilíbrio por vários períodos orbitais permanece aberta. A entrega registra os resultados favoráveis e desfavoráveis sem estabilização artificial.

## 10. Limitações para a banca

O modelo é collisionless, isolado e reduzido: omite gás, hidrodinâmica, formação estelar, feedback, ambiente cosmológico e perturbações de satélites. O bojo foi esferizado na preparação; não representa a barra real completa. O halo tem corte finito explícito. As massas e as referências permanecem em `MASSAS_VIA_LACTEA_1_0.md`; não foram alteradas para estabilizar a aparência.

Há duas populações estelares com DF e estrutura diferentes; um único valor global de espessura é insuficiente. Ações aproximadas, cobertura finita das verificações de Poisson, diferenças entre campo preparado e suavizado, ruído da amostragem e erros de máquina limitam a interpretação. A estabilidade em um intervalo finito não prova estabilidade por tempo ilimitado. Uma galáxia de teste aproximadamente estacionária é um controle útil para a dinâmica de matéria escura, mas sua estabilidade por si só não demonstra a existência ou a natureza da matéria escura.

Nenhuma força estabilizadora, amortecimento, correção evolutiva de velocidades, manutenção artificial de espessura ou braço decorativo faz parte do protocolo. A análise pode ajustar planos e calcular referenciais; ela não altera a evolução física.

## 11. Figuras, tabelas e reprodução da defesa

As dez figuras obrigatórias são exportadas em PNG e SVG, cada uma com seu CSV de pontos efetivamente desenhados. O manifesto `reports/v1.0.1/figures/figure-manifest.json` identifica descrições, limitações, fontes e hashes, versão do Matplotlib e hash de `scripts/validation-101/plot.py`. Fontes históricas e integrações novas são identificadas em cada comparação; os pontos diretos históricos esparsos não são interpolados como se existisse uma série direta completa.

| Gráfico | Arquivos em `reports/v1.0.1/figures/` | Leitura para a banca |
|---|---|---|
| K, U e E no tempo | `energy-terms.png`, `.svg`, `.csv` | A definição de U depende do campo; externo sem 1/2 |
| Erro relativo assinado | `energy-error.png`, `.svg`, `.csv` | Observar máximos e oscilações, distinguir direto e BH |
| Máximo energético versus h | `energy-dt.png`, `.svg`, `.csv` | Separar binário, galáxia CPU e GPU |
| Espessura temporal | `disk-thickness.png`, `.svg`, `.csv` | Populações e planos separados |
| Dispersões radial, azimutal, vertical | `velocity-dispersion.png`, `.svg`, `.csv` | Velocidades físicas, médias removidas conforme definição |
| Espessura versus resolução | `resolution-thickness.png`, `.svg`, `.csv` | Distinguir N total de refinamento apenas de halo/bárions |
| Raio de meia massa | `half-mass.png`, `.svg`, `.csv` | Identificar raio esférico/cilíndrico e componente |
| Densidades inicial/final | `density-profiles.png`, `.svg`, `.csv` | Bordas e aberturas fixas; ausência de bin não é zero físico |
| Momento angular | `angular-momentum.png`, `.svg`, `.csv` | Conservar vetor no isolado; Lz no externo axisimétrico |
| Campo contínuo, halo fixo, dinâmico | `field-comparison.png`, `.svg`, `.csv` | Comparar tempos iguais, Hamiltonianas e protocolos identificados |

Não se inventam barras de incerteza onde só existe uma realização. Dispersões entre as poucas sementes disponíveis são descritas como dispersões observadas, não intervalos universais. As unidades internas de velocidade são convertidas usando 977,7922216807891 km/s por kpc/Myr; a energia interna corresponde a 1,9010741942186524 × 10⁵² J pela convenção de massa nominal registrada no modelo.

Com o ambiente Python científico indicado na entrega, reproduzir as figuras a partir dos resultados salvos:

```text
python scripts/validation-101/plot.py
```

A reprodução das integrações CPU e do campo contínuo usa os comandos dos relatórios específicos. O manifesto permite verificar de quais arquivos cada figura veio; regenerar uma figura não é executar novamente a trajetória. Snapshots iniciais/finais das novas referências CPU estão em `reports/v1.0.1/snapshots/`; estados completos do controle suave estão em `continuum/*.jsonl`, e as leituras dos ensaios GPU nos próprios JSON de execução.
