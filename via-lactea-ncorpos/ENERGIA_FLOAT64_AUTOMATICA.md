# Energia direta Float64 automática — 18/10/2026

Na aba **Experimento N-corpos**, iniciar uma realização prepara e preserva o estado real em t=0 e dispara automaticamente a referência direta Float64. Não é necessário abrir Dispositivo e validação, estimar custo ou clicar para calcular. Os controles antigos continuam opcionais para solicitar uma medição adicional. Abaixo de cada gráfico permanece somente **Salvar gráfico**; uma linha discreta acima dos gráficos informa o estado da automação.

## Implementação

`EnergySnapshotSampler` captura cópias de posições, velocidades de passo completo, massas e componentes nos estados efetivamente medidos. O estado inicial precisa ter t=0. Os alvos seguintes partem de 200 Myr para N≤80.000. Os gatilhos de coleta CPU e WebGPU também verificam esses marcos, sem modificar a quantidade ou o tamanho dos passos físicos. A leitura pode ocorrer no primeiro passo/lote que cruza o alvo; o tempo efetivo é preservado em todos os resultados, separado do tempo solicitado.

`AutomaticEnergyReferences` avalia os snapshots em CPU Float64, com a implementação de pares compensados já validada e até quatro Workers. O laço de integração não aguarda esse somatório. Na GPU, a leitura consistente de buffers e o diagnóstico Barnes–Hut/campo por componentes continuam tendo seu custo; isso não é uma promessa de coleta sem custo. A avaliação direta é assíncrona e não chama a pausa usada pelo controle manual.

A linha aproximada Barnes–Hut e os pontos diretos usam energias iniciais independentes da mesma realização. A série direta representa `100 × (E_direta(t) − E_direta(0)) / |E_direta(0)|`, com sinal, em porcentagem. O tratamento preexistente de E₀ quase nula usa explicitamente K₀+|U₀|. Os pontos não são interpolados. A Hamiltoniana de pares continua Plummer com G e ε² efetivos do integrador. Avaliar um estado da GPU em Float64 não transforma a trajetória Float32 em uma integração Float64.

## Política de custo e memória

- Uma avaliação ativa e no máximo um snapshot pendente. Se chegar um estado mais recente durante o atraso, ele substitui o pendente e a avaliação omitida é registrada.
- Cadência básica: `200 × max(1, ceil((N/80000)²)) Myr`. Ela aumenta se o custo medido exceder o alvo interno de 10 segundos por avaliação. Os tempos são ancorados nos marcos físicos, não deslocados artificialmente para múltiplos exatos após a captura.
- Um piloto de até 1.000 corpos estima o custo automaticamente, sem adicionar pontos. Estimativas superiores a 60 s por estado ou avaliações que excedam esse limite geram uma limitação explícita; nenhuma referência aproximada substitui silenciosamente o cálculo direto.
- Orçamento adicional estimado de 96 MiB para os buffers do diagnóstico. Para N=80.000, a política estima 50.160.000 bytes considerando cópias, fila e Workers. Isso é um orçamento de implementação, não uma medição exata de RAM/VRAM.
- Os vetores completos são retidos para o estado inicial e os dois estados concluídos mais recentes. Os demais pontos preservam energia, época, parâmetros, procedência e normalização, indicando que os vetores foram liberados. O histórico de medições rápidas não acumula snapshots completos.
- O registro mantém até 4.096 referências por sessão e os 128 eventos mais recentes, com contadores totais de omissões. Ao atingir o limite de referências, informa a limitação e preserva os dados já calculados.
- Reiniciar cancela os Workers da realização anterior e invalida respostas antigas. O gerenciamento dos Workers foi protegido para que a finalização de um cálculo cancelado não termine os Workers da nova realização. A aritmética de pares não foi alterada.

Uma realização sem estado inicial preservado não recebe E₀ reconstruída nem pontos retroativos: a interface informa que a automação começará corretamente na próxima execução. Recarregar limpa a memória da sessão; exporte o que precisar guardar. Os resultados históricos em arquivos não foram alterados.

## Teste efetivo com 80.000 partículas

Foi usada uma aba separada com 80.000 corpos massivos realmente integrados, semente 2026, bojo + disco + halo legacy, força direta WebGPU, trajetória Float32, dt solicitado=0,1 Myr, ε solicitado=0,1 kpc e θ do diagnóstico=0,5. Não houve clique em Estimar, Calcular referência ou Cancelar. O painel de validação permaneceu fechado até depois da conclusão dos pontos; foi aberto somente para exportar o JSON.

| Alvo [Myr] | Tempo efetivo [Myr] | Energia direta | Desvio assinado [%] | Custo [ms] |
|---:|---:|---:|---:|---:|
| 0 | 0 | -1,8601391056181185 | 0 | 3510,150 |
| 200 | 200,09999999999292 | -1,8601399667684193 | -0,0000462949409668 | 3567,645 |
| 400 | 400,00000000002245 | -1,860139536260794 | -0,0000231511005934 | 3540,710 |
| 600 | 600,0000000000679 | -1,8601404176779788 | -0,0000705355774927 | 3588,660 |
| 800 | 800,0000000001133 | -1,8601407157088787 | -0,0000865575459067 | 3541,540 |
| 1000 | 1000,0000000001588 | -1,860141593462449 | -0,000133745069013 | 3671,960 |

Energia em 10¹⁰ M☉ kpc²/Myr². Os tempos em ponto flutuante são os efetivamente registrados; a interface os formata para leitura. Cada referência usa |E₀,direta|=1,8601391056181185. O custo médio foi **3570,110833 ms**, com quatro Workers. Foram concluídas seis avaliações, sem omissões, com fila pendente máxima de um estado; a cadência permaneceu em 200 Myr. A integração e a renderização continuaram durante os cálculos. Uma observação em execução, em 927,6 Myr, registrou 26,49 ms/passo, 3,70 Myr/s e 75 FPS. Esses valores são amostras deste dispositivo, não uma comparação controlada com a automação desligada nem uma garantia para outro hardware.

A execução foi pausada pelo teste ao atingir aproximadamente 1000 Myr, enquanto a coleta desse marco ainda terminava. A referência correspondente concluiu em segundo plano após a pausa. As referências de 0 a 800 Myr foram produzidas durante a evolução contínua, sem acionar a validação manual. O SVG efetivamente baixado contém as duas séries e seis pontos diretos, sem segmentos entre os pontos. O JSON preserva os seis resultados e os vetores de t=0, 800 e 1000 Myr conforme a política de retenção; os vetores intermediários não são apresentados como se ainda estivessem disponíveis.

Uma primeira passagem de temporização está preservada em `preliminary-large.json`. Ela evidenciou atraso da captura ao depender somente da coleta geral; os gatilhos foram refinados antes da execução final acima. Nenhum dado dessa passagem foi usado para preencher os pontos da execução final.

## Teste em CPU, reinício e limites

Uma realização funcional separada, com N=512, força direta CPU Float64, semente 2026, dt=0,1 Myr e ε=0,1 kpc, produziu automaticamente **18 referências** entre t=0 e t=3401,5 Myr. Os primeiros tempos foram 0; 201,8; 401,8; 601,8; 801,8; 1001,8 Myr. A diferença em relação aos marcos decorre dos lotes físicos efetivos. Custo médio: 38,308889 ms. O maior |desvio direto| amostrado foi **0,573019%**; esse resultado real não foi corrigido nem escondido. Esse sistema de baixa resolução é um teste funcional e não valida a estabilidade galáctica.

Após pausar, os pontos permaneceram disponíveis. Um reinício com semente 2027 apagou as referências da realização anterior e calculou automaticamente somente o novo ponto inicial, E₀=-2,3686890626892727. Os testes automatizados cobrem também reinício durante avaliação pendente, cancelamento, falha inicial, ausência de t=0, fila saturada, adaptação de custo, isolamento dos vetores e exclusão mútua com a medição manual.

Conservação energética amostrada não certifica estabilidade estrutural. Os seis pontos de 80.000 corpos não limitam excursões entre amostras nem separam sozinhos truncamento temporal, arredondamento Float32 e efeitos da força. O integrador, as forças, massas, G, suavização e condições iniciais permaneceram intactos.

## Evidências e reprodução

- [Verificações de arquivos e normalização](reports/automatic-energy/verification.json).
- [Registro do navegador](reports/automatic-energy/browser-qa.json).
- [Referências GPU · CSV](reports/automatic-energy/gpu-80000-referencias.csv).
- [SVG GPU efetivamente baixado](reports/automatic-energy/gpu-80000-baixado.svg).
- [Auditoria GPU e vetores retidos · JSON](reports/automatic-energy/gpu-80000-auditoria.json).
- [Referências CPU · CSV](reports/automatic-energy/cpu-512-referencias.csv).
- [SVG CPU efetivamente baixado](reports/automatic-energy/cpu-512-baixado.svg).
- [Auditoria CPU e vetores retidos · JSON](reports/automatic-energy/cpu-512-auditoria.json).
- [Novo E₀ após reinício](reports/automatic-energy/cpu-reset.json).
- [Prévia da interface](reports/automatic-energy/gpu-80000-automatico.png).
- [Testes automatizados](reports/automatic-energy/node-tests.tap).

`node scripts/verify-automatic-energy.mjs` confere procedência automática, tempos, normalização independente, contagem de pontos no SVG, fila e memória, e ausência de snapshots completos no histórico rápido. Recalcula K e verifica a integridade dos vetores retidos; para o teste pequeno também recalcula integralmente U e E. Não repete o somatório completo de pares de 80.000 corpos nessa verificação: esses valores são os seis cálculos paralelos efetivamente realizados no navegador com a implementação previamente validada.

Execute `node scripts/test.mjs`, `node scripts/build.mjs` e `node scripts/interface-106/audit.mjs --production` para testar e conferir o build estático. O manifesto registrado no JSON identifica a versão efetivamente servida durante o ensaio; a identidade final do pacote inclui também os ajustes posteriores de documentação e build. Não houve publicação remota.
