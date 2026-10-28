# Lentidão do refinamento ×32: backend automático e medições reais

## Execução inspecionada

A aba original do usuário estava em N₀=24648, fator ×32, dt=0,1 Myr e ε=0,1 kpc. Contagens efetivas: 3697 no bojo, 11092 no disco e 315488 no halo, totalizando 330277 partículas. O cálculo gravitacional efetivo era **CPU Worker Float64, Barnes–Hut θ=0,5**, apesar dos seletores de algoritmo/backend estarem em Automático e a visualização utilizar GPU. O painel registrava 11245,35 ms/passo, nove passos e 0,90 Myr. A execução original estava pausada e não foi reiniciada ou substituída durante a inspeção.

Dois passos correspondem a 0,2 Myr. Com esse tempo de CPU, somente a integração desses passos leva aproximadamente 22,49 s, consistente com o relato de cerca de 30 s incluindo os demais custos.

## Causa e correção

O seletor extrapolava tempos CPU de 512 partículas e comparava essa projeção com o custo da GPU. Essa comparação podia impedir o piloto GPU no N solicitado ou trocar uma GPU efetivamente medida por uma CPU sem medição nessa resolução. O primeiro teste da correção mostrou ainda um filtro anterior: GPU de 10000 corpos mediu 2,09 ms/passo, cuja extrapolação para 330277 ultrapassava o teto de 2 s e nem admitia o piloto no N completo. Essa medição pequena contém custo de despacho e sincronização.

Agora há uma calibração intermediária de 50000 partículas, somente quando necessária para uma resolução maior, após aprovação local da GPU e verificação dos recursos do teste. Uma projeção viável admite o piloto no N solicitado. Uma GPU medida e dentro do limite de 2 s/passo é mantida, a menos que exista uma medição CPU mais rápida **no mesmo N**. A projeção CPU pequena não é tratada como essa medição. O relatório de execução registra os dados da seleção. A caixa de estimativa informa o backend efetivo após a preparação.

O teste de calibração não muda N₀, massas ou parâmetros da realização solicitada. O piloto GPU no N completo continua sendo descartado e a integração começa novamente do estado inicial, conforme o procedimento já existente.

## Comparação observada

| Execução | N total | Método da força | Precisão da trajetória | Tempo médio por passo no painel |
|---|---:|---|---|---:|
| Original inspecionada | 330277 | CPU Barnes–Hut, θ=0,5 | Float64 | 11245,35 ms |
| Teste corrigido | 330277 | GPU direta Plummer | Float32 | 412,48 ms |

O teste corrigido usou N₀ manual=24648, fator ×32, algoritmo/backend automáticos, mesma semente 2026, dt e ε. O seletor manteve GPU WebGPU Float32. Foram concluídos 67 passos, até 6,70000009984 Myr, e a execução foi pausada. A janela automatizada entre iniciar e solicitar pausa foi de 27,735 s e observava 6,6 Myr; um passo pendente terminou depois da solicitação. Esse intervalo não inclui toda a preparação nem o diagnóstico final da pausa. A relação dos tempos médios por passo é aproximadamente 27,26. Não é um ensaio controlado de precisão entre algoritmos: CPU e GPU usam métodos e precisões diferentes, e as janelas de medição não são iguais.

O kernel GPU permanece uma soma direta O(N²). Para 330277 partículas, são 109082566452 contribuições ordenadas entre partículas distintas por cálculo de aceleração. Mantida a média observada, 50000 passos (5 Gyr) demandariam aproximadamente 5,73 horas só de integração. Diagnósticos, leitura de buffers, outras aplicações e condições térmicas podem elevar o custo. Não é uma promessa de duração nem uma medição de uma campanha de 5 Gyr.

Não foram alterados G, dt, ε, massas, posições/velocidades iniciais, kernels de força ou KDK. A mudança seleciona o backend adequado antes de preparar uma nova realização; ela não migra silenciosamente uma trajetória CPU em andamento para GPU. A realização original do usuário foi preservada. Nesta resolução a estimativa da referência energética direta ultrapassou o limite automático de 60 s; o painel informa a indisponibilidade, sem inventar pontos. Esse fato não torna a gravidade GPU uma estimativa Barnes–Hut: força e diagnóstico de energia são funções distintas.

Evidências: reports/halo-ui/performance-before-ui.txt, performance-after-ui.txt, performance-comparison.csv, performance-comparison.json, performance-after.png e performance-node-tests.tap. Os testes automatizados somam 192 casos aprovados. O teste desta página é funcional e de desempenho; não certifica equilíbrio dinâmico ou convergência estrutural.
