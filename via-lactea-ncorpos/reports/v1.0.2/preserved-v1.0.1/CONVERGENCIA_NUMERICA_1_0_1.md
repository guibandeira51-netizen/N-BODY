# Convergência numérica — versão 1.0.1

## Questões que não devem ser confundidas

Convergência da iteração AGAMA, da malha de potencial contínuo, da amostragem de partículas, da aproximação Barnes–Hut, da precisão e do integrador são testes diferentes. Uma execução que reduz erro energético com \(dt\) pode permanecer longe do equilíbrio; um perfil pouco variável em uma semente não demonstra convergência com N.

| Eixo | Manter fixo | Variar | Observáveis principais |
|---|---|---|---|
| Tempo | Snapshot e Hamiltoniana | \(dt=0,1;0,05;0,025\) Myr | Envoltória \(\delta E\), estado e momentos em épocas iguais |
| Força BH | Snapshot, \(\epsilon\), precisão | \(\theta\), incluindo referência direta | Erro de aceleração, viés energético, deriva dos invariantes |
| Precisão | Estado exportado e parâmetros físicos | CPU f64 / GPU f32 | Arredondamento inicial, erro de força e deriva acumulada |
| Halo | Mesmas partículas bariônicas, \(M_h\) | \(N_h\) e semente do halo | \(h,\sigma_n\), ruído e resposta do halo |
| Bárions | Modelo e halo controlados, massas físicas | \(N_d,N_b\) e sementes | Relaxação do bojo/discos, perfis e modos |
| Suavização | Modelo amostrado e duração | \(\epsilon\) justificável | Viés/ruído de força, resolução vertical e aquecimento |
| Campo contínuo | DF e tolerâncias definidas | Malhas/expansões/quadraturas | Poisson, ações, momentos e força em pontos independentes |

## Ordem temporal do KDK

Para o problema Hamiltoniano suave com passo fixo, a composição simétrica KDK tem erro global de segunda ordem. No regime assintótico, para uma medida de erro dominada pelo tempo,

\[
e(h)\simeq C h^2,\qquad \frac{e(h)}{e(h/2)}\simeq4,
\qquad p_{\rm observado}=\log_2\!\frac{e(h)}{e(h/2)}.
\]

Usar \(e=\max_{t_k}|\delta E|\), com cadência física comum e claramente declarada, é mais informativo que apenas o erro final. A mesma escala de energia e a mesma realização são necessárias. Não exigir razão exatamente quatro quando houver cancelamento, mudança de fase da oscilação, piso de arredondamento, erro de força ou amostragem temporal inadequada. Para erros de trajetória e momentos em épocas comuns, estimativas de diferenças entre resoluções também podem ser usadas; em dinâmica caótica, convergência estatística de distribuições pode ser mais útil em tempos longos. [Hairer, Lubich e Wanner](https://www.unige.ch/~hairer/preprints/gniverlet.html).

Se \(\max|\delta E|\) parar de cair ao reduzir h, investigar primeiro se o erro restante vem do backend, da aproximação espacial ou do diagnóstico. Isso não implica automaticamente que a ordem matemática do KDK mudou. O uso de força BH não derivada de uma Hamiltoniana de pares consistente limita diretamente as garantias geométricas.

## Erros de força e do estimador energético

Nos mesmos alvos e no mesmo snapshot, comparar

\[
e_{a,\mathrm{rms}}=
\left[\frac{\sum_i|\mathbf a_i^{\rm aprox}-\mathbf a_i^{\rm direta64}|^2}
{\sum_i|\mathbf a_i^{\rm direta64}|^2}\right]^{1/2}.
\]

Registrar número e seleção dos alvos, regiões físicas, erro absoluto, quantis relativos e eventuais forças de referência próximas de zero. Um RMS global pondera fortemente grandes acelerações e não substitui distribuição por componente/raio. Força BH contra direta em uma realização mede aproximação da soma discreta, não o viés da realização suavizada contra o AGAMA contínuo.

Calcular também \(U_{\rm BH}-U_{\rm direta64}\) nos snapshots viáveis. Uma energia BH menos variável não é automaticamente uma aproximação melhor da Hamiltoniana direta. Alterar \(\theta\) do diagnóstico não modifica uma trajetória que foi integrada com força GPU direta.

## Resolução de halo e bárions

As macro partículas do halo no candidato 10k têm aproximadamente \(2,62\times10^8M_\odot\), cerca de 23 vezes a massa das partículas do disco nessa alocação. Aumentar \(N_h\) de 4.000 a 8.000/20.000 mantém \(M_h\) e reduz o peso individual. Os pares de snapshots preservados auditam a identidade bariônica. A diferença resultante inclui amostragem e resposta dinâmica e deve ser comparada entre sementes.

Refinar todo o sistema de 10k para 50k altera simultaneamente halo, discos e bojo. Essa comparação é necessária, mas não isola o halo. O experimento E deve variar a discretização bariônica com o halo controlado e as mesmas massas/DFs. Não há obrigação de igualdade individual entre estrelas em resoluções estelares diferentes; há obrigação de coerência do modelo e da amostragem.

Poucas sementes permitem apresentar dispersão observada, não um intervalo universal confiável. O quiet start tem N/2 sorteios independentes; reamostragem estatística deve preservar pares e populações. Não interpretar as muitas partículas correlacionadas como muitas realizações independentes da galáxia.

## Suavização e escalas físicas

Variar \(\epsilon\) muda a Hamiltoniana. Uma comparação \(\epsilon/2,\epsilon,2\epsilon\) investiga o compromisso entre viés de força e flutuação de partículas, mas não é uma extrapolação temporal. A escala deve ser comparada com a altura do disco fino, escalas centrais do bojo, espaçamento local e frequências que o passo resolve. Reduzir espessamento por aumentar \(\epsilon\) pode apagar a resolução da força vertical. [Dehnen, 2001](https://arxiv.org/abs/astro-ph/0011568), [Athanassoula et al., 2000](https://arxiv.org/abs/astro-ph/9912467).

Não se reivindica aqui um \(\epsilon\) ótimo universal. O modelo de preparação é Newtoniano; convergir h para uma realização Plummer não resolve a incompatibilidade entre os dois campos. Para aproximar o limite collisionless Newtoniano, N e \(\epsilon\) exigem um estudo conjunto, além do h.

## Precisão Float64 e Float32

CPU direta Float64 é referência numérica finita. GPU direta Float32 calcula a mesma forma funcional, porém armazena massas, posições, velocidades e parâmetros arredondados. É preciso separar:

1. Conversão inicial Float64 → Float32 e parâmetros efetivos.
2. Erro da força no mesmo estado representável.
3. Acúmulo de arredondamento durante kicks, drifts e somas.
4. Diferença de método energético na leitura final.

Uma boa comparação por 20 Myr não prova equivalência por 1 Gyr. Quando o arredondamento passar a dominar, reduzir h aumenta o número de operações e pode deixar de reduzir o erro observado. O resultado precisa ser medido, sem extrapolação a outra GPU ou ordenação de somas.

## Evidência histórica e escopo das novas medidas

Na campanha 1.0, os controles \(dt/2\) até 200 Myr deixaram praticamente inalterado o espessamento calibrado 10k: +91,95% com h padrão e +91,84% com metade do passo. Isso mostra que reduzir apenas h naquele intervalo não eliminou o fenômeno; não estabelece uma decomposição única entre instabilidade, suavização e granularidade. Os 50k tiveram menor espessamento percentual, mas poucos N e sementes não fixam um limite assintótico.

As comparações curtas CPU/GPU da versão anterior e energias BH dos ensaios longos permanecem históricas em `reports/v1.0.0/`. Somente os arquivos novos de `reports/v1.0.1/` podem sustentar as conclusões adicionais desta versão. A cobertura real em h, N, precisão e duração deve ser lida por execução e por observável. Ausência de uma combinação é uma lacuna declarada, sem preenchimento por estimativa.

## Ordem medida nas novas referências

As 14 execuções CPU estão concluídas em `reports/v1.0.1/cpu-summary.json`. Para força direta Float64 e \(\epsilon=0,1\) kpc:

| Referência | Duração [Myr] | h [Myr] | \(e_{\max}\) | Redução ao dividir h por 2 |
|---|---:|---:|---:|---:|
| Binário excêntrico suavizado, N=2 | 200 | 0,1 | 5,93923569 × 10⁻³ | — |
| Mesmo binário | 200 | 0,05 | 1,49646823 × 10⁻³ | 3,96884 |
| Mesmo binário | 200 | 0,025 | 3,74852617 × 10⁻⁴ | 3,99215 |
| Galáxia calibrada, N=1.000 | 20 | 0,1 | 8,05447269 × 10⁻⁶ | — |
| Mesma galáxia | 20 | 0,05 | 2,00562121 × 10⁻⁶ | 4,01595 |
| Mesma galáxia | 20 | 0,025 | 5,01773124 × 10⁻⁷ | 3,99707 |

São máximos em **todos os passos inteiros**, portanto com cadência que também se refina com h; a figura temporal permite verificar a envoltória. As razões são compatíveis com segunda ordem no domínio ensaiado. Não se transfere essa demonstração de 20 Myr/N=1.000 para toda a evolução de 1 Gyr/N=50.000.

No calibrado, \(h_{50}(20\,\mathrm{Myr})\) foi 0,391381; 0,391310 e 0,391292 kpc para h=0,1; 0,05; 0,025 Myr, partindo de 0,210205 kpc. As diferenças sucessivas desse observável diminuíram por aproximadamente quatro, mas ele convergiu temporalmente para um disco que **espessou aproximadamente 86%**, não para um equilíbrio. Esta comparação demonstra diretamente a separação entre erro de integração e evolução estrutural.

## Força, suavização e resolução medidas na campanha curta

Com h=0,05 Myr e energia direta por passo, força BH \(\theta=0,5\) produziu máximo energético 2,12460 × 10⁻⁴, enquanto \(\theta=0,25\) produziu 1,41694 × 10⁻⁵; a referência direta deu 2,00562 × 10⁻⁶. O erro restante não pode ser removido assumindo que o esquema temporal sozinho seja responsável. O viés inicial BH e os RMS de força estão em `force-energy-audit.json` e `AUDITORIA_ENERGIA_1_0_1.md`.

| Controle calibrado, 20 Myr | N | \(\epsilon\) [kpc] | \(h_{50}(0)\) [kpc] | \(h_{50}(20)\) [kpc] | \(\Delta h_{50}\) |
|---|---:|---:|---:|---:|---:|
| C padrão | 1.000 | 0,1 | 0,210205 | 0,391310 | +86,16% |
| C menor suavização | 1.000 | 0,05 | 0,210205 | 0,411078 | +95,56% |
| C maior suavização | 1.000 | 0,2 | 0,210205 | 0,382458 | +81,95% |
| D, halo refinado | 1.400 | 0,1 | 0,210205 | 0,350727 | +66,85% |
| E, bárions refinados | 1.600 | 0,1 | 0,227225 | 0,362022 | +59,32% |

D mantém as 600 partículas bariônicas do caso C e substitui o halo por 800 partículas em 400 pares antipodais selecionados do snapshot 10k, renormalizados para a mesma massa de halo. Não é apenas duplicação das partículas de C. E mantém as mesmas 400 partículas de halo de C e usa 300 bojo +708 fino +192 espesso selecionados do snapshot 10k, normalizados por subpopulação. Ele tem uma nova realização bariônica, como mostram as alturas iniciais diferentes. São ensaios exploratórios de uma semente, não uma sequência assintótica ou limite de aquecimento inferido com incerteza. A aparente melhora não demonstra que o halo explica todo o fenômeno.

## Regra de conclusão

As três novas execuções GPU de N=1.000/20 Myr têm máximos de energia direta nominal 8,01290 × 10⁻⁶, 1,85001 × 10⁻⁶ e 6,18903 × 10⁻⁷ para h=0,1;0,05;0,025 Myr. A redução difere da razão quatro, e o máximo de momento angular na escala \(\sum|\mathbf L_i(0)|\) aumenta de 2,10711 × 10⁻⁷ para 7,23264 × 10⁻⁷ e 1,22014 × 10⁻⁶. A comparação identifica que reduzir h na GPU não melhora todos os observáveis monotonamente. O diagnóstico, o arredondamento inicial e a pequena diferença entre parâmetros nominais Float64 e efetivos Float32 estão documentados em `AUDITORIA_ENERGIA_1_0_1.md`. A trajetória permanece Float32 mesmo quando a energia é calculada em Float64.

A reanálise direta dos snapshots históricos grandes, concluída para 10 trajetórias/33 estados, acrescenta referências Float64 em N=10k–50k. A10k padrão tem máximo direto 1,91368 × 10⁻⁷ apenas em 0/20/200/1.000 Myr; A50k tem 2,26070 × 10⁻⁷ em 0/20/200 Myr. Isso não estabelece uma curva assintótica de erro com N, pois as realizações e durações diferem e as épocas diretas são esparsas. O controle histórico \(\epsilon=0,05\) kpc chegou a 1,37435 × 10⁻⁴ em 200 Myr com h=0,1 Myr; a confiança numérica dos controles de suavização é, portanto, desigual. A tabela completa e o viés BH estão em `AUDITORIA_ENERGIA_1_0_1.md`.

**VALIDADO NUMERICAMENTE** exige comportamento consistente com o método e erros quantificados no domínio efetivamente testado. Uma bateria pequena pode validar a ordem do KDK para a referência e deixar **NÃO VALIDADA** a convergência estrutural do modelo grande. A classificação deve incluir esse domínio; ela não pode ser transferida automaticamente de uma órbita de teste ou sistema reduzido para a galáxia completa.

Nesta entrega, a ordem temporal direta Float64 é **VALIDADA NUMERICAMENTE nos dois controles e intervalos acima**. A convergência física estrutural com N, suavização e semente permanece **NÃO VALIDADA**; os resultados de D/E são uma investigação inicial. A cobertura GPU/Float32 e reanálises históricas deve ser consultada nos arquivos próprios de `reports/v1.0.1/`, sem extrapolar a comparação CPU curta.

As duas novas repetições GPU grandes de 200 Myr, N=10k/50k, concluíram com espessamento global +91,95%/+32,39%. A resolução total maior reduz esse indicador nessa realização, mas altera simultaneamente a granularidade de todas as componentes. A energia BH densa tem cadências 1/2 Myr e não substitui a auditoria direta em 0/20/200 Myr. Não há ensaio novo de 50k por 1 Gyr nem ensemble suficiente para uma taxa convergida de aquecimento.

A auditoria direta dessas duas novas trajetórias foi concluída: máximos nominais amostrados de 1,90776493 × 10⁻⁷ e 2,26070382 × 10⁻⁷, respectivamente. Reavaliar G e ε² com os coeficientes representáveis Float32 resulta em 1,90961637 × 10⁻⁷ e 2,26131065 × 10⁻⁷. São comparações nos mesmos três estados, com resultados e convenções em `gpu-analysis-summary.json`; não estabelecem máximos temporais completos ou uma ordem assintótica com N. Em N=1.000, os máximos energéticos diretos em todos os passos continuam sendo os da série densa original, e não os máximos de somente dois estados da auditoria.
