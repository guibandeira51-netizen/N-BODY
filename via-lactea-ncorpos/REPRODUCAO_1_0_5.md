# Reprodução 1.0.5

## Conteúdo e histórico

Esta entrega complementa o projeto preservado. Os ZIP1.0.1–1.0.4 e todos os relatórios históricos continuam intactos. O pacote 105 contém fontes, entradas efetivas, resultados novos, referências históricas usadas, controles contínuos brutos, protocolos, figuras com pontos CSV e hashes. Checkpoints parciais permanecem locais e têm hashes; resultados completos e seus estados inicial/final estão incluídos. Confira SHA256SUMS.txt no ZIP e o SHA-256 externo do arquivo. package-audit.json é um relatório externo disponível no projeto e no painel; não integra o ZIP para evitar uma referência circular ao próprio hash.

As famílias E104 e o legacy de 80000 partículas totais/Jeans+Satoh são experimentos diferentes. E/F105 mantêm a preparação física original 104 e massas; somente a população refinada é amostrada novamente. MIX é explicitamente uma tentativa 105não promovida.

## Ambiente verificado

Python: 3.12.14; AGAMA: 1.0.161 compiled on Oct 15 2026; NumPy: 2.5.4; SciPy: 1.18.1; Matplotlib: 3.11.2. Node foi registrado no manifesto de código. AGAMA é a biblioteca nativa oficial previamente compilada; sua instalação e os pacotes científicos são dependências externas, sem instalações silenciosas. O arquivo software.json registra versões; o módulo e seu código-fonte oficial precisam estar disponíveis no PYTHONPATH para recomputação nativa. As fontes AGAMA utilizadas no ambiente têm referência de commit no histórico 1.0.4. Não há garantia de bit-identidade de trajetórias Float32 em outro adaptador gráfico.

## Ordem de reprodução em uma cópia nova

1. Preserve o projeto original e verifique os hashes. Rode `node scripts/equilibrium-105/preserve.mjs --verify` somente onde o histórico completo indicado no manifesto está disponível. Ele confere arquivos e nunca atualiza o baseline. Não substitua resultados existentes para refazer uma campanha.
2. Confira preregistered-protocol.json, phase-a.json e preparation-decision.json antes de novos N. `phase-a.mjs` verifica fases, tags, massas e hashes dos controles preservados.
3. Para repetir a preparação nativa em uma pasta 105nova, execute phase-mix.py, continuous.py, analyze-continuous.mjs, ic-audit.py e jeans-qmc.py nessa ordem; todos os geradores de estados recusam sobrescrita. A análise pode ser recalculada a partir dos dados preservados. Os tempos de construção em phase-times-s*.npz são os sorteados, não tempos de uma galáxia viva.
4. Prepare controles com prepare-resolution.py --stage baryons e, somente depois da decisão física, --stage halo --families E F. O manifesto descreve sementes, contagens, massa e origem. Não há clones; blocos inalterados são copiados. A referência E/h2026 vem da mesma trajetória104, com fases verificadas.
5. Servidor estático: `node scripts/serve.mjs`, local 4180. Coletor: `node scripts/equilibrium-105/collector.mjs`, somente 127.0.0.1:4187, CORS restrito ao servidor local. Em ambientes isolados, ambos precisam estar acessíveis ao mesmo navegador. O coletor valida ID, fonte e protocolo e recusa substituir um resultado concluído diferente.
6. Abra tests/browser-equilibrium-105.html?stage=baryon200 e pressione o botão da etapa registrada. Depois use stage=pilot-F e, após medir/validar, stage=halo200. Os registros completos já presentes são lidos, não refeitos. Para recalcular as trajetórias sem substituir dados, execute, por exemplo, `node scripts/equilibrium-105/reproduce.mjs halo-F200 verificacao01` e abra a etapa `reproduce-verificacao01` no navegador. O registrador copia a hipótese e os hashes iniciais, cria IDs e família separados e marca a repetição como reprodução, não como novas sementes independentes. Nenhum dado original é apagado. Não use evaluate/automação para fabricar resultados. O botão executa o código real WebGPU e seis workers de energia.
7. Recalcule native-vertical.mjs antes de analyze.mjs; depois force-audit.mjs, force-components.mjs, collective.mjs, migration.mjs, kinetic-contrast.mjs e reference-energy-bound.mjs. `cpu-pilot.mjs` é uma triagem de força única do Barnes–HutCPU, não uma evolução certificada. `decision.mjs` exige três resultados por E/F e avalia os critérios. H só pode ser registrado com decisão de custo/precisão própria; não foi executado.
8. Rode identity.mjs antes de uma nova época de execução; hashes das fontes também são guardados por resultado. Para a entrega, rode report.py, playback.mjs e plot.py, testes com `node scripts/test.mjs`, auditoria, package.py e build. Os scripts não devem ser executados indiscriminadamente contra o histórico preservado.

## Dados e auditoria

`analysis.json` liga cada série à fonte e SHA. IDs de apresentação usam um prefixo de grupo; nativeId mantém o ID bruto. A referência E/h2026 aparece em dois grupos com interpretações distintas, sem duplicar uma integração ou aumentar n dentro de um grupo. Médias±SD e intervalos por semente estão nos JSON/CSV. Campos herdados em meta.preparation e meta.method referem-se à preparação original; meta.version105, manifestos e arrays definem a realização nova.

Toda nova força viva usa os mesmos kernels diretos e KDK. Os diagnósticos 105 usam G=Math.fround(Gnominal), epsilon=sqrt(Math.fround(0,1²)); o kernel recebe epsilon²f32. O tempo nominal de saída permanece o definido pelo protocolo; dt efetivo f32 causa uma diferença de arredondamento declarada e calculável. Controles históricos mantêm seu Hamiltoniano nominal registrado. A soma direta é Float64 compensada, com erro de aritmética finita; readback não torna a trajetória Float64. A referência E/h2026 preserva o Hamiltoniano nominal original. reference-energy-bound.json limita analiticamente a mudança de convenção dos pares Plummer para G/epsilon² efetivos, sem recomputar estados não registrados: cada razão de potencial está entre os extremos r=0 e r=infinito, e a soma de pares positivos herda esses limites. O limite de deriva é inferior ao orçamento energético; não é um limite de arredondamento da força GPU nem uma prova rigorosa de aritmética intervalar. Energia de campo fixo soma m_iPhi_ext sem fator1/2; entre pares vivos usa i<j exatamente uma vez.

O painel equilibrio105.html (arquivo `equilibrio105.html`) mostra os estados registrados, com hashes de buffers e sem interpolação. Gráficos 17 PNG/SVG/CSV cobrem as medidas reais; o gráfico de domínio orbital explicita que vários períodos não foram medidos. Escala vertical física preservada.

Hardware e tempos são de uma sessão interativa: diagnósticos e outras tarefas podem coexistir. Tempos extrapolados de pilotos não são tempos de integrações realizadas. Acesso a VRAM total e memória total do navegador não foi medido; somente buffers/estimativas e limites da API são registrados.

## Convenções e limites de interpretação

Comprimento: kpc; tempo: Myr; massa interna:10¹⁰ massas solares nominais. Energia interna:10¹⁰ M☉ kpc²/Myr². Velocidades em gráficos são convertidas para km/s; o gerador preserva a conversão nominal de G registrada na preparação. h50 é a mediana ponderada de distância absoluta ao plano próprio da população. σz usa o eixo cartesiano original; σ perpendicular e inclinações são guardadas separadamente. Espessuras globais, por anel e alturas solares da densidade contínua são grandezas diferentes.

As partículas representam macro massas, não estrelas individuais nem partículas microscópicas de matéria escura. O modelo é newtoniano, isolado e sem gás ou perturbações externas explicitamente modeladas. Massas totais não foram reajustadas. Evolução usa KDK, ε=0,1 kpc e dt nominal 0,05 Myr. Não houve amortecimento, recentering, reposicionamento, congelamento oculto, multiplicador gravitacional ou correção vertical da trajetória.

Três realizações permitem médias, desvios amostrais e intervalos t com 2 graus de liberdade; não demonstram uma distribuição assintótica. Intervalos de 95% são por indicador, sob hipótese aproximada de normalidade das médias de realização, sem garantia conjunta para todas as grandezas. Épocas correlacionadas não contam como novas sementes. Ausência de significância não equivale a equivalência.

No sistema isolado vivo, E, P e L vetorial são invariantes ideais. Nos controles com campo externo axisimétrico fixo, energia e Lz são os invariantes pertinentes; não se exige conservação de P, L vetorial ou movimento balístico do centro de massa dos traçadores/bárions. As condições de simetria estão em cada diagnóstico. A suavização Plummer é uma regularização da gravitação pontual nas escalas próximas de 100 pc; convergir em N a epsilon fixo não demonstra o limite newtoniano não suavizado.

## Fontes primárias e alcance

- [Cautun et al. 2020, Tabela 2, coluna NFW](https://arxiv.org/abs/1911.04557): referência dos parâmetros históricos de massa e escala. O modelo reduzido sem gás/CGM não é uma reprodução do ajuste observacional completo.
- [Vasiliev, AGAMA](https://arxiv.org/abs/1802.08239): funções de distribuição em ações, momentos e construção autoconsistente. A biblioteca não certifica a realização deste trabalho.
- [Ludlow et al. 2021](https://arxiv.org/abs/2105.03561): estudos publicados de aquecimento espúrio por macro partículas de halo; motivação do teste de resolução. Seus resultados não são apresentados como medições da nossa galáxia.
- [Vasiliev 2013, SMILE/Schwarzschild](https://arxiv.org/abs/1307.8116): superposição orbital com ajuste de pesos à densidade. Nosso ensaio MIX não implementa esse ajuste e não é denominado Schwarzschild completo.
- [Yurin & Springel 2014, GALIC](https://arxiv.org/abs/1402.1623): alternativa que otimiza a resposta de densidade orbital com restrições cinemáticas. Foi investigada metodologicamente, não instalada ou executada aqui; adaptação ao mesmo potencial suavizado e às restrições observacionais exigiria validação própria.
- [Toomre 1964](https://adsabs.harvard.edu/pdf/1964ApJ...139.1217T): critério local para um disco estelar idealizado. O Q calculado aqui é somente um indicador limitado.
