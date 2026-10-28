# Estrutura azimutal, braços e aquecimento — 0.9.0

GUILHERME ALEIXO BANDEIRA · UEMS · Projeto de TCC

Versão 0.9.0 · 25 execuções A/B/C concluídas. Números abaixo vêm dos JSON e CSV medidos em reports/v0.9.0/.

## Origem da aparência inicial

A auditoria de sampleDisk em initial-legacy.js encontra φ=2πU, sem modelo de braço, pitch ou velocidade de padrão. A densidade Miyamoto–Nagai é axisimétrica. Pares antipodais são usados para reduzir movimentos globais, não para desenhar braços. A auditoria de particle-style.js e dos renderizadores encontra pesos por componente, profundidade e exposição por contagem; não há template espiral dependente de φ ou tempo nem estrelas fictícias. Cada ponto é uma partícula massiva.

Logo não há braços materiais intencionalmente impostos em t=0. Uma realização discreta pode ter alinhamentos visuais e flutuações, realçados pela projeção e brilho. Não foi demonstrado defeito do renderizador que elimine uma estrutura presente na massa. A redução quantitativa de um modo nos dados não se corrige ajustando o brilho.

## Amplitudes e ruído

A_m=|Σm_j exp(i m φ_j)|/Σm_j, m=1..4, em anéis instantâneos no plano robusto. São exportados re, im, amplitude e fase. Para partículas independentes RMS=√Σm_j²/Σm_j. Para o início antipodal, modos ímpares cancelam e o RMS dos pares nos modos pares é aproximadamente √(2/Nanel). Ignorar esse fator daria significâncias exageradas.

Um conjunto de 32 sementes para cada Nbase=10.000/50.000 está em initial-modes.json. A referência de inferência usa o maior RMS entre grupos de pares por rótulo e partículas independentes. P≈exp[−(A/RMS)²] é condicional e assintótico, disponível com pelo menos 30 grupos; não é probabilidade de existência de braços. O arquivo bruto da primeira campanha conserva P anterior baseado apenas em pares; a análise recomputa a referência conservadora a partir das contagens, sem mudar amplitudes, fases ou dinâmica. A anulação inicial dos ímpares não pode transformar qualquer arredondamento em evidência de modo.

## Evolução histórica medida

| Época Myr | R=2–4 A2 | R=4–6 A2 | R=6–8 A2 | Ajustes de espiral aceitos m |
|---|---|---|---|---|
| 0 | 0.035 | 0.035 | 0.034 | nenhum |
| 20 | 0.093 | 0.071 | 0.042 | nenhum |
| 200 | 0.401 | 0.295 | 0.177 | nenhum |
| 1000 | 0.151 | 0.022 | 0.011 | nenhum |
| 2540.4 | 0.037 | 0.023 | 0.012 | nenhum |

A2 cresce fortemente no interior em 200 Myr e diminui em vários anéis em épocas posteriores. O mapa de densidade mostra estrutura central alongada; A2 inclui barra/oval, portanto não certifica dois braços espirais. A distribuição inicial não satisfaz o critério de três anéis adjacentes com sinal para uma espiral coerente. A comparação em [historical-modes.pdf](reports/v0.9.0/historical-modes.pdf) e [historical-density.pdf](reports/v0.9.0/historical-density.pdf) usa massas reais. O mapa usa a mesma projeção, bins e escala de cor em todos os instantes.

## Fase, abertura e velocidade de padrão

A abertura só é estimada quando três anéis adjacentes entre 2 e 20 kpc excedem α/36 com α=0,01. Ajusta-se a fase a ln R com pesos da variância aproximada de fase; o χ² deve aceitar um único modelo log espiral a 95%, e a inclinação deve diferir de zero pela referência 1,96σ. Fase aproximadamente constante identifica barra/oval e não recebe pitch de 90°. Nos estados históricos usa-se ainda correção multiplicativa pelo número de épocas. São critérios condicionais, não uma classificação morfológica definitiva: covariância, sobreposição de padrões e aliasing radial podem invalidá-los.

Velocidade aparente de padrão vem de Δarg(C_m)/(mΔt) no mesmo anel, apenas com sinal nas duas épocas e mΩreferênciaΔt<π. A frequência orbital inicial de referência não é limite rigoroso para todos os padrões; o teste apenas recusa cadências obviamente insuficientes. A base do plano muda se o disco inclina, acrescentando fase geométrica. Saídas recusadas ficam indisponíveis, não zero. [phase-fits.json](reports/v0.9.0/phase-fits.json) contém ajustes, recusas e qualificações. Não se encontrou evidência suficiente para anunciar uma velocidade única e persistente da espiral da Via Láctea.

## Aquecimento e modos: comparação controlada

As séries por anel incluem σR, σφ, σ normal, Σ, κ inicial e Q=σRκ/(3,36GΣ). Q é condicional à aproximação de disco estelar fino, axisimetria e órbitas quase circulares; o disco espesso e barrado viola parte dessas hipóteses. Não se chama Q de potencial instantâneo inferido nem de certificação global.

A figura [heating-and-modes.pdf](reports/v0.9.0/heating-and-modes.pdf) compara A/B/C no anel 4–6 kpc. Correlações de Pearson brutas abaixo descrevem trajetórias temporais autocorrelacionadas, sem p inferencial ou causalidade. A2 pode crescer durante a formação de uma barra antes de cair; uma relação monotônica universal com aquecimento não é presumida.

| ID | R kpc | r(A2,σR) | r(A2,Q) | r(A2,h50) |
|---|---|---|---|---|
| 0-0 | 4–6 | -0.351 | -0.231 | -0.566 |
| 0-1 | 4–6 | -0.152 | -0.077 | -0.290 |
| 0-2 | 4–6 | -0.302 | -0.321 | -0.554 |
| 0-3 | 4–6 | -0.232 | -0.155 | -0.391 |
| 0-4 | 4–6 | -0.324 | -0.385 | -0.539 |
| 0-5 | 4–6 | -0.007 | -0.200 | -0.451 |
| 0-6 | 4–6 | 0.144 | -0.154 | -0.420 |
| 0-7 | 4–6 | -0.031 | -0.144 | -0.298 |
| 0-8 | 4–6 | 0.606 | 0.366 | 0.406 |
| 0-9 | 4–6 | 0.881 | 0.904 | 0.893 |
| 0-10 | 4–6 | 0.337 | 0.331 | 0.375 |
| 0-11 | 4–6 | 0.748 | 0.346 | 0.288 |
| 0-12 | 4–6 | 0.827 | 0.700 | -0.097 |
| 0-13 | 4–6 | 0.890 | 0.843 | 0.805 |
| 0-14 | 4–6 | 0.949 | 0.854 | 0.599 |
| 0-15 | 4–6 | 0.854 | 0.862 | 0.177 |
| 0-16 | 4–6 | 0.866 | 0.860 | 0.186 |
| 0-17 | 4–6 | 0.887 | 0.832 | 0.620 |
| 0-18 | 4–6 | 0.648 | 0.395 | 0.214 |
| 0-19 | 4–6 | 0.468 | -0.024 | 0.065 |
| 0-20 | 4–6 | 0.802 | 0.848 | 0.512 |
| 0-21 | 4–6 | 0.789 | 0.763 | 0.609 |
| 1-0 | 4–6 | 0.750 | 0.346 | 0.287 |
| 1-1 | 4–6 | 0.889 | 0.843 | 0.799 |
| 1-2 | 4–6 | 0.853 | 0.861 | 0.168 |

O aumento de dispersões, a mudança de Σ e o espessamento podem alterar a resposta coletiva e o contraste; a granulação também semeia perturbações. Rotação diferencial existe no modelo (frequências e períodos em analysis.json), mas não foi demonstrado que desapareçam braços materiais originalmente impostos, pois eles não são impostos. As fases, amplitudes e A/B/C sustentam evolução real de assimetrias e estruturas transitórias; não isolam um mecanismo único nem uma fração causal de aquecimento. Não se preservou artificialmente a aparência.

## Controle inicial entre sementes e evolução no mesmo anel

| Nbase | m | N médio no anel 4–6 | RMS A entre sementes | RMS por pares esperado |
|---|---|---|---|---|
| 10000 | 2 | 691.063 | 0.054 | 0.054 |
| 10000 | 4 | 691.063 | 0.042 | 0.054 |
| 50000 | 2 | 3478.938 | 0.026 | 0.024 |
| 50000 | 4 | 3478.938 | 0.024 | 0.024 |

O RMS empírico dos modos pares tem a escala prevista pelo ruído de pares, com dispersão de apenas 32 realizações. Os ímpares iniciais são aproximadamente nulos por construção.

| ID | Modelo / Nh | A2 inicial | Pico A2 | Tempo pico Myr | A2 final | σR inicial → final kpc/Myr | Q inicial → final |
|---|---|---|---|---|---|---|---|
| 0-0 | A / 4000 | 0.065 | 0.589 | 155 | 0.071 | 0.034 → 0.103 | 0.849 → 3.678 |
| 0-2 | B / 8000 | 0.065 | 0.520 | 145 | 0.080 | 0.034 → 0.087 | 0.849 → 2.897 |
| 0-4 | B / 20000 | 0.065 | 0.339 | 135 | 0.045 | 0.034 → 0.073 | 0.849 → 2.533 |
| 0-6 | C / 0 | 0.065 | 0.373 | 260 | 0.064 | 0.034 → 0.064 | 0.849 → 2.448 |
| 0-7 | C-soft / 0 | 0.065 | 0.319 | 240 | 0.070 | 0.034 → 0.066 | 0.849 → 2.289 |

No anel 4–6 kpc, os modos crescem e depois enfraquecem tanto em A como em C. Mesmo C tem aumento de σR e Q; portanto a granulação do halo não é condição necessária para toda a evolução azimutal observada. Q inicial abaixo de 1 é um alerta dentro da aproximação de disco fino, não um diagnóstico exato de um disco espesso em equilíbrio. O sinal pode conter barra, espiral transitória e resposta coletiva.

A campanha usa limites radiais 0/2/4/6/8/10/12/16/20/30 kpc. O painel mantém os limites legados 0/1/2/4/8/12/20/30/60/120/240/480 kpc para corresponder ao seletor existente. Compare limites e população, não índices de linhas. Os diagnósticos globais do plano usam o disco completo em ambos; o ajuste da orientação usa o núcleo esférico de 20 kpc.

## Referências

- [Sellwood (2014), Secular Evolution in Disk Galaxies](https://doi.org/10.1103/RevModPhys.86.1).
- [Sellwood (2011), The Lifetimes of Spiral Patterns in Disc Galaxies](https://doi.org/10.1111/j.1365-2966.2010.17545.x).
- [Sellwood (2013), relaxação em discos N-corpos](https://arxiv.org/abs/1303.4919).
- [Hunt & Vasiliev (2025), Milky Way Dynamics in Light of Gaia](https://doi.org/10.1016/j.newar.2024.101721). Ano do artigo 2025; o identificador DOI contém 2024. Nenhum dado Gaia foi integrado nesta versão.
- [Yurin & Springel (2014), GALIC](https://doi.org/10.1093/mnras/stu1421).
- [Vasiliev (2019), AGAMA](https://doi.org/10.1093/mnras/sty2672).
- [Hernquist (1990)](https://doi.org/10.1086/168845), [Miyamoto & Nagai (1975)](https://doi.org/10.1093/pasj/27.4.533), [Navarro, Frenk & White (1997)](https://doi.org/10.1086/304888).
