# Laboratório de Estabilidade Galáctica — versão 0.7.0

**GUILHERME ALEIXO BANDEIRA · PROJETO DE TCC · UEMS**  
Modelagem Computacional de Sistemas N-Corpos Aplicada ao Estudo da Matéria Escura.  
Atualização: 14 de outubro de 2026. Datas UTC individuais constam dos resultados.

## Conclusão científica desta entrega

O laboratório foi implementado com estados físicos integrados, gráficos e exportações. **O modelo histórico não está validado como uma galáxia em equilíbrio.** Os experimentos mostram espessamento do disco, dependência da resolução e grande variabilidade do bojo entre sementes. Conservar energia não impediu mudanças estruturais. Não foi encontrada nesta atualização uma nova distribuição de velocidades validada que resolvesse esses problemas.

O candidato de Jeans axisimétrico desenvolvido para o bojo/halo foi **rejeitado antes da integração**: a hipótese de dispersões meridionais iguais, densidade esférica prescrita e campo achatado total produziu segundo momento azimutal negativo em regiões do bojo. O sinal persistiu sob refinamento da quadratura. Isso rejeita essa combinação de hipóteses; **não demonstra a impossibilidade de uma solução com anisotropia mais geral**. Não houve recorte silencioso de variância, amortecimento, congelamento, reajuste de massas ou substituição de forças por órbitas analíticas.

O inicializador histórico continua sendo o padrão. Seu conteúdo original foi preservado em `src/physics/initial-legacy.js`; os testes comparam posições, velocidades, massas e componentes bit a bit. A variante experimental pode ser invocada por código com `initialization:'axisymmetric-jeans'`, mas rejeita estados não físicos e não é oferecida como modelo validado na interface.

## 1. Modelo preservado e auditoria histórica

Hernquist para bojo, Miyamoto–Nagai para disco, NFW com o mesmo taper para halo. Massas e escalas de `constants.js`, densidades/potenciais de `models.js`, forças Plummer, octree, Leapfrog KDK e shaders GPU foram preservados. O texto do TCC fundamenta a escolha dos perfis; os valores adotados, sua origem e a omissão do núcleo do modelo de referência estão detalhados em [Parâmetros e fontes](PARAMETROS_E_FONTES.md). Não atribuir ao TCC valores numéricos que ele não fornece.

Unidades internas: kpc, Myr, 10¹⁰ massas solares nominais. G = 0,04498502151469553 nessas unidades. Conversão 1 km/s = 0,001022712165045695 kpc/Myr. As convenções IAU e o parâmetro solar nominal são mantidos e rastreáveis no documento de parâmetros.

O commit de referência v0.6.0 é `51dd8cb1c7ee68187bc092b226369f2f920ad663`. Relatórios e documentos anteriores estão em `reports/history/v0.6.0/`. A reprodução em `reports/equilibrium/baseline-v0.6.0.json` registrou 42 testes aprovados e igualdade do ensaio estrutural histórico, excluindo a data.

O resultado histórico N=2.000, semente 2026, 20 Myr, dt=0,1 Myr, ε=0,1 kpc, θ=0,5 foi reproduzido: mediana **por número** do raio do bojo +45,04%, mediana por número de |z| do disco +59,88%, desvio absoluto relativo de energia aproximadamente 0,0079%. Esses percentuais históricos não são diretamente intercambiáveis com a inversa empírica da CDF de massa implementada no laboratório. Mesmo para massas iguais por componente, interpolar entre estatísticas de ordem não é a mesma convenção que selecionar a primeira partícula que completa metade da massa. As duas medidas são exportadas.

O arquivo citado em uma solicitação anterior, N=50.000 e 178,8 Myr, não foi fornecido como snapshot nesta tarefa. Os experimentos de 50.000 partículas desta entrega são novas integrações identificadas por semente e duração; não são uma reanálise daquele arquivo.

## 2. Definições dos diagnósticos

### Estrutura e referencial

`r = sqrt(x²+y²+z²)`; para o disco também `R = sqrt(x²+y²)`. Ordenam-se os raios e acumula-se **a massa real**, com soma compensada e tolerância apenas de arredondamento na fronteira de quantil. O raio de meia massa é a inversa da CDF empírica ponderada em 0,5. A mediana por número, interpolada, é registrada separadamente.

As posições permanecem no referencial inercial estabelecido na inicialização. A origem galáctica é (0,0,0), não o centro de cada componente recentralizado a cada passo. O centro de massa e sua velocidade são monitorados. Nenhuma correção contínua de posição, momento ou velocidade é aplicada durante a integração.

`h50 = quantil_massa(|z|, 0,5)`, em relação ao plano inicial z=0. Também são medidos h50, média de z e desvio padrão de z por anéis de R. Esses anéis selecionam a população **instantânea**: migração radial pode mudar sua composição. A inclinação do momento angular total do disco em relação a z é registrada para detectar rotação global do plano. Espessura relativa a um plano principal ajustado ainda não é implementada; por isso, h50 em z=0 não separa sozinho inclinação, empenamento e aquecimento. Momentos globais podem ser sensíveis às caudas.

Perfis esféricos usam massa/volume de casca; perfis cilíndricos usam massa/área de anel e integram todas as alturas. O perfil vertical dobrado em |z| usa abertura R<30 kpc e volume `2π(30 kpc)² Δ|z|`. Bins de transbordamento preservam a massa exterior, mas têm densidade indefinida. Não há truncamento físico das caudas para desenhar gráficos.

A referência analítica é integrada nos mesmos bins: Hernquist cumulativo, tabela cumulativa do halo e quadratura de Miyamoto–Nagai. O disco usa a variável limitada `u=z/sqrt(z²+b²)` e 512 pontos para os perfis apresentados. É uma referência ao **modelo inicial**, não um ajuste ao estado evoluído.

### Cinemática

Em cada anel, `vR=(x vx+y vy)/R`, `vphi=(x vy−y vx)/R`, `vz=vz`. Em R=0, a direção cilíndrica é indefinida e a partícula é excluída somente desses momentos, com contagem registrada. Médias e covariâncias usam ponderação pela massa e atualização central para reduzir cancelamento numérico. `sigma² = Σm(v−média)²/Σm`; o denominador é massa populacional, não correção amostral de Bessel. Exportam-se σR, σphi, σz, suas razões e rotação média. `vc`, média de `vphi` e módulo de velocidade são distintos.

### Conservação e virial

`K=Σ m v²/2`; `U=−G Σ(i<j) mi mj / sqrt(rij²+ε²)`; `E=K+U`. A energia é do **sistema completo**. A troca entre componentes não viola conservação total. O laboratório usa `(E−E0)/|E0|` com sinal; se a energia de referência for nula ou indistinguível de zero perante K e U em precisão de máquina, o desvio normalizado fica indisponível. Valores ausentes não são mostrados como erro zero.

CPU direto: soma explícita de pares, sujeita a arredondamento. CPU Barnes–Hut: potencial aproximado pela árvore. Na GPU, o diagnóstico de energia é escolhido separadamente do motor direto e pode usar árvore CPU. O método é registrado em cada instante. **Não há estimativa calibrada de erro da energia de árvore para toda realização**; essa incerteza aparece como não disponível. Na campanha CPU de convergência, a energia foi calculada por soma direta em todos os estados salvos, inclusive quando a integração usou árvore.

`P=Σ m v`; `L=Σ m r×v`. Seus desvios absolutos são registrados; os relativos usam `Σ m|v|` e `Σ|m r×v|` iniciais, evitando dividir pelo momento líquido quase nulo. A simetria antipodal inicial pode suprimir alguns erros de P: isso não prova simetria exata de Barnes–Hut em estados gerais.

O virial usa `Wij=Σ m xi aj` das **acelerações atuais** e o tensor cinético. Para pares Plummer, `W=−Σ G mi mj rij²/(rij²+ε²)^(3/2)`, que difere de U. Exibe-se `2K/(−W)` quando W<0. Rotação entra em K; termos de superfície/fluxos não são estimados. Uma razão próxima de 1 em um instante não comprova equilíbrio estrutural.

### Frequência epicíclica e Q

`Omega²=−aR(R,0)/R`; `kappa²=4 Omega²+R d(Omega²)/dR`; `Torb=2π/Omega`. A derivada central usa incremento relativo 10⁻³ e foi testada em campos Kepleriano, de rotação plana e de rotação sólida. O período de bojo/halo usa seu r½ como raio equatorial de referência; não representa o período de todas as órbitas esféricas.

`Q=sigmaR kappa/(3,36 G Sigma)` usa Σ medida no anel e κ do campo analítico **inicial**, sem suavização. O painel mostra σR/vc, h50/R e N efetivo, `(Σm)²/Σm²`. Não certifica a aproximação epicíclica, gaussianidade, estabilidade não axisimétrica ou correções de espessura. Frequências não positivas, anéis sem massa ou sem ao menos duas observações efetivas resultam em Q indisponível. Com poucos dados, um número finito continua estatisticamente incerto.

## 3. Experimentos reais e interpretação

Os números finais completos estão em `reports/laboratory/resultados-resumo.csv`, `series-temporais.csv`, `convergence.json` e `convergence-summary.json`.

- 27 integrações CPU: três sementes (2026, 2027, 2028); N=1.000, 2.000 e 4.000; dt=0,1, 0,05 e 0,025 Myr; ε=0,1 e 0,3 kpc; θ=0,5 e 0,25; controle com força direta. Cada família varia um parâmetro por vez. As comparações de 20 Myr têm estados em 0, 5, 10, 15 e 20 Myr.
- Três dessas integrações estendem N=1.000 a 200 Myr, com estados a cada 20 Myr. São experimentos de baixa resolução, não demonstrações do limite não colisional.
- Comparação pareada CPU direto Float64 × GPU direto Float32: N=1.000, três sementes, 20 Myr, estados a cada 5 Myr. Arquivo `gpu-comparison.json`. As componentes são comparadas coletivamente e a energia é recalculada em f64 por pares no snapshot de cada backend. Em 20 Myr, a maior diferença relativa de h50 do disco entre os backends nas três sementes foi aproximadamente 7,10×10⁻⁶ (0,000710%). A fixture de 1.024 corpos também passou; o erro RMS relativo de força foi 6,88×10⁻⁷. Isso não fornece um limite universal para longas integrações.
- Seis integrações GPU de resolução: N=10.000 e 50.000, três sementes, 20 Myr. Arquivo `gpu-resolution.json`. A energia desses ensaios é **aproximada por árvore** e não deve ser comparada como se tivesse a mesma precisão das energias exatas CPU.
- Controles anteriores independentes em campo analítico congelado estão em `reports/equilibrium/legacy-controls.json`. Esse campo é um controle para diagnóstico, não o motor do produto. Compará-lo ao N-corpos suavizado mistura diferenças de discretização e suavização: não isola uma única causa.

Na campanha CPU, a média do aumento de h50 em 20 Myr foi aproximadamente 63,94% (N=1.000), 42,80% (N=2.000) e 27,88% (N=4.000). A dispersão entre sementes é reportada, não escondida por uma única curva. Os intervalos exploratórios t de Student pressupõem realizações independentes e distribuição aproximadamente normal da mudança; três sementes não validam essa hipótese. Esses intervalos não constituem um classificador universal.

Nos ensaios GPU de 20 Myr, Δh50 foi 18,6704%, 24,0800% e 15,6218% para N=10.000, e 9,9092%, 10,2662% e 9,6762% para N=50.000 (sementes 2026, 2027, 2028). A tendência com N não eliminou a evolução. Esses casos têm energia aproximada, explicitamente identificada.

O espessamento persiste com força direta e refinamento temporal. Isso desfavorece uma explicação exclusivamente por erro de árvore ou por dt no intervalo testado. Sua redução com N aponta para a necessidade de controlar a granulação, mas não separa de forma definitiva relaxação por encontros e respostas coletivas ao ruído. As macropartículas do halo são mais massivas que as do disco. A expansão do bojo da semente 2026 não pode ser extrapolada a todas as sementes: outras realizações apresentaram contração no mesmo intervalo.

O diagnóstico de dispersões por anel é necessário: h50 global pode crescer enquanto a dispersão vertical global oscila ou até cai. Redistribuição radial, mudança de seleção, inclinação e momentos das caudas devem ser examinados em conjunto.

Os períodos de referência e `t/Torb` constam de cada componente. Não se extrapolam 20 ou 200 Myr para bilhões de anos, especialmente para o halo, cujo tempo característico é muito maior.

## 4. Amostragem e tentativa de aperfeiçoamento físico

A quadratura independente SciPy em `scripts/audit-spatial-independent.py` integrou a densidade Miyamoto–Nagai em células conjuntas R,|z|. A soma das frações de massa foi 1,0. Os testes agrupados das três sementes não apontaram incompatibilidade no protocolo empregado (p aproximadamente 0,386, 0,558 e 0,583); isso não prova equilíbrio dinâmico. A massa da tabela de halo difere da integração independente em cerca de 3,72×10⁻⁶ relativamente. Quantis, caudas, massas e contribuições de energia de referência estão em `reports/equilibrium/spatial-audit.json`.

O amostrador espacial de disco já tem a densidade conjunta correta. Com `q=sqrt(z²+b²)` e `A=a+q`, a marginal é `p(z)=b²/(2q³)`. A condicional radial é mistura de `a R/(R²+A²)^(3/2)` e `3q A² R/(R²+A²)^(5/2)`. A atualização não altera essa distribuição nem remove partículas distantes.

As velocidades históricas são Gaussianas baseadas em momentos Jeans, com monopolo para componentes esféricas e Satoh k=1 no disco. Momentos de Jeans não são uma função de distribuição estacionária. O candidato novo substituiu o monopolo por:

`P(R,z)=integral_|z|^infinity rho(R,z') dPhi/dz' dz'`

`sigmaR²=sigmaz²=P/rho`

`<vphi²>=P/rho+R/rho dP/dR+R dPhi/dR`.

Em R=1,08245386 kpc e z=−0,18893563 kpc, no bojo, o segundo momento azimutal convergiu para aproximadamente **−0,001784967 (kpc/Myr)²** entre 128 e 2.048 pontos de quadratura. Todas as três realizações candidatas encontraram momentos negativos. A comparação evolutiva antiga/nova não foi executada porque não existe estado candidato fisicamente admissível sob essa hipótese. Esse estágio não está marcado como validado.

GALIC otimiza velocidades e a resposta temporal das órbitas à densidade-alvo. AGAMA oferece funções de distribuição por ações e iteração de densidade/potencial; não garante reproduzir automaticamente um disco Miyamoto–Nagai arbitrário. São alternativas fundamentadas para continuidade, mas **nenhuma dessas bibliotecas foi utilizada para gerar um snapshot validado nesta entrega**. Uma DF com anisotropia mais geral ou superposição orbital exige ajuste, positividade, controle de caudas e testes independentes antes de substituir o padrão.

## 5. Interface, coleta e exportações

O laboratório fica abaixo de “Integração e precisão”. Cinco gráficos mostram raio de meia massa, h50, dispersões, energia e perfis inicial/selecionado/analítico. Seletores controlam componente, anel e instante. Valores de pontos são acessíveis por cursor; SVG exportado inclui eixos, unidades, legenda e origem dos dados.

A coleta é executada no Worker existente e sincronizada com estados completos KDK. Na GPU, reutiliza o snapshot de posições, velocidades, massas e acelerações; não faz readback a cada quadro. O intervalo solicitado em Myr combina-se com um intervalo real mínimo/adaptativo, aproximadamente dez vezes o custo recente de diagnóstico, para limitar a sobrecarga. A CPU mede na mesma fila que integra, portanto a medição ainda tem custo; ela não roda simultaneamente sobre um estado mutável.

O histórico limita-se a 512 registros de perfis/quantis, preserva t=0 e decima amostras antigas sem criar estados interpolados. Tempos reais e contagem de decimações são exportados. Pausar captura o estado final. Encerrar preserva o histórico do laboratório; reiniciar prepara novo experimento e limpa o histórico anterior. Recarregar a página não persiste o estado em disco: exporte antes.

O ZIP do laboratório contém JSON, CSV de séries globais/componentes, CSV de perfis, CSV de cinemática por anel, CSV de conservação, Markdown e cinco SVG da seleção atual. O JSON inclui perfis cinemáticos por anel, Toomre, momentos, configuração, massas, semente, backend, precisão, versão e hashes do build. Ausência do arquivo de identidade é indicada como não verificada. O pacote geral de revisão inclui código, testes, relatórios históricos e atuais.

Estados da avaliação: “Ainda não avaliado” antes de tempos distintos; “Em avaliação” durante coleta sem protocolo de convergência conclusivo; “Falha de validação numérica” em falhas de integração registradas. **O programa não emite automaticamente “Compatível com equilíbrio no intervalo testado”** porque os experimentos disponíveis não sustentam essa conclusão. A evolução estrutural detectada nas campanhas é reportada no painel e no documento, sem usar uma porcentagem arbitrária para rotular qualquer execução.

## 6. Reprodução

Na pasta do projeto, com Node.js ≥20.11:

```text
node --test
node scripts/laboratory-convergence.mjs
node scripts/serve.mjs
```

Para gráficos offline, crie um ambiente Python e instale NumPy/Matplotlib; para a auditoria espacial independente, também SciPy:

```text
python -m pip install numpy matplotlib scipy
node scripts/audit-spatial.mjs
python scripts/audit-spatial-independent.py
python scripts/plot-laboratory.py
node scripts/benchmark.mjs 1000 10000
node scripts/build.mjs
```

Versões efetivamente usadas são registradas em `plot-provenance.json` e `spatial-audit.json`. Os scripts de gráficos recusam campanhas incompletas. O build gera `downloads/code-identity.json` com SHA-256 dos arquivos de produção e prepara os arquivos de revisão. Não há cálculo gravitacional no servidor Vercel.

Para GPU, abra `http://localhost:4180/tests/browser-laboratory.html` e execute os dois botões separadamente. O resultado completo aparece no elemento `output`. `tests/browser-gpu.html` preserva as verificações anteriores de grupos parciais e renderização. O hardware e as datas do ensaio ficam no JSON; timings não são promessas para outros computadores.

## 7. Limitações e pendências explícitas

- Nova DF estacionária admissível, comparação antiga/nova e validação de longo prazo: **pendentes**. O candidato rejeitado não foi promovido.
- Não há certificação do limite não colisional, nem de equilíbrio global ou de estabilidade do halo por múltiplos tempos dinâmicos.
- Três sementes são amostra pequena. Refinamento adicional de N, ε, dt, θ, alocação de massa por componente e duração continua necessário.
- Q é condicional; erro estatístico de Q, forma não gaussiana, correções de espessura e modes não axisimétricos não são calibrados.
- Plano principal, coortes lagrangianas para espessura, termos de superfície e incerteza calibrada da energia aproximada permanecem pendentes.
- A coleta e os relatórios têm custo/memória; não se deve interpretar FPS ou tempo de processamento como precisão física.
- O modelo usa halo de matéria escura como hipótese. Estes experimentos avaliam consistência e estabilidade do modelo, não uma detecção independente de matéria escura.

## Referências primárias

- [Hernquist (1990), artigo original](https://adsabs.harvard.edu/pdf/1990ApJ...356..359H), DOI 10.1086/168845.
- [Miyamoto & Nagai (1975)](https://doi.org/10.1093/pasj/27.4.533).
- [Navarro, Frenk & White (1997)](https://arxiv.org/abs/astro-ph/9611107), DOI 10.1086/304888.
- [Yurin & Springel (2014), GALIC](https://arxiv.org/abs/1402.1623), DOI 10.1093/mnras/stu1421.
- [Vasiliev (2019), AGAMA](https://arxiv.org/abs/1802.08239), DOI 10.1093/mnras/sty2672.
- [Sellwood (2013), relaxação em discos](https://arxiv.org/abs/1303.4919).
- [Sellwood, revisão de estabilidade e evolução secular](https://ned.ipac.caltech.edu/level5/Sept13/Sellwood/Sellwood2.html).
- Constantes, parâmetros adotados e fontes observacionais de referência: [PARAMETROS_E_FONTES.md](PARAMETROS_E_FONTES.md).
