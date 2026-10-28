# Matéria escura na Via Láctea — versão 1.0.6

## Pergunta e desenho experimental

Como adicionar um halo ao mesmo bojo e discos altera força, velocidade circular, massa encerrada e órbitas? A página principal apresenta cinco figuras astrofísicas; a página de validação, duas. O arquivo científico reúne83 gráficos históricos sob consulta, com classificação por tema e finalidade. Nenhuma campanha N-corpos anterior foi repetida.

ExperimentoA: retirada controlada da contribuição gravitacional do halo, sem reajuste das massas bariônicas. ExperimentoB: cinco vetores iniciais idênticos nos dois campos, dez trajetórias reais. ExperimentoC:38 pontos observacionais publicados confrontados com dois modelos fixos. ExperimentoD: reanálise da auditoria inicial E104, força direta Plummer versus campo contínuo Plummer correspondente; nenhuma nova evolução viva.

## Resultado quantitativo

Resíduo RMS nos mesmos38 pontos: 71.586425 km/s para bárions e 8.771879 km/s com halo. A inclusão do halo reduz os resíduos neste modelo, sem provar ajuste estatístico completo ou inferência independente da calibração histórica. Em R=8,122 kpc, vc bariônica=179.068181 km/s, vc total=232.720057 km/s e diferença=53.651876 km/s.

| Componente | Massa adotada [M☉] | Normalização da grade |
|---|---:|---:|
| Bojo | 9.20001547e+09 | 0.995034879592 |
| Disco fino | 3.98e+10 | 0.999954279285 |
| Disco espesso | 1.07e+10 | 0.999920230073 |
| Halo | 1.04912921e+12 | 0.999483052943 |

## Sete figuras da exposição

1. Curva de rotação: observações e modelos.
2. Contribuições gravitacionais do mesmo modelo.
3. Resíduos: onde cada modelo se afasta dos dados.
4. Massa acumulada e fração de matéria escura.
5. Mesma partícula-teste em dois campos gravitacionais.
6. Estabilidade estrutural: avanço e limite medido.
7. Conservação de energia nos ensaios F105.

`reports/v1.0.6/figures/manifest.json` liga cada figura a CSV, SVG, PNG, entradas e hashes. O relatório de inventário justifica a retirada dos demais gráficos da exposição, sem removê-los do projeto. As diferenças entre os campos são consequências da hipótese gravitacional adotada, não observações independentes.

## Hipóteses comuns e limites

O campo 106 é newtoniano, estacionário, axisimétrico e simétrico por reflexão; o sistema é isolado. Gás frio e meio circumgaláctico (CGM) não estão implementados nesta representação. Suas massas não foram somadas às estrelas. O bojo é uma aproximação esférica, os discos são achatados e o halo tem massa finita. Não é uma reprodução completa do ajuste publicado de Cautun nem um novo ajuste da Via Láctea.

Comprimento: kpc; velocidades: km/s; massas: massas solares; potencial e energia específica: (km/s)²; aceleração: (km/s)²/kpc; momento angular específico: kpc km/s. O conversor temporal registrado é 1 km/s = 0,0010227121650537077 kpc/Myr. A biblioteca AGAMA usa tempo em kpc/(km/s). Phi(infinito)=0 para cada potencial; as energias iniciais são diferentes ao retirar o halo, mesmo mantendo posição e velocidade idênticas.

As partículas-teste de 106 não interagem entre si. Sua evolução por 1200 Myr não é um teste de estabilidade autogravitante por 1,2 Gyr. As campanhas históricas mantêm suas massas, sementes, força Plummer e estados científicos originais. A família F105 tem 169546 partículas totais, das quais 160000 no halo. O legacy de 80000 partículas totais/Jeans+Satoh e 1,51 Gyr é outro experimento.

Os dados observacionais são velocidades circulares inferidas por modelagem de Jeans de uma população, e não velocidades azimutais individuais. A assimetria dos erros estatísticos é preservada. Eilers e a tabela de Jiao são o mesmo conjunto, nunca somados como duas amostras independentes. Os parâmetros históricos baseados em Cautun já utilizaram restrições relacionadas à curva de Eilers: esta comparação é de consistência, sem interpretação como teste inteiramente independente ou descoberta da matéria escura.

Não foram calculados p-valores, significâncias em sigma, evidências Bayesianas ou uma medida universal de necessidade do halo. As conclusões são condicionais aos perfis, massas, simetrias, omissões bariônicas e erros adotados. Também não determinam a natureza microscópica da matéria escura.

## Fontes primárias

- Eilers et al. (2019), DOI 10.3847/1538-4357/aaf648: https://arxiv.org/abs/1810.09466 — Tabela 1, páginas 8–9 do PDF. Curva inferida com APOGEE, WISE, 2MASS e Gaia DR2, não Gaia DR3.
- Jiao et al. (2021), DOI 10.1051/0004-6361/202141058: https://arxiv.org/abs/2107.00014 — TabelaA.1, página 10; sistemáticas e escala comum discutidas na seção 2.1. DOI editorial: https://doi.org/10.1051/0004-6361/202141058 .
- Cautun et al. (2020), DOI 10.1093/mnras/staa1017: https://arxiv.org/abs/1911.04557 — origem dos parâmetros históricos reduzidos, coluna NFW sem contração; não um ajuste novo desta entrega.
- Vasiliev (2019), AGAMA: https://arxiv.org/abs/1802.08239 — expansão de potenciais e integração orbital; o uso da biblioteca não certifica o equilíbrio das realizações.
