# Reprodução1.0.3

Pacote `granularidade-1.0.3.zip`: complemento do projeto preservado. Inclui fontes, entradas/snapshots necessários, dados integrais, figuras, manifestos e SHA256SUMS. Os pacotes completos anteriores continuam separados. Reproduza em uma cópia de trabalho limpa para reports/v1.0.3, mantendo a preparação1.0.2; não sobrescreva as entradas que já sustentam os resultados entregues.

Node>=20.11, sem dependências Node externas. Neste ambiente npm não está no PATH: use `node scripts/test.mjs`, `node scripts/build.mjs`, `node scripts/serve.mjs`. Acesse localhost:4180/granularidade103.html. O navegador precisa de WebGPU para refazer a gravitação GPU; visualizar os relatórios não requer AGAMA.

Offline: Python3.12.14, AGAMA1.0.161 commit f302756b8af2b763db58e278e30478517dc8eea3, NumPy2.5.4, SciPy1.18.1, Matplotlib3.11.2. Configure as dependências/PYTHONPATH em seu ambiente. A preparação de DF é a1.0.2 já convergida, não uma nova calibração.

Nos snapshots, `meta.preparation` conserva a proveniência da preparação1.0.2, inclusive testes e contagens da realização PAI. As contagens e amostragens atuais são as dos arrays, do manifesto1.0.3 e de `meta.version103.samplingChecks`. Os protocolos de cada família em initial/halo e initial/baryons resolvem essa herança explicitamente. Não interpretar o teste de halo do pai como presença de partículas de halo no B.

```powershell
node scripts/granularity-103/preserve.mjs
python scripts/granularity-103/prepare.py --stage halo
node scripts/granularity-103/campaign.mjs
node scripts/granularity-103/identity.mjs
node scripts/granularity-103/collector.mjs
```

O coletor escuta SOMENTE127.0.0.1:4185 e aceita as IDs registradas e a origem local4180. Na aba /tests/browser-granularity-103.html?stage=halo20, execute o botão. Os12 halos devem terminar antes de registrar os controles B. Preparação de arquivos de B/campo e verificação independente podem ocorrer enquanto H evolui; B não inicia antes de completar H.

```powershell
python scripts/granularity-103/prepare.py --stage baryons
python scripts/granularity-103/prepare_field.py
python scripts/granularity-103/field_statistics.py
python scripts/granularity-103/field_components.py
```

Abra /tests/browser-granularity-force-103.html, execute a força e salve os dados completos como reports/v1.0.3/halo-wgsl-force-validation.json. O relatório entregue já inclui a saída real e os erros das tentativas anteriores. O portão de append-baryons verifica hash da tabela e o erro de referência antes de liberar B.

```powershell
node scripts/granularity-103/append-baryons.mjs
node scripts/granularity-103/identity.mjs
```

Execute /tests/browser-granularity-103.html?stage=baryons20. A seguir, os A nativos independentes e a seleção de200, depois de inspecionar os24 resultados curtos:

```powershell
python scripts/granularity-103/continuum.py --duration 20
node scripts/granularity-103/analyze-continuum.mjs
node scripts/granularity-103/analyze.mjs
node scripts/granularity-103/append-200.mjs
python scripts/granularity-103/continuum.py --duration 200
node scripts/granularity-103/analyze-continuum.mjs
```

Execute /tests/browser-granularity-103.html?stage=medium200. São somente os12 contrastes selecionados, com energia/estrutura a cada5 Myr e dt ainda0,05 Myr. Resultados concluídos são retomados por identidade e recusam substituição por dados diferentes. Checkpoints guardam o estado parcial mais recente; o executor atual retoma automaticamente ensaios concluídos, não promete retomar uma trajetória a partir de qualquer checkpoint parcial.

A extensão foi registrada SOMENTE depois de inspecionar os primeiros12 resultados200 Myr:

```powershell
node scripts/granularity-103/extend-baryons-200.mjs
python scripts/granularity-103/continuum.py --duration 200 --population thin2
node scripts/granularity-103/analyze-continuum.mjs
```

Pressione novamente executar na aba medium200: os12 concluídos são preservados e somente os seis novos B são integrados. Os três A fino×2 permitem comparar a nova amostra de fases com sua própria evolução suave.

```powershell
node scripts/granularity-103/analyze.mjs
node scripts/granularity-103/force-audit.mjs
node scripts/granularity-103/collective.mjs
python scripts/granularity-103/plot.py
node scripts/granularity-103/preserve.mjs --verify
```

`long-run-decision.json` registra uma avaliação científica dos resultados, não uma certificação gerada pelos testes de software. O gerador de relatórios exige os ensaios registrados concluídos e essa decisão explícita. `report.py`, a auditoria de artefatos e `package.py` consolidam a entrega. Feche o coletor após a campanha; o servidor4180 pode continuar.

As fontes foram preservadas por épocas/identidade antes de mudanças posteriores: a execução H curta começou com a versão inicial do harness; B e200 usam a extensão polinomial validada. Isso só afeta o campo externo de B, não os pares diretos de H. O JSON de cada execução identifica os hashes realmente carregados. Fontes/entradas históricas permanecem intactas; reprodutibilidade de fase depende da versão do AGAMA e trajetórias f32 podem variar entre dispositivos.
