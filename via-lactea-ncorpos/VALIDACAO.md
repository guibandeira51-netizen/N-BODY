# Validação e estado científico — protótipo 0.1.0

Esta entrega contém um motor autogravitante funcional, medições reais e uma auditoria das condições iniciais. **Os testes do motor passaram nos cenários abaixo. O equilíbrio prolongado da galáxia inicial não está validado.** A expansão do bojo e o aquecimento do disco observados precisam ser resolvidos ou caracterizados antes de usar integrações longas como resultado científico do TCC.

Os arquivos brutos em `reports/` permitem distinguir teste executado, projeção de custo e recurso ainda não implementado. Datas dos JSON usam UTC; não há transformação de um cálculo pequeno em um anúncio de N maior. As unidades físicas e fontes estão em `PARAMETROS_E_FONTES.md`.

## Testes automatizados CPU: 33 aprovados, zero falhas

Execução registrada em `reports/test-results.tap`, por `node --test --test-reporter=tap`.

- Lei de força 3D de Plummer, terceira lei de Newton, exclusão de auto interação, potencial coerente com o gradiente da força, invariância de translação e escala de massa.
- Órbita circular binária suavizada por cinco períodos: máximo erro relativo de energia < 10⁻⁶; erros de momento linear e angular < 10⁻¹³. São tolerâncias desse problema adimensional controlado, com dt = período/256, não exigências automaticamente satisfeitas por qualquer galáxia.
- Convergência temporal de segunda ordem: reduzir dt pela metade reduz o erro global da órbita em aproximadamente quatro vezes (faixa testada 3,8–4,2). Reversibilidade temporal e independência do agrupamento de passos.
- Sensibilidade da força a epsilon comparada com sua expressão analítica. Entradas inválidas e encontro coincidente não suavizado são recusados.
- Octree 3D real: θ=0 reproduz força e potencial diretos, incluindo folhas coincidentes, alvo dentro do nó, traçador sem massa e subdivisão próxima da precisão de máquina. Para θ>0, reduzir a abertura reduz o erro na realização controlada.
- Gradiente dos potenciais analíticos em 3D, unidades, densidade média em r200c, massa finita do halo, soma quadrática de velocidades circulares e limite central NFW.
- Integração numérica da marginal vertical MN e amostragem estatística de 40.000 pontos dos três perfis. Tolerância estatística absoluta de 0,01 nas frações selecionadas; a geometria do disco não foi substituída por outro perfil.
- Reprodutibilidade da semente, conservação da massa física por componente ao mudar N, ausência de halo no modelo bariônico, limites de recursos, memória de pico estimada e critérios de seleção do backend.

## Força direta versus Barnes–Hut

`reports/validation-galaxy.json`: mesma realização com N=1.000, epsilon=0,1 kpc. Erro RMS normalizado = `sqrt(Σ|a_BH−a_direta|² / Σ|a_direta|²)`.

| Abertura θ | Erro RMS de força |
|---:|---:|
| 0,8 | 1,41146×10⁻² |
| 0,5 | 2,57757×10⁻³ |
| 0,3 | 3,35870×10⁻⁴ |
| 0,1 | 4,63799×10⁻⁶ |

O valor padrão θ=0,5 dá cerca de 0,258% nessa realização. A calibração depende da distribuição, suavização e evolução. Barnes–Hut não conserva momento exatamente por construção; o erro efetivo é medido. θ=0 serve como referência de árvore sem aproximação de abertura, com custo próximo do método direto.

## WebGPU real versus referência Float64

`reports/validation-webgpu.json` foi produzido no navegador local. Adaptador exposto: **AMD, arquitetura rdna-3**. O navegador não revelou modelo comercial, VRAM instalada ou versão de driver. Isso é compatível com o hardware informado pelo usuário, mas não identifica por si só “RX 7600 8 GB”. O sistema Node identificou a CPU Ryzen 7 5700X e 16 processadores lógicos.

Os sete casos N=1, 2, 63, 64, 65, 257 e 1.024 passaram. Eles incluem workgroups parciais, um corpo sem auto força e fronteiras do bloco de 64. O caso N=1.024 apresentou erro RMS de força **6,87945×10⁻⁷**. Foram comparados oito passos KDK de dt=0,05 Myr e epsilon=0,1 kpc. Tolerâncias: força 5×10⁻⁴, posição 2×10⁻⁵ e velocidade 5×10⁻⁴, em RMS relativo. São limites conservadores para soma e arredondamento f32 desse ensaio curto, não metas de precisão secular.

A comparação galáctica utilizou **a mesma realização de 1.000 partículas, semente 2026, com halo, por 100 passos de 0,1 Myr (10 Myr)**, força direta em ambas as precisões:

| Grandeza comparada | Resultado observado |
|---|---:|
| Força inicial, RMS relativo | 5,56310×10⁻⁷ |
| Posição final, RMS relativo global | 3,01470×10⁻⁶ |
| Velocidade final, RMS relativo | 1,23929×10⁻⁶ |
| Posição, RMS vetorial no r inicial <30 kpc | 0,00325439 pc |
| Posição, erro vetorial máximo no r inicial <30 kpc | 0,0212362 pc |
| Velocidade, máximo no r inicial <30 kpc | 0,00308027 km/s |
| ΔE/E inicial, CPU | 9,55732×10⁻⁶ |
| ΔE/E inicial, GPU | 9,66898×10⁻⁶ |
| Erro de momento angular normalizado, CPU | 1,97156×10⁻¹⁶ |
| Erro de momento angular normalizado, GPU | 1,16313×10⁻⁷ |

Hernquist e MN possuem caudas não truncadas. Partículas muito distantes têm maior erro absoluto de posição em f32: máximo vetorial do bojo 11,62 pc e do disco 5,264 pc nesse teste. Um RMS relativo global pequeno pode esconder esse efeito; o relatório acrescenta erros absolutos por componente e por seleção espacial inicial. O núcleo interno tem erros bem menores. Nada disso prova precisão em Gyr.

As conservações GPU usam sua própria referência inicial, depois da conversão de massas, posições e velocidades para f32, promovidas novamente a Float64 para somar os diagnósticos. O diagnóstico usa os parâmetros nominais G e epsilon do mesmo modelo de Plummer; os shaders arredondam também G, dt e epsilon², com valores efetivos registrados no relatório. A tolerância galáctica é força 10⁻³, posição 10⁻⁴ e velocidade 2×10⁻³, em RMS relativo. A energia usa soma direta nesta validação, independentemente da escolha mais econômica de diagnóstico na interface.

## Auditoria das condições iniciais e suavização

`scripts/audit-initial.mjs` e `reports/initial-audit.json` registram testes controlados de quadratura, virial, dispersões, perfis, tamanho das componentes, suavização e passo. Não alteram massas e escalas de produção para obter uma aparência desejada.

A pressão Jeans do disco foi conferida em 35 pares (R,z) contra quadratura independente de 8.192 pontos, com derivada radial mais fina. Uma interpolação inicial da pressão introduzia viés; a versão entregue interpola **log P** em uma tabela 160×112. Máximo erro relativo de σ² nesse conjunto: **0,7533%**; máximo erro relativo de rotação média ao quadrado: **1,9186%**. Os casos esféricos também foram conferidos contra uma quadratura radial de 32.768 pontos. São verificações locais de momentos, sem validação de uma função de distribuição exata.

Ensaios autogravitantes com halo, semente 2026, θ=0,5; energia inicial/final recalculada por soma direta:

| N | Duração | dt (Myr) | epsilon (kpc) | Mediana inicial de abs(z) do disco (kpc) | Mediana final de abs(z) (kpc) | Erro relativo de energia |
|---:|---:|---:|---:|---:|---:|---:|
| 2.000 | 20 Myr | 0,1 | 0,1 | 0,172080 | 0,275124 | 7,89259×10⁻⁵ |
| 2.000 | 20 Myr | 0,05 | 0,1 | 0,172080 | 0,275115 | 7,98108×10⁻⁵ |
| 2.000 | 20 Myr | 0,1 | 0,3 | 0,172080 | 0,275714 | 9,68407×10⁻⁵ |
| 2.000 | 20 Myr | 0,1 | 1,0 | 0,172080 | 0,311589 | 9,97406×10⁻⁶ |
| 10.000 | 10 Myr | 0,1 | 0,1 | 0,165394 | 0,184741 | 2,35268×10⁻⁵ |

**A espessura mediana cresce aproximadamente 60% no ensaio de 2.000 corpos em 20 Myr.** O raio esférico de meia massa do bojo cresce de 2,0754 para 3,0101 kpc. Reduzir dt à metade produz perfis praticamente iguais; a acomodação não desaparece com essa redução. Suavização maior pode conservar melhor energia e ainda distorcer mais o perfil — epsilon=1 kpc não é uma solução demonstrada. A execução de 10.000 corpos mostra crescimento de espessura de 11,7% em 10 Myr, mas duração diferente e uma única semente impedem concluir convergência em N.

O controle em campo analítico fixo, usado **somente na auditoria**, mostra no caso com halo e 20 Myr a altura mediana do disco de 0,172080 para 0,173475 kpc, enquanto o bojo ainda muda de 2,0754 para 2,3179 kpc. Isso evidencia limitações tanto da cinemática aproximada quanto da discretização. O aplicativo principal continua autogravitante; esse controle não é seu backend.

Uma realização de 2.000 corpos contém 300 partículas de bojo, 900 de disco e 800 de halo. A massa de uma macro partícula do halo é cerca de 1,22×10⁹ Msun, muito maior que a de uma partícula do disco. Granularidade, encontros suavizados e o uso de momentos do campo contínuo na condição inicial podem gerar aquecimento. A aproximação esférica para o campo do disco e a Gaussiana local também não constituem uma distribuição estacionária exata. Estes resultados não isolam quantitativamente todos os mecanismos.

O script testa epsilon=0,1/0,3/1 kpc e dt=0,1/0,05 Myr; ainda faltam uma malha refinada de epsilon/2, dt/4, mais resoluções, várias sementes, múltiplos tempos dinâmicos e sensibilidade à largura de truncamento. GalIC/AGAMA foram estudados como alternativas metodológicas e não estão implementados. O status de **equilíbrio inicial prolongado permanece não validado**.

## Experimento com e sem halo

`reports/validation-galaxy.json` contém duas realizações de N=2.000 por 20 Myr, com inicialização Jeans própria para cada campo e massas bariônicas iguais. O número atribuído a cada componente muda para acomodar N total fixo; por isso o ruído discreto dos dois modelos não é idêntico.

No modelo contínuo adotado, em R=8,2 kpc e z=0:

- somente bojo + disco: **v_c=175,017 km/s**;
- bojo + disco + halo: **v_c=229,445 km/s**.

A diferença é a contribuição do halo ao campo desse modelo de referência. Não é ajuste a observações, velocidade tangencial solar ou velocidade 3D solar. As curvas completas estão em `reports/rotation-analytic.csv`; as medianas v_phi discretas na interface são uma grandeza distinta. A mudança de espessura observada ainda não pode ser atribuída exclusivamente à presença física de matéria escura, dadas as limitações de inicialização e resolução.

## Benchmarks de CPU medidos

`reports/benchmark-cpu.json`: Node v24.19.0, Windows, Ryzen 7 5700X, 16 processadores lógicos e RAM do host informada pelo sistema ~15,9 GiB. Kernel JavaScript Float64 em uma linha de execução. Cada linha é **um passo KDK real** de 0,1 Myr, após geração e cálculo inicial de aceleração; não é média de longa série nem extrapolação. A árvore usa θ=0,5 e epsilon=0,1 kpc. Tempos são sujeitos à carga do sistema e aquecimento/JIT.

| N real | Algoritmo CPU | Tempo de um passo |
|---:|---|---:|
| 1.000 | Direto | 4,748 ms |
| 1.000 | Barnes–Hut | 10,025 ms |
| 10.000 | Direto | 429,225 ms |
| 10.000 | Barnes–Hut | 201,691 ms |
| 100.000 | Barnes–Hut | 3.123,941 ms |
| 1.000.000 | Barnes–Hut | 56.302,922 ms |

Todos terminaram com posições e velocidades finitas. Em um milhão, o cálculo inicial de força também levou 55.065,758 ms; a inicialização e um passo exigem quase dois minutos. RSS reportado no fim ~208,4 MiB; a estimativa de memória de trabalho não substitui um medidor de pico. O resultado comprova esse ensaio em Node no host, **não um milhão em tempo real, no navegador ou por duração prolongada**. Valores acima de um milhão não foram ensaiados.

## Benchmarks de GPU medidos

`reports/validation-webgpu.json`: GPU direta WGSL f32 no adaptador AMD rdna-3 do navegador. Média de cinco passos após um aquecimento, com dt=0,1 Myr e epsilon=0,1 kpc. O tempo inclui submissão e espera real por `queue.onSubmittedWorkDone`, sem inicialização ou diagnóstico/render por quadro.

| N real | Algoritmo GPU | Média medida por passo |
|---:|---|---:|
| 1.000 | Direto | 0,463 ms |
| 10.000 | Direto | 2,348 ms |

Ensaio adicional em `reports/benchmark-gpu-100000.json`: **100.000 corpos efetivamente integrados**, um passo de aquecimento e três passos medidos, média **49,905 ms/passo**. Estado final finito após 0,4 Myr. Não foi realizada comparação direta Float64 desse N nem teste de equilíbrio prolongado nessa resolução.

Esses ensaios medem kernels curtos. Não comparam em condições idênticas a um benchmark CPU de um único passo e não provam estabilidade da galáxia. A interface adiciona renderização, agendamento e diagnósticos periódicos. A GPU não possui árvore escalável nesta versão; custo O(N²) limita seu uso em resoluções grandes, independentemente da VRAM.

## Estado dos recursos

| Recurso | Estado nesta entrega |
|---|---|
| Força instantânea de todas as partículas, KDK e unidades | Implementados; testados nos casos descritos |
| GPU compute e render em buffers compartilhados | Implementados; kernels comparados com CPU, desenho verificado no navegador |
| Alternativa CPU direto e Barnes–Hut 3D | Implementados e testados |
| N manual, estimativa de memória e modo automático | Implementados; projeções identificadas como estimativas |
| Pausa, reset e encerramento | Implementados; funcionamento verificado na interface |
| Encerramento em aba inativa | Implementado; o navegador de testes não emitiu document.hidden ao ocultar seu painel, portanto esse evento real não foi confirmado nessa sessão |
| Perfis e parâmetros rastreáveis | Documentados, com modelo histórico reduzido e convenções explícitas |
| Condições iniciais em equilíbrio prolongado | **Não validadas; relaxação/aquecimento observados** |
| WASM/SIMD/pool CPU de força | Suporte detectado; kernels e pool não implementados |
| Barnes–Hut GPU/Particle-Mesh/FMM | Não implementados |
| Comparação observacional com incertezas | Não implementada; nenhum dado inventado |
| Um milhão de corpos no navegador ou GPU | Não validado; ensaio Node CPU de um passo realizado |
| GitHub/Vercel na conta do usuário | Pacote preparado; nenhuma publicação remota realizada |

O build estático e a revisão visual verificam o software; não ampliam o alcance dos testes físicos. A próxima etapa científica precisa melhorar as condições iniciais e separar convergência de força, integração, suavização e relaxação por resolução. A primeira versão serve como base executável, auditável e reprodutível para esse trabalho.

O registro da interface está em `reports/browser-ui.json`: build servido por `/dist/`, inicialização GPU, seleção automática do backend em N manual de 100.000, avanço físico, pausa, encerramento, recusa de orçamento insuficiente, contagem separada após filtros e revisão a 390 pixels sem overflow horizontal. Não foram observados erros ou avisos de console na última consulta. As capturas são demonstrações da interface, incluindo uma evolução de prévia; não são novos ensaios de estabilidade com condição final exportada.
