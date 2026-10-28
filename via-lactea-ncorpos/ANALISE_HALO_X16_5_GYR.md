# Halo ×16 — resultado efetivamente integrado até 5 Gyr

Atualização UTC: 2026-10-22T01:32:03.361Z. Fonte bruta preservada: reports/halo-5gyr/run-halo-x16-t50000-2026-10-22T01-30-29-445Z.json.

O ×16 não atingiu o critério solicitado h50(5 Gyr) ≤ 2 h50(0). h50 passou de 0.164872508 para 0.521887700 kpc, aumento de 216.540159%. O limite era 0.329745017 kpc. Foram executados 50000 passos, totalizando 5000.000074505806 Myr, com dt Float32 efetivo de 0.10000000149011612 Myr.

## Comparação a 5 Gyr

| Modelo | Partículas do halo | h50 final [kpc] | Aumento desde t=0 | Critério |
|---|---:|---:|---:|---|
| smooth-halo-control | 0 | 0.409747411 | 148.523795% | Controle estático |
| halo-x2 | 26518 | 1.11256026 | 574.800351% | Não atingido |
| halo-x4 | 53036 | 0.822945482 | 399.140512% | Não atingido |
| halo-x8 | 106072 | 0.629520903 | 281.822846% | Não atingido |
| halo-x16 | 212144 | 0.521887700 | 216.540159% | Não atingido |

O ×16 reduziu o h50 final em 17.0976376% em relação ao ×8. Essa comparação mantém as mesmas partículas bariônicas, massas físicas, passo, suavização e solver. A resolução é uma intervenção numérica; ela também modifica o ruído de amostragem e a resposta coletiva do halo. A redução do aquecimento não prova que o mecanismo seja exclusivamente relaxação de dois corpos. O controle estático não é o limite autogravitante N→∞.

O maior h50 entre os estados medidos foi 0.521887700 kpc, em 5000.00007 Myr. Primeiro estado amostrado acima do limite: 1200.00002 Myr. Há coletas a cada 100 Myr; não se afirma um limite entre elas.

## Estrutura e conservação

Dispersão normal: 0.0401880199 → 0.0661983154 kpc/Myr. Raio cilíndrico de meia massa do diagnóstico estrutural: 5.33990428 → 6.14338434 kpc. Massa total etiquetada como disco: 6.80000009 → 6.80000009 em 10¹⁰ M☉. Massa etiquetada constante não equivale a massa ligada constante. A espessura é calculada em relação ao plano robusto instantâneo; os valores por anel e plano local estão em analysis-x16.json e radial-diagnostics.csv.

Alteração relativa do vetor momento angular total: 0.0000496249750.

| Tempo físico [Myr] | Energia direta Float64 | ΔE / abs(E₀) [%] |
|---:|---:|---:|
| 0.00000000 | -1.84202859 | 0.00000000 |
| 1000.00001 | -1.84203190 | -0.000179665049 |
| 5000.00007 | -1.84203067 | -0.000113048948 |

Energia em 10¹⁰ M☉ kpc²/Myr², somatório direto CPU Float64 compensado, com G e ε² efetivos da força Plummer GPU. Maior erro absoluto entre essas referências: 0.000179665049%. Isso não é um limite ao longo da trajetória inteira. A integração permanece Float32; Float64 é a precisão do diagnóstico. Conservar energia total não impede redistribuição de energia entre componentes, aquecimento do disco ou evolução fora do equilíbrio.

## Integridade e página principal

Snapshot final: reports/halo-5gyr/state-halo-x16-s50000-2026-10-22T01-30-26-913Z.bin.gz; SHA256 descomprimido: 7f8addef20c4eb1d0632bb35d433d35a63089ff0b3c19f47663e0aaac498e027. A verificação separada confirmou contagens [4972, 14917, 212144], massas individuais, componentes, instante de passo completo e h50 inicial/final reproduzidos dos arquivos binários. Não houve amortecimento, redução de alturas, rescalonamento de velocidades ou correção artificial de energia.

A auditoria atual dos módulos de entrada da página, do worker e da criação inicial indica integração do refinamento de halo na página principal: **não**. O ×16 desta campanha é um experimento separado e não foi promovido automaticamente. Alterar apenas N total na interface não reproduz as contagens [4972,14917,212144].

Reprodução da retomada exclusiva: servidor local em localhost:4180; node scripts/halo-5gyr/collector-v3.mjs em 127.0.0.1:4193; abrir tests/browser-halo-x16.html. O executor restaura o último checkpoint íntegro e executa somente halo-x16, sem iniciar ×32 ou níveis superiores. Um ×16 já concluído é ignorado; uma repetição integral deve usar uma cópia isolada e um novo ponteiro de campanha, preservando todos os resultados originais. Os resultados históricos e checkpoints anteriores permanecem preservados. Para consolidar: node scripts/halo-5gyr/verify-final.mjs; node scripts/halo-5gyr/report.mjs; node scripts/halo-5gyr/analyze-x16.mjs.

Figuras e dados: reports/halo-5gyr/x16-versus-x8.svg, x16-series.csv, analysis-x16.json e independent-final-verification.json. Esta realização não substitui estudos com outras sementes, dt, ε e funções de distribuição em equilíbrio.


## Interpretação do crescimento residual

| Anel [kpc] | h50 local inicial [kpc] | h50 local final [kpc] | Inclinação local final [graus] |
|---|---:|---:|---:|
| 0–2 | 0.164619407 | 0.281180528 | 7.47051834 |
| 2–4 | 0.153097034 | 0.550461014 | 1.81223087 |
| 4–6 | 0.161292210 | 0.573200437 | 0.759881587 |
| 6–8 | 0.166445257 | 0.531311206 | 0.702697874 |
| 8–10 | 0.159353447 | 0.569173679 | 0.651585099 |
| 10–12 | 0.146448231 | 0.593112660 | 0.537672187 |
| 12–16 | 0.151386675 | 0.651735712 | 0.189831182 |
| 16–20 | 0.165906758 | 0.705411239 | 0.982297836 |
| 20–30 | 0.161769812 | 0.716321463 | 2.01677709 |

O crescimento persiste em relação aos planos locais: no anel 4–6 kpc, por exemplo, h50 local passou de 0.161292210 para 0.573200437 kpc. Portanto, uma inclinação global rígida não explica todo o aumento medido. Como os anéis são seleções instantâneas, essa comparação não é uma medição do aquecimento das mesmas partículas acompanhadas individualmente. A dispersão normal global aumentou 64.7215155%; o raio de meia massa aumentou 15.0467128%.

A tendência entre resoluções é consistente com uma contribuição da granularidade do halo, mas o experimento não isola relaxação de dois corpos, evolução coletiva e desequilíbrio das condições iniciais. O disco continua com 14917 partículas. O controle de halo estático também apresentou crescimento, sem constituir o limite de um halo vivo com N infinito. Assim, este resultado não justifica prometer que apenas continuar refinando o halo atingirá o limite solicitado, nem promover a realização como equilíbrio demonstrado.
