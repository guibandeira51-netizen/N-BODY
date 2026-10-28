Versão atual **0.9.0**: [validação e reprodução](VALIDACAO_09.md), [aquecimento](AQUECIMENTO_DISCO.md), [halos A/B/C](COMPARACAO_HALOS.md) e [estrutura azimutal](ESTRUTURA_ESPIRAL.md). Diagnósticos no plano instantâneo e campanha controlada; equilíbrio global ainda não demonstrado. Os registros abaixo preservam a história do projeto.

Versão 0.8.0: consulte AUDITORIA_MASSAS.md, EQUILIBRIO_INICIAL.md, COMPARACAO_07_08.md e VALIDACAO_08.md. Massas/forças verificadas; novo equilíbrio ainda não demonstrado.

> Atualização 0.7.0: [Laboratório de Estabilidade Galáctica](ESTABILIDADE_GALACTICA.md). Consulte esse documento e `reports/laboratory/` para os ensaios atuais. O conteúdo abaixo registra a revisão anterior.

# Validação da atualização sintética — 0.6.0

Registro dos ensaios da simplificação de 11 de outubro de 2026 no horário local; os JSON registram timestamps UTC. A aplicação principal foi reduzida à simulação autogravitante sintética de bojo, disco e halo. A implementação anterior foi preservada antes da remoção na branch `archive/gaia-before-synthetic-cleanup`, commit `0e963bd6004eb5cdeb9148c99097c998792a6b7e`, com bundle Git separado para recuperação.

## Regressão e preservação do modelo

Após a limpeza, 35 testes Node passaram e o build estático concluiu. A suíte da atualização passou com **42 testes, zero falhas**, incluindo quatro testes adicionais de guardas numéricos/arrays e três de transferência visual/câmera. Registro bruto: [reports/test-results.tap](reports/test-results.tap).

Os testes remanescentes cobrem força direta, árvore tridimensional, exclusão de auto interação, gradiente do potencial, convergência e reversibilidade KDK, conservação em problemas controlados, distribuição das componentes, massas preservadas ao alterar N, semente e recursos; incluem a integridade ZIP/CSV e cópias usadas na exportação. Catálogos, traçadoras e testes observacionais exclusivos foram retirados da aplicação principal.

Os SHA-256 de `src/physics/constants.js`, `models.js` e `initial.js` coincidem byte a byte com o commit arquivado. Massas, escalas, unidades e preparação das condições iniciais foram preservadas. A conferência e a síntese dos ensaios estão em [reports/validation-summary-current.json](reports/validation-summary-current.json).

O build gera arquivos estáticos. Seu resultado verifica dependências e montagem do aplicativo, sem ampliar o alcance da validação física. Os cálculos continuam locais ao navegador.

## Critérios numéricos e seu alcance

| Verificação | Evidência exigida | Interpretação |
|---|---|---|
| Massa por componente | Mesma massa física em diferentes N e durante os passos | Alterar a resolução não deve criar massa |
| Força direta e potencial Plummer | Comparação com expressão analítica, simetria e gradiente | Coerência da força implementada e do diagnóstico direto |
| Barnes–Hut | `theta=0` contra soma direta e tendência de erro ao diminuir abertura | A aproximação deve ser calibrada para a distribuição usada |
| Leapfrog | Órbita controlada, refinamento de passo e reversibilidade | Ordem numérica e conservação nos cenários testados |
| CPU versus GPU | Mesma realização, parâmetros efetivos f32 e erros absolutos/relativos | Tolerâncias de um ensaio finito; não certificam evolução secular |
| Reprodutibilidade | Mesma semente e configuração | Reprodução das condições iniciais |
| Estrutura galáctica | Perfis, quantis e dispersões em tempos iguais, diferentes N/dt/epsilon/sementes | Conservação isolada não demonstra equilíbrio |

As tolerâncias dos testes controlados não são limites universais para qualquer N, duração ou encontro. A massa total é preservada pelo estado de massas; energia e momento exigem medir o erro. Barnes–Hut usa uma aproximação dirigida de força e de potencial, e pode violar a conservação exata de momento. A referência CPU direta usa Float64; o backend GPU usa Float32 com arredondamentos registrados.

Os diagnósticos de conservação permanecem visíveis. A interface não interrompe a execução por um percentual universal de energia: a interpretação dos erros depende do cenário, algoritmo, suavização, precisão e duração. Guardas para estados inválidos e falhas do dispositivo continuam interrompendo os cálculos.

## Força Barnes–Hut versus soma direta

Mesma realização inicial com N=1.000, semente 2026, halo e `epsilon=0,1 kpc`. Erro RMS normalizado: `sqrt(sum |a_BH-a_direta|² / sum |a_direta|²)`. Novo ensaio em [reports/validation-galaxy.json](reports/validation-galaxy.json).

| Abertura | Erro RMS de força |
|---:|---:|
| 0,8 | 1,41146×10^-2 |
| 0,5 | 2,57757×10^-3 |
| 0,3 | 3,35870×10^-4 |
| 0,1 | 4,63799×10^-6 |

A abertura padrão produziu cerca de 0,258% de erro RMS nesse estado. Essa calibração não é uma garantia para qualquer distribuição ou época. Os testes de `theta=0` conferem a árvore contra a soma exata.

## CPU e GPU: conservação e precisão

Os **sete casos WebGPU N=1, 2, 63, 64, 65, 257 e 1.024 passaram** no navegador, incluindo grupos incompletos e as fronteiras do bloco de 64. Referência CPU Float64, oito passos KDK de `dt=0,05 Myr`, `epsilon=0,1 kpc`. No caso N=1.024, erro RMS de força `6,87945×10^-7`. Os limites RMS relativos dos casos são força `5×10^-4`, posição `2×10^-5` e velocidade `5×10^-4`; o relatório identifica parâmetros e resultados por caso. [reports/validation-webgpu.json](reports/validation-webgpu.json)

A comparação galáctica usou **a mesma realização com N=1.000, halo, semente 2026, soma direta, 100 passos de 0,1 Myr**, alcançando 10 Myr. Ela foi aprovada nos limites registrados: força `10^-3`, posição `10^-4`, velocidade `2×10^-3`, em RMS relativo. [reports/validation-galaxy-webgpu.json](reports/validation-galaxy-webgpu.json)

| Comparação ou conservação final | Resultado |
|---|---:|
| Força inicial GPU versus CPU, RMS relativo | 5,56310×10^-7 |
| Posição final, RMS relativo | 3,01470×10^-6 |
| Velocidade final, RMS relativo | 1,23929×10^-6 |
| Posição final, RMS vetorial na seleção r inicial <30 kpc | 0,00325439 pc |
| Posição final, máximo vetorial nessa seleção | 0,0212362 pc |
| Velocidade final, máximo vetorial nessa seleção | 0,00308027 km/s |
| Erro relativo final de energia CPU / GPU | 9,55732×10^-6 / 9,66898×10^-6 |
| Erro normalizado final de momento angular CPU / GPU | 1,97156×10^-16 / 1,16313×10^-7 |
| Erro relativo final de massa CPU / GPU | 0 / 0 |

A conservação de cada precisão usa sua própria referência inicial; a conversão para f32 já arredonda massas e coordenadas. A energia foi recalculada com potencial Plummer direto. As caudas não truncadas de Hernquist e Miyamoto–Nagai têm partículas distantes com erro absoluto de posição maior em f32: máximos vetoriais de 11,62 pc no bojo e 5,264 pc no disco. Um RMS global pequeno não dispensa inspeção espacial. Este ensaio de 10 Myr não valida precisão em Gyr.

## Auditoria estrutural executada novamente

Os novos [reports/validation-galaxy.json](reports/validation-galaxy.json) e [reports/initial-audit.json](reports/initial-audit.json) registram os ensaios físicos; a síntese contém configuração, conservação e percentis por componente. Semente 2026, CPU Barnes–Hut, `theta=0,5`, `epsilon=0,1 kpc`, `dt=0,1 Myr`. A tabela mostra **erro final versus inicial**, com potencial direto Plummer nas duas épocas; não são máximos ao longo da trajetória.

| Modelo e N | Tempo | Erro relativo de massa | Erro relativo de energia | Erro de P normalizado | Erro de L normalizado |
|---|---:|---:|---:|---:|---:|
| Sem halo, 2.000 | 20 Myr | 0 | 1,29599×10^-4 | 3,33206×10^-18 | 4,54775×10^-5 |
| Com halo, 2.000 | 20 Myr | 0 | 7,89259×10^-5 | 4,79638×10^-18 | 1,30320×10^-5 |
| Com halo, 10.000 | 10 Myr | 0 | 2,35268×10^-5 | 1,68861×10^-18 | 3,57566×10^-6 |

P é normalizado pela soma inicial `sum m|v|`; L pela soma inicial `sum |m r×v|`. A simetria antipodal inicial ajuda a explicar P muito pequeno nesses casos. Ela não prova conservação exata de Barnes–Hut para uma distribuição geral.

No caso com halo N=2.000 em 20 Myr, o raio esférico de meia massa do bojo foi de **2,075400 para 3,010058 kpc (+45,04%)**. A altura mediana absoluta do disco foi de **0,172080 para 0,275124 kpc (+59,88%)**. O raio de meia massa do halo foi de **71,794559 para 71,703711 kpc (-0,127%)**. A pequena mudança desse percentil do halo nesse intervalo não certifica sua distribuição inteira ou estabilidade prolongada.

Diminuir `dt` para 0,05 Myr repetiu o reajuste em 20 Myr: bojo +45,03% e altura do disco +59,88%. Usar `epsilon=1 kpc` reduziu o erro de energia para `9,97406×10^-6`, mas o bojo cresceu 63,72% e o disco 81,07% nas mesmas métricas. Menor deriva de energia não resolve o equilíbrio da condição inicial nem justifica mudar a suavização para esconder aquecimento.

Há uma comparação estrutural em **tempos iguais de 10 Myr**: N=2.000 apresentou bojo +16,88% e altura do disco +14,40%; N=10.000 apresentou +4,21% e +11,70%. Isso mostra dependência de resolução nesses ensaios. Uma única semente e duas resoluções não estabelecem convergência estatística ou equilíbrio secular. Partículas de realizações diferentes não foram comparadas por índice como se fossem uma mesma trajetória.

## Benchmarks atuais

CPU: Node v24.19.0, Windows, Ryzen 7 5700X, 16 processadores lógicos; Float64. Dois passos de aquecimento, mediana de três amostras com três passos cada, `dt=0,1 Myr`, `epsilon=0,1 kpc`, `theta=0,5`, semente 2026. Geração, cópia, força inicial, aquecimento, diagnósticos e desenho ficam fora do tempo por passo. [reports/benchmark-cpu.json](reports/benchmark-cpu.json)

| N integrado | CPU direta f64 | CPU Barnes–Hut f64 |
|---:|---:|---:|
| 1.000 | 4,3209 ms/passo | 6,3811 ms/passo |
| 10.000 | 419,2925 ms/passo | 176,1767 ms/passo |
| 100.000 | Não executado | 3.033,5360 ms/passo |

A medição direta CPU foi contida em N≤10.000 pelo custo quadrático desse benchmark; isso não limita o motor ou o N da interface. Todos os estados medidos terminaram finitos após 1,1 Myr, dos quais 0,9 Myr correspondem aos nove passos incluídos nas amostras. Tempos Node não demonstram execução em tempo real no navegador.

GPU: adaptador exposto AMD rdna-3; soma direta f32; mesmos `dt`, `epsilon` e semente nominais. Dois passos de aquecimento e mediana de três amostras de três passos cada. O tempo inclui submissão e `queue.onSubmittedWorkDone`; geração, upload/força inicial, readback, diagnóstico e desenho são excluídos. Modelo comercial e VRAM instalada não foram revelados pelo navegador. [reports/benchmark-gpu.json](reports/benchmark-gpu.json), [reports/benchmark-gpu-100000.json](reports/benchmark-gpu-100000.json)

| N integrado | GPU, lote de 1 | GPU, lote de 3 |
|---:|---:|---:|
| 1.000 | 2,4767 ms/passo | 0,7900 ms/passo |
| 10.000 | 3,3633 ms/passo | 2,7817 ms/passo |
| 100.000 | Não executado | 47,3617 ms/passo |

Em N=1.000 e 10.000, os hashes das posições e velocidades finais coincidiram entre lotes de um e três passos. A redução de espera observada motivou o agrupamento adaptativo de passos completos; não houve mudança de N, `dt` ou força. Em N=100.000 o estado final foi finito após 1,1 Myr, mas não foi executada referência direta Float64 nessa resolução ou auditoria estrutural longa. Os métodos e precisões CPU/GPU são diferentes; estes números não são uma comparação de algoritmos com precisão idêntica.

## Interface, desenho e alcance dos testes

O comportamento implementado preserva o estado ao pausar ou ocultar a aba. O lote pendente conclui, seguido de snapshot e diagnóstico na época final; **Iniciar** retoma a mesma realização. Reiniciar ou mudar a configuração prepara outra realização desde t=0. O halo está oculto por padrão e continua na gravitação. Os filtros alteram somente o desenho. A exportação completa espera o trabalho pendente e captura as mesmas partículas físicas; o relatório sem estado informa essa ausência.

O pipeline WGSL de desenho dos buffers compartilhados foi submetido com N=65 e conferido visualmente: três estilos de componentes, sem mensagens de erro nesse ensaio. Registro: [reports/validation-render-webgpu.json](reports/validation-render-webgpu.json). É um teste controlado de renderização, não outra demonstração de estabilidade galáctica ou um benchmark completo da interface. Os testes unitários de câmera/transferência conferem limites visuais e preservação das coordenadas físicas.

A revisão funcional da aplicação principal conferiu preparo, pausa, retomada sem reinício, reinício em t=0, filtros, três orientações, identidade UEMS e ausência de transbordamento em desktop e tela estreita. O diagnóstico após a pausa corresponde à mesma época física do estado. Registros: [reports/browser-ui.json](reports/browser-ui.json) e [reports/review-export-validation.json](reports/review-export-validation.json). O ZIP efetivamente baixado passou em CRC e hashes de 56 arquivos de referência; seu CSV contém os 10.000 corpos, incluindo os 4.000 do halo oculto, com campos finitos e época consistente. A evolução GPU observada durante essa revisão da interface não é um novo ensaio controlado de estabilidade estrutural.

## Estabilidade galáctica: limite preservado

`VALIDACAO.md` permanece como registro histórico do protótipo 0.1.0. Os ensaios atuais reproduziram a limitação estrutural documentada naquele registro, e estão identificados acima com seus novos arquivos. Não usar tempos de benchmark antigos como medição desta atualização.

Esse limite é relevante para a versão atual porque o modelo e a preparação Jeans aproximada foram preservados. Um desenho mais legível não resolve o equilíbrio inicial. Mesmo testes do integrador, forças e precisão CPU/GPU aprovados não certificam estabilidade prolongada das três componentes.

Ainda são necessários ensaios estruturais por múltiplos tempos dinâmicos, várias sementes e resoluções, com controles de `dt`, `epsilon`, abertura e truncamento. Não se afirma que uma imagem, uma boa conservação ou uma curva do modelo com halo constitua detecção direta de uma partícula de matéria escura.

## Reprodução

```powershell
node --test
node scripts/validate-galaxy.mjs
node scripts/audit-initial.mjs
node scripts/benchmark.mjs 1000 10000 100000
node scripts/build.mjs
```

Para executar os ensaios GPU, inicie `node scripts/serve.mjs`, abra `http://localhost:4180/tests/browser-gpu.html` e exporte o JSON da página. API indisponível deve produzir registro de ensaio não executado. O pacote não contém dependências de catálogo ou consultas observacionais.
