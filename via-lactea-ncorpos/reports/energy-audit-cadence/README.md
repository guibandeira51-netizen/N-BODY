# Intervalo obrigatório da auditoria energética Float64

Revisão da interface de 19/10/2026. O usuário deve escolher 50, 100, 150 ou 200 Myr antes de iniciar ou reiniciar uma realização na aba Experimento N-corpos. A interface começa sem opção selecionada; os botões Iniciar e Reiniciar permanecem desabilitados até a escolha. A função de início também verifica a escolha antes de cancelar estados ou preparar cálculos.

O intervalo é tempo físico simulado entre auditorias solicitadas, distinto do passo dt e do custo computacional em segundos. A captura mantém o tempo exato do estado realmente integrado; não renomeia os pontos para múltiplos ideais. Os marcadores e o guia visual existentes seguem essas épocas reais.

O campo fica desabilitado durante preparação e evolução. Ao pausar, a escolha pode ser modificada; o próximo início prepara uma nova realização com a configuração atual. O estado não é reinicializado no simples ato de selecionar. O intervalo solicitado é preservado em `configuration.energyAuditCadenceMyr`, na configuração exportada dos pontos e em `automatic.requestedCadenceMyr`. O intervalo efetivo aparece separadamente no status e em `automatic.cadenceMyr`.

## Proteções e compatibilidade

A política existente de resolução permanece proporcional a `ceil((N/80000)^2)`, agora multiplicando o intervalo escolhido em vez de 200 Myr fixos. A medição de custo também permanece: se o diagnóstico exceder o alvo de 10 s por estado, o intervalo efetivo aumenta em múltiplos inteiros. O limite automático de 60 s por estado, orçamento de memória de 96 MiB, até 4096 referências e fila de um trabalho ativo mais um pendente continuam ativos. Assim, um pedido de 50 Myr não promete uma medição a cada 50 Myr em qualquer N ou dispositivo.

A interface informa pedido e cadência efetiva. O Worker CPU e as opções de diagnóstico GPU recebem o mesmo valor. Configurações legadas que não possuem o novo campo continuam usando 200 Myr internamente; a nova interface exige a escolha explícita. Mudar de intervalo dentro do mesmo objeto de sessão é rejeitado; uma nova realização redefine o sampler e a fila.

Forças, integrador KDK, dt, G, suavização, massas, inicializador, cálculo da Hamiltoniana e Workers de somatório direto não foram modificados. As alterações ficam na interface, no agendamento/captura do diagnóstico e na transmissão desse parâmetro.

## Verificações executadas

- 164 testes automatizados aprovados, incluindo as quatro escolhas, obrigatoriedade, propagação CPU/GPU, captura em épocas reais, adaptação por custo, proteção de filas, reinício e invariância da energia diante da nova opção de diagnóstico.
- Navegador: seleção vazia, campo obrigatório e Iniciar/Reiniciar desabilitados; escolha de 50 Myr habilitou o início.
- CPU direta, N=256, dt=0,1 Myr, ε=0,1 kpc, semente 2026, quatro realizações reais: referências em [0; 51,30000000000001], [0; 102,50000000000006], [0; 150,5] e [0; 201,69999999999982] Myr para pedidos de 50/100/150/200 Myr. A diferença para os alvos corresponde ao estado efetivamente alcançado pelo lote de integração. E0 direta foi idêntica nos quatro testes: −1,3440892101862238 nas unidades internas. Os UUIDs são distintos.
- GPU WebGPU Float32, N=1024, intervalo solicitado e efetivo de 50 Myr: referências reais em 0 e 50,79999999999999 Myr. Diagnóstico direto CPU Float64.
- O campo foi conferido desabilitado durante a evolução; alterar a escolha após pausa e iniciar produziu outra realização sem misturar pontos.
- `browser-cpu.json` e `browser-gpu.json` preservam os dados lidos dos SVGs reais e as configurações. `verification.json` compara tempos, cadências, energias iniciais, UUIDs e hashes dos kernels físicos.

Estes são testes funcionais de pequena resolução, não novos certificados de estabilidade galáctica. Não foi repetida uma campanha de 80.000 partículas e não se adotou o custo histórico de 3,5 s como medição atual deste dispositivo.

Reproduzir a conferência dos registros preservados: `node scripts/energy-audit-cadence/verify.mjs`. Suíte: `node scripts/test.mjs`. Build: `node scripts/build.mjs`. Preservação: `node scripts/interface-106/audit.mjs --production`.
