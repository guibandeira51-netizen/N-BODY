# Reproduzir a validação 1.0.1

Esta campanha investiga conservação e equilíbrio; **não certifica estabilidade galáctica prolongada**. As condições iniciais AGAMA original e calibrada, massas e resultados anteriores permanecem preservados. As novas saídas usam exclusivamente `reports/v1.0.1/`.

Use Node.js 20.11+ na pasta com `package.json`. Não há pacotes JavaScript a instalar. Para figuras, use Python com NumPy e Matplotlib; o controle contínuo requer AGAMA oficial, identificado em `reports/v1.0.0/dependencies.json` e `REPRODUCAO_AGAMA_WINDOWS.md`. Os snapshots prontos permitem repetir N-corpos sem recompilar AGAMA.

```powershell
node scripts/test.mjs
node scripts/validation-101/run-cpu.mjs
python scripts/validation-101/prepare-continuum.py
node scripts/validation-101/analyze-continuum.mjs
node scripts/validation-101/reanalyze-history.mjs
```

O ambiente efetivamente usado nesta máquina fornece Python em `C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`, AGAMA em `C:\Users\PC\Documents\Codex\2026-10-10\s-2\work\v1-python` e NumPy/Matplotlib em `C:\Users\PC\Documents\Codex\2026-10-10\s-2\work\laboratory-python`. Em outra máquina, configure um ambiente equivalente. A extensão é CPython 3.12 Windows x64; fontes, commit e hashes estão preservados no pacote histórico. Os scripts importam a biblioteca real.

Para WebGPU, abra dois terminais:

```powershell
node scripts/serve.mjs
```

```powershell
node scripts/validation-101/collector.mjs
```

Abra `http://localhost:4180/tests/browser-validation-101.html` e use o botão de campanha. O coletor escuta somente em loopback, porta 4183, admitindo IDs e origens locais previstos. Salva casos concluídos em `reports/v1.0.1/gpu/`. O navegador retoma resultados concluídos. Preserve uma campanha anterior antes de repetir com outros parâmetros; o coletor recusa substituir resultados diferentes. O build estático não inicia esse serviço.

Depois dos cinco casos WebGPU:

```powershell
node scripts/validation-101/analyze-gpu.mjs
python scripts/validation-101/plot.py
node scripts/validation-101/summarize.mjs
node scripts/validation-101/preserve.mjs --verify
node scripts/test.mjs
python scripts/validation-101/package.py
node scripts/build.mjs
```

As somas diretas dos estados de 50 mil partículas têm custo quadrático. Os máximos densos pequenos usam todos os passos. Os máximos históricos grandes são **máximos dos instantes disponíveis**, podendo omitir picos entre snapshots. O protocolo registra o plano antes da evolução, e cada ensaio registra sementes, Hamiltoniana, precisão e hash inicial.

Esta pasta não contém `.git`; a identidade é SHA-256 do conteúdo. `executed-source/<SHA256>/` guarda cópias do código de execução; `code-identity.json` registra CPU e `release-code-identity.json` a revisão final. Saídas do navegador têm hashes individuais do harness e kernel. Sua rotina de retomada foi corrigida durante a preparação: `gpu/attempt.json` preserva a tentativa que falhou ao reutilizar um adaptador já consumido. Somente casos concluídos são contados.

`attempts/cpu-first/` preserva a preparação inicial. A referência CPU foi repetida com cópia das fontes preservada, reproduzindo os mesmos resultados físicos; tempos reais dependem da carga do computador. Forças, suavizações e backends não alteram velocidades artificialmente durante a integração.

Os dez gráficos incluem PNG, SVG e CSV dos pontos desenhados. `figures/figure-manifest.json` registra fontes e hashes. Não há barras de erro inventadas. O painel `equilibrio.html` lê três avaliações independentes de `assessment.json`.

`downloads/validacao-1.0.1.zip` é um suplemento científico. Para repetir a reanálise histórica, extraia também `ensaios-1.0.0.zip` na mesma pasta. Os pacotes anteriores têm hashes verificados. O build preserva esses arquivos e inclui a nova validação em `dist/`; executar o build não publica o site.
