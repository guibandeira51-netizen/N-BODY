# Referência direta Float64 com refinamento do halo

Auditoria de interface e diagnóstico em 21 de outubro de 2026. Não altera o integrador, as forças, as condições iniciais ou os resultados históricos.

## Por que o gráfico ficou vazio

A execução do usuário tinha N₀ = 23.218, halo ×32 e **311.115 partículas efetivamente integradas**: 3.482 no bojo, 10.449 no disco e 297.184 no halo. O backend efetivo era força direta WebGPU Float32, dt = 1 Myr e suavização nominal de 0,1 kpc.

O agendador automático rejeitava o cálculo quando sua projeção ultrapassava 60 segundos. Também havia um timeout de 60 segundos. O cancelamento da referência em t=0 desabilitava a auditoria automática; a simulação continuava, mas não existia E₀ direta para normalizar o gráfico. Isso não era uma conservação energética igual a zero: era ausência de medição.

Além disso, a política anterior multiplicava o intervalo físico escolhido por `ceil((N/80000)^2)`. Para N = 311.115 e seleção de 200 Myr, o agendador de snapshots usava **3.200 Myr**. Essa espera não era o dt do Leapfrog nem o tempo de cálculo no computador.

## Correção

- Um custo projetado acima de 60 segundos agora é informação de desempenho, sem rejeitar por si só uma referência admitida pelo orçamento de memória. O usuário pode cancelar o cálculo.
- A avaliação continua em Workers CPU, com Float64 e somatório compensado. A trajetória WebGPU continua Float32.
- Os Workers enviam progresso por número de pares efetivamente somados, com atualizações limitadas a aproximadamente quatro por segundo por Worker. A ordem dos pares e do somatório permanece igual.
- O intervalo escolhido de 50, 100, 150 ou 200 Myr controla as épocas físicas solicitadas, independentemente do dt e de N.
- A fila permanece limitada a um cálculo ativo e um snapshot pendente. Se a integração produzir snapshots mais depressa que a avaliação, o pendente mais antigo pode ser substituído pelo mais recente. Essa omissão é registrada; não se reconstroem épocas perdidas.
- Uma referência usa arrays próprios, parâmetros efetivos e seu tempo de captura. O avanço posterior da simulação não muda a época do resultado.
- Cada série usa sua própria energia inicial. A série direta usa `100*(E_direta(t)-E_direta(0))/abs(E_direta(0))`, mantendo o tratamento explícito já existente para cancelamento energético próximo de zero.
- O painel “Dispositivo e validação → Validação de energia” mantém estimativa, cálculo, progresso, cancelamento e tabela. Abaixo dos gráficos permanece somente “Salvar gráfico”.

O orçamento de memória e o limite explícito de 4.096 referências por sessão continuam ativos. Não há promessa de duração máxima para um cálculo direto completo. O custo continua O(N²); a fila limitada evita acúmulo ilimitado, mas os Workers podem competir por recursos do computador.

## Recuperação da execução original

O usuário já havia encerrado a integração em 1.268 Myr. A página ainda preservava os snapshots inicial e final. Foram avaliados manualmente, sem reiniciar ou modificar a realização.

| t [Myr] | N | E direta [10¹⁰ M☉ kpc²/Myr²] | δE direta [%] | Custo da avaliação [s] |
|---:|---:|---:|---:|---:|
| 0 | 311.115 | −1,850120023938372 | 0 | 51,295850 |
| 1.268 | 311.115 | −1,8464436298716866 | +0,19871111166395103 | 51,666835 |

São dois estados reais, não uma reconstrução da trajetória entre eles. A estimativa de custo que havia bloqueado a automação era conservadora e dependente do piloto; uma projeção não constitui uma medição de custo completo. A projeção manual antiga com apenas 1.000 corpos também superestimou fortemente o custo. O piloto manual passou a usar até 10.000 corpos; continua identificado como estimativa e nunca entra no gráfico.

Os arquivos `reports/halo-ui/energy-recovered-user.svg`, `.json`, `.csv`, `.png` e `energy-recovered-user-ui.txt` preservam o gráfico, seus metadados e a observação da interface. O SVG foi capturado do elemento realmente exibido na página, o mesmo elemento serializado pelo botão de exportação. A aba original foi preservada com seus pontos recuperados, sem recarga.

## Teste do fluxo corrigido

Uma segunda aba executou a mesma resolução física e dt = 1 Myr. A referência inicial foi iniciada automaticamente mesmo com projeção superior a 60 segundos; o progresso apareceu durante a integração. A segunda referência foi capturada automaticamente em 200 Myr, enquanto a integração avançava além desse instante. O tempo do ponto continuou 200 Myr.

Uma solicitação manual adicional em 325 Myr foi cancelada. A interface confirmou que os dois pontos concluídos, em 0 e 200 Myr, permaneceram e que nenhum resultado parcial havia sido registrado. A solicitação foi repetida para verificar que o cancelamento não bloqueava o uso posterior.

| t [Myr] | Origem | E direta [10¹⁰ M☉ kpc²/Myr²] | δE direta [%] | Custo [s] |
|---:|---|---:|---:|---:|
| 0 | Automática | −1,850120023938372 | 0 | 50,252175 |
| 200 | Automática | −1,8498923771065643 | +0,012304435866979815 | 50,784205 |
| 325 | Manual, após cancelamento e repetição | −1,8495980999675499 | +0,0282102763101306 | 50,952000 |

A aba de teste ficou pausada em 325 Myr; não existe uma nova campanha de bilhões de anos neste ensaio. O N, o dt e os parâmetros efetivos estão nos metadados de cada ponto. A energia inicial dos dois ensaios coincide exatamente, mas as realizações e históricos são identificados separadamente.

Resultados completos desse teste ficam em `reports/halo-ui/energy-automatic-refined.json`, `.csv` e `.svg`, com evidência de cancelamento em `energy-cancellation-ui.txt`. O script `node scripts/audit-energy-reference-ui.mjs` extrai os dados dos SVG realmente exibidos/exportados, confere a normalização independente e os marcadores, gera CSV e verifica os hashes das fontes físicas históricas.

Os **194 testes automatizados passaram**, incluindo regressões para o caso de custo projetado acima de 60 segundos, fila sobrecarregada, cadência escolhida, independência das realizações, cancelamento e progresso sem alterar o somatório. A comparação SHA-256 confirmou intactas todas as 14 fontes listadas no manifesto da campanha histórica de halo de 5 Gyr. O callback de progresso conserva exatamente o resultado Float64 do somatório no teste de regressão; isso não é um limite formal de arredondamento para a Hamiltoniana.

O build estático final foi concluído para `dist/index.html`, mantendo os caminhos relativos usados por GitHub e Vercel. Não houve publicação remota.

## Limites da conclusão

O conserto comprova o funcionamento da medição direta e da apresentação dos pontos. Não certifica equilíbrio estrutural nem a precisão da integração em dt = 1 Myr. Os +0,198711% medidos em 1.268 Myr pertencem à Hamiltoniana direta dos estados daquela trajetória GPU Float32. Separar erro temporal, arredondamento Float32 e outros mecanismos exige comparações controladas com o mesmo estado inicial; este teste de interface não realiza essa atribuição.

Aumentar dt muda a discretização das órbitas; não equivale a mudar somente a frequência do diagnóstico. Para aumentar ou reduzir o número de referências, deve-se usar o intervalo de auditoria, mantendo dt como escolha numérica que exige validação.
