# Diagnóstico decisivo da resolução e do equilíbrio galáctico

Data UTC: 2026-10-21T14:12:47.016Z. Resultado: **equilíbrio não demonstrado; resolução mínima ainda não determinada; candidato não promovido**. A hipótese de que o gráfico principal já usava o candidato foi refutada pelos metadados e pelo snapshot original. Foram executadas 54 trajetórias GPU e 16 controles CPU, todas de até 200 Myr. Nenhuma nova campanha de bilhões de anos foi executada.

## 1. Identidade do gráfico original

Realização **1ca8f265-4da8-49e8-9694-df20f8edc2fa**, gerador **legacy**, versão de identidade **1.0.6-disk-audit.1**; semente 2026, força GPU direta Float32, energia CPU Float64 compensada. N=33148; dt solicitado=0,1 Myr, efetivo=0.10000000149011612 Myr; ε solicitado=0,1 kpc, ε² efetivo=0.009999999776482582 kpc²; G efetivo=0.04498502239584923. Sem potencial externo. θ=0,5 pertence ao diagnóstico BH, não à força GPU.

| Componente | N | Massa-alvo [M☉] | Massa efetiva de cada partícula GPU [M☉] |
| --- | --- | --- | --- |
| Bojo | 4972 | 5.000000e+9 | 1005632 |
| Disco | 14917 | 6.800000e+10 | 4558557 |
| Halo | 13259 | 9.763158e+11 | 7.363420e+7 |

A partícula do halo tem 16.15296 vezes a massa da partícula do disco; bojo/disco=0.2206030. O halo total finito é 9,7631576417×10¹¹ M☉; 5,4×10¹¹ M☉ é sua escala NFW, não a massa total. R200=206,6257987 kpc, limite externo=247,9509584 kpc, com o taper original preservado.

O histórico contém 373 medições entre 0 e 18600.00 Myr, com h50=0.1648725→4.470348 kpc. O último tempo é compatível com 186000 passos × dt efetivo: 18600,0002771616 Myr. Os campos ativos zerados após encerrar não apagam o histórico. A leitura aproximada anterior de 4,43 kpc em 18.500 Myr não substitui a medição retida mais recente.

O snapshot t=0 original está preservado em session-snapshot-initial.json; posições, velocidades, massas e componentes coincidiram elemento a elemento com a regeneração pelo código atual, após a conversão Float32 original. Hashes binários constam em session-analysis.json. O snapshot final original também foi salvo. Não se atribuiu uma reconstrução ao papel de captura original.

## 2. Espessamento não equivale a fuga

No snapshot final, **0% da massa do disco** apresentou energia específica instantânea positiva, usando potencial direto de todas as partículas, sem autointeração, G/ε efetivos e velocidades relativas ao centro de massa global. O mesmo diagnóstico inicial deu 0%. Esse critério é instantâneo: o potencial vivo muda no tempo e não constitui prova de aprisionamento permanente. Não foram examinados todos os estados intermediários quanto à fuga.

A fração do disco em R>30 kpc foi 9.613193%→14.81531%. Miyamoto–Nagai já possui uma cauda radial extensa: cruzar 30 kpc não define escape. A dispersão normal cresceu de 39.29553 para 102.1576 km/s. O plano global inclinou 4.431257 graus; h50 no plano inicial=4.456998 kpc, próximo de h50 no plano próprio=4.470348 kpc. Logo, a inclinação sozinha não explica o resultado. Os autovalores do ajuste são 33.22190, 50.91922, 53.02173 kpc²: o estado já não se aproxima de um disco fino, e a interpretação de um plano único fica limitada.

E direta inicial=-1.844198, final=-1.844162; δE final=0.001944228%; maior |δE| entre 373 referências=0.002062473%. A boa conservação da energia global é compatível com redistribuição de energia entre componentes e direções. Não certifica equilíbrio.

## 3. Campanha controlada de resolução

A matriz principal tem 2 geradores × 3 sementes × Nd={512,2048,8192} × Nh={2048,8192}: 36 trajetórias até 200 Myr, dt=0,05 Myr, ε=0,1 kpc. Nb=512 foi mantido fixo. Há refinamentos curtos até Nd=16384/Nh=32768, controles dt={0,1;0,05;0,025} Myr, ε={0,05;0,1;0,2} kpc, dois controles Nb=4096 e duas trajetórias de 200 Myr na maior resolução, com uma semente. Consulte manifest.json e series.csv para cada caso efetivamente executado.

As amostras são prefixos de pares antipodais dos geradores existentes. Ao refinar o halo, posições, velocidades e massas de bojo/disco são idênticas; ao refinar o disco, bojo/halo são idênticos. Não há terceiro gerador. As massas-alvo são sempre [0,5;6,8;97,6315764173]×10¹⁰ M☉. As potências de dois usadas nas contagens mantêm também a mesma massa efetiva Float32 por componente ao refinar a matriz, à parte do erro de soma. Prefixos dentro da mesma semente são correlacionados e não devem ser tratados como repetições independentes. As três sementes do candidato reamostram a mesma biblioteca orbital, sem representar três ajustes independentes da função de distribuição.

| Gerador | Nd | Nh | h50 médio em 200 Myr [kpc] | Intervalo entre 3 sementes [kpc] | Aumento médio de h50 [kpc] |
| --- | --- | --- | --- | --- | --- |
| legacy | 512 | 2048 | 0.6957686 | 0.6785266–0.7120613 | 0.5193220 |
| legacy | 512 | 8192 | 0.4285805 | 0.4046370–0.4515917 | 0.2521339 |
| legacy | 2048 | 2048 | 0.6803583 | 0.5999492–0.8085884 | 0.5114121 |
| legacy | 2048 | 8192 | 0.3652571 | 0.3429249–0.3809727 | 0.1963110 |
| legacy | 8192 | 2048 | 0.6707790 | 0.6221345–0.7423961 | 0.5017474 |
| legacy | 8192 | 8192 | 0.3684112 | 0.3551384–0.3899214 | 0.1993796 |
| candidate | 512 | 2048 | 0.6506932 | 0.5839651–0.7266197 | 0.4792878 |
| candidate | 512 | 8192 | 0.4606388 | 0.4166919–0.4861597 | 0.2892333 |
| candidate | 2048 | 2048 | 0.6094029 | 0.5841175–0.6467153 | 0.4433326 |
| candidate | 2048 | 8192 | 0.3805230 | 0.3660141–0.3901152 | 0.2144526 |
| candidate | 8192 | 2048 | 0.6495131 | 0.6135896–0.7127099 | 0.4896218 |
| candidate | 8192 | 8192 | 0.3510094 | 0.2858355–0.4011537 | 0.1911181 |

O refinamento do halo reduz o aumento de h50 em todas as diferenças pareadas registradas em diferencas-pareadas.csv. Ao passar Nd=2048→8192 mantendo Nh=8192, a média legada permanece semelhante; aumentar apenas a resolução estelar não remove o piso produzido pelo halo discreto e pelos demais mecanismos presentes. Isso é compatível com o mecanismo estudado por Ludlow et al., mas não identifica uma fração causal exclusiva de encontros: o halo vivo também muda seu campo médio e sua resposta coletiva.

A resolução principal do bojo, Nb=512, é inferior à sessão original Nb=4972. Os controles Nb=4096 são curtos e de uma semente. Essa dimensão ainda não convergiu; portanto a matriz não fornece uma estimativa universal de N mínimo para a realização original. Os resultados de maior resolução são:

| Gerador | h50(0) [kpc] | h50(200) [kpc] | σ normal inicial/final [km/s] | Maior |δE| amostrado [%] |
| --- | --- | --- | --- | --- |
| legacy | 0.1658779 | 0.2368893 | 39.34723 / 43.37329 | 0.00004057469 |
| candidate | 0.1633154 | 0.2237394 | 36.80635 / 40.83134 | 0.00001441035 |

Não há patamar estrutural demonstrado em todos os eixos Nd/Nh/Nb, tempos e sementes. Um ponto de 40 Myr mais fino não autoriza uma conclusão sobre vários Gyr. O critério é a convergência de diferenças entre resoluções em h50, σnormal², σR², massa e perfis radiais, comparadas à dispersão entre sementes e ao erro temporal/força medido. Uma tolerância percentual escolhida para aprovar o modelo não foi adotada. Apenas duas resoluções de halo têm três sementes em 200 Myr, o que impede uma extrapolação assintótica confiável.

## 4. Controles A/B/C comparáveis

A contém somente o disco de teste no potencial total contínuo convolvido com Plummer; B contém somente o disco vivo, sua autogravidade direta e o campo fixo de bojo+halo contado uma vez; C contém as três componentes vivas sem campo externo. Mesmas fases e massas do disco em cada comparação. Nos controles A/B, E=K+Uauto+ΣmΦexterno; em A, Uauto=0. A massa do disco é usada como peso em A sem gerar força entre os traçadores.

| Gerador | Controle | Sementes | h50 inicial médio [kpc] | h50 final médio [kpc] | Aumento médio [kpc] |
| --- | --- | --- | --- | --- | --- |
| legacy | A | 3 | 0.1764466 | 0.1991554 | 0.02270882 |
| legacy | B | 3 | 0.1764466 | 0.3376317 | 0.1611852 |
| legacy | C | 3 | 0.1764466 | 0.4285805 | 0.2521339 |
| candidate | A | 3 | 0.1714055 | 0.1745751 | 0.003169609 |
| candidate | B | 3 | 0.1714055 | 0.3068449 | 0.1354394 |
| candidate | C | 3 | 0.1714055 | 0.4606388 | 0.2892333 |

A/B usam CPU Float64 com constantes nominais; C usa GPU Float32 com constantes efetivas registradas. As fases iniciais de A/B são arredondadas exatamente como C. A diferença de arredondamento de G e ε é explicitada; o campo fixo é a mesma referência convolvida da auditoria anterior, com diferenças amostradas de quadratura ≈0,101% e interpolação ≈0,011%. Não é uma solução contínua exata. A comparação CPU/GPU já preservada em reports/equilibrium-rebuild/gpu-results.json, N=400/40 Myr, mostrou discrepância RMS relativa de posição do disco ≈2,11×10⁻⁵; isso não certifica toda resolução/época desta nova matriz. Em campos fixos axisimétricos só Lz, não o vetor completo de L, é invariante.

O controle B aquece mesmo com halo suave; portanto encontros com partículas do halo não explicam tudo. Disco discreto, ruído/modos coletivos e condições iniciais continuam candidatos. C aquece mais, com forte dependência de Nh. A/B não isolam encontros individuais de instabilidades coletivas; A₂, dispersões e perfis por anel foram preservados em aneis.csv. Não foi atribuída uma barra ou instabilidade de flexão sem uma análise de coerência/modos.

## 5. Condições iniciais e fronteira do candidato

O legado usa momentos de Jeans no potencial não suavizado e uma aproximação gaussiana/Satoh; ativar o campo Plummer discreto não torna essa distribuição uma função estacionária. Velocidades circulares e a igualdade inicial aproximada σR=σz não provam equilíbrio tridimensional nem estabilidade coletiva.

O candidato ajusta ocupações espaciais positivas de órbitas no campo suavizado. Não implementa todas as restrições cinemáticas do GALIC e não é o GALIC. Sua biblioteca do disco tem 511 órbitas, com número efetivo de pesos ≈379.0049; a do halo tem 323, efetivo ≈187.4146. Aumentar o número de partículas amostradas não expande essa base orbital. Os momentos radiais/azimutais/verticais por anel estão em candidate-kinematics.csv: são previsões da mistura, não alvos cinemáticos independentemente validados.

A fração ponderada das fases do halo além de 247,9509584 kpc é **0.4868711%**, enquanto o alvo é zero. Órbitas que têm ao menos uma fase armazenada fora da fronteira carregam 2.620073% dos pesos. A biblioteca usa bins cilíndricos largos que não impõem a superfície esférica de truncamento. Não basta um estado inicial estar dentro do raio: sua órbita deve ter suporte compatível com a fronteira. As fases finitas também não limitam os máximos entre amostras. Nenhuma partícula foi cortada ou deslocada para esconder esse defeito. O disco e o bojo originais não possuem esse truncamento, portanto esse teste de fronteira refere-se especificamente ao halo.

Os resíduos fracos da equação de Boltzmann e os erros de densidade já calculados foram reutilizados em candidate-kinematics.json. Os resíduos de z², zvz e momentos radiais, a discretização de fases e a diferença entre duas metades orbitais não fornecem uma certificação de função de distribuição estacionária. A melhor permanência de h50 no controle suave é evidência limitada; a falha de suporte e a evolução N-corpos impedem a promoção do candidato.


O diagnóstico inicial preservado da sessão legada informa Q≈0,924 no anel 2–4 kpc, usando κ do potencial analítico inicial não suavizado. Reavaliando os novos estados iniciais com κ do campo suave, os valores estão tabulados em toomre-inicial-campo-suave.csv, juntamente com σR/vc, h50/R e σz/σR. Valores próximos/abaixo da escala unitária tornam o suporte radial e a resposta coletiva questões relevantes; a aproximação de disco estelar fino, órbitas quase circulares e distribuição de velocidades não foi certificada. Q sozinho não identifica barra, flexão ou uma causa exclusiva do espessamento, e Q>1 tampouco certifica estabilidade global. Nenhuma dispersão foi ajustada para atingir um Q escolhido.

## 6. Passo, suavização, custo e alternativas

Os controles de dt da matriz preservam o mesmo estado e ε. Compare as linhas correspondentes de series.csv e passo-temporal.svg: uma menor deriva energética, quando presente, não deve ser confundida com menor aquecimento estrutural. O erro Float32 e a amostragem esparsa da energia podem impedir uma razão exata de quatro entre máximos ao dividir dt por dois. Os ensaios com ε diferente preservam o mesmo estado inicial, mas alteram a Hamiltoniana suavizada: não são testes de uma mesma função de distribuição já reajustada. Eles medem sensibilidade combinada a ruído e viés de força; não selecionam uma nova ε para estabilizar visualmente o disco.


Resultados dos controles de sensibilidade em 40 Myr, semente 2026, Nd=8192/Nh=8192:

| Gerador | Nb | dt [Myr] | ε [kpc] | h50(40) [kpc] | δE(40) [%], assinado |
| --- | --- | --- | --- | --- | --- |
| legacy | 512 | 0.05 | 0.1 | 0.2157727 | 0.00001412359 |
| candidate | 512 | 0.05 | 0.1 | 0.1943938 | -0.000009214438 |
| legacy | 512 | 0.1 | 0.1 | 0.2157649 | -0.00003565177 |
| legacy | 512 | 0.025 | 0.1 | 0.2157685 | 0.000009542013 |
| candidate | 512 | 0.1 | 0.1 | 0.1944019 | -0.00007260927 |
| candidate | 512 | 0.025 | 0.1 | 0.1943900 | -0.00003219516 |
| legacy | 4096 | 0.05 | 0.1 | 0.2183382 | 0.000008059244 |
| legacy | 512 | 0.025 | 0.05 | 0.2173187 | -0.00001163458 |
| legacy | 512 | 0.025 | 0.2 | 0.2208188 | -0.000005651095 |
| candidate | 4096 | 0.05 | 0.1 | 0.1964463 | -0.00001143880 |
| candidate | 512 | 0.025 | 0.05 | 0.1989308 | -0.00004269174 |
| candidate | 512 | 0.025 | 0.2 | 0.2029078 | -0.00002165141 |

Reduzir dt=0,1→0,025 Myr alterou h50(40) em aproximadamente 3,59×10⁻⁶ kpc no legado e −1,19×10⁻⁵ kpc no candidato, enquanto o crescimento medido foi da ordem de 10⁻² kpc. Nesse controle curto, o refinamento temporal não remove o espessamento. Não se extrapolou essa comparação a todo encontro, resolução ou duração. Os CSV também preservam σnormal, σR, R50 e invariantes.

O hardware informado pelo navegador foi {"vendor":"amd","architecture":"rdna-3","device":"","description":"","logicalProcessors":16}. RAM/VRAM e modelo comercial exato não são certificados por esses campos. custos-medidos.csv separa inicialização, integração e diagnósticos; o tempo físico não é tempo de parede. O somatório direto Float64 em CPU, usado nos estados selecionados, também custa O(N²) e pode dominar o diagnóstico. Os horários medidos incluem trabalho concorrente desta auditoria.

| N hipotético | ms/passo estimados | h para 200 Myr a dt=0,05 | h para 1 Gyr a dt=0,05 |
| --- | --- | --- | --- |
| 50000 | 12.74249 | 0.01415832 | 0.07079162 |
| 100000 | 50.97048 | 0.05663386 | 0.2831693 |
| 300000 | 458.7373 | 0.5097082 | 2.548541 |
| 1000000 | 5097.093 | 5.663437 | 28.31719 |

São projeções quadráticas, sem renderização, validações diretas frequentes ou garantia de relógio térmico constante. N=10⁶ é apenas uma escala ilustrativa; não é a resolução demonstrada como necessária ou suficiente para este modelo. O custo atual permite os controles curtos medidos; a viabilidade de uma galáxia convergida por Gyr não foi demonstrada.

O Barnes–Hut CPU já existente foi comparado à força direta nos snapshots originais t=0 e t=18600 Myr, com θ={0,2;0,35;0,5;0,8}, mesmo G/ε. Em θ=0,5, o erro RMS de força no disco foi 0.5431538% inicialmente e 0.3723498% no estado final. Os máximos por partícula e as forças/torques líquidos estão em tree-force-calibration.json; um erro RMS pode esconder caudas. A árvore mais precisa também pode custar mais que o direto CPU neste N. Não foi certificada uma trajetória de longa duração com esse solver, nem se trocou o motor principal.

GADGET-4 é uma referência viável para uma avaliação offline de Tree/FMM/TreePM, com forças diretas de controle, condições isoladas/vácuo e estudos de invariantes. Seu kernel padrão é spline, com ε equivalente a Plummer; igualar o número chamado ε não reproduz a Hamiltoniana Plummer atual. Uma eventual adaptação exige validar a força/potencial do mesmo kernel e todas as unidades, ou documentar a mudança física como outro experimento. O TreePM para uma galáxia isolada exige fronteiras apropriadas, não uma caixa cosmológica periódica aplicada sem controle. Nenhuma instalação, integração ou medição de desempenho do GADGET-4 foi realizada nesta entrega.

## 7. Decisão e próximo passo justificado

1. O gráfico atual é legado, demonstrado por identidade, metadados, hashes e buffers originais.
2. Há evidência forte de sensibilidade à granularidade do halo, além de aquecimento no disco vivo com halo suave. Condições iniciais, ruído discreto e resposta coletiva ainda não estão completamente separados. Não há uma porcentagem causal defensável para cada mecanismo.
3. Não foi demonstrada convergência estrutural completa; não se determinou um N mínimo. Aumentar somente Nd tampouco resolve o problema da matriz estudada.
4. Os controles curtos até N=49664 foram executados no hardware disponível. Projeções para N muito maior tornam uma avaliação escalável importante, mas não provam a necessidade de exatamente esse N.
5. A mudança sustentada pelos dados é refinar o halo de forma controlada e validar um solver escalável offline antes de solicitar grandes N/Gyr; isso não autoriza promover a biblioteca atual com suporte incompatível. Uma futura reconstrução deve impor fronteira orbital e restrições cinemáticas compatíveis com os mesmos perfis, sem modificar massas ou amortecer movimentos. Não foi iniciada outra reconstrução nesta tarefa.

Para o TCC, a conclusão defensável neste momento é uma investigação do aquecimento e da convergência de um modelo experimental, com um controle de campo suave para órbitas e curvas de rotação. A realização viva atual não sustenta a afirmação de uma Via Láctea estacionária por bilhões de anos. Os três potenciais adotados não foram refutados por essa falha de realização numérica.

## 8. Fontes e reprodução

- Sellwood (2013), Relaxation in N-body simulations of disk galaxies: https://arxiv.org/abs/1303.4919 . Relaxação discreta afeta especialmente a estrutura vertical; evolução planar por espirais não é sinônimo de aquecimento vertical colisional.
- Ludlow et al. (2021), Spurious heating of stellar motions in simulated galactic disks by dark matter halo particles: https://arxiv.org/abs/2105.03561 . Dependência da massa das partículas do halo, densidade e dispersão locais; benefício limitado de refinar estrelas mantendo halo grosseiro. Seus limiares empíricos não foram transplantados para este MN/NFW/Plummer.
- Yurin & Springel (2014), An iterative method for the construction of N-body galaxy models in collisionless equilibrium: https://arxiv.org/abs/1402.1623 . Restrições cinemáticas adicionais à resposta espacial distinguem soluções de mesma densidade.
- GADGET-4, configuração: https://wwwmpa.mpa-garching.mpg.de/gadget4/04_config-options/ ; kernel/unidades: https://wwwmpa.mpa-garching.mpg.de/gadget4/05_parameterfile/ .

Não foi introduzido parâmetro físico novo. Nd/Nh/Nb, dt, ε e θ são eixos numéricos declarados, não ajustes observacionais.

Para reproduzir: Node >=20.11; manter o projeto e os dados das auditorias anteriores. Executar node scripts/resolution-decision/prepare.mjs (a partir do JSON original exportado), node scripts/resolution-decision/supplement.mjs, node scripts/resolution-decision/session.mjs, node scripts/resolution-decision/fixed-controls.mjs, node scripts/resolution-decision/tree-study.mjs e node scripts/resolution-decision/kinematics.mjs. Abrir o servidor node scripts/serve.mjs em localhost:4180 e o coletor node scripts/resolution-decision/collector.mjs em 127.0.0.1:4189. Abrir tests/browser-resolution-decision.html e executar os ensaios; o retorno real depende de WebGPU. O coletor salva cada etapa concluída e a retomada ignora IDs já existentes. Para uma campanha inteiramente nova, usar uma cópia do projeto/novo diretório de resultados, preservando esta evidência. Finalizar com node scripts/resolution-decision/report.mjs, node scripts/test.mjs e node scripts/build.mjs.

O relatório JSON original também foi preservado comprimido sem perda. Capturas de estado e CSV têm unidades no esquema/cabeçalho; as figuras SVG incluem somente pontos tabulados e guias retos. Os relatórios anteriores permanecem intactos. source-baseline.json e decision.json verificam que os dez módulos físicos auditados não foram modificados nesta tarefa.
