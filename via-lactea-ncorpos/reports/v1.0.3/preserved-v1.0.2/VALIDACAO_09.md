# Validação e reprodução — versão 0.9.0

GUILHERME ALEIXO BANDEIRA · UEMS · Projeto de TCC

Versão 0.9.0 · 25 execuções A/B/C concluídas. Números abaixo vêm dos JSON e CSV medidos em reports/v0.9.0/.

## Alcance da entrega

A atualização investiga o aquecimento e a evolução azimutal. O laboratório acrescenta diagnóstico no plano instantâneo, planos locais, modos m=1..4 e exportação CSV. As fontes físicas históricas permanecem preservadas. O modo principal continua autogravitante A, sem amortecimento ou reposicionamento. B e C estão nos harnesses científicos; C não é uma nova alegação de modelo final equilibrado.

Foram registrados 25 ensaios A/B/C, uma reprodução histórica até 2.540,4 Myr, três controles de órbitas no campo médio, 64 realizações iniciais para ruído, fixtures e comparações CPU/GPU. Consulte o status real em analysis.json; um arquivo parcial nunca é apresentado como ensaio concluído.

## Testes e evidências

- Suíte Node: 76 testes, sem falhas, cobrindo massas, unidades, forças, gradientes, árvore, KDK, conservação, distribuição espacial, não mutação, plano rígido conhecido, warp, Fourier e ruído, espiral sintética de densidade positiva, barra sem pitch espúrio, aliasing, halo finito e energia externa. O padrão espiral sintético existe só no teste de recuperação de sinal, não no inicializador de produção.
- Halo fixo CPU/GPU: força relativa RMS aproximadamente 4,06×10⁻⁷ (C) e 4,03×10⁻⁷ (C-soft); após 20 Myr posição RMS aproximadamente 6,42×10⁻⁶ na fixture de 600 partículas bariônicas. Tabelas, quadratura, massa exterior e derivada do potencial têm testes separados. Registro: fixed-halo-gpu-validation.json.
- Laboratório CPU/GPU: três sementes, N=1.000, força direta e 20 Myr, plano e σ normal comparados; laboratory-gpu-validation.json e source-and-regression-validation.json. Fixtures pequenas não validam por si toda a evolução longa de N=50.000/70.000 em f32.
- Reprodução do ZIP histórico: igualdade exata das métricas estruturais finais dos três componentes, energia e inclinação por L; historical-comparison.json.
- Fonte: constantes, modelos, inicializador histórico, força CPU, KDK e renderizadores preservados. Os dois shaders padrão de força e integração permanecem idênticos. gpu.js recebe apenas construção polimórfica e extensão de bindings para o backend experimental.

## Arquivos e configurações

A identidade original 0.8 está em baseline-identity.json, SHA composto 8600c6814b20b2d3e1c221ec59d69b5b4c027528aa04f377440a023608538e86. O código original foi guardado em reports/history/v0.8.0/source/. campaign-provenance.json e executed-source-campaign/ guardam os 15 arquivos exatos carregados no início da campanha, antes de atualizar o painel/estatística de ruído. A segunda campanha de dt fino registra seus próprios hashes; o arquivo atual pode diferir de um arquivo experimental arquivado sem alterar trajetórias já calculadas. A identidade final do aplicativo é gerada em downloads/code-identity.json.

Arquivos novos principais: fixed-halo.js, gpu-fixed-halo.js, halo-experiments.js e disk-analysis.js. Alterados: laboratory.js, laboratory-panel.js, mass-audit.js, gpu.js, build, versão e documentação. Condições iniciais antigas foram mantidas para reprodução. O ZIP original da Área de Trabalho não foi modificado. Diretórios Git criados pelo usuário dentro do projeto não integram os pacotes gerados.

## Reproduzir e gerar figuras

Na pasta que contém package.json:

```powershell
node --test
node scripts/serve.mjs
```

Abra http://localhost:4180/tests/browser-halos-09.html e clique em Executar campanha controlada. O processamento usa WebGPU real e pode levar dezenas de minutos conforme o dispositivo. O JSON aparece em #output e contém apenas ensaios terminados; aguarde status completed. A configuração longa de 50.000 partículas está também em tests/browser-reproduce-09.html. O controle dt/2 de alta resolução está em tests/browser-high-dt-09.html. O navegador não promete reproduzir byte a byte resultados em GPUs/drivers diferentes. Para reprodução exata da primeira campanha restaure os arquivos arquivados e verifique os SHA correspondentes; o código atual usa o mesmo integrador, massas e força padrão, com diagnósticos ampliados.

```powershell
node scripts/analyze-halos-09.mjs reports/v0.9.0/halo-campaign.json reports/v0.9.0/halo-high-dt.json
python scripts/plot-investigation-09.py
node scripts/write-investigation-docs-09.mjs
node scripts/verify-investigation-09.mjs
node scripts/build.mjs
```

As figuras usam Python, NumPy e Matplotlib (nesta execução: Python 3.12, NumPy 2.5.4, Matplotlib 3.11.2). O argumento opcional de plot-investigation-09.py é o caminho dos estados brutos da reprodução histórica, distribuídos no pacote separado de dados de reprodução; o CSV da campanha não contém posições completas. analyze-historical-09.mjs recebe esse mesmo caminho. Sem argumento o script gera figuras dos diagnósticos já exportados; não cria posições ausentes.

## Downloads e interpretação

O ZIP de investigação reúne tabelas, relatórios, figuras e scripts, e está ligado ao fim do painel. O ZIP do laboratório de uma execução inclui resultados.json, séries, perfis, cinemática, conservação e plano-e-modos.csv, com unidades e épocas efetivamente medidas. Nenhuma interpolação é exportada como estado integrado.

Resultados físicos que permanecem abertos: equilíbrio global, decomposição causal IC/relaxação/resposta coletiva, extrapolação ao limite sem colisões, erro de energia por árvore em cada amostra, f64 direto de alta resolução por 1 Gyr, distinção definitiva barra/espiral e modelo com função de distribuição validada. A melhoria de resolução e a medição corrigida não eliminam esses limites. Não se apresenta esta simulação idealizada como comprovação observacional da existência de matéria escura.

## Janela temporal e alteração de protocolo

Os primeiros oito ensaios de baixa resolução cobrem 1.000 Myr. As novas comparações de alta resolução, sementes e dt/2 cobrem 200 Myr comuns. A janela alta foi reduzida por custo computacional antes de inspecionar seus resultados; uma integração parcial foi descartada e não é tratada como resultado final. A reprodução histórica independente já cobre 2.540,4 Myr. Não há convergência A/B/C de alta resolução demonstrada por 1 Gyr. protocol-amendment.json e continuation-provenance.json registram a decisão e o código executado.

## Correção de metadados experimentais

O campo unbound do gerador A/B/C inicialmente herdava a contagem da realização-base, incluindo seu halo antigo. A contagem atual é recalculada para a população experimental efetiva no potencial analítico inicial não suavizado. Esse sinalizador não participa da força, integração ou medidas de aquecimento. Os flags antigos permanecem nos dados brutos por proveniência; initial-state-validation.json e browser-initial-state-validation.json separam a correção. O segundo confere hashes no mesmo navegador; Node e navegador podem diferir nos últimos bits de funções transcendentais, sem implicar alteração dos parâmetros.

## Integridade após retomada da sessão

O navegador encerrou durante uma execução parcial. Os 14 ensaios completos preservados em disco foram reaproveitados e apenas os restantes foram retomados; nenhuma série parcial foi usada como resultado final. resume-provenance.json e os sourceEpochs da campanha identificam a terceira versão exata do harness. campaign-validation.json confere os 25 ensaios e quatro arquivos de proveniência (campanha inicial, continuação, retomada e dt fino), incluindo os 60 hashes de arquivos executados. browser-initial-state-validation.json registra a regeneração dos 25 estados no navegador, com igualdade dos arrays físicos e das partículas bariônicas emparelhadas.

O launcher Windows também procura o Node do runtime local do Codex quando node não está no PATH. Isso facilita reabrir o servidor após reiniciar o computador; não instala inicialização automática do Windows.

## Referências

- [Sellwood (2014), Secular Evolution in Disk Galaxies](https://doi.org/10.1103/RevModPhys.86.1).
- [Sellwood (2011), The Lifetimes of Spiral Patterns in Disc Galaxies](https://doi.org/10.1111/j.1365-2966.2010.17545.x).
- [Sellwood (2013), relaxação em discos N-corpos](https://arxiv.org/abs/1303.4919).
- [Hunt & Vasiliev (2025), Milky Way Dynamics in Light of Gaia](https://doi.org/10.1016/j.newar.2024.101721). Ano do artigo 2025; o identificador DOI contém 2024. Nenhum dado Gaia foi integrado nesta versão.
- [Yurin & Springel (2014), GALIC](https://doi.org/10.1093/mnras/stu1421).
- [Vasiliev (2019), AGAMA](https://doi.org/10.1093/mnras/sty2672).
- [Hernquist (1990)](https://doi.org/10.1086/168845), [Miyamoto & Nagai (1975)](https://doi.org/10.1093/pasj/27.4.533), [Navarro, Frenk & White (1997)](https://doi.org/10.1086/304888).
