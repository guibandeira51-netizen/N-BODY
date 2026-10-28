# Massas e definições — preparação da versão 1.0

Auditoria escrita antes de gerar a nova realização. O arquivo `scripts/equilibrium/model-c20.json` é a especificação reproduzível. A realização só pode ser promovida depois dos ensaios livres; as incertezas abaixo não são tolerâncias de equilíbrio.

| Referência / definição | Disco estelar (M☉) | Bojo/barra (M☉) | Total estelar (M☉) |
|---|---:|---:|---:|
| Legado 0.9, modelo reduzido Gala | 6,80 × 10¹⁰ | 0,50 × 10¹⁰ | 7,30 × 10¹⁰ |
| Licquia & Newman 2015, IMF Kroupa | (5,17 ± 1,11) × 10¹⁰ | (0,91 ± 0,07) × 10¹⁰ | (6,08 ± 1,14) × 10¹⁰ |
| Cautun 2020, ajuste com contração | fino 3,18⁺⁰·³⁰₋₀·₄₅ + espesso 0,92⁺⁰·¹⁹₋₀·₁₂, em 10¹⁰ | 0,94⁺⁰·⁰⁹₋₀·₁₀ × 10¹⁰ | 5,04⁺⁰·⁴³₋₀·₅₂ × 10¹⁰ |
| Cautun 2020, ajuste NFW sem contração, referência adotada | fino 3,98⁺⁰·²⁶₋₀·₆₇ + espesso 1,07⁺⁰·¹⁸₋₀·₁₉, em 10¹⁰ | 0,92⁺⁰·¹¹₋₀·₀₈ × 10¹⁰ | 5,97⁺⁰·⁴⁰₋₀·₈₀ × 10¹⁰ |

Os intervalos de Cautun são os de 68% da tabela 2; são marginais correlacionadas. Somar erros como se independentes ou misturar as duas colunas não reproduz seu posterior. Adotamos a coluna NFW sem contração inteira para as normalizações e escalas estelares/halo, explicitamente como aproximação reduzida. Licquia & Newman é comparação independente, com B/T = 0,150⁺⁰·⁰²⁸₋₀·₀₁₉; não substitui apenas uma massa no ajuste de Cautun.

| Massa do halo / total | Legado 0.9 | Cautun contraído | Cautun NFW sem contração |
|---|---:|---:|---:|
| Massa de escala NFW | 5,40 × 10¹¹ M☉, **não é massa total** | não usada aqui | derivada da integral do perfil finito |
| Massa de DM dentro do raio de referência | medir no perfil legado | 0,97⁺⁰·²⁴₋₀·₁₉ × 10¹² M☉ | 0,82⁺⁰·⁰⁹₋₀·₁₈ × 10¹² M☉ dentro de 207 kpc |
| Massa total publicada M200 (DM + bárions) | não confundir com halo | 1,08⁺⁰·²⁰₋₀·₁₄ × 10¹² M☉ | 0,95⁺⁰·¹⁰₋₀·₁₉ × 10¹² M☉ |
| Massa finita total de DM da simulação | 9,76315764173288 × 10¹¹ M☉ | não implementada como perfil contraído | integral do NFW com corte suave gaussiano a 414 kpc, calculada antes da amostragem |

O halo candidato tem ρ ∝ [x(1+x)²]⁻¹ exp[−(r/414 kpc)²], rs = 14,4 kpc, normalizado para MDM(<207 kpc) = 8,2 × 10¹¹ M☉ **no perfil inicial de referência**. Sua massa integrada até infinito difere desse número. O corte é uma escolha computacional explícita; a DF usa esse perfil finito. Após a iteração, o perfil e a massa encerrada são novamente medidos. O raio 207 kpc veio do modelo completo publicado; não o declaramos R200 do modelo reduzido.

O modelo livre tem três etiquetas físicas (bojo, disco estelar, halo de DM), com duas subpopulações de disco. Omite os 1,2 × 10¹⁰ M☉ de gás frio e os 5,5 × 10¹⁰ M☉ de CGM dentro do raio de referência do ajuste NFW. O gás frio corresponde a 20,10% da massa estelar adotada; a omissão total corresponde a cerca de 7,05% do M200 total publicado. Essas massas **não foram adicionadas ao disco nem ao halo de DM**. O potencial é reconstruído sem gás, portanto não é reprodução exata do ajuste observacional completo. A omissão muda a curva de rotação e a força vertical e limita inferências sobre a Via Láctea real.

O bojo inicial usa a forma radial de Cautun (r0 = 0,075 kpc, α = 1,8, corte = 2,1 kpc), substituindo q = 0,5 por q = 1 e renormalizando para 9,2 × 10⁹ M☉. Essa aproximação não é a média angular exata do bojo achatado e não representa a barra/peanut. O disco da DF tende a perfis próximos dos exponenciais com Rd fino/espesso = 2,43/3,88 kpc; sua estrutura vertical não é imposta como exponencial. O controle usa Hdisk = 0,3/0,9 kpc, e o segundo candidato usa 0,186457867/0,498329086 kpc, calibrados apenas para a mediana vertical inicial. Esses são parâmetros da DF, diferentes da altura exponencial publicada. Os perfis finais estão medidos na validação, incluindo os desvios do alvo.

A integral até infinito do halo de referência é 1,049128645 × 10¹² M☉. A integral independente da DF é 1,049129212 × 10¹² M☉ (diferença relativa 5,40 × 10⁻⁷); para o bojo, o erro de quadratura é 1,68 × 10⁻⁶. Os pesos discretos usam a massa integrada da DF, não a estimativa Monte Carlo do amostrador. Assim, o total finito simulado é cerca de 1,108829228 × 10¹² M☉, **não M200**.

| Componente | Fração da massa total finita | Fração do N no ensaio 10k | Massa individual no ensaio 10k |
|---|---:|---:|---:|
| Bojo | 0,8297% | 15% | 6,13334 × 10⁶ M☉ |
| Discos combinados | 4,5544% | 45% | fino 1,12239 × 10⁷; espesso 1,12159 × 10⁷ M☉ |
| Halo | 94,6159% | 40% | 2,62282 × 10⁸ M☉ |

Entre as estrelas, B/T = 0,1541. As frações da tabela dependem de integrar o halo finito até infinito, e não de usar uma mesma abertura de 207 kpc em todas as componentes. O número 10k contém 1.500 partículas de bojo, 3.546 de disco fino, 954 de espesso e 4.000 de halo. O halo tem macro partículas cerca de 23 vezes mais massivas que as dos discos nessa alocação; Nh = 8.000/20.000 reduz essa massa a 1,31141 × 10⁸/5,24565 × 10⁷ M☉, sem mudar a massa física. A convergência da resposta do disco precisa ser demonstrada pelos ensaios, mesmo quando as somas de massa estão corretas.

N não é fração de massa. O gerador aceita Nb, Nd e Nh independentes; cada componente recebe sua própria M/N e as subpopulações do disco são auditadas. Não há regra automática de 90% das partículas no halo. Maior Nh, com as mesmas partículas estelares, testa granularidade. O controle de halo fixo precisa usar o **halo candidato convergido**, e não a tabela do halo legado.

Fontes: [Licquia & Newman, DOI](https://doi.org/10.1088/0004-637X/806/1/96), [preprint](https://arxiv.org/abs/1407.1078); [Cautun et al., artigo, tabelas 1–2](https://doi.org/10.1093/mnras/staa1017), [dados/código dos autores](https://github.com/MariusCautun/Milky_Way_mass_profile); [Gala, definição oficial do modelo histórico](https://gala.adrian.pw/en/stable/supporting/define-milky-way-model.html). Números arredondados publicados não constituem nova cadeia posterior.
