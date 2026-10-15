# Auditoria do motor N-corpos — simplificação sintética

Auditoria de código e medições da versão **0.6.0**, realizada em 11 de outubro de 2026 no horário local; os relatórios registram timestamps UTC. O aplicativo principal contém somente a realização N-corpos sintética. O desenvolvimento removido foi preservado em Git antes da limpeza; o motor de bojo, disco e halo foi mantido. Os SHA-256 de `constants.js`, `models.js` e `initial.js` coincidem byte a byte com o commit arquivado, conforme `reports/validation-summary-current.json`.

## Campo gravitacional e integração

`src/physics/initial.js` gera as massas, posições e velocidades de Hernquist, Miyamoto–Nagai e NFW finito, com semente explícita. `src/physics/constants.js` mantém massas, escalas, conversões e padrões numéricos. Os potenciais contínuos fornecem o campo aproximado das condições iniciais e dos ensaios de referência. O aplicativo evolutivo calcula a gravitação das partículas instantâneas; não soma um campo analítico equivalente por cima delas.

Em CPU, `src/physics/forces.js` contém a soma direta Float64 e uma octree Barnes–Hut tridimensional. A soma direta visita cada par uma vez e aplica acelerações correspondentes às duas partículas. A auto interação é excluída. A suavização Plummer é usada tanto na força quanto na energia direta.

A árvore mantém índices das partículas em intervalos e verifica se o nó contém o alvo antes de aproximá-lo. Nós contendo o próprio alvo são abertos; `theta=0` desabilita a aproximação de abertura. As folhas usam um pequeno agrupamento computacional e avaliam seus pares. Posições coincidentes e a impossibilidade de subdividir além da precisão numérica são tratados explicitamente. Buffers da árvore são reutilizados, e a geometria e os momentos dos nós são reconstruídos para cada avaliação de força. Não há uma profundidade artificial usada como substituta do critério de precisão.

`src/physics/integrator.js` executa Leapfrog Kick–Drift–Kick, com um passo físico fixo. A aceleração inicial é preparada uma vez; cada passo faz kick de meio passo, drift, nova força e kick final. O avanço físico registrado depende dos passos concluídos, e não da frequência de desenho. A execução CPU fica em um Worker, em `src/compute/worker.js`.

A WebGPU de `src/compute/gpu.js` executa soma direta WGSL Float32. Cada alvo recebe contribuições em blocos de 64 fontes, com memória compartilhada no grupo de trabalho. Grupos incompletos têm máscaras para manter as barreiras e a exclusão de auto interação. Não foi implementada uma árvore de força na GPU. O custo quadrático continua presente mesmo com paralelismo.

## Custos identificados antes de novas otimizações

| Trabalho | Custo ou efeito observado no código | Medição necessária |
|---|---|---|
| Força direta CPU/GPU | Quadrático em N; costuma dominar o passo quando N cresce | Média de passos reais e precisão, para cada N admitido |
| Barnes–Hut CPU | Construção e travessia de árvore; abertura controla custo e aproximação | Separar construção, força completa e passos; comparar com soma direta |
| Condições iniciais | Preparação de tabelas Jeans e amostragem de todas as componentes | Tempo de geração, separado da força inicial e da evolução |
| Diagnóstico de energia | Outra avaliação de potencial; direto também é quadrático | Tempo do diagnóstico, separado dos passos físicos |
| CPU para desenho | Empacotamento Float32 e transferência das posições | Tempo e cadência da cópia; não converter o estado físico CPU para f32 |
| GPU para diagnóstico/exportação | Leitura periódica dos buffers | Custo de readback e diagnóstico; evitar leitura completa a cada quadro |
| Renderização | Desenho das partículas filtradas e área coberta por seus pontos | FPS e revisão visual, separados de ms/passo |

Esses custos foram confrontados com medições reais. Em N=1.000, a CPU direta mediu 4,3209 ms/passo e a árvore 6,3811 ms/passo; em N=10.000, foram 419,2925 e 176,1767 ms/passo, respectivamente. Portanto, a árvore perde para a soma direta no pequeno N ensaiado e apresenta vantagem no maior. Em N=100.000, a árvore mediu 3.033,5360 ms/passo; a última construção de árvore levou 35,7952 ms. Essa leitura isolada de construção não é uma média de perfilamento, mas mostra que não se deve presumir que a construção domine o passo nesse cenário. Valores e amostras estão em `reports/benchmark-cpu.json`.

O Worker só prepara uma cópia das posições para desenho quando decorreu o intervalo visual mínimo ou quando uma atualização/diagnóstico foi solicitada. A integração permanece Float64. No backend GPU, compute e desenho compartilham buffers físicos; leituras de estado para diagnóstico são periódicas. Uma escolha aproximada de potencial para diagnóstico não altera o algoritmo que integra as forças.

## Otimização medida e trabalho removido

Lotes de passos amortizam mensagens e espera da fila sem alterar o kernel gravitacional ou o passo físico. O agendador escolhe até 32 passos completos por lote, a partir do ms/passo medido e de uma meta operacional de 20 ms. Esse teto é de trabalho agendado antes de retornar ao controle da interface; não limita N nem define precisão científica.

O benchmark WebGPU comparou lotes de um e três passos, com dois passos de aquecimento e três amostras de três passos medidos. Inclui submit e espera real de `queue.onSubmittedWorkDone`; exclui geração, upload inicial, readback, diagnóstico e desenho. Adaptador exposto: AMD, arquitetura rdna-3; o modelo comercial e a VRAM instalada não foram revelados.

| N integrado | GPU direta f32, lote de 1 | GPU direta f32, lote de 3 |
|---:|---:|---:|
| 1.000 | 2,4767 ms/passo | 0,7900 ms/passo |
| 10.000 | 3,3633 ms/passo | 2,7817 ms/passo |

Os hashes das posições e velocidades finais coincidiram entre os dois tamanhos de lote em cada N. A redução observada é compatível com a amortização da espera de fila; não se atribui ao lote uma alteração de força ou aumento de precisão. Dados brutos: `reports/benchmark-gpu.json`.

Em N=100.000, lote de três passos, a GPU direta mediu mediana **47,3617 ms/passo**, com estado final finito após 1,1 Myr, em `reports/benchmark-gpu-100000.json`. Esse ensaio não executou comparação direta Float64 nesse N nem verifica estabilidade galáctica prolongada.

O cálculo de `velocityBins`, sem consumidor após a retirada dos gráficos, foi removido do Worker. Isso elimina trabalho secundário desnecessário; não foi medido um ganho isolado de desempenho dessa remoção. Os guardas de entradas e arrays foram reforçados sem mudar as equações da força, e receberam regressão numérica.

O painel separa corpos fisicamente integrados e corpos elegíveis para desenho após filtros. Ocultar o halo altera somente o desenho. A câmera pode recortar corpos que passaram pelos filtros; a contagem visual não promete que todos estão dentro do campo.

## Admissão de N e seleção local

N manual não recebe um máximo universal na interface. A admissão verifica orçamento estimado e limites efetivos de representação e buffers. Arrays e índices têm limites reais, e os dispositivos WebGPU expõem limites específicos de buffer e despacho. Estimativa de memória não mede VRAM livre e não pode garantir uma alocação bem-sucedida.

O aplicativo mede ensaios locais de 512 corpos e pode acrescentar uma medida GPU de 10.000 corpos quando admitida. As projeções são explicitamente estimativas. A escolha automática pode testar a GPU no N solicitado, medir o piloto e voltar ao estado inicial antes de iniciar o experimento. A soma direta é recusada quando a projeção excede 2 s/passo, como política operacional de duração de passos, não como limiar científico ou teto fixo de N.

O kernel CPU atual é JavaScript Float64 em um Worker. WebAssembly, SIMD e número de processadores lógicos são detectados, mas não constituem kernels de força ou um pool CPU implementados. A alternativa escalável disponível é Barnes–Hut CPU. Não há implementação validada de Barnes–Hut GPU, FMM ou Particle-Mesh nesta entrega.

## Pausa, retomada e exportação

Pausar ou ocultar a aba interrompe o agendamento de novos lotes; o lote pendente pode concluir, seguido de snapshot e diagnóstico na mesma época final. A realização fica em memória para retomada por **Iniciar**. Reiniciar ou aplicar outra configuração gera um novo estado em t=0. Fechar/recarregar a página libera o estado; não há checkpoint persistente nem cálculo prometido com a aba fechada.

O tempo físico conta somente passos concluídos. O tempo de cálculo CPU soma a duração do trabalho medido no Worker, incluindo empacotamento e diagnósticos; o GPU soma integração e espera da fila e exclui readback. FPS continua sendo medida do desenho. O painel explicita as épocas dos diagnósticos. Não há pausa automática baseada em um percentual universal de energia; estados inválidos, falhas ou perdas de dispositivo interrompem os cálculos.

A exportação do estado espera o trabalho pendente, copia o estado e registra um instante físico consistente. Os downloads leves usam a última medição disponível e informam sua época. Relatórios de referência e resultados da sessão são separados. Não há envio automático para outro serviço.

## Limites físicos que a limpeza não resolve

As velocidades iniciais usam momentos aproximados de Jeans e Gaussianas locais, com Satoh no disco e uma aproximação de monopolo nas componentes esféricas. A implementação não prepara uma função de distribuição estacionária exata. O teste de conservação de energia não exclui acomodação estrutural, ruído de macro partículas ou aquecimento do disco.

A auditoria física foi executada novamente e reproduziu aumento da altura mediana do disco e do raio de meia massa do bojo em ensaios autogravitantes. Em N=2.000 com halo, 20 Myr, `dt=0,1 Myr`, `epsilon=0,1 kpc` e `theta=0,5`, o bojo cresceu 45,04% em raio de meia massa e o disco 59,88% em altura mediana absoluta, enquanto o erro final de energia foi `7,8926×10^-5`. Diminuir o passo temporal à metade não eliminou o comportamento. Os novos relatórios estão em `reports/validation-galaxy.json`, `reports/initial-audit.json` e na síntese `reports/validation-summary-current.json`.

As verificações numéricas atuais e os benchmarks estão em `VALIDACAO_ATUAL.md`, com referência aos arquivos brutos. Valores antigos documentados em `VALIDACAO.md` continuam históricos. Melhorias de desenho e desempenho não constituem correção demonstrada do equilíbrio inicial.
