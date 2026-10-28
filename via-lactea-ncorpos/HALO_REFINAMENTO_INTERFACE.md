# Refinamento exclusivo do halo na simulação principal

O painel “Dinâmica galáctica e matéria escura”, em experimento-ncorpos.html, agora oferece ×1 (original), ×2, ×4, ×8, ×16 e ×32. ×1 permanece como padrão.

N₀ é o número total da realização original, antes do refinamento. Sua distribuição entre componentes segue o gerador legado. O multiplicador altera somente Nh; as massas individuais do halo são divididas pelo fator, preservando sua massa física total. As posições, velocidades e massas iniciais do bojo e do disco são preservadas ao manter N₀, semente e modelo. Nenhum amortecimento, rescalonamento de energia ou alteração da força foi introduzido.

Para N₀=33148 e semente 2026:

| Fator | Bojo | Disco | Halo | Total integrado |
|---|---:|---:|---:|---:|
| ×1 | 4972 | 14917 | 13259 | 33148 |
| ×2 | 4972 | 14917 | 26518 | 46407 |
| ×4 | 4972 | 14917 | 53036 | 72925 |
| ×8 | 4972 | 14917 | 106072 | 125961 |
| ×16 | 4972 | 14917 | 212144 | 232033 |
| ×32 | 4972 | 14917 | 424288 | 444177 |

A interface calcula memória, projeção de custo e admissibilidade usando o total refinado, não N₀. Uma escolha maior não é reduzida silenciosamente para caber no dispositivo. O backend e o algoritmo efetivos continuam identificados no painel. A resolução automática de base não é recalculada apenas por trocar o fator; uma nova avaliação do dispositivo ou mudança de backend/orçamento pode recalibrá-la. Para comparações controladas, use N₀ manual fixo, mesma semente, dt, ε e backend.

Na verificação real, a projeção baseada no teste de 512 partículas chegou a rejeitar o ×16 com uma previsão de 408 s/passo, por extrapolar também o custo de despacho. A calibração de 10000 partículas agora é executada quando o teste GPU inicial foi aprovado e a memória desse teste é admissível, sem ser vetada pela própria projeção pequena que deveria corrigir. O limite de custo para a execução final permanece. Na preparação completa seguinte, o ×16 foi alocado e os primeiros três passos foram efetivamente integrados; a interface mediu aproximadamente 247 ms/passo nessa tentativa, não 408 s/passo. Isso é uma medição local curta, não um benchmark universal.

A auditoria automática usava um teto independente de 96 MiB, que desativava referências no ×16. Agora o controlador reserva conservadoramente a maior estimativa entre estado GPU e estado CPU com árvore, e atribui somente o restante do orçamento configurado à referência. O sampler e a fila frontend utilizam esse mesmo orçamento. Nas páginas que não o fornecem, o padrão histórico de 96 MiB permanece. A fila limitada, o máximo de 60 s por referência e a adaptação da cadência ao custo permanecem. A energia continua CPU Float64 compensada, sem substituir avaliações recusadas por valores aproximados ou fictícios. O orçamento é uma estimativa, não uma medição de RAM/VRAM disponível.

O piloto de throughput da energia também foi ampliado de no máximo 1000 para no máximo 10000 partículas, pois a primeira chamada pequena, incluindo compilação JIT, superestimava o custo no ×16. Esse subconjunto serve exclusivamente para medir custo; sua energia não é registrada nem desenhada como referência da galáxia completa. A avaliação física usa todas as partículas do snapshot original e continua sujeita ao teto automático de 60 s.

As salvaguardas de cadência por resolução e por custo medido agora são combinadas pelo máximo, em vez de multiplicadas: ambos são limites inferiores para o mesmo intervalo. A multiplicação anterior contava o crescimento do custo com N duas vezes e chegou a produzir 9000 Myr no ×16 com solicitação de 200 Myr. O novo resultado para esse caso é 1800 Myr, preservando a salvaguarda de resolução existente. O intervalo solicitado e o efetivo continuam distintos e visíveis; não se criam medições entre snapshots. Referências adicionais podem ser solicitadas no painel de validação.

Uma alteração durante a evolução pausa a execução; a nova configuração se aplica ao iniciar outra realização desde t=0. Nenhuma partícula é inserida na realização em andamento. No modelo sem halo, o seletor é desativado e o fator efetivo é ×1.

## Implementação e verificações

Ambos os caminhos de inicialização do worker vivo, CPU e GPU, usam src/physics/live-initial.js. Esse adaptador cria a realização legada e aplica refineLegacyHalo, já usado nos testes de refinamento. O integrador, o kernel GPU, G, a suavização e os modelos de massa foram preservados. Os relatórios de execução incluem baseN, haloRefinement, contagens e N efetivo.

Os testes novos conferem todos os fatores, identidade das fases bariônicas e do prefixo do halo, massa total em Float64 e após representação Float32, compatibilidade do modo original e rejeição de configurações inconsistentes. A regressão de interface permite somente o novo controle e os rótulos de N₀, preservando os demais controles e a cena.

As contagens de todos os fatores foram conferidas no navegador com N₀=33148. Testes funcionais da página executaram CPU direta Float64 com N₀=64, ×32, N=839, e GPU direta Float32 com N₀=64, ×16, N=439. São verificações de funcionamento, não ensaios de estabilidade na resolução científica. Evidências em reports/halo-ui. A preparação completa do ×16 é registrada separadamente após sua conferência na página.

A conferência final também preparou na página principal N₀=33148, ×16, 232033 partículas na GPU. A referência direta Float64 em t=0 foi concluída com todas as partículas, e o painel informou intervalo solicitado de 200 Myr e efetivo de 1800 Myr. A execução foi deixada preparada e pausada. Uma tentativa anterior já havia integrado três passos reais nessa resolução. Os 190 testes automatizados passaram. Essa verificação de interface e inicialização não é uma nova campanha de 5 Gyr nem reclassifica o resultado histórico como equilíbrio.

O gerador histórico de interface reutiliza a vista do seletor e preserva os controladores vivos que já contêm o adaptador, evitando retornar silenciosamente à inicialização antiga. O build estático inclui os novos módulos e evidências; não publica remotamente.

## Limite da interpretação física

O resultado científico preservado do ×16 foi h50=0,1648725083 → 0,5218877004 kpc em 5000,0000745 Myr: aumento de 216,5401593%. Não foi um ensaio de 15 Gyr. Disponibilizar ×32 não equivale a integrá-lo por 5 Gyr nem a demonstrar estabilidade nessa resolução.

O crescimento em massa ou raio da Via Láctea e a diferença entre suas populações de disco fino/espesso não são a mesma grandeza que a mudança de h50 de uma realização isolada. A história observacional envolve formação estelar e fusões ausentes deste experimento. A análise de Gaia/LAMOST distingue fases de formação e populações; não fornece uma validação direta de um aumento de 200% no h50 deste modelo: [ESA, Gaia finds parts of the Milky Way much older than expected, 23/03/2022](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Gaia_finds_parts_of_the_Milky_Way_much_older_than_expected), referente a Xiang e Rix (2022), DOI 10.1038/s41586-022-04496-5.

O TCC pode apresentar o refinamento, a dependência numérica e as limitações medidas. A alegação de equilíbrio, de crescimento secular realista ou de concordância quantitativa com a evolução observada exige testes e comparações específicos.
