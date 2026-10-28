# Interface do TCC — N-corpos com três gráficos ao vivo

Atualização de 17 de outubro de 2026, após a escolha do simulador original pelo usuário.

## O que aparece

A apresentação continua em `index.html`; a investigação astrofísica com cinco figuras continua em `materia-escura.html`. A aba `experimento-ncorpos.html` mantém os controles, a visualização 3D e o painel de integração do simulador escolhido. Saíram dessa aba os blocos Laboratório de Estabilidade Galáctica, Resultados para revisão do TCC, Versão 1.0.1 e o rodapé técnico associado.

No lugar, aparecem somente três gráficos:

1. Espessura do disco × tempo: h50 ponderado por massa em relação ao plano próprio robusto instantâneo, em kpc. O modelo sintético possui um único disco; ele não é rotulado artificialmente como disco fino AGAMA.
2. Erro relativo de energia × tempo: 100×(E−E0)/|E0|, com sinal, em %. A referência E0 é reiniciada a cada nova realização. A interface informa se a energia vem da soma direta de pares Plummer ou da aproximação Barnes–Hut com erro da árvore não calibrado.
3. Curvas de rotação por componentes: disco, bojo, halo, disco + bojo e total (disco + bojo + halo), com cinco cores distintas. São contribuições circulares do campo gravitacional atual, não médias cinemáticas.

A cada estado diagnóstico, o Worker calcula diretamente a força Plummer das posições e massas atuais em sondas sem massa no plano z=0. A malha radial é 0,5 kpc e de 1 a 30 kpc em passos de 1 kpc: 31 raios. Cada raio usa 32 azimutes igualmente espaçados. A média radial por componente produz v_i²=−R⟨aR_i⟩; disco+bojo e total são somas dessas quantidades assinadas antes da raiz quadrada. A geometria achatada do disco permanece na soma das forças, sem aproximação esférica GM(<R)/R.

O halo oculto no desenho continua contribuindo para a gravitação. No modelo sem halo sua contribuição é zero, e a curva total coincide com disco+bojo. O diagnóstico usa Float64; para estados GPU, as posições e massas convertidas de Float32 e os parâmetros efetivos G e ε² são fornecidos pelo backend. Isso não transforma a evolução GPU em integração Float64.

A média em 32 ângulos é uma quadratura finita, não uma certificação de convergência angular. O ruído de partículas e da malha angular não foi removido. Quando uma componente apresenta aceleração média para fora, seu v² assinado é preservado nos dados e a velocidade circular correspondente fica ausente no gráfico. Não se força uma contribuição negativa a zero. As curvas combinadas são calculadas a partir dos v² assinados, mesmo nesses casos. Não há observações astronômicas nessa aba.

A espessura e a energia mantêm as definições anteriores. O histórico preserva até 512 estados com redução de amostras antigas quando necessário, retendo o primeiro estado. Não há alteração de massas, posições, velocidades ou parâmetros para produzir o formato desejado.

## Implementação e coleta

O motor e os 51 arquivos de fonte anteriores à investigação 1.0.6 permanecem intactos. `src/ncorpos-live-entry.js` é gerado por `scripts/interface-106/site.mjs` a partir de `src/main.js`, trocando os inicializadores da interface, o Worker diagnóstico e o texto de encerramento. `src/compute/live-worker.js` é gerado a partir do Worker original e acrescenta somente a medição não mutante do campo por componente. As forças de evolução CPU/GPU, o integrador KDK, o escalonamento, a câmera e os renderizadores são reutilizados. Não inicializa o painel extenso nem os botões de revisão removidos do HTML.

`src/physics/rotation-field.js` calcula as contribuições separadas; `src/live-diagnostics.js` recebe os diagnósticos reais calculados pelo Worker. A cadência física solicitada é 1 Myr; a frequência efetiva também depende da limitação de cerca de um segundo de tempo real e do custo do diagnóstico, mantida pelo controlador original. Por isso o tempo da última medição é indicado separadamente do tempo da integração. Pausar coleta o estado final, Reiniciar limpa a série e restaura E0, e Encerrar preserva os gráficos da sessão. Gráficos vazios antes de iniciar são esperados.

O relatório compacto usa o esquema `live-nbody-diagnostics-v2`. A exportação de medição já existente em Dispositivo e validação continua disponível e inclui os estados diagnósticos, a configuração, as contagens e massas de cada componente fonte, os parâmetros e os campos por raio, além dos dados dos três gráficos. Não é necessário abrir os grandes blocos de exportação na tela principal.

## Preservação e verificação

O simulador técnico integral permanece em `simulador-tecnico.html`, acessível pelo arquivo científico. Ali continuam o laboratório completo e os blocos técnicos retirados desta aba. Os relatórios, CSVs, JSONs, figuras, massas e campanhas científicas foram preservados. O arquivo científico continua com 83 gráficos históricos sob consulta. A cópia da interface imediatamente anterior está em `reports/interface-106/previous-full-simulator/`; a interface simplificada anterior está em `previous-clean-interface/`.

Os testes verificam a permanência dos controles/canvas, a ausência dos blocos removidos, a espessura, o sinal da energia e a referência após reinício. Para a rotação, verificam a fórmula Plummer em massas centrais, aditividade em v², variação do campo ao mover uma componente e halo ausente. Um cálculo independente com a função de força direta usada na evolução confere as sondas fora do eixo; a concordância foi limitada apenas pelo arredondamento Float64. Um anel de massa exterior verifica a preservação de suporte radial para fora como lacuna em v. São 118 testes.

Os testes no navegador são verificações funcionais, sem nova campanha científica nem conclusão de estabilidade ou de convergência. O registro atual está em `reports/interface-106/browser-qa.json`; as figuras de tela estão em previews. A implementação cinemática anterior foi preservada em `previous-kinematic-rotation/`, junto aos documentos e registros da entrega correspondente.

Execute `node scripts/test.mjs`, `node scripts/build.mjs` e `node scripts/interface-106/audit.mjs --production`. O build é estático em `dist`; nenhuma publicação remota foi realizada. O pacote atual é `downloads/apresentacao-tcc-1.0.6-componentes.zip`, com SHA-256 e manifesto interno. Os ZIPs anteriores e os grandes pacotes de campanhas continuam preservados separadamente no diretório downloads. Os relatórios científicos 1.0.6 mantêm seu conteúdo original; este documento atualiza somente a interface posterior.
