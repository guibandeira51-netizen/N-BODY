# Reprodução da etapa 1

O pacote `correcao-equilibrio-1.0.2.zip` complementa a árvore preservada; contém os dados e fontes necessários a esta etapa, incluindo as entradas AGAMA históricas usadas. Os antigos downloads completos continuam separados. Não extraia sobre seu histórico sem uma cópia, se quiser conservar a interface anterior; ela também está em preserved-v1.0.1.

Node >=20.11: `node scripts/test.mjs`, `node scripts/build.mjs`, `node scripts/serve.mjs`. Se npm estiver instalado, os atalhos equivalentes são `npm test`, `npm run build`, `npm run dev`. Nesta máquina npm não estava no PATH; o build foi executado pelo script Node real. O servidor local usa 4180 e não requer AGAMA para visualizar ou evoluir os snapshots. Abrir `/correcao102.html`; nova configuração é opt-in. Não há dependências Node externas nem mudança da gravitação.

Preparação offline: Python 3.12.14, AGAMA 1.0.161 (commit f302756b8af2b763db58e278e30478517dc8eea3), NumPy 2.5.4, SciPy 1.18.1, Matplotlib 3.11.2. O ambiente exato está nos metadados de preparação; caminhos locais dos módulos não são portáteis. Instale/compile as versões indicadas e configure PYTHONPATH quando necessário. Não se exige enviar dados a serviços externos.

Execute a partir da raiz, usando `python` desse ambiente. Os diretórios de produção já entregues não devem ser sobrescritos: faça uma cópia da árvore para reproduzir o caminho padrão, ou use --out onde a CLI oferece essa opção.

```powershell
python scripts/equilibrium-102/test_plummer_mean.py
python scripts/equilibrium-102/probe_field.py
python scripts/equilibrium-102/generate_softened.py --threads 4 --counts 150 450 400 --seeds 2026 2027 2028
python scripts/equilibrium-102/generate_softened.py --resume --sample-only --counts 1500 4500 4000 --seeds 2026 2027 2028
python scripts/equilibrium-102/prepare_baseline.py
node scripts/equilibrium-102/run_minimum.mjs --family=baseline
node scripts/equilibrium-102/run_minimum.mjs --family=corrected
python scripts/equilibrium-102/run_smooth.py
python scripts/equilibrium-102/validate_field.py
python scripts/equilibrium-102/validate_df.py
```

Os comandos acima usam os padrões registrados nas CLIs; confira `--help` nos scripts Python. O controle GPU exige WebGPU real: inicie `node scripts/equilibrium-102/collector.mjs` (coletor só em loopback 4184, aceita exclusivamente as seis IDs/duração esperadas), depois abra `/tests/browser-softened-minimum-102.html` e use seu botão de execução. Os dados brutos já presentes são retomados/recusados em vez de substituídos por resultados diferentes. Feche o coletor ao fim.

```powershell
node scripts/equilibrium-102/analyze_short.mjs
python scripts/equilibrium-102/plot.py
python scripts/equilibrium-102/report.py
node scripts/equilibrium-102/preserve.mjs --verify
```

Saídas: seis snapshots corrigidos e seis referências antigas; 21 integrações (A:9,C-CPU:6,C-GPU:6); séries temporais, estados 0/20 Myr, estatística de campo, densidades, momentos, frequências e gradientes; oito figuras com SVG/PNG/CSV. Não há novas integrações B/D/200/1.000 Myr. O hash científico das entradas e o código executado estão em cada protocolo. Reprodutibilidade amostral depende também da versão/compilação do AGAMA; GPU f32 pode variar entre dispositivos, portanto igualdade bit a bit de trajetórias não é prometida.
