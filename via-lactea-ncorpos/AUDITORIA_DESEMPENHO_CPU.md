# Auditoria CPU — Ryzen 7 5700X

## Auditoria do motor original, antes de substituições

Hardware confirmado pelo sistema: AMD Ryzen 7 5700X, 8 núcleos físicos, 16 processadores lógicos. O motor online cria um único `live-worker.js`; `Leapfrog.step` e `barnesHutAccelerations` são síncronos nesse Worker. Não há pool de força CPU nem execução WASM/SIMD da força. A detecção de suporte SIMD na interface não equivale a uma implementação SIMD.

A referência direta Float64 usa um pool separado de até quatro Workers. Ela mede energia e não distribui os passos físicos. Na execução inspecionada, N₀ = 40.000 e halo ×32 resultavam em **536.000 corpos**, com 6.000 no bojo, 18.000 no disco e 512.000 no halo. A interface media aproximadamente 17,9 s/passo CPU BH e informava a referência direta automática desativada por memória. A execução foi pausada, preservando o estado, para evitar concorrência com os benchmarks. A leitura está em `reports/halo-ui/cpu-audit-original-ui.txt`.

## Medição do original no Node.js

`node scripts/cpu-performance/baseline.mjs` usa os módulos originais. Mantém semente 2026, dt = 0,1 Myr, ε = 0,1 kpc e θ = 0,5. Uma etapa de aquecimento precede três passos KDK completos medidos. A força é cronometrada em torno da função original; a construção vem de `getBarnesHutStats`. O restante da força inclui travessia, validação e limpeza da saída. A geração das condições iniciais, cópias e diagnósticos ficam fora do tempo por passo e são medidos separadamente. As medianas de fases são independentes e não precisam somar exatamente à mediana do total.

| N | Passo [ms] | Árvore [ms] | Travessia/validação [ms] | Leapfrog/outros [ms] |
|---:|---:|---:|---:|---:|
| 1.000 | 7,30 | 0,74 | 6,20 | 0,24 |
| 10.000 | 198,25 | 2,46 | 195,67 | 0,12 |
| 24.000 | 595,51 | 6,75 | 588,65 | 0,28 |
| 80.000 | 2.444,31 | 89,99 | 2.369,73 | 0,49 |
| 536.000, halo ×32 | 15.417,29 | 201,14 | 15.213,05 | 3,29 |

N = 536.000 usa a realização refinada de N₀ = 40.000, preservando a distribuição e as massas entre comparações. Os tamanhos menores usam as realizações originais correspondentes, não uma redução física arbitrária da galáxia maior. Não se infere convergência física comparando os tempos de resoluções distintas.

Em 80.000 e 536.000 corpos, CPU do processo/tempo de parede foi aproximadamente 1,00 núcleo equivalente. É uma medição do processo inteiro, incluindo threads auxiliares, não telemetria individual de cada núcleo do sistema. Em tarefas de poucos milissegundos essa razão tem resolução insuficiente e não deve ser interpretada como utilização zero. Os resultados são do Node.js; não são intercambiáveis com tempos de Chromium ou GPU.

## Diagnósticos e cópias

Em N = 536.000, medidos separadamente no estado final do ensaio:

| Etapa | Tempo [ms] |
|---|---:|
| Energia rápida BH, segunda avaliação | 15.479,85 |
| Estrutura/espessura/diagnósticos do laboratório | 3.225,35 |
| Curva de rotação, 31 raios × 32 azimutes | 3.587,13 |
| Packing visual Float32 | 4,53 |
| Cópia de snapshot energético | 6,45 |
| Structured clone do diagnóstico estrutural | 0,86 |

As leituras da GPU e a transferência entre Workers/navegador não estão incluídas nesses números. O packing visual é transferido com transfer list, sem cópia adicional do buffer por structured clone. A referência direta paralela anterior copia arrays para cada Worker; esse custo existe nos estados auditados, não em cada passo.

Uma referência direta completa de 536.000 corpos tem **143.647.732.000 pares distintos**. Ela não foi inserida no loop de benchmark. O agendador tem um cálculo ativo e um snapshot pendente; não mede energia direta a cada quadro. No estado online auditado, o orçamento estimado para a referência excedia a memória restante e a rotina estava desligada. Logo, essa tarefa O(N²) não explica os 17,9 s/passo observados. A curva de rotação é O(N × 31 × 32), com malha fixa, não um somatório de todos os pares.

O Worker só solicita diagnósticos periódicos após o intervalo físico e um limite de tempo de parede dependente do custo, além das auditorias de energia e solicitações explícitas. Nessa resolução, o diagnóstico pode causar pausas perceptíveis e amostragem muito menos frequente que a cadência física nominal.

## Alocações e reconstruções

- A árvore reaproveita `order`, `scratch`, `rank`, pilha e arrays de nós em um `WeakMap`; crescimento de capacidade aloca apenas quando necessário.
- As posições mudam a cada drift: reconstruir a árvore em cada avaliação da força é necessário no algoritmo implementado. Não se deve omitir reconstruções sem validar outra política de atualização.
- O cálculo de energia BH reconstrói a árvore mesmo quando acabou de haver uma força nas mesmas posições. Há oportunidade de reutilizar uma árvore imutável nessa etapa, com verificação explícita de validade.
- O packing visual aloca um novo Float32Array a cada mensagem de imagem. Em passos lentos, seu custo medido é pequeno diante da força. Há oportunidade de pool de buffers, mas não é o gargalo dominante.
- Diagnósticos estruturais criam arrays e fazem ordenações. A referência inicial e snapshots fazem cópias próprias para garantir integridade. Retirá-las indiscriminadamente poderia associar energia a um estado em mutação.

As fontes e hashes do motor anterior foram preservados em `reports/cpu-performance-2026-10-22/baseline/` e `baseline.json`. O objetivo dos protótipos seguintes é avaliar ganhos sem substituir silenciosamente a integração principal.

## Protótipo paralelo medido

Foi acrescentado um experimento isolado em `scripts/cpu-performance/`, sem alterar o motor da página principal. A árvore original é construída pelo coordenador e publicada em arrays compartilhados. Workers persistentes calculam alvos independentes em blocos de 256, distribuídos por contador atômico. Cada alvo mantém a mesma ordem de travessia e aritmética Float64 do original; nenhuma redução de força é feita entre Workers. Uma barreira aguarda todos os alvos antes do último kick. Estado e árvore não são modificados durante a travessia.

| N | Original [ms/passo] | 8 Workers [ms/passo] | Ganho | 16 Workers [ms/passo] | Ganho |
|---:|---:|---:|---:|---:|---:|
| 10.000 | 200,20 | 31,71 | 6,31× | 38,64 | 5,18× |
| 24.000 | 669,09 | 89,82 | 7,45× | não medido | — |
| 80.000 | 2.690,27 | 362,98 | 7,41× | 309,36 | 8,70× |
| 536.000 | 16.930,20 | 2.264,34 | 7,48× | 1.916,55 | 8,83× |

São comparações pareadas da campanha `parallel.json`, com original medido novamente; não se usa o baseline de outra rodada como denominador. O próprio protótipo com um Worker tem diferença de desempenho por organização do código/JIT: em 80.000 corpos levou 2.379,31 ms. Portanto, o ganho original → paralelo inclui essa diferença; o ganho 1 → 8 Workers dentro do protótipo foi 6,56× nesse tamanho.

Em 536.000 corpos, oito Workers usaram aproximadamente 7,31 processadores lógicos equivalentes e 16 Workers, 13,59. Isso demonstra concorrência efetiva no processo Node.js; não significa 13 núcleos físicos. Com 16 Workers, a árvore serial levou 203,63 ms e a publicação 2,88 ms, diante de 1.702,85 ms de despacho/travessia. Criar o pool levou cerca de 53 ms, uma vez, fora dos passos medidos.

Todos os pools de 1/2/4/8/16 efetivamente testados produziram posições, velocidades e acelerações **idênticas bit a bit** ao original após quatro passos KDK completos, nos respectivos tamanhos. O teste de regressão adicional usa quatro Workers, massas desiguais e nulas, posições coincidentes, θ = 0 e 0,5 e dez passos; verifica também o relógio físico e massas. Essa equivalência curta demonstra ausência de alteração aritmética nos estados testados, não uma certificação de estabilidade durante Gyr.

O protótipo executado no navegador, com Web Workers reais, confirmou:

| N | Original navegador [ms] | 4 Workers [ms] | Ganho | 8 Workers [ms] | Ganho |
|---:|---:|---:|---:|---:|---:|
| 10.000 | 218,70 | 60,35 | 3,62× | 36,73 | 5,96× |
| 80.000 | 2.552,25 | 675,64 | 3,78× | 401,23 | 6,36× |

Arrays finais também foram comparados bit a bit no navegador. O navegador informou 16 processadores lógicos, `crossOriginIsolated=true` e SharedArrayBuffer disponível. Não houve medição individual de utilização de cada núcleo no navegador. Tempos sobrepostos dos Workers e contagem de alvos estão no JSON.

### Transferência de dados

No Node.js, um snapshot de 30,55 MB (536.000 corpos) levou 21,52 ms em ida e volta com cópia e 0,46 ms transferindo a propriedade do buffer nos dois sentidos. Para o buffer visual de 8,58 MB, foram 6,03 ms e 0,18 ms. Esses microbenchmarks são RTT de `worker_threads`, sem renderização nem leitura de GPU; não equivalem a latência de uma mensagem completa da interface. Mesmo a cópia medida é muito menor que os segundos de força serial. Compartilhar snapshots exige imutabilidade e sincronização; não se pode permitir que um diagnóstico leia posições em mutação.

## Comparação com a RX 7600

Foi executado o backend WebGPU original, força direta Float32, no navegador. Mesmo modelo/seed/contagens e parâmetros solicitados. O backend arredonda G, dt e ε² para Float32; os valores efetivos estão registrados. Um passo de aquecimento e três passos medidos, excluindo leitura, diagnósticos e renderização:

| N | Passo GPU [ms] | Leitura final do estado [ms] | Erro relativo L2 da força nas sondas |
|---:|---:|---:|---:|
| 10.000 | 3,025 | 5,015 | 1,973 × 10⁻⁶ |
| 80.000 | 45,840 | 13,400 | 1,077 × 10⁻⁵ |
| 536.000 | 1.045,425 | 54,945 | 4,130 × 10⁻⁵ |

A comparação de força usa somatório direto CPU Float64 em 96 alvos estratificados (32 por componente), nas posições e massas **já quantizadas da própria GPU**, com G e ε² efetivos. Não é um limite global de erro nem mede o erro de quantização das condições iniciais. Esse erro de força não é o erro de conservação de energia. O tempo de leitura inclui map/cópias/conversões do snapshot, não uma medida isolada do barramento PCIe.

Em 80.000 corpos, o original CPU no navegador levou 55,7 vezes o tempo do passo GPU; o protótipo de oito Workers levou 8,75 vezes. A GPU continuar mais rápida nessa faixa é compatível com seu paralelismo muito maior, mesmo fazendo O(N²), enquanto a árvore tem acesso irregular à memória. Não extrapolar esses quocientes para todos os N ou GPUs. A comparação de 536.000 do protótipo CPU foi feita em Node.js, não no mesmo runtime do navegador.

## Referência direta e alternativa nativa offline

O executável existente `tools/pyfalcon/falcon-reference.exe` foi avaliado sem recompilar ou trocar o motor do site. Usa núcleo oficial falcON, compilado em dupla precisão, Plummer kernel 0 explicitamente selecionado, G/massas/ε/dt originais e forma KDK. Fonte vendorizada: GalacticDynamics-Oxford/pyfalcon, commit `d2e2e05acb377d21b9a87d94aa8b283f52f39fca`. SHA-256 do binário e entradas estão no JSON. O formato de saída textual do adaptador imprime G com poucos dígitos; o argumento é enviado com a precisão completa e convertido por `std::stod`, não pelo texto de saída arredondado.

**O método multipolar mútuo falcON é outra aproximação de força. θ = 0,5 não estabelece equivalência de precisão com a árvore monopolar atual.** A medição contra a força direta Float64 foi:

| N | Alvos diretos | Erro relativo L2 BH atual | Erro relativo L2 falcON | Processo nativo: força inicial + 3 passos + E/S [ms] |
|---:|---:|---:|---:|---:|
| 1.000 | todos | 0,258% | 0,943% | 22,11 |
| 10.000 | todos | 0,560% | 1,147% | 84,88 |
| 80.000 | 96 sondas | 0,473% | 0,764% | 522,08 |
| 536.000 | 96 sondas | 0,418% | 0,848% | 2.975,35 |

Erro L2 = sqrt(Σ|a_aprox − a_direta|² / Σ|a_direta|²) nos alvos indicados, no estado inicial. Os máximos por alvo também estão no CSV/JSON. As sondas dos casos grandes não fornecem garantia global. Não dividir o tempo nativo total por três e apresentá-lo como tempo puro de integração: inclui força inicial, criação do processo, leitura/escrita de arquivos e saída. Os bins nativos de entrada/saída ficam preservados localmente em `reports/cpu-performance-2026-10-22/native/`, fora do build web.

O ensaio nativo é promissor para campanhas offline, mas **não foi aprovado como substituição com a mesma precisão de força**. Exige comparação a erro equivalente, regressão de energia e momento angular e trajetórias mais longas. As duas energias de início/fim medidas para N ≤ 10.000 cobrem somente 0,3 Myr e não são um máximo energético da trajetória. Os testes de desempenho não certificam a galáxia fisicamente.

## Avaliação das opções e decisão

1. **Web Workers + memória compartilhada: ganho demonstrado.** Oito Workers são um ponto inicial sustentado pelos testes para uso interativo. Dezesseis melhoraram os casos grandes em Node.js, mas pioraram N = 10.000; não devem ser impostos universalmente. Integrar na página requer admissão conjunta de memória/threads com o pool energético, fallback serial, cancelamento, tratamento de falhas e validação de execução longa. O protótipo é acessível no teste isolado; o seletor CPU principal continua usando o motor anterior.
2. **SharedArrayBuffer: compatibilidade precisa ser verificada.** O servidor local já fornece COOP/COEP e o teste passou. Em hospedagem, requer contexto seguro e isolamento entre origens; falta desses recursos exige fallback. Fonte: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer . Esta auditoria não altera políticas de acesso nem publica o site.
3. **WASM SIMD: suporte detectado, ganho ainda não medido.** Não existe kernel de força WASM no motor auditado. Uma porta precisaria manter Float64, Plummer e critérios de abertura e medir custos de memória e acesso irregular. Não atribuir ganho ao rótulo SIMD. Documentação oficial: https://webassembly.org/features/ . A prioridade respaldada pelos números é distribuir a travessia que hoje usa apenas um Worker.
4. **Nativo offline: medido, aproximação diferente.** Preservar como campanha identificada separadamente, até validar precisão equivalente. Repositório oficial: https://github.com/GalacticDynamics-Oxford/pyfalcon . Não usar sua velocidade para prometer o mesmo resultado numérico do BH atual.
5. **Diagnósticos: segundo gargalo relevante.** Energia BH, estrutura e rotação somaram cerca de 22,29 s no caso grande. Um pool de força sozinho não acelera essas rotinas. Reutilização de árvore no mesmo snapshot, execução sobre cópias imutáveis, separação de cadências e orçamento de custo são candidatos justificados; o custo não deve ser ocultado nem medições necessárias eliminadas silenciosamente.

A conclusão é falta de paralelismo na travessia da força, agravada pelo custo de diagnósticos quando disparados. Não é uma limitação dos oito núcleos do Ryzen nem, nesta execução, energia direta O(N²) em cada quadro. A árvore e as cópias não dominam os passos originais medidos.

## Reprodução e arquivos

Todos os tempos são amostras locais, três passos por configuração após aquecimento, semente 2026. Há variação por JIT, frequência, temperatura, GC, processos concorrentes e navegador; não foi monitorada frequência/temperatura. O uso lógico equivalente é CPU do processo/tempo de parede, sem afinidade ou telemetria física por núcleo. Não foram feitas campanhas de Gyr nem medição de estabilidade estrutural nesta auditoria.

Os scripts escrevem na pasta datada fixa. Para repetir sem sobrescrever estes resultados, copie o projeto para outra pasta e preserve uma cópia da pasta de evidências antes de executar:

```powershell
node scripts/cpu-performance/baseline.mjs
node scripts/cpu-performance/prepare-kernel.mjs
node scripts/cpu-performance/parallel.mjs
node scripts/cpu-performance/native.mjs
node scripts/serve.mjs
```

O nativo exige o binário local e as dependências da pasta tools, deliberadamente excluídos do build web. No navegador, abra `/tests/browser-cpu-profile.html` e `/tests/browser-gpu-cpu-audit.html`, execute os botões e preserve o JSON apresentado. As páginas não são vinculadas na navegação do TCC. `summarize.mjs` gera os CSV/SVG a partir dos JSON preservados e verifica hashes dos dez módulos originais.

Evidências principais: `baseline.json`, `parallel.json`, `browser.json`, `gpu-browser.json`, `native.json`, `baseline-phases.csv`, `parallel-scaling.csv`, `browser-comparison.csv`, `force-reference.csv`, `transfers-node.csv`, `cpu-scaling.svg`, `source-integrity.json`. Os hashes das dez fontes auditadas permanecem idênticos. As mudanças de interface removem apenas os dois links solicitados e a regra que os recriava no gerador; páginas e dados científicos históricos permanecem preservados.

Verificação: `node scripts/test.mjs` e `node scripts/build.mjs`, com saída preservada em `tests.tap` e `build.txt`. O registro final de verificação encontra-se em `verification.json`.
