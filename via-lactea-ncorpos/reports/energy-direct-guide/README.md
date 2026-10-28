# Referência direta Float64 — guia visual e remoção do painel de diferença

Revisão de interface de 19/10/2026. Os dois painéis ativos de energia são Barnes–Hut e referência direta Float64. O painel B(t)/ε/ΔB/η e seu seletor foram removidos da aba atual. Os dados técnicos, CSVs, JSONs e figuras arquivadas permanecem preservados.

A referência direta mantém os mesmos marcadores e tooltips, com tempos físicos exatos. Segmentos retos, laranjas, de espessura 1,1, tracejado 4/4 e opacidade 0,7 conectam apenas os endpoints reais em ordem cronológica. Não existem novos pontos ou energias calculadas a partir dos segmentos. A linha não recebe eventos de mouse nem tooltip; os tooltips continuam nos círculos reais. A legenda é: “Marcadores: medições diretas Float64. Linha tracejada: guia visual entre snapshots.”

O guia não extrapola após o último ponto. O zoom e a referência horizontal em zero permanecem no modo relativo. O modo E(t) conserva o deslocamento de eixo explicitamente indicado na revisão anterior. A exportação usa o próprio SVG exibido, incluindo linha, marcadores, escalas, legenda e metadados.

## Lacunas

O guia interrompe o segmento quando há snapshot intermediário com valor indisponível, evento registrado de falha/cancelamento/omissão ou intervalo acima de 1,5 vez a cadência de referência. A região recebe o rótulo “Lacuna” e informa seus limites e motivo. Uma referência posteriormente concluída no mesmo instante resolve a falha daquele instante. Regiões sem avaliação após o último ponto são sinalizadas quando há falha registrada ou intervalo maior que a tolerância; nenhum trecho é extrapolado.

A cadência automática é registrada como metadado de apresentação em cada nova referência. Em dados antigos sem esse registro, usa-se a mediana inferior dos intervalos medidos; essa inferência está identificada em `plot.guide.cadenceSource`. O fator 1,5 é uma regra visual documentada, não um critério de estabilidade ou uma estimativa estatística de incerteza. Falhas não registradas e mudanças de cadência não documentadas podem não ser distinguíveis de coleta esparsa; o tracejado nunca certifica valores entre snapshots.

O controlador apenas transmite cadência e eventos ao renderizador e registra falhas manuais. Não altera o agendamento, a fila, o cálculo Float64, as partículas, a força ou o KDK.

## Verificação

- Reutilizados os seis registros reais da realização arquivada N=80.000, de 0 até 1000,0000000001588 Myr. O arquivo científico original não foi reescrito.
- SVG realmente baixado pela interface em `float64-exportado.svg`: seis círculos, cinco segmentos, tempos e K/U/E preservados, domínios x/y idênticos aos do SVG anterior, linha zero presente. O desvio direto final permanece −0,00013374506901292645%.
- Ensaio funcional CPU N=256: a interface atualizou 37 referências automáticas e 36 segmentos até 7200,0999999997275 Myr, enquanto os demais artefatos eram verificados. Isso testa o fluxo e a apresentação; não certifica equilíbrio ou precisão galáctica de longo prazo. `live-rendered.json` guarda exatamente os metadados lidos do SVG no navegador; nenhuma medição foi gerada pelos segmentos.
- Conferida a ausência do painel removido, com quatro botões de gráfico na aba: espessura, Barnes–Hut, Float64 e rotação.
- Conferida a composição móvel em largura disponível de 390 px, sem rótulos cortados; as capturas são superfícies estreitas do navegador, sem alegar teste em aparelho físico.
- Testes específicos de ordenação sem mutação, intervalos longos, valores inválidos, falhas, cancelamentos, resolução posterior de uma falha, cauda sem auditoria, cadência adaptativa e dados reais. A suíte completa tem 157 testes aprovados.
- A verificação por hash em `verification.json` confirma 44 arquivos de física, computação e referência energética sem alteração desde o início desta revisão. A auditoria de produção confere adicionalmente os 51 arquivos originais do motor e os 4677 arquivos históricos.

Reprodução da conferência dos arquivos já preservados: `node scripts/energy-direct-guide/verify.mjs`. Testes: `node scripts/test.mjs`. Build: `node scripts/build.mjs`. Preservação: `node scripts/interface-106/audit.mjs --production`.
