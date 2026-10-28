# Interface do TCC — simulador N-corpos escolhido pelo usuário

Atualização de 17 de outubro de 2026, posterior à reorganização inicial 1.0.6.

## Navegação atual

- `index.html`: apresentação institucional do TCC, preservada.
- `experimento-ncorpos.html`: o simulador completo mostrado na imagem enviada pelo usuário, substituindo a interface simplificada.
- `materia-escura.html`: cinco figuras astrofísicas, preservadas.
- `arquivo-cientifico.html`: área secundária com 83 gráficos históricos, relatórios, dados e downloads.

A aba N-corpos usa o HTML original de `simulador-tecnico.html`, incluindo seu painel à esquerda, visualização à direita, controles de resolução automática/manual, N, CPU/GPU, algoritmo, dt, suavização, iniciar, pausar, reiniciar, encerrar, filtros de componentes, câmera e diagnósticos originais. Foi acrescentada somente uma barra de navegação para as três áreas do site e o arquivo científico. O CSS original e o motor `src/main.js` são reutilizados sem alterações.

O número de partículas no modo automático depende da avaliação do dispositivo. O valor 29.244 mostrado na imagem não foi fixado artificialmente. A realização sintética original permanece identificada como tal. Os avisos científicos e a distinção entre conservação de energia e estabilidade estrutural continuam presentes.

## Substituição e preservação

A interface simplificada foi retirada da rota ativa. Seus arquivos `src/experiment106-page.js` e `src/compute/presentation-worker.js` foram removidos das fontes ativas. Uma cópia da entrega anterior, incluindo os testes específicos daquele controlador e seus registros, está em `reports/interface-106/previous-clean-interface/`. O ZIP anterior `downloads/apresentacao-tcc-1.0.6.zip` continua preservado. Os arquivos históricos científicos e os 51 arquivos antigos de código permanecem sem alterações.

A rota histórica `simulador-tecnico.html` continua disponível para reprodução. A aba principal usa exatamente o mesmo simulador, com a navegação do site acrescentada. Nenhum dado observacional, massa, trajetória, resultado de campanha ou figura científica foi recalculado.

## Verificação

Os 113 testes anteriores de código e ciência são mantidos. O teste atual da interface verifica que, retirando a nova barra de navegação e seu CSS, a aba N-corpos é idêntica ao HTML do simulador escolhido. Total atual: 114 testes. Os dois testes específicos do controlador simplificado retirado estão arquivados com aquela implementação.

No navegador, a aba substituída foi carregada e executada com 512 partículas, CPU Worker Float64 e força direta; iniciar e pausar produziram avanço real até 3,60 Myr. Esse é um teste funcional, sem conclusão de estabilidade ou nova campanha científica. O encerramento preserva o histórico da sessão conforme o comportamento original.

Use `node scripts/test.mjs` para testar e `node scripts/build.mjs` para gerar o site estático em `dist`. Execute `node scripts/interface-106/audit.mjs --production` após o build para conferir os recursos publicados e a preservação científica. Não houve publicação remota.

O pacote atualizado é `downloads/apresentacao-tcc-1.0.6-ncorpos.zip`, acompanhado de SHA-256 e manifesto interno. Os grandes ZIPs de campanhas continuam separados; mantenha-os no diretório `downloads` para disponibilizar todos os downloads históricos. Os relatórios científicos 1.0.6 permanecem com seus conteúdos originais; este guia documenta a navegação posterior.
