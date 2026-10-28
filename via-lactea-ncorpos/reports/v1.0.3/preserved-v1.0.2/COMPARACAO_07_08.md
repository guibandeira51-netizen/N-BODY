# Comparação 0.7.0 / 0.8.0 — resultados medidos

GUILHERME ALEIXO BANDEIRA · PROJETO DE TCC · UEMS

## Decisão desta entrega

Massas e forças foram verificadas, e a preparação iterativa foi implementada e submetida a evolução livre. A nova inicialização continua experimental; não há certificação de equilíbrio global. A aplicação mantém a inicialização histórica como padrão. Os números abaixo devem ser avaliados conjuntamente, sem escolher apenas a realização ou a métrica mais favorável.

O refinamento antipodal removeu o movimento coletivo inicial por componente, mas não produziu melhora estrutural robusta nas duas sementes e resoluções. Em N=10000, Δh50 aos 200 Myr ficou em 189,81% e 218,46%, contra 157,10% e 178,02% históricos. Em N=50000, ficou em 64,97% e 49,59%, contra 49,38% e 57,82%. A média das duas realizações também não melhorou. Isso rejeita a promoção desta realização preparada como solução de equilíbrio; não rejeita toda a família do método iterativo. O problema físico de construir uma nova condição inicial validada permanece pendente.

## Protocolo

16 evoluções livres GPU direto f32 de 200 Myr: quatro históricas, quatro candidatos sem pares, quatro refinamentos antipodais e quatro controles de discretização/suavização. As sementes são 2026 e 2027, N=10000/50000 na comparação principal. dt=0,1 Myr e ε=0,1 kpc. Controles: halo refinado N=26000 com 1500/4500/20000 partículas; suavização ε=0,3 kpc em N=10000. Cada estado salvo corresponde a 0,5,10,15,20,50,100,150 ou 200 Myr integrados.

A energia desses ensaios é recalculada em CPU por Barnes–Hut θ=0,5 sobre snapshots GPU, portanto **aproximada**. Não se interpretam seus desvios como erro exato exclusivo do integrador. W usa as acelerações GPU atuais. Os parâmetros físicos permanecem iguais; o candidato modifica as velocidades iniciais por preparação documentada. A etapa de preparo não conta como tempo livre e não continua durante os 200 Myr de validação.

Três reproduções CPU N=2000 recuperaram exatamente as mudanças estruturais históricas de 20 Myr nas sementes 2026/2027/2028. Quatro reproduções GPU N=10000/50000 registram diferenças numéricas em 'gpu-reproduction.json'; os estados de 20 Myr são comparados com a campanha anterior. A energia CPU dessas reproduções foi calculada por soma direta de pares.

## Inicialização histórica

| N | Semente | Δh50 em 20 Myr (%) | Δh50 em 200 Myr (%) | Δr50 bojo em 200 Myr (%) | Δσz em 200 Myr (%) |
|---:|---:|---:|---:|---:|---:|
| 10000 | 2026 | 18.6704 | 157.1050 | 25.2658 | 52.1108 |
| 10000 | 2027 | 24.0800 | 178.0239 | 18.8134 | 23.9056 |
| 50000 | 2026 | 9.9092 | 49.3842 | 4.1688 | 21.5562 |
| 50000 | 2027 | 10.2662 | 57.8155 | -8.8441 | 26.2523 |

## Candidato iterativo com pares antipodais

| N | Semente | Δh50 em 20 Myr (%) | Δh50 em 200 Myr (%) | Δr50 bojo em 200 Myr (%) | Δσz em 200 Myr (%) |
|---:|---:|---:|---:|---:|---:|
| 10000 | 2026 | 29.3439 | 189.8118 | 29.7791 | 32.8882 |
| 10000 | 2027 | 38.9670 | 218.4565 | 9.4208 | 44.1775 |
| 50000 | 2026 | 3.7166 | 64.9665 | 4.2147 | 12.7578 |
| 50000 | 2027 | 2.7314 | 49.5870 | 2.0546 | 10.4585 |

## Tentativa iterativa anterior sem pares — preservada

| N | Semente | Δh50 em 20 Myr (%) | Δh50 em 200 Myr (%) | Δr50 bojo em 200 Myr (%) | Δσz em 200 Myr (%) |
|---:|---:|---:|---:|---:|---:|
| 10000 | 2026 | 30.3522 | 450.9117 | 52.0039 | 40.6389 |
| 10000 | 2027 | 60.3667 | 1157.1170 | 70.4755 | 29.5613 |
| 50000 | 2026 | 6.3209 | 305.0931 | 19.6919 | 12.3453 |
| 50000 | 2027 | 17.4261 | 76.9708 | 1.3104 | 22.8881 |

Essa tentativa apresentou velocidade vertical média inicial do disco diferente de zero e deslocamento coletivo durante a evolução. Portanto h50 em z=0 mistura alteração da distribuição vertical e movimento de seu centro. O refinamento impõe pares somente na construção, com momento inicial por componente nulo. Essa simetria elimina o viés coletivo inicial da amostra, sem comprovar uma DF estacionária. A comparação do refinamento com o controle deve examinar também os perfis por anel, σz, centros e bojo.

## Controle: aumentar somente a resolução do halo

| N | Semente | Δh50 em 20 Myr (%) | Δh50 em 200 Myr (%) | Δr50 bojo em 200 Myr (%) | Δσz em 200 Myr (%) |
|---:|---:|---:|---:|---:|---:|
| 26000 | 2026 | 12.5271 | 64.0785 | 2.5339 | 25.1037 |
| 26000 | 2027 | 13.1103 | 108.5070 | 7.5055 | 23.0134 |

As posições, velocidades e massas das partículas bariônicas em t=0 são exatamente as do controle histórico N=10000. A massa por partícula do halo diminui cinco vezes, enquanto Mh é mantida. A melhora nas duas sementes sustenta investigar discretização do halo como contribuição; não mede isoladamente uma taxa de relaxação por encontros nem exclui respostas coletivas ao ruído. O centro do disco e a inclinação permanecem observáveis relevantes.

## Controle: suavização ε=0,3 kpc

| N | Semente | Δh50 em 20 Myr (%) | Δh50 em 200 Myr (%) | Δr50 bojo em 200 Myr (%) | Δσz em 200 Myr (%) |
|---:|---:|---:|---:|---:|---:|
| 10000 | 2026 | 22.8863 | 120.8583 | 16.7976 | 14.4126 |
| 10000 | 2027 | 24.6524 | 157.4887 | 16.5956 | 6.2338 |

Aumentar ε muda o campo resolvido, além de reduzir encontros próximos. Não eliminou a evolução em todos os casos. Não foi adotado ε=0,3 como correção automática do modelo.

## Interpretação e limites

h50 é medido em relação a z=0, com massa real das partículas. Não equivale sozinho a aquecimento. σz é central em velocidade, mas momentos globais podem ser sensíveis às caudas e à redistribuição radial. O raio de meia massa do bojo varia de maneira dependente da semente. A evolução do halo em 200 Myr não cobre múltiplos períodos em todas as suas regiões. Duas sementes não oferecem uma distribuição de incerteza bem estimada.

O candidato inicial e seu refinamento devem ser interpretados como testes do método implementado. Não houve prova de convergência com o número de iterações, duração do segmento, métrica de vizinhos ou quantidade de vizinhos. Positividade de massas e finitude de velocidades não asseguram estacionariedade. Resultados favoráveis em um intervalo curto ou em uma semente não são suficientes para promoção.

As comparações de precisão preservam os testes CPU/GPU da 0.7 e acrescentam a fixture de massas diferentes da 0.8. Não foi executada uma réplica CPU direta f64 de 50000 corpos por 200 Myr. Assim, não se atribui toda diferença entre campanhas a f32, e os testes pequenos não são extrapolados como limite universal.

## Arquivos e reprodução

- 'mass-audit.json', 'mass-gpu.json': massa, unidades e forças reais.
- 'cpu-reproduction.json', 'gpu-reproduction.json': comparação com 0.7.
- 'gpu-campaign-unpaired.json', 'gpu-campaign-antipodal.json': protocolos completos; datas, hardware, hashes e estados.
- 'gpu-campaign.json': conjunto combinado de 16 ensaios, sem substituir os protocolos originais.
- 'series-comparacao.csv', 'comparison-summary.json': medidas por componente e resumo.
- 'snapshots/': condições iniciais, hashes e índice por experimento.
- 'cpu-snapshot-validation.json': gerador offline CPU e 200 Myr livres, sem extrapolação ao GPU de alta resolução.
- 'executed-source-unpaired/': arquivos exatos da primeira campanha, identificados por hash.

Use 'scripts/prepare-equilibrium.mjs', 'scripts/validate-snapshot.mjs', 'tests/browser-mass.html' e 'tests/browser-equilibrium-refinement-08.html'. Consulte 'EQUILIBRIO_INICIAL.md' e 'AUDITORIA_MASSAS.md'. Nenhum resultado simulado é apresentado como detecção independente de matéria escura.
