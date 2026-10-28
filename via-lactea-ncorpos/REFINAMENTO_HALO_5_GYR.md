# Refinamento exclusivo do halo por 5 bilhões de anos

Atualização UTC: 2026-10-22T01:31:04.848Z. Este relatório registra somente estados efetivamente calculados.

Critério solicitado: h50(5 Gyr) / h50(0) ≤ 2. Espessura inicial da sessão original = 0.16487250830671857 kpc; limite = 0.32974501661343714 kpc. Esse limite é um objetivo definido pelo usuário, não um teste universal de equilíbrio. O maior aumento amostrado a cada 100 Myr também é registrado separadamente.

| Modelo | Nh vivo | Tempo real [Myr] | h50 inicial [kpc] | Último h50 [kpc] | Aumento | 5 Gyr concluídos | Critério final |
|---|---:|---:|---:|---:|---:|---|---|
| smooth-halo-control | 0 | 5000.000 | 0.1648725 | 0.4097474 | 148.5238% | Sim | Controle, não elegível |
| halo-x2 | 26518 | 5000.000 | 0.1648725 | 1.112560 | 574.8004% | Sim | Não atingido |
| halo-x4 | 53036 | 5000.000 | 0.1648725 | 0.8229455 | 399.1405% | Sim | Não atingido |
| halo-x8 | 106072 | 5000.000 | 0.1648725 | 0.6295209 | 281.8228% | Sim | Não atingido |
| halo-x16 | 212144 | 5000.000 | 0.1648725 | 0.5218877 | 216.5402% | Sim | Não atingido |

## Comparabilidade

Os halos vivos preservam exatamente as posições, velocidades e massas capturadas de 4972 partículas do bojo e 14917 do disco, no referencial original. Sua identidade de fase é 34b47cd206b51589179207e47382dedc031c999581bcb566f1bf29886dac804b. A massa total efetivamente representada no halo é constante: multiplicar Nh por uma potência de dois divide a massa de cada partícula pela mesma potência de dois, exatamente em Float32. A distribuição NFW, raio externo, ε nominal=0,1 kpc, G e gerador legado não são ajustados para atingir o resultado. A ampliação usa novas fases do amostrador legado com semente 2026, preservando o prefixo original do halo. O alinhamento de referencial documentado ocorre somente na geração inicial das novas amostras; não há reposicionamento durante a evolução.

O controle de halo suave conserva bojo e disco vivos, substituindo somente o halo por seu campo contínuo Plummer pré-calculado, sem duplicar a massa. Uma translação constante coloca o controle no centro do perfil original; as fases relativas, massas e velocidades bariônicas são preservadas. É uma Hamiltoniana de controle distinta: energia = K + U dos pares bariônicos + Σ m Φ_halo, sem fator 1/2 na contribuição externa. O shader, a interpolação escalar e o campo foram reutilizados das validações anteriores. A aproximação de campo e seu prolongamento de massa pontual fora da grade não constituem uma solução exata nem um certificado do limite autogravitante N→∞.

## Integração, referências e checkpoints

Força direta GPU Float32 e Leapfrog KDK sem alterações. dt solicitado=0,1 Myr, dt efetivo=0.10000000149011612 Myr. 50000 passos correspondem a 5000,000074505806 Myr; os tempos efetivos completos são preservados. ε² efetivo=0.009999999776482582 kpc². As velocidades dos snapshots estão no passo completo após o último kick. Os diagnósticos de h50 não modificam as partículas.

A energia de referência é calculada diretamente em CPU Float64 com somatório compensado nos estados selecionados 0, 1000 e 5000 Myr, não a cada quadro. Seus máximos são máximos entre referências, não limites ao longo de toda trajetória. Para os halos vivos iniciados com a versão de checkpoints, 32 sondas de força do disco são confrontadas com somatório direto Float64; isso verifica pontos reais, não um limite global certificado.

Os checkpoints binários preservam exatamente os valores Float32 lidos da GPU, massas, componentes, instante, parâmetros e número global de passos; são comprimidos sem perda e protegidos por SHA256. Retomadas validam os parâmetros e o instante e recomputam as acelerações pelo mesmo kernel. Os arquivos anteriores permanecem preservados; custos de tentativas retomadas podem incluir trabalho anterior ao último checkpoint. O controle suave inicial e o primeiro ensaio x2 foram iniciados antes da adição de checkpoints.

Todos os módulos físicos confrontados com o manifesto permaneceram iguais: true. O solver não foi substituído e o gerador candidato orbital não foi promovido. Um ensaio aprovado vale para aquela realização, resolução, suavização e passo, sem certificar genericamente uma Via Láctea estável.

## Fontes e reprodução

A interpretação da dependência do aquecimento com a massa das partículas do halo segue Ludlow et al. (2021), https://arxiv.org/abs/2105.03561 , e a distinção entre relaxação discreta e evolução coletiva segue Sellwood (2013), https://arxiv.org/abs/1303.4919 . Os limiares de N desses artigos não foram impostos a este modelo.

Dados: reports/halo-5gyr/series.csv, assessment.json, manifest.json e h50-5gyr.svg. Painel de acompanhamento: reports/halo-5gyr/index.html. Capturas binárias e hashes constam no assessment.

Reprodução em uma cópia do projeto: node scripts/halo-5gyr/prepare.mjs; node scripts/halo-5gyr/dashboard.mjs; iniciar o servidor local em localhost:4180 e node scripts/halo-5gyr/collector-v2.mjs em 127.0.0.1:4192; abrir tests/browser-halo-5gyr.html e executar. O botão retoma o último checkpoint disponível do ensaio incompleto e ignora ensaios concluídos. node scripts/halo-5gyr/report.mjs consolida os estados disponíveis sem inventar tempos posteriores.


## Complemento de integridade e resolução

Os níveis disponíveis no manifesto são 2× (Nh=26518), 4× (Nh=53036), 8× (Nh=106072), 16× (Nh=212144), 32× (Nh=424288), 64× (Nh=848576), 128× (Nh=1697152). Somente os níveis com medições na tabela acima foram efetivamente executados. Preparar um arquivo inicial não equivale a integrar 5 Gyr. A massa efetiva do halo em cada potência de dois é preservada exatamente na representação Float32.

O backend opcional de soma direta em blocos divide apenas os alvos entre dispatches GPU; a sequência de fontes, a força Plummer e o KDK permanecem iguais. A regressão real com 232033 partículas, incluindo 212144 partículas de halo, encontrou igualdade bit a bit das acelerações iniciais e de posições, velocidades, massas e acelerações após dois passos. Evidências: chunked-direct-large-validation.json, chunked-direct-validation.json e checkpoint-regression.json. Esses ensaios verificam equivalência computacional específica, não equilíbrio dinâmico.

**Errata de metadados, sem alteração dos resultados brutos:** as primeiras versões do coletor enviaram G e ε efetivos ao diagnóstico Float64, mas omitiram effectiveParameters. Por isso, o campo aninhado trajectoryPrecision retornado por directEnergy pode dizer Float64. A trajetória desses ensaios foi GPU Float32, como registram os parâmetros efetivos do ensaio e os checkpoints; Float64 é a precisão do diagnóstico em CPU. A energia numérica usou os valores efetivos corretos. Os arquivos originais são preservados, e conservation-and-structure.json identifica explicitamente ambas as precisões. O coletor novo fornece os metadados completos.

A energia direta e o momento angular são diagnósticos independentes do engrossamento. As referências energéticas e as alterações de dispersão normal, raio de meia massa e massa do disco estão em conservation-and-structure.json. Nenhuma conservação energética é usada para classificar o disco como estruturalmente estável.

### Alternativa escalável avaliada e não utilizada

Foi compilado localmente o núcleo oficial falcON fornecido em https://github.com/GalacticDynamics-Oxford/pyfalcon , commit d2e2e05acb377d21b9a87d94aa8b283f52f39fca, com falcON_DOUBLE e kernel=0 (Plummer). O default do pacote usa outro kernel e não foi utilizado. O adaptador afirma em tempo de execução que sizeof(real)=8. Somente adaptações de portabilidade Windows foram feitas nos cabeçalhos; o código das forças foi preservado. A comparação de duas massas desiguais reproduziu o somatório direto ao arredondamento Float64. Contudo, nos 96 pontos efetivamente sondados do estado com 232033 partículas, θ=0,5 apresentou erro relativo L2 de aceleração de aproximadamente 0,77%; θ=0,15 reduziu-o a aproximadamente 0,053%, com custo maior. Isso não atende a uma substituição silenciosa do cálculo direto da campanha. Nenhuma trajetória de engrossamento ou aprovação foi produzida por esse solver. Resultados completos: falcon-force-calibration.json. Não se atribui a esses ensaios um limite global de erro.


## Conferência independente e custos das tentativas

node scripts/halo-5gyr/verify-final.mjs descomprime os snapshots finais disponíveis, verifica os hashes e parâmetros efetivos, confere 50000 passos no instante correto, preservação das massas individuais e contagens e recalcula h50 dos estados inicial/final. Os resultados ficam em independent-final-verification.json. Trata-se de uma execução separada da mesma definição de espessura, não de uma definição independente ou teorema de equilíbrio. O primeiro ensaio x2 não capturou um snapshot binário final; sua série medida permanece preservada, com essa limitação explicitada.

O ensaio x16 foi inicialmente iniciado com blocos de 8192 alvos, cancelado antes da primeira coleta de 100 Myr e retomado do checkpoint inicial com o kernel GPU original, mais rápido nesta resolução. A tentativa e seus arquivos são preservados. As comparações com 232033 partículas e com o estado evoluído do x8 produziram valores idênticos bit a bit entre organizações de dispatch. A variante de 128 fontes por bloco também foi avaliada e não selecionada. Evidências: source-tile-validation.json e wide-target-validation.json. Os tempos desses microensaios incluem competição com a simulação independente em andamento.

Os custos computeMs, diagnosticMs e wallMs são registrados junto às coletas. Trabalho de tentativas interrompidas depois da última coleta pode não estar incluído. Portanto, os valores não são uma contabilidade exata de todo o tempo de computador gasto nesta investigação.


## Continuação local da campanha

A revisão v4-automatic-staged-direct-independent-final-check carrega os níveis 2, 4, 8, 16, 32, 64, 128 e ignora os ensaios já concluídos. Os níveis ainda sem séries medidas são somente estados iniciais preparados. A sequência usa o coletor local scripts/halo-5gyr/collector-v3.mjs em 127.0.0.1:4193. Após cada novo halo vivo chegar a 50000 passos, o executor aguarda a conferência independente dos arquivos inicial/final pelo endpoint /verify; a aprovação requer coincidência do identificador, hash final e resultado. Ao atingir o critério final verificado, a sequência para. Se esgotar os níveis planejados ou houver erro de dispositivo/memória/verificação, informa essa condição, sem inventar aprovação. A lista de níveis não é uma resolução mínima demonstrada nem uma garantia de êxito.

O x16 foi retomado do checkpoint sincronizado de 1 Gyr para carregar essa revisão. A retomada não muda os estados já medidos e só recompõe a aceleração pelo mesmo kernel. Os níveis a partir de x32 usam blocos de 65536 alvos; a ordem crescente de fontes, a suavização, a precisão Float32 e os passos KDK são mantidos. As sondas diretas Float64 nos estados efetivos registram a precisão da força na resolução executada. As validações de equivalência pertencem ao dispositivo local informado; não são uma garantia bit a bit entre fabricantes ou arquiteturas.

Serviços em execução local podem ser mantidos por scripts/halo-5gyr/start-local-service.ps1, com -Service serve, collector ou consolidator, após conferir que não há outro processo nas respectivas portas. São processos locais, sem serviço de inicialização do sistema, agendamento de conversa ou publicação remota. O consolidador atualiza apenas tabelas/figuras derivadas quando chega uma nova medição. Para continuar a integração, o aplicativo e a aba do executor precisam permanecer abertos; os instantes físicos decorrem dos passos efetivos, não do relógio de parede. Uma retomada posterior usa o último checkpoint íntegro.

A sequência finita pode exigir horas ou dias conforme N cresce: a soma direta continua O(N²). Não há resultado de 5 Gyr para um nível ainda parcial, nem resolução escolhida por extrapolação do gráfico.
