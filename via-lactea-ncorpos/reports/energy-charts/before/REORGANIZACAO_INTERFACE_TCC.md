# Interface do TCC — N-corpos com três gráficos ao vivo

Atualização de 17 de outubro de 2026, após a escolha do simulador original pelo usuário.

## O que aparece

A apresentação continua em `index.html`; a investigação astrofísica com cinco figuras continua em `materia-escura.html`. A aba `experimento-ncorpos.html` mantém os controles, a visualização 3D e o painel de integração do simulador escolhido. Saíram dessa aba os blocos Laboratório de Estabilidade Galáctica, Resultados para revisão do TCC, Versão 1.0.1 e o rodapé técnico associado.

No lugar, aparecem somente três gráficos:

1. Espessura do disco × tempo: h50 ponderado por massa em relação ao plano próprio robusto instantâneo, em kpc. O modelo sintético possui um único disco; ele não é rotulado artificialmente como disco fino AGAMA.
2. Conservação da energia × tempo físico: 100×(E−E0)/|E0|, com sinal, em %. Linha rápida: energia estimada Barnes–Hut, sem certificação. Pontos selecionados: pares diretos Float64 compensados em CPU, sem interpolação. Cada método usa a energia inicial do mesmo estado físico; nova realização reinicia E0. A referência direta tem estimativa de custo por piloto, execução em até quatro Workers, progresso e cancelamento; registra a diferença BH/direto nos mesmos snapshots. O resumo explicita valores atuais, máximos amostrados, cadência, método, precisão e a normalização alternativa K0+|U0| perto de cancelamento. Sem referência, a conservação permanece explicitamente não verificada. Consulte AUDITORIA_ENERGIA_NCORPOS.md.
3. Curvas de rotação por componentes: disco, bojo, halo, disco + bojo e total (disco + bojo + halo), com cinco cores distintas. São contribuições circulares do campo gravitacional atual, não médias cinemáticas.

A cada estado diagnóstico, o Worker calcula diretamente a força Plummer das posições e massas atuais em sondas sem massa no plano z=0. A malha radial é 0,5 kpc e de 1 a 30 kpc em passos de 1 kpc: 31 raios. Cada raio usa 32 azimutes igualmente espaçados. A média radial por componente produz v_i²=−R⟨aR_i⟩; disco+bojo e total são somas dessas quantidades assinadas antes da raiz quadrada. A geometria achatada do disco permanece na soma das forças, sem aproximação esférica GM(<R)/R.

O halo oculto no desenho continua contribuindo para a gravitação. No modelo sem halo sua contribuição é zero, e a curva total coincide com disco+bojo. O diagnóstico usa Float64; para estados GPU, as posições e massas convertidas de Float32 e os parâmetros efetivos G e ε² são fornecidos pelo backend. Isso não transforma a evolução GPU em integração Float64.

A média em 32 ângulos é uma quadratura finita, não uma certificação de convergência angular. O ruído de partículas e da malha angular não foi removido. Quando uma componente apresenta aceleração média para fora, seu v² assinado é preservado nos dados e a velocidade circular correspondente fica ausente no gráfico. Não se força uma contribuição negativa a zero. As curvas combinadas são calculadas a partir dos v² assinados, mesmo nesses casos. Não há observações astronômicas nessa aba.

A espessura e a energia mantêm as definições anteriores. O histórico preserva até 512 estados com redução de amostras antigas quando necessário, retendo o primeiro estado. Não há alteração de massas, posições, velocidades ou parâmetros para produzir o formato desejado.

## Implementação e coleta

O motor e os 51 arquivos de fonte anteriores à investigação 1.0.6 permanecem intactos. `src/ncorpos-live-entry.js` é gerado por `scripts/interface-106/site.mjs` a partir de `src/main.js`, trocando os inicializadores da interface, o Worker diagnóstico e o texto de encerramento, transmitindo os parâmetros efetivos da GPU e capturando os estados para referência energética. `src/compute/live-worker.js` é gerado a partir do Worker original e acrescenta medições não mutantes do campo por componente, energia rápida rotulada e preservação do estado inicial real. `physics/live-energy.js` e os Workers de referência avaliam a Hamiltoniana sem modificar a evolução. As forças de evolução CPU/GPU, o integrador KDK, o escalonamento, a câmera e os renderizadores são reutilizados. Não inicializa o painel extenso nem os botões de revisão removidos do HTML.

`src/physics/rotation-field.js` calcula as contribuições separadas; `src/live-diagnostics.js` recebe os diagnósticos reais calculados pelo Worker. A cadência física solicitada é 1 Myr; a frequência efetiva também depende da limitação de cerca de um segundo de tempo real e do custo do diagnóstico, mantida pelo controlador original. Por isso o tempo da última medição é indicado separadamente do tempo da integração. Pausar coleta o estado final, Reiniciar limpa a série e restaura E0, e Encerrar preserva os gráficos da sessão. Gráficos vazios antes de iniciar são esperados.

O relatório compacto usa o esquema `live-nbody-diagnostics-v3`, com `energyAudit` no esquema `legacy-energy-audit-v1`. A exportação de medição em Dispositivo e validação continua disponível. O JSON específico da energia preserva as partículas dos snapshots auditados como vetores, parâmetros efetivos, métodos e identidade do código; os botões ao lado exportam CSV de energia e SVG. Encerrar preserva os endpoints para auditoria enquanto a aba permanece aberta; recarregar limpa a memória, por isso exporte os dados necessários. Não é necessário abrir os grandes blocos históricos de exportação na tela principal.

## Preservação e verificação

O simulador técnico integral permanece em `simulador-tecnico.html`, acessível pelo arquivo científico. Ali continuam o laboratório completo e os blocos técnicos retirados desta aba. Os relatórios, CSVs, JSONs, figuras, massas e campanhas científicas foram preservados. O arquivo científico continua com 83 gráficos históricos sob consulta. A cópia da interface imediatamente anterior está em `reports/interface-106/previous-full-simulator/`; a interface simplificada anterior está em `previous-clean-interface/`.

Os testes verificam a permanência dos controles/canvas, a ausência dos blocos removidos, a espessura, o sinal da energia e a referência após reinício. Para a rotação, verificam a fórmula Plummer em massas centrais, aditividade em v², variação do campo ao mover uma componente e halo ausente. Um cálculo independente com a função de força direta usada na evolução confere as sondas fora do eixo; a concordância foi limitada apenas pelo arredondamento Float64. Um anel de massa exterior verifica a preservação de suporte radial para fora como lacuna em v. A entrega anterior tinha 118 testes; a revisão energética completa tem 126.

Os ensaios de energia estão separados dos testes funcionais: controles CPU, comparações GPU e uma repetição da realização legacy N=80.000 estão em `reports/energy-audit/`, com CSV, oito figuras SVG/PNG e snapshots. Os 126 testes atuais verificam também a energia, os parâmetros efetivos, a sincronização KDK e a coerência das evidências. A repetição reproduziu os oito K e U históricos, com máximo direto amostrado de 0,000136555%; a estabilidade estrutural não foi certificada. O registro anterior da interface está em `reports/interface-106/browser-qa.json`; a implementação cinemática e os documentos anteriores permanecem preservados.

Execute `node scripts/test.mjs`, `node scripts/build.mjs` e `node scripts/interface-106/audit.mjs --production`. O build é estático em `dist`; nenhuma publicação remota foi realizada. O pacote atual é `downloads/auditoria-energia-ncorpos-2026-10-17.zip`; `apresentacao-tcc-1.0.6-componentes.zip` preserva a entrega anterior, com SHA-256 e manifesto interno. Os ZIPs anteriores e os grandes pacotes de campanhas continuam preservados separadamente no diretório downloads. Os relatórios científicos 1.0.6 mantêm seu conteúdo original; este documento atualiza somente a interface posterior.

## Restauração dos controles Float64 — 18/10/2026

Após a simplificação, os acionadores da referência direta foram restaurados em **Dispositivo e validação → Validação de energia**, com estimativa, cálculo paralelo sob demanda, cancelamento, progresso e consulta dos instantes auditados. Abaixo de cada gráfico permanece apenas **Salvar gráfico**. A série direta exige um estado inicial em t=0 da mesma realização, usa sua própria E₀ e desenha somente pontos reais, sem interpolação. O SVG inclui metadados das duas séries; JSON e CSV da auditoria ficam no painel recolhível. Os vetores dos snapshots e parâmetros efetivos são preservados independentemente da integração em curso.

A suíte atual possui 128 testes aprovados. O fluxo real de seleção, dois instantes posteriores, exportação SVG/JSON, recarga, erro antes de iniciar e cancelamento está documentado em [RESTAURACAO_REFERENCIA_FLOAT64.md](RESTAURACAO_REFERENCIA_FLOAT64.md), com evidências em `reports/energy-reference-restoration/`. As medições e contagens citadas nas entregas anteriores acima continuam sendo registros dessas versões. Os ZIPs históricos não foram substituídos por esta restauração.

## Automação da referência direta — 18/10/2026

A referência Float64 agora começa automaticamente em t=0 e solicita novos estados a cada 200 Myr para N≈80.000. A coleta usa estados reais da CPU/GPU e o somatório roda em Workers independentes, com uma avaliação ativa e no máximo um snapshot pendente. A cadência se adapta à resolução e ao custo; limites de memória e tempo são explícitos. Apenas o estado inicial e os dois snapshots concluídos mais recentes retêm seus vetores completos, preservando os valores energéticos dos demais pontos. A leitura manual continua opcional no painel recolhível.

O ensaio final real WebGPU N=80.000 concluiu automaticamente seis pontos até 1000 Myr, com cadência de 200 Myr e custo médio direto de 3,57 s por estado; também foram testados CPU e reinício entre sementes. A suíte possui 135 testes aprovados. Consulte [ENERGIA_FLOAT64_AUTOMATICA.md](ENERGIA_FLOAT64_AUTOMATICA.md), os dados e os SVGs efetivamente baixados em `reports/automatic-energy/`. Esses ensaios verificam a automação do diagnóstico; não certificam estabilidade estrutural. As versões e os resultados históricos citados acima continuam preservados.
