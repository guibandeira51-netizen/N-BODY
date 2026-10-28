# Interface do TCC — N-corpos com três gráficos ao vivo

Atualização de 17 de outubro de 2026, após a escolha do simulador original pelo usuário.

## O que aparece

A apresentação continua em `index.html`; a investigação astrofísica com cinco figuras continua em `materia-escura.html`. A aba `experimento-ncorpos.html` mantém os controles, a visualização 3D e o painel de integração do simulador escolhido. Saíram dessa aba os blocos Laboratório de Estabilidade Galáctica, Resultados para revisão do TCC, Versão 1.0.1 e o rodapé técnico associado.

No lugar, aparecem somente três gráficos:

1. Espessura do disco × tempo: h50 ponderado por massa em relação ao plano próprio robusto instantâneo, em kpc. O modelo sintético possui um único disco; ele não é rotulado artificialmente como disco fino AGAMA.
2. Erro relativo de energia × tempo: 100×(E−E0)/|E0|, com sinal, em %. A referência E0 é reiniciada a cada nova realização. A interface informa se a energia vem da soma direta de pares Plummer ou da aproximação Barnes–Hut com erro da árvore não calibrado.
3. Curvas de rotação do disco: média azimutal ponderada por massa das partículas por anel cilíndrico, na origem inicial e em torno de z, em km/s. São mostradas as médias inicial e atual, mais a velocidade circular do potencial analítico inicial como referência explicitamente fixa. Essa referência não é apresentada como campo evoluído, e a média de um disco quente não é forçada a coincidir com ela. Não há dados observacionais nessa aba.

Anéis vazios têm valor ausente e não são interpolados. O gráfico cobre os anéis de 0 a 30 kpc; os pontos usam os centros dos intervalos históricos. O histórico de diagnósticos mantém até 512 estados, com redução de amostras antigas quando necessário, preservando o primeiro estado. Não há suavização dos valores físicos nem alterações de massa, posição ou velocidade para obter um gráfico desejado.

## Implementação e coleta

O motor e os 51 arquivos de fonte anteriores à investigação 1.0.6 permanecem intactos. `src/ncorpos-live-entry.js` é gerado por `scripts/interface-106/site.mjs` a partir de `src/main.js`, trocando somente os inicializadores da interface e o texto de encerramento. Reutiliza o mesmo Worker, força CPU/GPU, integrador KDK, escalonamento, câmera e renderizadores. Não inicializa o painel extenso nem os botões de revisão removidos do HTML.

`src/live-diagnostics.js` recebe os diagnósticos reais já calculados pelo Worker. A cadência física solicitada é 1 Myr; a frequência efetiva também depende da limitação de cerca de um segundo de tempo real e do custo do diagnóstico, mantida pelo controlador original. Por isso o tempo da última medição é indicado separadamente do tempo da integração. Pausar coleta o estado final, Reiniciar limpa a série e restaura E0, e Encerrar preserva os gráficos da sessão. Gráficos vazios antes de iniciar são esperados.

A exportação de medição já existente em Dispositivo e validação continua disponível e inclui os estados diagnósticos, a configuração, as contagens por anel e os dados projetados nos três gráficos. Não é necessário abrir os grandes blocos de exportação na tela principal.

## Preservação e verificação

O simulador técnico integral permanece em `simulador-tecnico.html`, acessível pelo arquivo científico. Ali continuam o laboratório completo e os blocos técnicos retirados desta aba. Os relatórios, CSVs, JSONs, figuras, massas e campanhas científicas foram preservados. O arquivo científico continua com 83 gráficos históricos sob consulta. A cópia da interface imediatamente anterior está em `reports/interface-106/previous-full-simulator/`; a interface simplificada anterior está em `previous-clean-interface/`.

Os testes verificam a permanência dos controles/canvas/painel de integração, a ausência dos blocos removidos, a conversão das velocidades medidas, os anéis vazios, a distinção entre referência circular e cinemática, o sinal da energia e a nova referência após reinício. Os 116 testes passaram. No navegador, CPU direta com N=1.000 produziu 17 estados diagnósticos até 197,80 Myr durante um teste funcional curto; reiniciar voltou a t=0 e uma única amostra. WebGPU com N=1.000 atualizou os três gráficos e foi pausada em 48,45 Myr. Esses testes verificam a interface, não são uma nova campanha científica e não certificam estabilidade ou convergência. As épocas CPU/GPU são diferentes e não formam um ensaio comparativo de precisão.

Execute `node scripts/test.mjs`, `node scripts/build.mjs` e `node scripts/interface-106/audit.mjs --production`. O build é estático em `dist`; nenhuma publicação remota foi realizada. O pacote atual é `downloads/apresentacao-tcc-1.0.6-ao-vivo.zip`, com SHA-256 e manifesto interno. Os ZIPs anteriores e os grandes pacotes de campanhas continuam preservados separadamente no diretório downloads. Os relatórios científicos 1.0.6 mantêm seu conteúdo original; este documento atualiza somente a interface posterior.
