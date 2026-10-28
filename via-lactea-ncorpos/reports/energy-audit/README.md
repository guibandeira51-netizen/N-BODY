# Auditoria energética da realização legacy — guia dos dados

Os três relatórios finais ficam na raiz: `AUDITORIA_ENERGIA_NCORPOS.md`, `COMPARACAO_ENERGIA_DIRETA_BH.md` e `VALIDACAO_CONSERVACAO_ENERGIA.md`.

- `observed-run-before.json`: exportação original intacta, oito diagnósticos, antes da correção.
- `replay-80000-snapshots.json`: repetição real completa, parâmetros efetivos, energias e oito snapshots de partículas. O arquivo tem aproximadamente 92 MB. Os K e U antigos coincidem exatamente com os oito registros originais; os vetores originais posteriores não estavam disponíveis para comparação bit a bit.
- `replay-80000-analysis.json` e CSV correspondentes: Hamiltoniana direta, estimativa BH, decomposição, varredura de theta, custos e hashes dos estados.
- `experiments.json`, `trajectories.csv`, `theta-snapshots.csv`: controles CPU legacy N=96/256 e binárias compactas de estresse. Não certificam o regime da galáxia inteira.
- `resolved-controls.json` e CSV: binárias resolvidas, energia em cada passo até 1 Gyr e convergência de trajetória. `resolved-controls-cost-audit.json` acrescenta o custo por avaliação em uma repetição dos mesmos seis controles; suas energias e métricas de trajetória reproduzem exatamente as anteriores.
- `gpu-controls.json`, `gpu-binary-controls.json`, `gpu-controls.csv`: comparações com o mesmo estado inicial e parâmetros efetivos, CPU Float64 e GPU Float32. Cadência 10 Myr: máximos amostrados, sem limite sobre picos entre pontos.
- `precision-input.json`, `precision-calibration.json`: oracle Decimal-80 sobre dados binários exatos de um snapshot N=96. Calibração empírica, sem intervalo formal universal para a aritmética.
- `figures/manifest.json`: oito figuras SVG/PNG, fontes, unidades e hashes. O detalhe ampliado da figura de N=80.000 mostra o residual direto não nulo.
- `ui-export-reference.json`, `ui-export-check.json`, `ui-final-qa.json`, `previews/`: verificação funcional da interface, separada dos controles científicos; ensaio N=128. O recálculo das partículas exportadas confere as energias.
- `release-audit.json`, `code-identity.json`, `package-audit.json`: integridade, código, testes e build. `executed-source/src` conserva os arquivos da repetição antes dos últimos ajustes de metadados da interface. A versão final acrescenta época zero explícita no endpoint inicial CPU, evita cópias de acelerações desnecessárias para energia e melhora o contraste dos botões. As fórmulas e a aritmética de pares, as forças e o KDK não mudaram.

`before/` conserva a interface anterior. `interim-initial-only/` é um rascunho anterior à repetição completa, quando só o início havia sido auditado: use os relatórios finais da raiz para as conclusões. As fontes e dados AGAMA históricos não foram reclassificados como evidência desta realização legacy. Os 4.677 arquivos históricos e os 51 arquivos anteriores do núcleo permanecem intactos.

Na escala do estado inicial direto, a soma dos termos de integração e de variação do viés BH reproduz a variação da estimativa. As duas curvas exibidas usam suas próprias energias iniciais, sempre no mesmo estado físico. Nenhuma tendência, velocidade, massa ou posição foi corrigida para reduzir o gráfico.
