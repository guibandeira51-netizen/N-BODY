# Compatibilidade das mensagens da referência energética Float64

## Falha observada

Após a alteração que passou a enviar progresso durante o somatório, uma aba já aberta continuava executando a versão anterior de `LiveEnergyReference`. Cada nova avaliação criava um Worker a partir do arquivo atualizado no servidor. O cliente anterior tratava qualquer mensagem como resultado final; a mensagem parcial `{type: 'progress', done: ...}` não tinha a energia cinética nem o potencial final.

Na aba do usuário, o resultado foi `Cannot read properties of null (reading 'kinetic')`. A referência inicial falhou e o agendador daquela versão desativou as coletas seguintes. Avançar até 1.355 Myr não restaurava a medição. Esta foi uma regressão de compatibilidade introduzida pelo envio de progresso, diferente da restrição anterior de custo de 60 segundos.

## Correção aplicada

O cliente novo inclui `progressProtocol: 1` na requisição. O Worker só envia progresso intermediário quando recebe esse opt-in. Para clientes anteriores, envia somente uma resposta final completa, preservando as chaves `value`, `base` e `ms` que já eram reconhecidas. A resposta final nova também é identificada como `type: 'result'`.

O cliente novo continua aceitando respostas finais anteriores, sem o campo `type`. Respostas finais malformadas e ausência da energia cinética agora geram um erro explícito antes de registrar qualquer medição. O protocolo não altera pares, massas, posições, velocidades, G, suavização ou ordem do somatório.

## Recuperação da realização do usuário

A execução estava pausada em 1.355 Myr, com bojo 3.482, disco 10.449 e halo 297.184: N = 311.115, halo ×32, dt = 1 Myr e força direta WebGPU Float32. Os estados inicial e atual estavam disponíveis.

Depois de corrigir o Worker, a captura e o cálculo manual foram executados **na própria aba antiga**, sem recarregar ou reiniciar a integração. Isso exercitou a combinação exata que havia falhado: cliente antigo com Worker atualizado.

| t [Myr] | E direta [10¹⁰ M☉ kpc²/Myr²] | δE direta [%] | Custo [s] |
|---:|---:|---:|---:|
| 0 | −1,850120023938372 | 0 | 51,549870 |
| 1.355 | −1,8461892206482675 | +0,2124620694465474 | 55,952085 |

O gráfico da aba original passou a exibir os dois pontos. A normalização foi conferida contra a energia inicial direta, independentemente da energia Barnes–Hut. A aba permanece pausada; seu agendador antigo já havia sido desativado pela falha e não recebe uma atualização de JavaScript em memória. Para iniciar uma nova realização com automação corrigida, é necessário carregar a versão atual da página. A recuperação manual preserva a execução existente sem essa recarga.

Não foram reconstruídas medições em 200, 400 ou outros instantes intermediários cujos snapshots completos não estavam preservados. A variação direta de +0,212462% é um resultado numérico dessa trajetória; este reparo de interface não certifica a precisão de dt = 1 Myr nem atribui separadamente o desvio ao integrador e ao arredondamento Float32.

Dados completos e evidência da recuperação: `reports/halo-ui/energy-protocol-recovered-user.{svg,json,csv,png}` e `energy-protocol-recovered-user-ui.txt`. A mensagem anterior à recuperação foi preservada em `energy-protocol-failure-ui.txt`.

## Regressão e verificação

- **196 testes automatizados aprovados.** A nova regressão executa o handler real do Worker com uma requisição antiga e verifica que há somente uma resposta final completa. Com opt-in, o mesmo handler produz progresso e um resultado energético idêntico. Outro teste verifica falhas explícitas para base cinética ausente e resposta final inválida.
- Uma página recém-carregada executou o fluxo automático com N = 1.000 e intervalo de 50 Myr. A interface registrou 156 estados de diagnóstico e última referência automática em 7.704 Myr antes da pausa em 7.724 Myr. Este ensaio reduzido, com dt = 1 Myr, serve apenas para testar o fluxo de mensagens e a persistência da coleta; não valida conservação física, resolução ou equilíbrio. A evidência conservada é a leitura da interface em `energy-protocol-fresh-page-ui.txt`, sem uma tabela completa de referências desse teste funcional.
- `node scripts/audit-energy-protocol.mjs` confere os marcadores e a normalização do SVG real da execução recuperada, gera CSV e verifica SHA-256 das 14 fontes físicas do manifesto histórico. Os hashes permanecem iguais.
- As evidências anteriores de 0/1.268 Myr e do teste de 0/200/325 Myr permanecem em seus arquivos originais.

O build estático inclui o protocolo corrigido e as novas evidências. Não houve publicação remota.
