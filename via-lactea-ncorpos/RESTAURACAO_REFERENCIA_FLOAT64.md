# Referência direta Float64 restaurada — 18/10/2026

Na aba Experimento N-corpos, abra **Dispositivo e validação → Validação de energia**. Use **Estimar custo da referência direta** para capturar o estado inicial preservado e o estado atual sincronizado. A integração retoma se estava em execução. O piloto de até 1.000 corpos estima o custo e não adiciona pontos ao gráfico. Em seguida use **Calcular referência direta Float64**. Para auditar outro instante, estime novamente e calcule a nova seleção. **Cancelar cálculo** interrompe os Workers e preserva apenas os pontos já concluídos.

O progresso, os instantes auditados, as energias iniciais independentes, os parâmetros dos snapshots e as exportações JSON/CSV ficam nesse painel recolhível. Abaixo de cada gráfico permanece somente **Salvar gráfico**. O SVG de energia exporta a linha Barnes–Hut, os pontos Float64 e metadados tabulares das duas séries.

## Integridade e normalização

A referência direta usa o somatório de pares Float64 compensado, paralelo em CPU, já existente. O integrador, as forças, massas e condições iniciais não foram modificados. Os snapshots possuem cópias próprias de posições, velocidades, massas, componentes, tempo físico, configuração e parâmetros efetivos. Os resultados são associados ao tempo do snapshot, mesmo que a integração tenha avançado.

Cada método usa sua própria energia inicial no estado físico de t=0. A série direta calcula `100 × (E_direta(t) − E_direta(0)) / |E_direta(0)|`, em porcentagem, com sinal. Não se usa E₀,BH como denominador direto. O tratamento preexistente de quase cancelamento de E₀ usa `K₀ + |U₀|` e é identificado. Sem snapshot inicial válido, a auditoria recusa a seleção, explica a limitação e oferece reiniciar uma realização. Nenhum ponto direto posterior é desenhado sem sua referência inicial.

Recarregar limpa os estados da sessão; os controles continuam disponíveis. Exporte o JSON se precisar preservar os snapshots antes de recarregar. Uma referência energética direta não certifica estabilidade estrutural; com forças Barnes–Hut, ela diagnostica a Hamiltoniana de pares na trajetória aproximada.

## Teste real no navegador

Foram usados os controles reais em uma aba separada, preservando a aba do usuário. Realização principal: 2.048 partículas, bojo + disco + halo legacy, semente 2026, CPU Worker, força direta Float64, dt=0,1 Myr e ε=0,1 kpc. A linha rápida continua sendo energia estimada Barnes–Hut, θ=0,5.

| Snapshot [Myr] | Energia direta | Desvio direto [%] | Custo da referência [ms] |
|---|---:|---:|---:|
| 0 | -1,9518018861826163 | 0 | 42,60 |
| 24,900000000000084 | -1,95183466010358 | -0,0016791622754239281 | 43,13 |
| 73,10000000000012 | -1,951809144137617 | -0,000371859206211687 | 46,30 |

Energia em 10¹⁰ M☉ kpc²/Myr². As pequenas diferenças decimais nos tempos decorrem da representação de passos em ponto flutuante; a interface mostra 24,9 e 73,1 Myr. Todos os pontos usam denominador direto 1,9518018861826163. E₀,BH é diferente: -1,9507972012110848. As avaliações utilizaram quatro Workers CPU; custos incluem preparação e comunicação, variando com a carga do dispositivo.

O SVG efetivamente baixado contém as duas legendas e três círculos diretos, sem segmentos ligando os pontos. O JSON baixado preserva os três snapshots. Uma recomputação direta independente a partir desses vetores diferiu no máximo em 4,44×10⁻¹⁶ unidades de energia por arredondamento e ordem do somatório.

O JSON bruto conserva o manifesto que estava sendo servido quando a aba de teste foi aberta, antes da reconstrução final da interface. Esse manifesto não foi reescrito como se identificasse a interface final. A verificação SHA-256 confirma que os oito módulos de energia, forças, integrador e condições iniciais usados na recomputação coincidem com os hashes desse manifesto. A identidade da interface final está em `reports/interface-106/code-identity.json`. Após o teste visual foram ajustados somente o texto singular/plural e a proteção contra atualizações de progresso de pilotos cancelados; nenhum cálculo físico foi alterado.

Teste de cancelamento: realização separada com 32.768 partículas, CPU Barnes–Hut, θ=0,5, dt=0,1 Myr, ε=0,1 kpc e semente 2026. Foram concluídas referências diretas em t=0 (E=-1,8407145568630665) e t=0,6 Myr (E=-1,8407158364279168; desvio=-0,00006951457223649975%). Custos: 663,245 e 645,515 ms. A tentativa inicial de cancelar terminou antes do clique; a tentativa seguinte em t=0,7 Myr foi cancelada imediatamente, preservando os dois pontos anteriores e não adicionando o ponto incompleto. Os controles voltaram a permitir uma nova estimativa.

Foi verificado o erro ao solicitar referência antes de iniciar, sem criação de pontos; a recarga da página; a acessibilidade dos controles; a mensagem de ausência de referências na nova sessão; e a permanência de apenas um botão abaixo de cada gráfico. Os testes automatizados também cobrem ausência de t=0, incompatibilidade de época, parâmetros ou massas, cópias independentes, denominadores distintos e ausência de interpolação. A suíte possui 128 testes aprovados.

Esses ensaios validam o fluxo de auditoria e exportação. Não são uma nova campanha de equilíbrio galáctico ou um certificado de precisão para qualquer N e trajetória.

## Evidências e reprodução

- [Registro do navegador](reports/energy-reference-restoration/browser-qa.json).
- [Snapshots exportados, N=2.048](reports/energy-reference-restoration/energia-2048-snapshots.json).
- [SVG efetivamente baixado](reports/energy-reference-restoration/energia-2048-baixada.svg).
- [Recomputação e verificações](reports/energy-reference-restoration/snapshot-verification.json).
- [Tabela das referências](reports/energy-reference-restoration/referencias-2048.csv).
- [Prévia do gráfico e painel](reports/energy-reference-restoration/referencias-diretas-no-grafico.png).
- [Teste de cancelamento](reports/energy-reference-restoration/cancelamento-validado.png).
- [Suíte automatizada](reports/energy-reference-restoration/node-tests.tap).

Execute `node scripts/verify-energy-restoration.mjs` para recalcular as energias a partir dos snapshots e conferir o SVG baixado; `node scripts/test.mjs` para a suíte; `node scripts/build.mjs` para o build estático. As cópias anteriores da interface estão em `reports/energy-reference-restoration/before/`. Os resultados e pacotes científicos históricos permanecem preservados.
