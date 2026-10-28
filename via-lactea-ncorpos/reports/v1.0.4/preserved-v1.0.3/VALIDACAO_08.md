# Validação da versão 0.8.0

GUILHERME ALEIXO BANDEIRA · PROJETO DE TCC · UEMS · 14 de outubro de 2026

## Situação científica

A auditoria de massas e gravidade foi concluída com testes numéricos e resultados reais. O gerador iterativo foi implementado e testado, incluindo um refinamento de simetria justificado pelo movimento coletivo observado na primeira tentativa. **Nenhum candidato foi promovido a inicialização equilibrada.** Os resultados não mostraram melhora estrutural robusta sobre a inicialização histórica. O problema de construir uma nova DF estacionária ou uma realização com equilíbrio demonstrado permanece em aberto.

## Evidências executadas

| Verificação | Evidência | Limite da conclusão |
|---|---|---|
| Massas por componente, N=10000/50000 | `mass-audit.json`; testes A/B | Arredondamento f64; não prova limite não colisional |
| Massas desiguais na gravidade CPU | Referência analítica Plummer; testes C/D | Configurações testadas |
| Barnes–Hut, massa agregada e centro ponderado | Monopolo distante e θ=0 contra pares diretos | θ>0 introduz aproximação e não conserva pares simetricamente |
| WebGPU, massas desiguais | `mass-gpu.json`; RMS 4,16149e-8 no caso de três corpos | f32; tolerância dessa fixture |
| Grupos GPU parciais | Fixture N=1025, oito passos | Ensaio curto |
| Ausência de dupla contabilização | Teste de uma partícula isolada e referência de força completa | Campos analíticos usados somente no preparo/referências |
| Consistência dimensional | Equivalência com SI e conversões de velocidade, Gyr, aceleração e energia | kg herda incerteza de G CODATA |
| Histórico CPU 0.7 | Três sementes N=2000, 20 Myr | Mudanças estruturais exatamente reproduzidas |
| Histórico GPU 0.7 | N=10000/50000, duas sementes, 20 Myr | Raios e h50 exatamente reproduzidos nos casos pareados |
| Candidatos e controles | 16 ensaios GPU livres de 200 Myr | Energia medida por árvore, aproximada |
| Gerador offline CPU | N=1000, 20 iterações e 200 Myr livres | Controle de implementação; não extrapolado a N=50000 |
| Snapshots | 16 iniciais GPU, unidades/modelo e massa conferidos, SHA-256 | Não são declarações de equilíbrio |

Os 16 ensaios GPU incluem quatro históricos, quatro candidatos sem simetria, quatro refinamentos antipodais, dois controles de resolução do halo e dois controles de ε. Tempos de preparação e integração livre estão separados. A massa do halo nunca é substituída pela massa divergente de um NFW infinito.

## Decisões de código

- Padrão da aplicação: inicialização histórica. Sem alteração silenciosa de massas, escalas, G, suavização ou alocação.
- `initial-allocated.js`: experimento de resolução com o mesmo algoritmo histórico; o padrão produz arrays bit a bit iguais. É separado do gerador iterativo.
- `iterative-initial.js`: preparo por transferência cilíndrica de velocidades, com log e indicador `equilibriumValidated:false`.
- Entrada de snapshots: valida modelo, unidades, N, componentes, valores finitos e massas totais; compatível com CPU/GPU e com as mensagens existentes do Worker.
- Relatórios do laboratório: auditoria automática de massa em JSON/Markdown e arquivo `massas.md` no ZIP existente. Nenhuma seção gráfica foi acrescentada à interface.
- Fontes exatas das campanhas: arquivadas em `executed-source-unpaired/` e `executed-source-antipodal/`, com seus hashes nos resultados. Inicializador histórico preservado integralmente.

## Testes ainda necessários para demonstrar equilíbrio

Não foram executados refinamento do número de iterações e dos segmentos do preparo, avaliação de uma DF positiva em ações, ajuste orbital completo ou validação de longo prazo por múltiplos períodos de todo o halo. São necessários mais sementes, controle de ruído/encontros por região, espessura em plano principal e populações acompanhadas ao longo da migração. Não há erro de energia de árvore calibrado por estado em N=50000. Uma comparação CPU direta f64 de 50000 corpos por 200 Myr não foi realizada. Esses pontos impedem certificar estacionariedade ou atribuir toda evolução a uma única causa.

## Reprodução e entrega

```text
node --test
node scripts/audit-masses-08.mjs
node scripts/prepare-equilibrium.mjs --n 1000 --seed 2026 --iterations 20 --segment 10
node scripts/validate-snapshot.mjs
node scripts/serve.mjs
node scripts/build.mjs
```

No navegador, abra `tests/browser-mass.html` e `tests/browser-equilibrium-refinement-08.html`. Os resultados completos aparecem no elemento `output` e os snapshots iniciais no elemento `snapshots`. `pack-snapshots-08.mjs` organiza os JSON salvos das campanhas original/refinada, e `summarize-equilibrium-08.mjs` gera tabelas e comparação.

Os resultados da primeira campanha sem simetria correspondem ao arquivo de código arquivado. Reexecutar o protocolo amplo atual usa o refinamento antipodal; não se deve esperar que produza o candidato anterior sem restaurar sua fonte ou fornecer explicitamente `antipodal:false` ao preparo. A interface principal continua em `http://localhost:4180/`. Publicação na Vercel permanece manual, como solicitado anteriormente.
