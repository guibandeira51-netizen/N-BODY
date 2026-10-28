# Curvas de rotação 1.0.6

## Equação e decomposição

vc²(R)=R dPhi(R,0)/dR=−R aR(R,0). Para a mesma decomposição axisimétrica, vc_total²=vc_bojo²+vc_fino²+vc_espesso²+vc_halo². Os discos são calculados por expansões cilíndricas de sua densidade achatada, sem substituir sua força por GM_esférica(<R)/R. A velocidade azimutal média de um disco quente pode diferir de vc.

O modelo106 é uma representação newtoniana suave nova das grades físicas preservadas em `reports/v1.0.2/corrected/density-*-final.ini`, com as mesmas massas de ação atribuídas às partículas. Seus campos, curvas e órbitas são novos; as campanhas Plummer históricas não foram reclassificadas.

| Componente | Massa adotada [M☉] | Normalização da grade |
|---|---:|---:|
| Bojo | 9.20001547e+09 | 0.995034879592 |
| Disco fino | 3.98e+10 | 0.999954279285 |
| Disco espesso | 1.07e+10 | 0.999920230073 |
| Halo | 1.04912921e+12 | 0.999483052943 |

## Reconstrução numérica da densidade

O teste de monotonicidade encontrou pequenas massas negativas na interpolação angular das grades históricas, além do ruído da rotina genérica de massa encerrada. A definição106 é explícita: rho106_i = M_i max(rho_grid_i,0) / integral max(rho_grid_i,0)dV. As massas físicas M_i permanecem fixas. Não há ajuste à curva observada, amortecimento de órbitas ou correção de partículas vivas. A tentativa com a grade assinada e seus resultados foi preservada em `attempts/signed-density/`.

Maior fração de massa negativa interpolada antes da reconstrução: 1.48200595e-05. A normalização usa integral esférica até 10000 kpc, com quadraturas24×96 e32×160; maior diferença relativa=1.81242623e-07. `mass-quadrature.json` registra todos os números. Isso corrige uma representação numérica de densidade, sem alterar resultados históricos ou produzir estabilidade artificial.

## Massa em esfera e verificações

M_i(<r)=4pi integral_0^r s²ds integral_0^1 rho_i(s sqrt(1−mu²),0,s mu)dmu, usando simetria por reflexão. Essa mesma esfera define bojo, discos, halo e f_DM=M_halo/M_total. Cascas de densidade não negativa dão uma massa acumulada monótona sem filtro cumulativo. A massa em esfera não é a massa em cilindro e não é usada para substituir a força dos discos.

Máxima diferença entre força e derivada numérica do potencial nos probes: 6.79917524e-11. Máxima mudança de força radial com expansão mais fina em 5–25 kpc: 0.000187393822. Malhas, potenciais INI e hashes estão em `model.json`. Comparações com os campos Newtoniano e Plummer preservados também estão registradas. Esses são testes de representação do campo, não certificados de equilíbrio dinâmico.

`rotation.csv` contém todas as contribuições, delta_v, diferença percentual relativa ao caso bariônico e acelerações. `enclosed-mass.csv` contém massas esféricas e fração do halo. Não foi calculada faixa de confiança dos modelos: as marginais publicadas não fornecem sozinhas uma distribuição conjunta legítima.

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
