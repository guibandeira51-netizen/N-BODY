# Auditoria de reprodução da versão 0.6.0

Esta nota registra a etapa anterior à modificação das condições iniciais. O código de referência é o commit `51dd8cb1c7ee68187bc092b226369f2f920ad663`. Os arquivos históricos foram copiados para `reports/history/v0.6.0`; seus hashes e os hashes das oito unidades auditadas estão em `baseline-v0.6.0.json`.

## Medições repetidas nesta etapa

- `node --test`: 42 aprovados, 0 falhas, duração informada pelo executor 972,788 ms.
- `node scripts/validate-galaxy.mjs`: saída 0, 8,466 s de relógio de parede. Esse tempo inclui geração, diagnósticos e integração; não constitui um benchmark isolado do motor.
- A nova saída física é exatamente igual à saída arquivada, removido apenas o campo de data.
- N=2.000, semente 2026, halo, Barnes–Hut, theta=0,5, dt=0,1 Myr, epsilon=0,1 kpc e 20 Myr: raio mediano esférico do bojo +45,0351%; raio mediano do disco +9,1555%; altura absoluta mediana do disco +59,8811%.
- Nesse caso: erro relativo final de energia `7,892593064906391e-5`, massa 0, momento linear `4,796382187530415e-18` e momento angular `1,3032025371624559e-5`. A energia inicial e final é a soma direta do potencial Plummer. Esses valores não representam máximos ao longo do tempo.
- Sem halo, mesmas condições numéricas: raio mediano do bojo +19,2673%, altura mediana do disco +16,6678%, erro final de energia `1,2959882649471658e-4`.
- No estado N=1.000, RMS de aceleração Barnes–Hut normalizado pela soma quadrática direta: theta 0,8 → 0,0141146; 0,5 → 0,00257757; 0,3 → 0,000335870; 0,1 → 0,00000463799.

O perfil antigo usa mediana do número de partículas em cada componente. A equivalência a meia massa vale porque, nesta implementação e realização, todas as partículas de uma componente possuem a mesma massa. As medições são referidas à origem inercial inicial; não foi feita recentralização dinâmica.

## Inspeção de força, integração e transporte

`forces.js`: soma direta de pares usa `G*m_j*(x_j-x_i)/(r²+epsilon²)^(3/2)` e atualizações opostas ponderadas por massa. A energia direta usa `-G*m_i*m_j/sqrt(r²+epsilon²)`, sem duplicação de pares. Não foi encontrado termo analítico adicional ou aplicação dupla do halo. A saída de aceleração rejeita sobreposição com arrays físicos. A árvore exclui por pertencimento exato qualquer nó que contenha o alvo; folhas coincidentes descontam a massa própria. Theta zero executa a soma de partículas. A aproximação dirigida Barnes–Hut não é estritamente simétrica entre pares, portanto conservação exata de momento não é uma propriedade geral dela.

`integrator.js`: calcula a aceleração antes do primeiro passo; executa meio kick, drift inteiro, nova força no estado atualizado e meio kick. As unidades são kpc, Myr e 10^10 massas solares. `dt` está em Myr e nenhuma conversão adicional é aplicada durante o passo. O estado permanece Float64 e não depende do FPS. Os testes repetidos incluem órbita por cinco períodos, reversibilidade, convergência de segunda ordem, invariância por translação, escala linear de massa, gradiente do potencial e independência do agrupamento de passos.

`gpu.js`: o kernel usa a mesma força Plummer em f32. Todas as lanes executam as barreiras de bloco, inclusive no grupo incompleto. A massa fica na quarta coordenada de posição e é preservada nos passes de integração. Kick/drift, força e kick final são passes distintos, evitando corrida entre atualização e leitura de posições. O tempo e a contagem são atualizados após `queue.onSubmittedWorkDone`. Os parâmetros efetivos f32 são registrados. Esta etapa não repetiu ensaios de hardware WebGPU; os relatórios copiados para a pasta histórica permanecem resultados históricos.

`worker.js`: `prepare` gera uma realização, inicializa a força e fixa a referência diagnóstica. Os pedidos `step` evoluem o mesmo estado f64; apenas a cópia de apresentação usa Float32. Exportar copia o estado antes de transferir seus buffers. Não foi identificada reinicialização oculta, mudança de massa, escala de tempo ou força dependente da câmera/FPS.

As verificações de fronteira repetidas cobrem N individual, ausência de força própria, coincidência com/sem suavização, alias de memória, estados não finitos, folhas degeneradas, subdivisões próximas da precisão de máquina e exclusão do alvo em nós aceitos. Não apareceu defeito de escala ou sequência de integração capaz de explicar isoladamente as deformações reproduzidas. Isso não elimina erros futuros, extremos de precisão ou erro de aproximação gravitacional.

## Evidência histórica que orienta os próximos controles

O `initial-audit.json` arquivado contém um controle de campo analítico fixo não suavizado. Para N=2.000 com halo e 20 Myr, registra bojo +11,6849% e altura do disco +0,8103%, comparados aos +45,0351% e +59,8811% autogravitantes reproduzidos acima. Os campos diferem tanto em granulação como em suavização; a diferença não isola uma única causa. A relação virial inicial `2K/(-W)` discreta de aproximadamente 0,9813 tampouco certifica equilíbrio.

Na mesma auditoria histórica, o RMS da diferença entre aceleração direta suavizada e campo analítico suave foi aproximadamente 42,6% no bojo, 41,8% no disco e 30,1% no halo, em N=2.000 e epsilon=0,1 kpc. A aproximação da árvore em theta=0,5 é muito menor no estado N=1.000 testado, mas os conjuntos não são idênticos e isso não substitui controles estruturais no mesmo estado.

O arquivo de uma execução N=50.000 em 178,8 Myr citado no pedido não foi localizado nesta etapa no diretório da aplicação. Não se atribuiu a ele nenhuma medição nova. As causas deverão ser separadas com controles de campo fixo, autogravitação, resolução, alocação de partículas, suavização e método de inicialização.
