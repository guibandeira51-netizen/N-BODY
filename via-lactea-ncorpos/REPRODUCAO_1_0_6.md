# Reprodução 1.0.6

## Ambiente e identidade

Python 3.12.14; AGAMA 1.0.161 compiled on Oct 15 2026; NumPy 2.5.4; SciPy 1.18.1; Matplotlib 3.11.2. Node e hashes por fonte estão em `code-identity.json`. Identidade agregada do código106: `9f3e9e53a10e2380c1c9f00839fa4b8067497625a83e69e4397c02e367127242`. A biblioteca nativa AGAMA e dependências científicas precisam estar instaladas; não são instaladas silenciosamente pelo site. Potenciais nativos exportados permitem repetir órbitas sem reconstruir DFs ou refazer SCM.

## Consultar ou servir

`node scripts/serve.mjs` serve o projeto em http://localhost:4180/ . O site é estático, com módulos JavaScript relativos, dados locais e nenhum serviço externo obrigatório em tempo de execução. `node scripts/build.mjs` produz dist, compatível com GitHub Pages conforme a URL/base da publicação e com Vercel pelo vercel.json existente. Não houve publicação remota. O simulador antigo está em simulador-tecnico.html, acessado pelo arquivo científico.

## Ordem de reprodução científica em cópia de trabalho

1. Confira `preservation.json`, `history-verification.json`, hashes do ZIP e SHA256SUMS.txt. `node scripts/darkmatter-106/preserve.mjs --verify` requer o histórico completo indicado no baseline. Não recrie o baseline sobre o original.
2. Baixe as fontes oficiais https://arxiv.org/pdf/1810.09466 e https://arxiv.org/pdf/2107.00014 nos caminhos locais descritos em `observations/provenance.json`. Os PDFs integrais foram consultados e têm hashes; o pacote redistribui a tabela numérica e referências, não os artigos completos. Execute `observations.py` para extrair e cruzar as tabelas. CSV publicado preservado permite reproduzir a análise sem baixar os PDFs.
3. Execute `model.py` para reconstruir as densidades positivas das grades preservadas, normalizar às mesmas massas e gerar quatro potenciais, curva e massa esférica. Não se ajustam massas aos dados. `density.py` define a quadratura; `mass.py` somente audita o resultado, sem reescrever curvas. As tentativas assinadas iniciais estão em attempts/signed-density e não são o modelo final.
4. Execute `orbits.py` e `compare.py`. Estes usam os potenciais exportados, mesmo vetor inicial por par, tolerâncias e protocolo registrados. Não há nova campanha N-corpos.
5. Execute `validation.py` para reanalisar séries e auditoria inicial históricas. Ela exige exatamente os arquivos e hashes identificados no JSON, preserva o limite200 Myr e não executa física nova. A tabela do campo suave versus partículas é evidência técnica, não um oitavo gráfico.
6. `node scripts/darkmatter-106/inventory.mjs` gera a auditoria dos83 gráficos. `site.mjs` gera as três páginas principais; preserva o HTML antigo em simulador-tecnico.html. `plot.py` produz exatamente sete figuras com PNG, SVG e CSV dos pontos desenhados. Para as órbitas, o PNG/SVG estático usa o caso solar completo; o painel interativo permite cinco casos e estados medidos.
7. Rode `node scripts/test.mjs`, depois `node scripts/darkmatter-106/identity.mjs`, `report.py` e `node scripts/darkmatter-106/audit.mjs`. Grave o log de testes. A documentação deve ser regenerada após mudança real de código ou resultado; as fontes das figuras são conferidas por hash.
8. `package.py` gera o pacote106 e verifica CRC/hashes internos. `node scripts/build.mjs` produz a versão estática, sem refazer campanhas ou alterar downloads históricos. `node scripts/darkmatter-106/audit.mjs --production` confere o build, os dados e a preservação histórica. A auditoria do pacote e a auditoria pós-build ficam externas ao próprio ZIP para evitar autorreferência de hashes.

## Alcance do pacote e do arquivo técnico

O ZIP106 inclui código atual, dados observacionais numéricos, potenciais, trajetórias novas, relatórios, inventário e figuras históricas utilizadas, evidências históricas necessárias à síntese e suas entradas. Não é uma recompressão recursiva de todos os ZIP antigos. Os pacotes completos0.9–1.0.5 continuam preservados separadamente; resultados anteriores não são apagados nem reescritos. Checkpoints parciais e trajetórias antigas não utilizadas permanecem no projeto e nos arquivos históricos. O baseline preserva 4382 arquivos históricos, incluindo antigos downloads. A cópia original de fontes, scripts e interface está em original-project/.

Cada figura mantém dados tabulares, unidades, hipóteses e referências. `code-identity.json` liga fontes a hashes; `figures/manifest.json` liga gráficos a dados e hashes; `observations/provenance.json` registra as duas tabelas consultadas; `model.json` e `mass-quadrature.json` documentam a representação nova. Não confundir hipóteses numéricas, resultados medidos e observações astronômicas.

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
