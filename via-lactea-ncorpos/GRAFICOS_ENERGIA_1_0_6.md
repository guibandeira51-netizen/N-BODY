# Gráficos de energia — interface 1.0.6, revisão de 18/10/2026

Esta revisão altera a apresentação e a retenção de diagnósticos escalares. Não altera partículas, forças, Leapfrog KDK, G, suavização, massas, condições iniciais ou trajetórias. A conservação numérica da energia não certifica equilíbrio estrutural.

## Três painéis

1. **Energia estimada — Barnes–Hut**, verde: linha com os estados realmente medidos. Mostra `100 (E_BH(t) − E_BH(0)) / |E_BH(0)|`, com sinal, zero tracejado, máximo absoluto amostrado e último desvio. Sem suavização. Na nova execução, o histórico energético escalar preserva todas as épocas medidas; o limite de 512 registros continua aplicável ao histórico estrutural separado. Não se recuperam medições já descartadas em arquivos anteriores.
2. **Conservação energética — Referência direta Float64**, laranja: somente pontos nas épocas auditadas. Usa exclusivamente `100 (E_dir(t) − E_dir(0)) / |E_dir(0)|`. A escala vertical é independente e inclui zero. O seletor acima alterna para E(t) em unidades físicas. Quando o zoom é muito estreito, o eixo mostra explicitamente `E(t) − E₀`, fornece E₀ e informa que o zero absoluto está fora do zoom; os valores originais de E(t) permanecem nos tooltips e metadados.
3. **Erro de estimativa energética — Barnes–Hut versus Float64**, azul: somente pares avaliados no mesmo snapshot. Seletor para B, erro instantâneo, ΔB e η. Não representa sozinho energia física perdida ou adquirida.

Os dois primeiros painéis ficam lado a lado com o mesmo intervalo horizontal e escalas verticais independentes. O terceiro ocupa a largura inteira. A consulta CSS da largura disponível empilha os três abaixo de 681 px; o terceiro também recebe uma composição SVG compacta. Abaixo de cada gráfico há somente **Salvar gráfico**. Os seletores ficam acima dos gráficos. As explicações científicas essenciais fazem parte da figura exportada.

Os ticks usam notação científica para amplitudes pequenas. Os tooltips preservam os números medidos, com K, U, E, época, método e precisão. Mais casas decimais não significam maior precisão física. A escala mínima para séries constantes deriva da resolução de representação Float64 e está explicitamente marcada como escala de exibição, sem tratá-la como incerteza.

## Comparação e normalizações

Para cada registro emparelhado:

- `B(t) = E_BH(t) − E_dir(t)`;
- `ε_BH(t) = 100 B(t) / |E_dir(t)|`;
- `ΔB(t) = B(t) − B(0)`;
- `η(t) = 100 ΔB(t) / |E_dir(0)|`.

A identidade de comparação utiliza o mesmo denominador: `η = 100 ΔE_BH / |E_dir(0)| − 100 ΔE_dir / |E_dir(0)|`. Não se subtraem os percentuais nativos de denominadores diferentes. As duas variações com denominador comum estão disponíveis nos tooltips, JSON e CSV.

A comparação usa `reference.fast` e `reference.direct`, produzidos no mesmo trabalho sobre o snapshot imutável. Não procura valores próximos na linha temporal e não interpola BH. Antes de mostrar B, verifica época, N, massa total, K, G, ε² efetivo, termos externos, algoritmo da força, precisão da trajetória, sincronização das velocidades e dt efetivo. A integridade das massas individuais e dos vetores está preservada pelo pipeline existente de captura e validação; resumos escalares isolados não são uma prova independente de igualdade dos vetores. Registros inconsistentes são excluídos da comparação e registrados em `rejectedComparisonTimes`.

A aproximação monopolar e o critério de abertura da árvore podem produzir um viés variável quando a distribuição muda. A avaliação direta usa a Hamiltoniana de pares Plummer compatível com a força e os parâmetros efetivos, em CPU Float64 compensada. Isso não transforma uma trajetória GPU Float32 em uma trajetória Float64.

Se `|E₀| <= 64 ε_máquina (|K₀| + |U₀|)`, a nova apresentação não calcula percentuais e informa a limitação. O modo E(t) continua utilizável. A função energética histórica, com sua alternativa `K₀ + |U₀|`, foi preservada para compatibilidade; os novos painéis e o CSV novo usam a regra estrita de indisponibilidade. O JSON preserva tanto os registros históricos brutos quanto `panels`, que documenta a regra atual. Na ausência de E_dir(0), nenhum denominador BH é reutilizado.

## Automação e exportação

O agendamento Float64, os Workers paralelos, os snapshots imutáveis, a cadência física adaptada ao custo, o limite de um trabalho ativo mais um pendente e o cancelamento foram preservados. A apresentação não agenda avaliações adicionais. Os controles manuais continuam em **Dispositivo e validação → Validação de energia**.

Cada nova realização recebe um UUID de diagnóstico, sem interferir na semente física. Reiniciar limpa as referências e a série energética. SVG, JSON e CSV incluem identificação, unidades, valores reais e parâmetros. Os SVGs contêm os limites exatos dos eixos e o modo selecionado; os pontos diretos nunca são conectados. A exportação disponibilizada permanece SVG; PNG não era uma opção implementada neste fluxo.

## Dados reais reutilizados: N = 80.000

Fonte preservada: `reports/automatic-energy/gpu-80000-auditoria.json`.
SHA-256: `1c5b5d74a73546c67acded484cca6320245419b7fff2725bbcdedd9d1b50f2f5`.

Realização existente, semente 2026, GPU direta Float32, dt solicitado 0,1 Myr, suavização solicitada 0,1 kpc; G e ε² efetivos permanecem nos registros. Avaliações energéticas CPU Float64. Esta tarefa não repetiu uma campanha de 1 Gyr.

| Época registrada [Myr, abreviada] | Desvio direto [%] |
| --- | --- |
| 0 | 0 |
| 200,1 | −0,00004629494096678508 |
| 400 | −0,000023151100593442988 |
| 600 | −0,00007053557749265583 |
| 800 | −0,00008655754590667455 |
| 1000 | −0,00013374506901292645 |

Os arquivos mantêm os tempos binários exatos; a tabela abrevia apenas sua apresentação. Maior desvio direto absoluto amostrado: **0,00013374506901292645%**. Maior desvio BH absoluto amostrado: **0,015888729532916326%**. Em 1000 Myr, B = 0,000724434452532563 nas unidades internas, erro instantâneo do estimador = 0,03894512412811048%, ΔB = 0,00029797255638097653 e η = 0,016018831897088748%. Esses resultados pertencem a esta realização e aos seis estados auditados. Não são um limite universal do integrador nem um certificado de estabilidade.

O arquivo derivado reduzido contém os resumos energéticos originais; não afirma recuperar vetores de snapshots que já haviam sido liberados. A identificação `recorded:gpu-80000:<SHA-256>` vincula a visualização ao arquivo arquivado.

## Verificação no navegador e novo ensaio funcional

Um novo ensaio CPU direto Float64, N=512, semente 2026, dt=0,1 Myr e ε=0,1 kpc confirmou o aparecimento automático dos pontos:

| Tempo físico exato [Myr] | E direta [10¹⁰ M☉ kpc²/Myr²] | Desvio direto [%] |
| --- | --- | --- |
| 0 | −2,161912586311806 | 0 |
| 201,10000000000002 | −2,161864671407253 | +0,0022163201628173598 |
| 400,59999999999997 | −2,161565789001955 | +0,016041227200708406 |

A interface foi pausada em 566,6 Myr. Este é um ensaio funcional de baixa resolução, distinto do ensaio arquivado de 80.000 partículas. Seu erro real não foi ocultado. Reiniciar com a semente 2027 produziu somente t=0, E=−2,3686890626892727, com outro UUID e erro inicial zero. Nenhum ponto anterior foi reutilizado. As identidades exatas do código executado estão nas exportações, preservadas sem reetiquetar resultados antigos como execução de código posterior.

O navegador baixou quatro SVGs: BH relativo, Float64 relativo, viés η e Float64 E(t). O verificador compara os metadados e os marcadores com os dados reais, incluindo domínios x/y e deslocamento do eixo. A largura disponível de 390 px foi conferida em uma superfície estreita, com empilhamento e sem transbordamento dos painéis; não foi emulado um dispositivo físico.

Arquivos em `reports/energy-charts/`:

- `recorded-80000.json`, `recorded-80000-panels.json`, `recorded-80000.csv`, três `recorded-80000-*.svg`;
- quatro `browser-*.svg` realmente baixados, `browser-verification.json` e `source-verification.json`;
- `live-cpu-512.json`, `live-reset.json`, capturas desktop e móvel;
- `node-tests.tap` e `preservation-audit.json`, após os comandos abaixo.

Reprodução: `node scripts/energy-charts/prepare.mjs`. A página `tests/browser-energy-charts.html` é explicitamente uma consulta dos dados arquivados e usa o mesmo renderizador da interface. `node scripts/energy-charts/verify.mjs` valida as exportações já preservadas. Testes completos: `node scripts/test.mjs`. Build: `node scripts/build.mjs`. Auditoria de preservação: `node scripts/interface-106/audit.mjs --production`.

A revisão inclui testes de E₀ negativa, cancelamento numérico próximo de zero, referências ausentes, valores pequenos de ambos os sinais, rejeição de pares inconsistentes, identidade com denominador comum, domínios independentes, marcadores sem interpolação, modo E(t), UUID e retenção energética além de 512 estados. Os testes existentes da automação e da física continuam ativos. Nenhuma publicação remota foi realizada.

Na segunda conferência após recarga, o ensaio funcional CPU N=512 permaneceu ativo enquanto os demais artefatos eram verificados. Calculou 14 pontos automáticos até 2601,100000000015 Myr, com pico de um snapshot pendente e nenhuma falha. A maior variação direta amostrada foi 0,4013872890617531%, e o último desvio direto foi +0,22419962820746683%. Este teste demonstra o fluxo automático e a representação de desvios reais, sem certificar precisão de longo prazo deste modelo de baixa resolução. O registro completo está em `reports/energy-charts/live-cpu-512-reload.json` e os tempos exatos em `browser-verification.json`.
