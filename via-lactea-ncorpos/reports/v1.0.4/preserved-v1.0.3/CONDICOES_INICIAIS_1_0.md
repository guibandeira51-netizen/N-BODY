# Condições iniciais por DF — candidato 1.0

O motor histórico não foi substituído. `initial-legacy.js`, constantes, forças Plummer e integrador KDK continuam como referência. O novo gerador Python usa **AGAMA real** para a preparação; a página `equilibrio.html` importa o snapshot e evolui as partículas com os backends locais. O nome de uma biblioteca não é uma certificação de estabilidade.

## Modelo e construção

`scripts/equilibrium/model-c20.json` especifica a aproximação collisionless descrita em `MASSAS_VIA_LACTEA_1_0.md`. A referência observacional é a coluna NFW sem contração de Cautun et al. (2020). Os dois discos estelares compartilham a etiqueta de componente 1, mas conservam subpopulações distintas no arquivo inicial. O bojo esferizado tem etiqueta 0; DM, 2. O disco Miyamoto–Nagai permanece apenas no legado. Não se impõe que uma DF quase isotérmica reproduza exatamente sua densidade.

O algoritmo cria um potencial inicial a partir das densidades alvo; constrói QuasiSpherical para bojo e halo e QuasiIsothermal para cada disco; mantém as DFs fixas em ações enquanto `SelfConsistentModel` recalcula densidades e potencial. O disco admite anisotropia, aquecimento aleatório e rotação média distintos. As frequências usadas na definição da DF são congeladas no potencial inicial, conforme o método; reconstruí-las a cada iteração mudaria f(J).

QuasiSpherical começa com uma inversão esférica no potencial **esferizado**, mapeada para ações e depois avaliada no potencial axisimétrico. A distribuição final pode ficar achatada. Não chamamos essa construção de Eddington esférico exato em um potencial achatado. O halo tem corte suave no perfil que entra na própria inversão; não se corta posteriormente uma amostra de DF NFW infinita.

As escolhas cinemáticas σR(Rsolar) = 35/50 km/s para fino/espesso e Rσ = 2 Rd são hipóteses explícitas, não medições do ajuste de Cautun. O primeiro candidato usou Hdisk = 0,3/0,9 kpc diretamente. A auditoria encontrou medianas solares de |z| de 0,366/1,245 kpc, maiores que os alvos exponenciais 0,208/0,624 kpc. Esse candidato foi preservado como controle `agama`, inclusive seus resultados desfavoráveis.

O segundo candidato, `agama-calibrated`, usa Hdisk = 0,186457867/0,498329086 kpc. `calibrate_vertical_df.py` resolve a mediana vertical no potencial analítico inicial para alcançar os alvos espaciais zd ln(2), por integração dos momentos da DF e busca de raiz. Nenhuma expansão evoluída entra nessa função objetivo. Hdisk não é uma altura exponencial imposta, e a iteração autoconsistente posterior pode deslocar o perfil; as medianas finais são novamente medidas. A calibração de uma mediana em um raio não ajusta todo o perfil radial/vertical nem as observações cinemáticas. Os parâmetros de massa, dispersão radial e campos de força não são retocados conforme os resultados de estabilidade.

O campo é Newtoniano suave na preparação. A evolução livre é Plummer com ε informado, de modo que há uma diferença conhecida entre os dois campos, sobretudo no bojo compacto. Ensaios com ε/2 e 2ε investigam parte dessa diferença junto com a granularidade; não os interpretamos como uma decomposição causal exata. Não há amortecimento, correção contínua de velocidades, recentragem nem reposicionamento durante a evolução.

## Massas e amostragem

Integramos a DF no espaço de ações para fixar a massa de cada componente; a integral física do halo finito também é calculada separadamente. A estimativa Monte Carlo de massa retornada pelo amostrador é registrada, mas não controla a normalização física. Assim, Nh e semente não mudam Mhalo. As massas finais são M_DF/N_c, com o pequeno erro de quadratura em relação ao alvo explicitamente auditado antes da amostragem. No disco, Nfino/Nespesso é uma escolha de resolução auditada, não uma nova fração física de massa.

O amostrador explora pelo menos 4.096 pontos por subcomponente antes da subamostragem, inclusive quando a realização final tem menos pontos; isso evita o uso de amostras extremamente pequenas para explorar a DF. Criam-se pares antipodais (x,v), (−x,−v), simetria válida do potencial axisimétrico. Há N/2 sorteios independentes. Esse quiet start suprime modos ímpares; os testes de ruído e os relatórios declaram as correlações. Não foram adicionados pontos decorativos.

Sementes estelares e de halo são separadas. A sequência de números aleatórios é reinicializada por subcomponente; variações Nh/haloSeed preservam as partículas estelares. Os hashes das posições e velocidades estelares conferem essa propriedade. Não assumimos igualdade bit a bit entre motores matemáticos ou versões distintas de compiladores: registrar o snapshot exportado garante a reprodução da mesma realização.

## Admissão e validação

Os snapshots contêm unidades, posição e velocidade de cada partícula, massa, componente, subpopulação, semente, método, parâmetros, versão da biblioteca e identificação da realização. São rejeitados valores não finitos, componentes inválidas e discrepância entre a soma das partículas e a massa declarada. O importador redefine `equilibriumValidated=false`; um campo arbitrário no JSON não pode conceder validação científica.

Antes da evolução são registrados f(J) nos pontos amostrados, energias no potencial contínuo, massas, perfis e mudanças de força entre iterações. O critério numérico de variação de campo é separado dos testes de estabilidade. Não negatividade em uma amostra não prova admissibilidade em todo o espaço de fases, e ações aproximadas limitam a estacionariedade.

`scripts/equilibrium/protocol.json` define os ensaios livres em 20, 200 e 1.000 Myr, variando Nh, semente, N, dt e ε. O harness de backends usa uma realização física pequena completa para comparar CPU f64 e GPU f32. O controle com o potencial total congelado é integrado pelo AGAMA e é identificado separadamente: não substitui o N-corpos autogravitante.

O contraste Gaussiano usa as **mesmas posições e massas**, substituindo a forma local da distribuição de velocidades por Gaussianas com covariância estimada nos vizinhos meridionais. Não é o inicializador Jeans legado nem uma DF estacionária demonstrada. Ele investiga a mudança da distribuição de velocidades dentro do novo modelo, enquanto 0.9 versus candidato muda também massas e perfis. O halo fixo usa o potencial axisimétrico do halo final, interpolado a partir de um único potencial escalar; suas forças são derivadas desse mesmo potencial.

## Reprodução

Preparação requer Python, NumPy, SciPy e o AGAMA oficial compilado. Node e navegador não executam o AGAMA: leem o snapshot pronto. As versões e hashes efetivamente utilizados estão em `reports/v1.0.0/dependencies.json` e `agama/preparation.json`; o código exato da preparação inicial também fica preservado em `executed-source-preparation` quando difere do gerador final.

```text
python scripts/equilibrium/generate_agama.py --config scripts/equilibrium/model-c20.json --out reports/v1.0.0/agama --suite --threads 4
python scripts/equilibrium/refine_scm.py --out reports/v1.0.0/agama --max-extra 2
python scripts/equilibrium/generate_agama.py --config scripts/equilibrium/model-c20.json --out reports/v1.0.0/agama --suite --reuse-prepared --threads 4
python scripts/equilibrium/calibrate_vertical_df.py --config scripts/equilibrium/model-c20.json --out reports/v1.0.0/agama-calibrated
python scripts/equilibrium/generate_agama.py --config scripts/equilibrium/model-c20-calibrated.json --out reports/v1.0.0/agama-calibrated --suite --threads 4
node scripts/serve.mjs
```

O arquivo `model-c20-calibrated.json` entregue inclui o resultado da calibração e as opções de iteração: máximo 14 etapas, mínimo 4 e duas mudanças consecutivas abaixo de 0,001. Usa o potencial final do primeiro candidato somente como ponto inicial da iteração; as frequências que definem as DFs continuam vindo do potencial analítico de referência. Registros de cada etapa permitem retomar a preparação com a mesma configuração. Uma reinicialização do ambiente interrompeu uma tentativa anterior; ela não é contada como execução física concluída.

Após ter uma preparação concluída, `--reuse-prepared` reconstitui as mesmas DFs e usa o potencial final salvo para repetir apenas a amostragem. É obrigatório fornecer o `--config` correto; configurações incompatíveis são rejeitadas. A normalização e o pool mínimo de amostragem foram corrigidos antes de qualquer ensaio do candidato. Os arquivos finais de `snapshots.json`, com seus hashes, identificam exatamente os dados usados nos ensaios. Veja `VALIDACAO_EQUILIBRIO_1_0.md` para resultados efetivos, falhas, comandos complementares e o alcance da conclusão.
