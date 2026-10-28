Versão **1.0.1 — investigação de estabilidade e conservação**: [fundamentação matemática](ESTABILIDADE_E_CONSERVACAO_TCC.md), [energia](AUDITORIA_ENERGIA_1_0_1.md), [equilíbrio axisimétrico](EQUILIBRIO_AXISIMETRICO_1_0_1.md), [convergência](CONVERGENCIA_NUMERICA_1_0_1.md), [comparação AGAMA](COMPARACAO_AGAMA_1_0_1.md) e [reprodução](reports/v1.0.1/REPRODUCAO.md). O [painel de validação](equilibrio.html) apresenta três avaliações independentes. KDK direto Float64 demonstrou convergência de segunda ordem no domínio de referência; o equilíbrio estrutural e a convergência global da galáxia permanecem NÃO VALIDADOS. Resultados históricos, massas físicas e integradores foram preservados.

Versão em preparação científica **1.0.0-rc.1**: [laboratório do candidato AGAMA](equilibrio.html), [massas e incertezas](MASSAS_VIA_LACTEA_1_0.md), [condições iniciais](CONDICOES_INICIAIS_1_0.md), [validação efetiva](VALIDACAO_EQUILIBRIO_1_0.md), [comparação com 0.9](COMPARACAO_09_10.md) e [limitações físicas](LIMITACOES_FISICAS.md). O candidato possui funções de distribuição e potencial reconstruído offline pelo AGAMA real. Não foi promovido a modelo de equilíbrio certificado. O simulador histórico continua na página inicial, preservado para comparação; a página do candidato contém exportação da execução, pacote científico, JSON brutos complementares e CSV para revisão externa. Há dois candidatos: o controle inicial e o de mediana vertical calibrada. Os resultados e limitações são quantitativos; ver REPRODUCAO_AGAMA_WINDOWS.md para o ambiente real.

Referência **0.9.0**: [validação e reprodução](VALIDACAO_09.md), [aquecimento](AQUECIMENTO_DISCO.md), [halos A/B/C](COMPARACAO_HALOS.md) e [estrutura azimutal](ESTRUTURA_ESPIRAL.md). Diagnósticos no plano instantâneo e campanha controlada; equilíbrio global ainda não demonstrado. Os registros abaixo preservam a história do projeto.

Versão 0.8.0: consulte AUDITORIA_MASSAS.md, EQUILIBRIO_INICIAL.md, COMPARACAO_07_08.md e VALIDACAO_08.md. Massas/forças verificadas; novo equilíbrio ainda não demonstrado.

> Atualização 0.7.0: [Laboratório de Estabilidade Galáctica](ESTABILIDADE_GALACTICA.md). Consulte esse documento e `reports/laboratory/` para os ensaios atuais. O conteúdo abaixo registra a revisão anterior.

# Via Láctea — N-corpos autogravitante

Versão **0.6.0** do projeto de TCC de **GUILHERME ALEIXO BANDEIRA**, Universidade Estadual de Mato Grosso do Sul — UEMS. Esta aplicação apresenta uma galáxia idealizada com partículas massivas de bojo, disco e halo de matéria escura. Os cálculos gravitacionais, a integração temporal e a renderização ocorrem no computador de quem abre o site.


## Executar localmente

O desenvolvimento e o servidor de prévia usam Node.js 20.11 ou posterior. O navegador de um visitante do site publicado não precisa instalar Node.js. A aplicação não depende de pacotes JavaScript externos para executar ou construir o site.

Na pasta que contém `package.json`, execute:

```powershell
node scripts/serve.mjs
```

Abra **http://localhost:4180/**. No Windows, `INICIAR_WINDOWS.cmd` executa o mesmo servidor. Mantenha o terminal aberto; `Ctrl+C` encerra a prévia. O servidor escuta em `127.0.0.1`, acessível pelo nome `localhost`, apenas neste computador.

Para escolher outra porta no PowerShell:

```powershell
$env:PORT = '4190'
node scripts/serve.mjs
```

Use um navegador com WebGL2. A integração GPU depende da disponibilidade real de WebGPU no navegador, em uma origem local ou HTTPS. A CPU calcula em um Web Worker e fornece a alternativa quando WebGPU está indisponível. Abra o projeto pelo servidor HTTP; módulos, Workers e APIs de GPU não devem depender da abertura de `index.html` por `file://`.

## Controles essenciais

O site inicia diretamente no simulador N-corpos sintético.

- **Quantidade N:** define o total de partículas massivas da realização. Não há um teto universal de N. Estimativas de memória, limites dos buffers e medições de custo podem impedir uma tentativa incompatível com os recursos disponíveis.
- **Backend e algoritmo:** a CPU oferece força direta e Barnes–Hut em Float64; a GPU oferece força direta WGSL em Float32. A escolha automática se baseia em medições locais e nas restrições reais do dispositivo.
- **Passo temporal, suavização e abertura da árvore:** os padrões são `dt=0,1 Myr`, `epsilon=0,1 kpc` e `theta=0,5`. A abertura aplica-se ao método Barnes–Hut. São parâmetros numéricos iniciais, que precisam de estudos de sensibilidade para cada experimento.
- **Iniciar, pausar e reiniciar:** o início calcula a evolução; a pausa preserva o estado após concluir o passo pendente; o reinício gera novamente a realização na época inicial. Alterar a quantidade de corpos ou os parâmetros prepara um novo experimento, sem inserir massas na realização que já evoluiu.
- **Aba inativa:** a execução é pausada e o passo pendente pode terminar. O estado permanece em memória; ao retornar, **Iniciar** continua a mesma realização. Fechar ou recarregar a página libera os recursos e perde o estado. Esta versão não grava checkpoints nem mantém uma linha temporal persistente.
- **Componentes visuais:** bojo, disco e halo podem ser exibidos ou ocultados. A seleção afeta o desenho. As partículas do halo continuam na gravitação quando a camada está oculta; matéria escura está invisível por padrão.
- **Câmera:** arraste para orbitar e use a roda ou o gesto de pinça para zoom. As vistas superior, lateral e livre ajudam a observar espessura, profundidade e extensão. O enquadramento do disco e o do halo têm escalas diferentes.

O tempo físico avança somente quando passos Leapfrog são concluídos. A câmera e o desenho não aplicam uma rotação artificial ao sistema físico. **FPS** mede o desenho; **ms/passo** mede a duração das integrações concluídas; **Myr/s** relaciona avanço físico e tempo real. O passo físico não depende do FPS. Mais tempo de processamento calcula mais evolução; isso não aumenta automaticamente a precisão nem a resolução N-corpos.

O agendamento agrupa até 32 passos completos para amortizar mensagens e espera de filas, usando uma meta operacional de aproximadamente 20 ms por lote. Isso não modifica N, `dt`, forças ou precisão. Uma pausa aguarda o lote pendente e atualiza o diagnóstico na época final. O contador de cálculo mede trabalho do Worker na CPU, incluindo empacotamento e diagnósticos; na GPU mede integração e espera da fila, sem readback. Seus alcances diferentes não permitem comparar esses contadores como benchmarks idênticos.

**Corpos integrados** conta a população física completa. A seleção para desenho pode contar menos corpos após ocultar componentes, e a câmera pode recortar outros fora do campo. Cada ponto desenhado corresponde a uma partícula física; não são acrescentadas cópias para aumentar a densidade aparente.

As estimativas de memória excluem custos do driver, canvas, fragmentação e outros programas. O navegador normalmente não informa a quantidade efetivamente disponível de VRAM; detectar WebGPU não demonstra que uma resolução específica será viável.

O ensaio inicial mede 512 corpos na CPU e na GPU disponível. Uma medição GPU de 10.000 corpos pode ser feita se as restrições de recursos e a projeção de custo permitirem. Na escolha automática, um piloto GPU no N pedido é medido antes de confirmar esse backend, e o estado é restaurado à época inicial após o piloto. As projeções do método direto usam custo quadrático; as da árvore usam uma aproximação N log N. Elas orientam tentativas e continuam identificadas como estimativas.

Uma projeção direta acima de 2 s/passo é recusada como política operacional de resposta e prevenção de passos gráficos muito demorados. Esse limiar depende da medição no dispositivo; não é um máximo fixo de partículas nem critério de precisão física. Barnes–Hut oferece a alternativa escalável na CPU.

## Modelo físico e unidades

As três componentes seguem os perfis Hernquist (bojo), Miyamoto–Nagai (disco) e NFW com truncamento suave finito (halo). Todas as partículas possuem massa, posição e velocidade. A evolução calcula a força das posições instantâneas dessas partículas e usa Leapfrog Kick–Drift–Kick. A curva e o potencial contínuos entram na preparação das condições iniciais e nos controles de referência, sem adicionar uma segunda vez a mesma massa ao campo discreto.

Unidades internas: **kpc**, **Myr** e **10^10 massas solares nominais**. Velocidades são expressas em kpc/Myr e convertidas para km/s quando apresentado um valor nessa unidade. A aceleração é kpc/Myr². Constantes, equações e conversões estão documentadas em `PARAMETROS_E_FONTES.md` e implementadas em `src/physics/constants.js`.

| Componente | Massa e escalas preservadas |
|---|---|
| Bojo Hernquist | Massa total `5×10^9 Msun`; escala `1 kpc` |
| Disco Miyamoto–Nagai | Massa total `6,8×10^10 Msun`; escalas `a=3 kpc`, `b=0,28 kpc` |
| Halo NFW | Massa de escala `5,4×10^11 Msun`; raio de escala `15,62 kpc` |

A massa de escala NFW não é a massa total do halo. A convenção de truncamento preservada determina `r200c≈206,626 kpc`, encerra suavemente a densidade em `1,2 r200c≈247,951 kpc` e possui massa efetivamente integrada de aproximadamente `9,76316×10^11 Msun`. A largura do truncamento é uma escolha numérica documentada.

As massas e escalas foram adotadas na primeira implementação a partir de Gala MilkyWayPotential v1 reduzido às três componentes; o TCC descreve os perfis, mas não fornece uma tabela completa desses valores. O documento de parâmetros registra a fonte histórica e a omissão do núcleo adicional do modelo de referência. A simplificação mantém esses valores; não redefine um ajuste observacional da Via Láctea.

Mudar N divide as mesmas massas físicas entre outro número de macro partículas. Essas partículas não representam estrelas individuais nem partículas elementares de matéria escura. Com halo, a alocação de resolução padrão é aproximadamente 15% bojo, 45% disco e 40% halo, com arredondamento. Essas porcentagens não são frações da massa galáctica.

Velocidade circular `v_c`, componente azimutal `v_phi` e módulo tridimensional `|v|` são grandezas diferentes. No plano, `v_c²=R ∂Phi/∂R`; as contribuições das componentes somam em `v_c²`. A distribuição de velocidades das partículas inclui dispersão e não se reduz a colocar todos os corpos em órbitas circulares.

## Condições iniciais e conservação

A densidade do disco é a de Miyamoto–Nagai, sem substituição por um disco exponencial. Bojo e halo têm amostragem esférica dos perfis implementados. Não foram introduzidos braços espirais, barra ou órbitas decorativas para produzir uma aparência específica. O modelo inicial é aproximadamente axisimétrico; estruturas que surgirem na evolução precisam ser estudadas em termos de dinâmica, resolução e ruído numérico.

As velocidades iniciais usam momentos aproximados de Jeans, decomposição de Satoh e Gaussianas locais. As componentes esféricas usam uma aproximação de monopolo para a contribuição do disco. Essa preparação não constitui uma função de distribuição estacionária exata.

**O equilíbrio prolongado da galáxia inicial permanece sem certificação.** A auditoria histórica documentou acomodação do bojo e aquecimento do disco, mesmo quando a energia foi bem conservada. Um teste curto de conservação ou uma comparação CPU/GPU não valida estabilidade durante vários tempos dinâmicos. Esses limites devem acompanhar resultados apresentados no TCC.

O diagnóstico de energia usa o potencial de Plummer coerente com a força suavizada. Um diagnóstico feito por Barnes–Hut tem potencial aproximado, identificado como energia de árvore. Momento linear e angular são normalizados por escalas iniciais não nulas, pois seus valores líquidos podem começar próximos de zero. A época do diagnóstico aparece no painel. Os erros permanecem visíveis durante a evolução; não há um corte de energia universal usado como certificação ou pausa automática. Estados numericamente inválidos e perdas do dispositivo interrompem os cálculos.

## Implementação e desempenho

| Área | Arquivos principais |
|---|---|
| Unidades, perfis e condições iniciais | `src/physics/constants.js`, `models.js`, `initial.js` |
| Força direta e octree tridimensional | `src/physics/forces.js` |
| Leapfrog KDK e grandezas conservadas | `src/physics/integrator.js`, `diagnostics.js` |
| CPU fora da interface | `src/compute/worker.js` |
| Gravitação paralela WebGPU | `src/compute/gpu.js` |
| Limites e medições do dispositivo | `src/compute/capability.js` |
| Visualização e câmera | `src/render/webgl-renderer.js`, `gpu-renderer.js`, `camera.js` |
| Controles e agendamento | `src/main.js` |

A força direta tem custo quadrático em N. A CPU Barnes–Hut reduz o custo por aproximação espacial calibrada contra a força direta; sua abertura não conserva momento exatamente por construção. A GPU desta versão calcula força direta e ainda não possui árvore Barnes–Hut, Particle-Mesh ou FMM. Para N grande, o algoritmo importa tanto quanto a presença da GPU.

A GPU calcula e desenha usando buffers físicos compartilhados; leituras para diagnóstico são periódicas. A CPU mantém o estado físico em Float64 no Worker e transmite as posições de desenho em intervalos próprios. Detectar WebAssembly, SIMD ou processadores lógicos não significa que esses recursos sejam utilizados pelo kernel de força; a implementação CPU atual é JavaScript em um Worker.

## Reproduzir os ensaios

Na mesma pasta do projeto, sem instalar pacotes JavaScript:

```powershell
node --test
node scripts/validate-galaxy.mjs
node scripts/audit-initial.mjs
node scripts/benchmark.mjs 1000 10000 100000
```

Os scripts de validação e benchmark executam integrações reais e escrevem relatórios em `reports/`. O benchmark CPU usa dois passos de aquecimento e a mediana de três amostras com três passos cada, excluindo geração, força inicial, diagnósticos e desenho. N alto pode exigir preparação e passos demorados. Os tempos em Node não demonstram a mesma resolução ou velocidade no navegador.

Com o servidor ativo, abra **http://localhost:4180/tests/browser-gpu.html** para os ensaios reais WebGPU. A página executa os casos de comparação com a referência CPU Float64 e permite exportar os resultados. Se o navegador não disponibilizar a API ou o dispositivo, o ensaio deve ser registrado como não executado.

`VALIDACAO.md` identifica os resultados históricos do protótipo 0.1.0 e seu alcance. `VALIDACAO_ATUAL.md` registra separadamente os ensaios da simplificação, e `AUDITORIA_MOTOR.md` relaciona o funcionamento do motor aos custos medidos. Não interpretar um relatório histórico como nova medição da sessão atual.

Nesta atualização, **42 testes Node passaram** e os sete ensaios de fronteira WebGPU foram aprovados. A mesma realização de 1.000 corpos foi comparada entre CPU direta e GPU direta por 10 Myr. Os benchmarks atuais mediram até 100.000 corpos: aproximadamente **3.033,54 ms/passo em CPU Barnes–Hut Float64** e **47,36 ms/passo em GPU direta Float32** no host utilizado. São medições curtas de integração, com métodos e precisões distintos, sem renderização ou diagnóstico. Os relatórios registram o alcance exato dos ensaios.

A nova auditoria estrutural reproduziu o limite físico relevante: em N=2.000 e 20 Myr, com halo, a altura mediana absoluta do disco cresceu **59,88%** e o raio de meia massa do bojo **45,04%**, enquanto o erro final de energia foi `7,89×10^-5`. O motor está verificado nos cenários documentados, mas o equilíbrio prolongado da realização não está demonstrado.

## Baixar resultados para revisão

Os downloads ao fim da página geram arquivos localmente. O relatório inclui configuração, semente, backend, algoritmo, quantidade efetiva de corpos, tempos e último diagnóstico disponível. A exportação das partículas pausa a execução e espera o passo pendente, para registrar um estado físico consistente com massas, posições e velocidades.

Os resultados da sessão e os relatórios de referência devem estar identificados separadamente. Quando a simulação ainda não foi preparada, a ausência de estado físico deve estar registrada. CSVs informam unidades nos cabeçalhos; JSON e Markdown preservam os parâmetros e limites de interpretação para revisão em outro chat. Não há envio automático dos arquivos para serviços externos.

Exportar todas as partículas pode exigir memória adicional; a alternativa de relatório sem a tabela física é apropriada quando o estado é grande. O arquivo baixado registra um resultado para análise, sem implicar que a execução pode ser retomada automaticamente a partir dele.

## Build e publicação manual

Para preparar os arquivos estáticos:

```powershell
node scripts/build.mjs
```

O resultado deve conter `dist/index.html`, estilos, módulos, recursos de identidade e relatórios necessários aos downloads. `npm run build` executa o mesmo script. A hospedagem fornece esses arquivos; a integração continua local ao navegador.

Para publicar manualmente na Vercel, envie esta pasta ao repositório escolhido e importe-o. **Root Directory** deve apontar para a pasta que contém `package.json` e `vercel.json`. Use framework **Other**, comando `npm run build` e diretório de saída `dist`. `vercel.json` fornece o comando de build, a saída e os cabeçalhos de isolamento. Confira a conclusão do build e a existência de `dist/index.html` nos registros da publicação.

Antes da remoção, o desenvolvimento anterior foi preservado na branch Git `archive/gaia-before-synthetic-cleanup`, commit `0e963bd6004eb5cdeb9148c99097c998792a6b7e`. O arquivo separado `via-lactea-gaia-preservado.bundle` permite recuperar essa história sem depender de uma hospedagem remota. A implementação arquivada não compõe o aplicativo principal nem o pacote de execução. Esta entrega prepara os arquivos locais para a publicação manual; não efetua implantação remota na conta do usuário.

