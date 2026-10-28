# Validação da primeira etapa 1.0.2

**Classificação: correção de campo implementada e testada; melhora preliminar em 20 Myr; candidato experimental, estabilidade longa não validada.**

Esta entrega encerra a **etapa 1 solicitada**, antes dos refinamentos e otimizações secundárias. Não certifica a estabilidade de longo prazo nem a convergência não colisional. As etapas 2–4 permanecem pendentes. Não se adotou uma porcentagem universal aceitável de espessamento.

## Evidências

- Gerador de condições iniciais realmente modificado; campo médio Plummer, ε=0,1 kpc; nove iterações convergentes; seis novos snapshots com hashes e parâmetros.
- Validação independente do operador, densidade, potencial, forças, frequências, gradientes, momentos e f(J). Erro da expansão <10⁻⁴ nas sondas da referência da mesma densidade; fechamento físico da DF tem erros maiores e explicitados.
- 21 integrações reais até 20 Myr. C-GPU N=10.000 melhora nas três sementes; média de crescimento de h50 9.082089% → 4.736551%. Não há garantia universal nem estabilidade longa.
- 96 testes Node (incluindo três sobre compatibilidade da preparação) e quatro testes Python independentes do operador. Consulte os logs `node-tests.tap` e `python-tests.txt` e a auditoria final de build/artefatos para o estado efetivamente verificado.
- 931 arquivos históricos identificados na preservação; `preservation-verification.json` é a prova da verificação final por SHA-256, não a data desta redação.

## Limites que continuam abertos

Granularidade de halo e bárions, diferenças de resolução vertical, ações aproximadas, fechamento da densidade e cinemática observacional, instabilidades coletivas, estabilidade por vários períodos, convergência de N/ε/método e integrações 200/1.000 Myr. A massa física e os priors foram preservados, mas as densidades resultantes não são exatamente idênticas aos alvos. O modelo padrão não foi substituído.

Os relatórios de refinamento descrevem protocolos pendentes e números aritméticos das massas. Não representam experimentos realizados. A sequência seguinte é halos pareados → bárions com halo fixo Plummer → seleção por convergência → integração longa. Otimização WGSL/árvore/PM permanece fora desta primeira etapa; não houve alegação de ganho de precisão por VRAM.

## Reprodução e proveniência

Consulte `reports/v1.0.2/REPRODUCAO.md`. A pasta `executed-source` contém cópias identificadas dos códigos dos ensaios; os JSON registram as fontes e hashes de entrada. O gerador recebeu uma extensão de CLI `--sample-only` e mesclagem do manifesto enquanto a solução inicial rodava. Isso não alterou o operador/iteração carregados por aquele processo. `generation-epoch-0` conserva a fonte exata reconstruída daquela época, e `preparation-scm-epoch0.json`/`protocol-scm-epoch0.json` conservam os metadados da primeira execução. A preparação corrente registra a chamada de amostragem de 10.000, cujo tempo não deve ser confundido com os 954,686 s da preparação antes da amostragem (a primeira chamada completa levou aproximadamente 978 s).

Não se relabelou o hash de uma versão posterior como se fosse o código carregado na primeira iteração. O núcleo numérico é idêntico nas duas épocas; a extensão apenas permite amostrar a solução já convergida. Os snapshots que alimentaram os ensaios permanecem intactos. `SHA256SUMS.txt` no pacote identifica os bytes entregues. Código, dados brutos e documentação são verificáveis, sem necessidade de confiar em um selo de equilíbrio.
