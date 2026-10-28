# Comparação controlada de halos — 0.9.0

GUILHERME ALEIXO BANDEIRA · UEMS · Projeto de TCC

Versão 0.9.0 · 25 execuções A/B/C concluídas. Números abaixo vêm dos JSON e CSV medidos em reports/v0.9.0/.

## Protocolo e diferenças inevitáveis

A: todas as componentes massivas e autogravitantes. B: apenas a população do halo cresce; posições, velocidades e massas iniciais de cada partícula bariônica permanecem idênticas. Novas realizações usam o mesmo amostrador de densidade e velocidades aproximadas, sem copiar posições do halo. C: bojo e disco continuam autogravitantes; o halo é um campo esférico fixo da mesma densidade NFW finita. C não possui partículas massivas de halo. O teste C remove também a resposta dinâmica, as trocas de energia e o recuo do halo. Sua diferença em relação a A não mede isoladamente uma fração causal de relaxação.

O halo tem massa total 976315764173.288 M☉ e raio externo 247.95095842704154 kpc. Sua escala de massa NFW, 540000000000 M☉, não é a massa total após taper. Bojo: 5000000000 M☉. Disco: 68000000000 M☉. Escalas e constantes não foram ajustadas. A resolução bariônica baixa tem Nb=1.500 e Nd=4.500; a alta, Nb=7.500 e Nd=22.500. Nbase é um rótulo da resolução original; N total efetivo muda em B e C.

Todos os ensaios usam força direta GPU f32 e KDK. Padrões dt=0,1 Myr e ε=0,1 kpc. Cadência de diagnóstico 5 Myr. A energia de autogravitação é avaliada por árvore CPU f64 com θ=0,5, aproximada e sem erro calibrado por amostra. O halo externo adiciona ΣmΦ uma vez, sem fator 1/2; o momento linear das partículas não é invariante em C. O momento angular sobre o centro fixo deve ser controlado.

A tabela radial externa tem 4.096 pontos até 100.000 kpc e extrapolação kepleriana exterior; a densidade finita original é a referência. C usa campo médio não suavizado. C-soft controla a diferença de suavização por convolução esférica da mesma densidade com Plummer, ε=0,1, em 8.192 cascas normalizadas à mesma massa. A interpolação/quadratura introduz erro mensurável, testado separadamente.

## Resultados finais medidos

| ID | Modelo | N total / N halo | Semente bojo+disco / halo | T Myr | dt / ε | m halo / m disco | Δh50 instantâneo % | Δσ normal % | Δr50 bojo % | ΔE/|E0| |
|---|---|---|---|---|---|---|---|---|---|---|
| 0-0 | A | 10000 / 4000 | 2026 / 2026 | 1000 | 0.1 / 0.1 | 16.152 | 598.984 | 104.028 | 118.077 | 3.686e-4 |
| 0-1 | A | 10000 / 4000 | 2026 / 2027 | 1000 | 0.1 / 0.1 | 16.152 | 634.925 | 96.551 | 107.971 | 1.960e-5 |
| 0-2 | B | 14000 / 8000 | 2026 / 2026 | 1000 | 0.1 / 0.1 | 8.076 | 378.699 | 90.004 | 56.532 | -1.059e-4 |
| 0-3 | B | 14000 / 8000 | 2026 / 2027 | 1000 | 0.1 / 0.1 | 8.076 | 393.562 | 91.039 | 51.197 | 3.357e-5 |
| 0-4 | B | 26000 / 20000 | 2026 / 2026 | 1000 | 0.1 / 0.1 | 3.230 | 213.049 | 60.352 | 19.999 | 8.033e-5 |
| 0-5 | B | 26000 / 20000 | 2026 / 2027 | 1000 | 0.1 / 0.1 | 3.230 | 244.663 | 67.058 | 23.134 | -8.878e-5 |
| 0-6 | C | 6000 / 0 | 2026 / fixo | 1000 | 0.1 / 0.1 | — | 95.940 | 36.112 | 21.282 | -1.816e-4 |
| 0-7 | C-soft | 6000 / 0 | 2026 / fixo | 1000 | 0.1 / 0.1 | — | 99.646 | 31.237 | 25.947 | -1.702e-4 |
| 0-8 | A | 10000 / 4000 | 2027 / 2027 | 200 | 0.1 / 0.1 | 16.152 | 189.460 | 24.192 | 18.813 | 5.069e-4 |
| 0-9 | B | 26000 / 20000 | 2027 / 2027 | 200 | 0.1 / 0.1 | 3.230 | 89.522 | 21.768 | 7.505 | 1.031e-4 |
| 0-10 | C | 6000 / 0 | 2027 / fixo | 200 | 0.1 / 0.1 | — | 25.733 | 4.896 | -1.610 | -7.270e-5 |
| 0-11 | A | 50000 / 20000 | 2026 / 2026 | 200 | 0.1 / 0.1 | 16.152 | 61.273 | 21.500 | 4.169 | -6.665e-5 |
| 0-12 | A | 50000 / 20000 | 2026 / 2027 | 200 | 0.1 / 0.1 | 16.152 | 68.347 | 21.515 | -0.111 | -4.945e-5 |
| 0-13 | B | 70000 / 40000 | 2026 / 2026 | 200 | 0.1 / 0.1 | 8.076 | 46.740 | 7.919 | 5.155 | -8.438e-5 |
| 0-14 | B | 70000 / 40000 | 2026 / 2027 | 200 | 0.1 / 0.1 | 8.076 | 50.540 | 17.167 | -2.595 | 2.217e-5 |
| 0-15 | C | 30000 / 0 | 2026 / fixo | 200 | 0.1 / 0.1 | — | 19.975 | 1.184 | 3.003 | -3.656e-5 |
| 0-16 | C-soft | 30000 / 0 | 2026 / fixo | 200 | 0.1 / 0.1 | — | 19.845 | 1.783 | 3.445 | -4.083e-5 |
| 0-17 | A-dt | 10000 / 4000 | 2026 / 2026 | 200 | 0.05 / 0.1 | 16.152 | 166.753 | 49.481 | 27.244 | 2.172e-4 |
| 0-18 | B-dt | 26000 / 20000 | 2026 / 2026 | 200 | 0.05 / 0.1 | 3.230 | 65.764 | 29.484 | 1.744 | 1.419e-4 |
| 0-19 | C-dt | 6000 / 0 | 2026 / fixo | 200 | 0.05 / 0.1 | — | 32.156 | 9.248 | 6.808 | -9.187e-5 |
| 0-20 | A-epsilon | 10000 / 4000 | 2026 / 2026 | 200 | 0.1 / 0.3 | 16.152 | 138.584 | 13.556 | 16.798 | 1.327e-4 |
| 0-21 | B-epsilon | 26000 / 20000 | 2026 / 2026 | 200 | 0.1 / 0.3 | 3.230 | 52.432 | 6.704 | 1.743 | 8.985e-5 |
| 1-0 | A-high-dt | 50000 / 20000 | 2026 / 2026 | 200 | 0.05 / 0.1 | 16.152 | 61.312 | 21.787 | 4.419 | -6.481e-5 |
| 1-1 | B-high-dt | 70000 / 40000 | 2026 / 2026 | 200 | 0.05 / 0.1 | 8.076 | 46.707 | 7.836 | 5.426 | -7.392e-5 |
| 1-2 | C-high-dt | 30000 / 0 | 2026 / fixo | 200 | 0.05 / 0.1 | — | 19.763 | 1.197 | 2.908 | -3.523e-5 |

Os percentuais são relativos ao início de cada realização. Compare linhas com mesma resolução bariônica, semente bariônica e tempo final; não compare diretamente 200 com 1.000 Myr. As duas sementes de halo são realizações emparelhadas, insuficientes para um intervalo de confiança populacional.

## Campo inicial

A gravidade bariônica inicial é calculada separadamente e subtraída do campo total GPU; a contribuição restante é comparada ao campo esférico NFW finito. A razão abaixo usa **somente o campo do halo** no denominador; não é erro relativo da gravidade total. A subtração GPU também contém arredondamento.

| ID | N halo | Semente | RMS da diferença / RMS do campo do halo · 4–8 kpc | Viés projetado relativo |
|---|---|---|---|---|
| 0-0 | 4000 | 2026 | 0.970 | 0.070 |
| 0-1 | 4000 | 2027 | 0.854 | -0.167 |
| 0-2 | 8000 | 2026 | 0.552 | 0.088 |
| 0-3 | 8000 | 2027 | 0.514 | 0.057 |
| 0-4 | 20000 | 2026 | 0.327 | 0.060 |
| 0-5 | 20000 | 2027 | 0.322 | 0.003 |
| 0-6 | 0 | fixo | 0.000 | 0.000 |
| 0-7 | 0 | fixo | 0.002 | -0.002 |
| 0-8 | 4000 | 2027 | 1.031 | -0.133 |
| 0-9 | 20000 | 2027 | 0.284 | 0.007 |
| 0-10 | 0 | 2027 | 0.000 | 0.000 |
| 0-11 | 20000 | 2026 | 0.313 | -0.044 |
| 0-12 | 20000 | 2027 | 0.417 | 0.125 |
| 0-13 | 40000 | 2026 | 0.271 | -0.061 |
| 0-14 | 40000 | 2027 | 0.260 | 0.047 |
| 0-15 | 0 | fixo | 0.000 | 0.000 |
| 0-16 | 0 | fixo | 0.002 | -0.002 |
| 0-17 | 4000 | 2026 | 0.970 | 0.070 |
| 0-18 | 20000 | 2026 | 0.327 | 0.060 |
| 0-19 | 0 | 2026 | 0.000 | 0.000 |
| 0-20 | 4000 | 2026 | 0.445 | 0.061 |
| 0-21 | 20000 | 2026 | 0.182 | 0.049 |
| 1-0 | 20000 | 2026 | 0.313 | -0.044 |
| 1-1 | 40000 | 2026 | 0.271 | -0.061 |
| 1-2 | 0 | fixo | 0.000 | 0.000 |

## Sensibilidade ao passo em 200 Myr

| ID dt/2 | N | Modelo | h50 dt=0,1 | h50 dt=0,05 | Diferença h50 % | Diferença σ normal % |
|---|---|---|---|---|---|---|
| 0-17 | 10000 | A-dt | 0.452 | 0.459 | 1.441 | -1.782 |
| 0-18 | 26000 | B-dt | 0.280 | 0.285 | 1.832 | 3.958 |
| 0-19 | 6000 | C-dt | 0.237 | 0.227 | -4.305 | 0.906 |
| 1-0 | 50000 | A-high-dt | 0.263 | 0.263 | 0.024 | 0.237 |
| 1-1 | 70000 | B-high-dt | 0.239 | 0.239 | -0.023 | -0.077 |
| 1-2 | 30000 | C-high-dt | 0.195 | 0.195 | -0.177 | 0.013 |

Uma diferença pequena entre passos não certifica convergência em N ou equilíbrio. A divergência caótica de trajetórias individuais não equivale ao erro das estatísticas. ε=0,3 é um controle que também muda a força resolvida, não um ajuste aprovado para esconder aquecimento.

## Interpretação e uso

O refinamento do halo deve ser examinado junto das flutuações do campo, sementes e C/C-soft. A redução de aquecimento ao aumentar Nh sustenta uma contribuição da discretização, mas resposta coletiva e realização finita permanecem. B mantém as massas físicas e melhora a resolução do halo; não resolve automaticamente o equilíbrio bariônico nem estabelece o limite sem colisões. O modo padrão continua A, com o inicializador histórico preservado. C é diagnóstico.

Dados: [resumo](reports/v0.9.0/model-summary.csv), [séries](reports/v0.9.0/time-series.csv), [anéis](reports/v0.9.0/rings.csv), [proveniência](reports/v0.9.0/campaign-provenance.json), [análise](reports/v0.9.0/analysis.json). Figura: [baixa resolução](reports/v0.9.0/halo-comparison-10000.pdf), [alta resolução](reports/v0.9.0/halo-comparison-50000.pdf).

## Janela temporal e alteração de protocolo

Os primeiros oito ensaios de baixa resolução cobrem 1.000 Myr. As novas comparações de alta resolução, sementes e dt/2 cobrem 200 Myr comuns. A janela alta foi reduzida por custo computacional antes de inspecionar seus resultados; uma integração parcial foi descartada e não é tratada como resultado final. A reprodução histórica independente já cobre 2.540,4 Myr. Não há convergência A/B/C de alta resolução demonstrada por 1 Gyr. protocol-amendment.json e continuation-provenance.json registram a decisão e o código executado.

## Conclusões sustentadas pelos experimentos

Com as mesmas 6.000 partículas bariônicas, o crescimento h50 instantâneo em 1.000 Myr caiu de 598.984–634.925% com Nh=4.000 para 213.049–244.663% com Nh=20.000, nas duas sementes. O campo inicial e a redução da massa individual do halo são consistentes com contribuição importante da discretização. C apresentou Δh50=95.940% e C-soft=99.646%: retirar partículas do halo não elimina a evolução. C também remove a resposta dinâmica; essas diferenças não são percentuais causais de relaxação. O refinamento do halo melhora o comportamento medido, mas não produz um modelo globalmente equilibrado. O bojo e a evolução residual do disco exigem investigação de função de distribuição e resposta coletiva em resolução maior.

Com a mesma semente, refinamentos podem compartilhar as primeiras amostras aleatórias do halo. Isso é um controle por números aleatórios comuns entre modelos; não duplica partículas dentro de uma realização e não torna os modelos estatisticamente independentes. Sementes diferentes fornecem as realizações adicionais registradas.

## Referências

- [Sellwood (2014), Secular Evolution in Disk Galaxies](https://doi.org/10.1103/RevModPhys.86.1).
- [Sellwood (2011), The Lifetimes of Spiral Patterns in Disc Galaxies](https://doi.org/10.1111/j.1365-2966.2010.17545.x).
- [Sellwood (2013), relaxação em discos N-corpos](https://arxiv.org/abs/1303.4919).
- [Hunt & Vasiliev (2025), Milky Way Dynamics in Light of Gaia](https://doi.org/10.1016/j.newar.2024.101721). Ano do artigo 2025; o identificador DOI contém 2024. Nenhum dado Gaia foi integrado nesta versão.
- [Yurin & Springel (2014), GALIC](https://doi.org/10.1093/mnras/stu1421).
- [Vasiliev (2019), AGAMA](https://doi.org/10.1093/mnras/sty2672).
- [Hernquist (1990)](https://doi.org/10.1086/168845), [Miyamoto & Nagai (1975)](https://doi.org/10.1093/pasj/27.4.533), [Navarro, Frenk & White (1997)](https://doi.org/10.1086/304888).
