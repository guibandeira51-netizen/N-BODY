# Reprodução 1.0.4

## Ambiente e ordem

Node>=20.11 para servidor/testes/análise/build, navegadorWebGPU; Python com AGAMA1.0.161, NumPy, Matplotlib para geração e figuras. Hardware informado: Ryzen7 5700X,16 GBRAM,RX7600 8 GB. Não é necessário instalar dependências no navegador para inspecionar snapshots.

Execute em cópia do projeto/pacote. Os geradores e coletor recusam reescrever resultados concluídos; não apague evidências originais. `preservation.json` e `preserved-v1.0.3/` guardam a linha de base, com verificação dos arquivos históricos. Para repetir fisicamente, use uma nova pasta de saída/versionamento e preserve os scripts originais por hash.

1. `node scripts/refinement-104/preserve.mjs` antes de alterações, uma única vez; `--verify` confirma os históricos.
2. `node scripts/refinement-104/prepare.mjs`: combina exatamente as populações selecionadas1.0.3. O pacote inclui os pais necessários e seus manifestos. `prepare-higher.py` amostra somente populações refinadas da mesma DF/potencial1.0.2; veja os argumentos e checks de admissibilidade.
3. `node scripts/refinement-104/controls.mjs` verifica as12 referências preservadas; `ic-audit.py` e `native-df.py` produzem auditorias independentes sem alterar a física.
4. `node scripts/refinement-104/identity.mjs` preserva a identidade das fontes antes da execução. Não altere módulos de física durante uma etapa em execução. O arquivo code-identity final pode apontar uma época posterior; todas as épocas efetivamente executadas permanecem em executed-source.
5. `node scripts/serve.mjs` serve a raiz na porta4180. `node scripts/refinement-104/collector.mjs` coleta somente de origem local4180 para loopback4186. Abra `tests/browser-refinement-104.html?stage=factorial20` e use o botão. O coletor só aceita IDs registrados, hashes/configurações compatíveis e resultados completos; checkpoints parciais ficam separados.
6. Após inspecionar20, `advance.mjs` registra200. Os registros posteriores e a decisão quantitativa documentam a seleção antes de pilotos/horizontes adicionais. O manifesto entregue contém todos os estágios efetivamente concluídos; escolha o nome em `?stage=...` para reproduzir uma etapa. Resultados existentes são reconhecidos, sem nova integração; isso é retomada de resultados completos, não continuação automática de checkpoints parciais.
7. `node scripts/refinement-104/analyze.mjs`, `collective.mjs`, `migration.mjs`, `force-audit.mjs`; Python `field-audit.py`, `plot.py` e `report.py`. Figuras usam somente dados completos; CSV de pontos e hashes acompanhamPNG/SVG. O arquivo de decisão científica não é gerado a partir de um limiar universal de espessamento.
8. `node scripts/test.mjs`; `node scripts/refinement-104/audit.mjs`; Python `package.py`; `node scripts/build.mjs`. Auditoria verifica inputs, massas, fontes executadas, controles, figuras, energia em processo independente e históricos. O ZIP tem CRC eSHA256 de todas as entradas, além doSHA256 do arquivo inteiro.

## Conteúdo e unidades

Cada execução tem 41 amostras nos ensaios principais20/200,21 nos refinamentos200 e11 nos pilotos de custo20. Estados completos0/fim, constantes porpartícula, tempos e fontes ficam nosJSONbrutos. Checkpoints mais recentes permanecem no projeto; o pacote pode incluir manifesto de hashes dos parciais em vez de duplicá-los. As trajetórias nativas f(J) guardam41 estados da subamostra original e não são realizações N-corpos autogravitantes. Dados reutilizados1.0.3 são identificados e não contam como execuções novas.

Unidades dos arrays: kpc, Myr, 1e10 Msun, velocidadeskpc/Myr. CSV de dispersões usa km/s; variâncias(km/s)². Densidades indicam medida geométrica no eixo/arquivo; massas encerradasMsun. Não confunda massa total do halo com massa dentro de um raio,σz comσ perpendicular, ou velocidade circular com componente azimutal da amostra.

Os controles contínuos novos G são preparados por continuous-g.py e analisados por analyze-continuous-g.mjs. Usam todos os mesmos bárions, input quantizado e41 estados0–200 Myr, com fonte eJSONL identificados por SHA-256. Estes três controles são distintos das três auditorias subamostradas native-df.py e dos12 controles históricos reutilizados.
