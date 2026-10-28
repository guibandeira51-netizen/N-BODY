# Órbitas com e sem halo 1.0.6

## Protocolo

Equações: dx/dt=v e dv/dt=−gradPhi. Cinco vetores iniciais: órbitas no plano em 5,8,122,15 e22 kpc e uma órbita inclinada iniciada em 8,122 kpc. No plano, v_phi inicial=0,9vc_total(R); a velocidade NÃO é recalculada para o campo sem halo. A órbita inclinada acrescenta z=0,3 kpc, v_R=12 km/s e v_z=18 km/s. Os vetores completos e hashes dos quatro potenciais estão em `orbit-protocol.json`.

São dez trajetórias DOP853 Float64 até 1200 Myr, amostradas a cada1 Myr, com accuracy1e-10. Todas foram repetidas em accuracy1e-12 e confrontadas com KDK independente dt0,05 e0,025 Myr. Não é um experimento N-corpos nem uma continuação viva de F105. A versão 106 não realizou nova campanha autogravitante.

| Caso | Campo | r mínimo/máximo registrado [kpc] | Período azimutal [Myr] | Erro E amostrado |
|---|---|---:|---:|---:|
| R5 | baryons | 5.0000 / 6.0049 | 186.31074830441256 | 2.608e-09 |
| R8.122 | baryons | 8.1220 / 13.6768 | 404.64665526242663 | 1.724e-08 |
| R15 | baryons | 15.0000 / 121.7948 | não medido | 8.715e-08 |
| R22 | baryons | 22.0000 / 159.4542 | não medido | 8.252e-09 |
| solar-inclined | baryons | 8.0759 / 14.3638 | 426.66725638589503 | 5.302e-09 |
| R5 | halo | 4.1969 / 5.0000 | 129.43894849206566 | 8.935e-10 |
| R8.122 | halo | 6.6653 / 8.1220 | 195.609804445891 | 1.229e-09 |
| R15 | halo | 11.8672 / 15.0000 | 370.7980795590138 | 1.34e-09 |
| R22 | halo | 17.4515 / 22.0000 | 569.7805061596633 | 1.364e-09 |
| solar-inclined | halo | 6.6792 / 8.1917 | 197.9386190456169 | 1.096e-09 |

## Precisão e observáveis

Maior erro relativo de energia amostrado DOP853=8.71545427e-08; maior erro relativo de Lz=2.80825434e-09; maior diferença de posição para a tolerância mais estrita=5.88047635e-07 kpc. As discrepâncias KDK por órbita e sua redução ao dividir dt estão no JSON; não se extrapola uma ordem universal para outros sistemas. Essas tolerâncias foram conferidas automaticamente.

Distância e pericentros/apocentros usam r=sqrt(x²+y²+z²), enquanto a figura usa projeção x/y ou x/z. Os extremos são detectados nos estados de 1 Myr; são estimativas amostradas, não soluções analíticas de pontos de retorno. Ausência de extremo ou de volta completa é registrada como null, sem período inventado. O período azimutal é medido apenas por voltas completas. Para E>=0 no potencial com Phi(infinito)=0, não se declara apocentro finito. No campo axisimétrico Lz é conservado; o vetor L completo não é em geral invariante para a órbita inclinada.

Os dois quadros usam a mesma projeção, extensão, época e vetores iniciais. A extensão é determinada por toda a trajetória do par, não muda por quadro e não altera as coordenadas. O controle de tempo reproduz os estados registrados sem interpolar ou integrar geometricamente trajetórias artificiais. Círculo vazio é o início; ponto cheio, o estado selecionado. A tabela de extremos/períodos utiliza toda a trajetória, conforme declarado no painel.

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
