# Validação resumida 1.0.6

## Separar três objetos

Campo gravitacional médio: força do potencial contínuo, usada para vc e partículas-teste. Cinemática: médias e dispersões das velocidades das partículas, que não são obrigadas a coincidir com vc. Evolução estrutural: crescimento de h50 e distribuição de massa, que pode ocorrer mesmo com energia conservada.

## Gráfico6 — evolução estrutural preservada

Reutilizados12 ensaios de 200 Myr: A-original3, B-original3, E1053 e F1053. Os metadados, fontes e hashes individuais constam em `validation.json`. h50 é a mediana ponderada da distância absoluta ao plano próprio da população fina. Faixas representam média±desvio amostral entre realizações, não intervalos de confiança. A/B variam três realizações bariônicas; E/F mantêm bárions2026 e variam três halos. Essas dispersões não têm interpretação intercambiável.

F105:169546 partículas totais, contagens1500/7092/954/160000; KDK GPU direta Float32, dt0,05 Myr, Plummer epsilon0,1 kpc. Crescimento médio do fino18,29%±3,14% em 200 Myr. F teve somente a menor estimativa pontual entre E105/F105 pareados. O intervalo de confiança da diferença inclui zero. Não foi demonstrada convergência estrutural global ou estacionariedade. Não usar o legacy de 80000 partículas totais/1,51Gyr como evidência de estabilidade de E104 ou F105.

## Gráfico7 — energia

As três realizações completas F105 são mostradas, sem selecionar apenas a curva mais favorável. Máximo amostrado no conjunto F representado=2.64147417e-07. A força e a trajetória são Float32 GPU direta; o diagnóstico usa Hamiltoniano de pares Plummer direto compensado Float64, G e epsilon² efetivos f32. Não é estimativa energética Barnes–Hut. Orçamento histórico=1e-5; zero aparece no piso gráfico1e-16, mas os dados brutos mantêm zero. Máximos entre amostras não são limitados por essa figura.

**Conservação energética não implica estacionariedade estrutural.**

## ExperimentoD — campo inicial

Reutilizada a família E104 de 89546 partículas, três realizações bariônicas e de halo, e28 probes fixos. A tabela pública mostra os probes no plano em 4,8,122,12 e16 kpc. Força de pares Plummer calculada diretamente em NumPy Float64 e comparada ao campo médio Plummer correspondente. As dispersões entre sementes incluem a amostragem dos bárions e do halo. Isso não separa causalmente todos os mecanismos e não define uma lei assintótica de ruído. O campo Newtoniano106 é separado desse teste para evitar misturar leis de força.

## Verificações novas

As sete figuras usam dados calculados ou publicados. Os testes conferem identidade de vetores iniciais, conservação orbital, refinamento KDK, gradiente do potencial, fechamento quadrático de vc, massa esférica monótona, preservação de massas, escores, contagens5+2 e inventário83. A precisão nativa e a dependência do campo com a malha constam nos relatórios próprios. Testes de software não promovem candidatos históricos a equilíbrio certificado.

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
