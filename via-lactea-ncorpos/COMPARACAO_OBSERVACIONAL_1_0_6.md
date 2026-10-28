# Comparação observacional 1.0.6

## Dados e seleção

Foram extraídos os38 pontos de 5,27–24,82 kpc da Tabela 1 de Eilers2019, páginas 8–9 do PDF. Todos os152 valores de raio, velocidade e erros estatísticos coincidem exatamente, na precisão decimal publicada, com a TabelaA.1 de Jiao2021, página 10. A última acrescenta uma sistemática fracionária. Os dois artigos não constituem duas amostras independentes. Os dados numéricos, tabelas e hashes dos PDFs consultados estão em `observations/`; as fontes oficiais são citadas abaixo. Não se redistribuem artigos completos no pacote106: incluem-se os fatos numéricos e referências exatas aos documentos.

Não foram inventados pontos, suavizada a curva medida ou suposta rotação perfeitamente horizontal. Não se acrescentou um conjunto Gaia DR3 com metodologia diferente. As incertezas estatísticas assimétricas são mantidas nos dados e nas barras da figura1.

## Resíduos e escores

res_i=v_obs_i−v_model_i. RMS=sqrt(mean(res_i²)). Para o diagnóstico Q, sigma_stat_i=(sigma_minus_i+sigma_plus_i)/2. Q_stat=sum(res²/sigma_stat²). O cenário diagonal adicional usa D_ii=sigma_stat²+(frac_Jiao*vobs)², uma combinação em quadratura explicitamente adotada aqui. O cenário correlacionado usa C=D+u u^T, u_i=0,02vobs_i, motivado pela escala comum discutida por Jiao. Esta covariância é uma hipótese de sensibilidade; não uma matriz medida ou a única combinação correta das sistemáticas.

| Modelo | RMS [km/s] | Q estatístico diagonal | Q com sistemática diagonal | Q no cenário correlacionado |
|---|---:|---:|---:|---:|
| baryons | 71.58642548 | 263799.77630259 | 66738.91469886 | 1667.11238577 |
| halo | 8.77187911 | 822.59886624 | 145.13007515 | 54.48175229 |

## O que se pode inferir

Nenhum parâmetro foi ajustado aqui: massas, perfis e origem histórica são iguais para os dois casos, retirando somente o halo. Se todos os erros fossem Gaussianos independentes e as previsões fixas externas,38 seria o número nominal de graus de liberdade. A covariância não foi fornecida, as sistemáticas são modeladas e os parâmetros históricos já usaram restrições relacionadas à curva de Eilers. Por isso não reportamos chi-quadrado reduzido como probabilidade calibrada, p-valores ou significância definitiva.

O halo reduz fortemente os resíduos deste modelo reduzido. Isso não demonstra que o modelo com halo descreve todos os pontos dentro das incertezas, que um ajuste bariônico plausível foi excluído em todas as famílias ou que a natureza da matéria escura foi determinada. Gás e CGM estão ausentes. Um ajuste bariônico com restrições físicas, uma nova parametrização de densidade ou um ajuste de halo seriam experimentos separados, com parâmetros livres e calibração próprios. Não foi realizado um ajuste livre de halo para competir com bárions arbitrariamente fixos.

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
