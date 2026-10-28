# Geometria física do halo NFW contínuo — implementação e validação

Entrega local de 23/10/2026. A gravitação é Newtoniana. Não há métrica relativística, nova lei de força, fonte superficial ou interpretação de matéria escura como geometria sem matéria. O halo continua sendo uma distribuição material 3D, externa e estática.

## Uso na página principal

Em `experimento-ncorpos.html`, os dois modos originais permanecem: **Halo NFW — partículas** e **Halo NFW — contínuo**. Ao selecionar o contínuo, aparece **Geometria física do halo contínuo**, com Esférico, Oblato, Prolato e Triaxial. Os parâmetros p, q e os ângulos ficam no mesmo painel. A forma esférica é o controle histórico, sem alteração da força.

Oblato: p=1 e q<1; prolato: p=1 e q>1; triaxial: p, q e 1 distintos. Os valores iniciais q=0,8, q=1,25 e p=0,85/q=0,7 são hipóteses exploratórias explícitas, não medidas da Via Láctea. Nenhuma massa, constante gravitacional ou escala do TCC foi ajustada para melhorar resultados.

Uma mudança de forma/orientação é uma mudança física: pausa a evolução e prepara uma nova realização ao iniciar. O estado existente não recebe outra Hamiltoniana silenciosamente. Mesmos N e semente preservam as fases e massas iniciais do bojo/disco. No contínuo, N é exatamente o total de bariões; não há partículas do halo. Os controles de refinamento por partículas continuam associados ao outro modo.

## Fonte 3D, normalização e truncamento

Nos eixos principais, m²=x'²+y'²/p²+z'²/q². A rotação mundo→principal é a transposta de Rz(yaw) Ry(pitch) Rx(roll), com orientação constante no tempo.

No corpo NFW, a densidade radial base é

ρ₀(m) = Mₛ / [4π m (m+rₛ)²].

Mₛ é massa de escala, não massa total. O taper mantém a tabela radial finita já usada pelo modo contínuo: no intervalo entre dois nós, ρ₀(m)=[Mᵢ₊₁−Mᵢ]/[4π(mᵢ₊₁−mᵢ)m²]. A densidade é zero além do limite externo. Nas novas formas, taper e corte são definidos em **m**, portanto a fronteira externa é elipsoidal, com semieixos m_out, p m_out e q m_out. Não é um corte esférico disfarçado.

Nas formas não esféricas:

ρ(x)=C ρ₀(m)/(pq).

O Jacobiano d³x=pq m² sinθ dm dθ dφ cancela 1/(pq), preservando a massa integrada. Mantêm-se Mₛ=54, rₛ=15,62 kpc e a massa finita do campo original, aproximadamente 97,63158 unidades de 10¹⁰ M☉. Os valores efetivos quantizados, centro, tabela, C, eixos e orientação estão em `campaign-results.json`.

Foi identificada uma diferença muito pequena na junção da tabela histórica: δ=M_NFW(R200)−M_tabela(R200). Em Float64, δ=7,638177649482714×10⁻⁶ unidades de massa, cerca de 7,82347×10⁻⁸ da massa total. Para construir uma nova densidade contínua positiva e exatamente normalizada, as novas formas removem a pequena casca implícita dessa junção e usam C=M_total/(M_total+δ). Não se altera o controle esférico histórico. Na tabela GPU quantizada δ≈1,02315×10⁻⁵; C e δ efetivos são registrados como Float32. A massa é preservada até a precisão desses parâmetros efetivos; não se alega exatidão real infinita de Float32.

## Potencial e força efetivamente calculados

São usadas as integrais homeoidais da distribuição de densidade elipsoidal, e não GM(<m)/m². Com a=(1,p,q), Δ(u)=√[(1+u)(p²+u)(q²+u)], m²(u)=Σx'ᵢ²/(aᵢ²+u) e Ξ(s)=2∫ₛ^∞ρ₀(v)v dv:

Φ(x)=−πGC∫₀^∞ Ξ(m(u))/Δ(u) du,

a'ᵢ(x)=−2πGC x'ᵢ∫₀^∞ ρ₀(m(u))/[(aᵢ²+u)Δ(u)] du.

São integradas numericamente após t=1/√(1+u), t∈[0,1], usando 64 nós Gauss–Legendre fixos. O mesmo conjunto de nós define potencial e derivada. A implementação subtrai a parcela esférica no integrando e adiciona o controle esférico analítico, melhorando o cancelamento no campo distante. O ajuste explícito δ da junção e C é aplicado tanto à força quanto ao potencial das novas formas. No centro exato, a aceleração é definida como zero por simetria; a cúspide NFW tem limite direcional e não possui gradiente clássico único nesse ponto.

O potencial externo não recebe a suavização Plummer das partículas: ele é a distribuição contínua NFW finita especificada acima. As interações bojo/disco mantêm a mesma suavização Plummer ε e o mesmo somatório de pares. A energia é

E=Σ mᵢvᵢ²/2 − GΣᵢ<ⱼ mᵢmⱼ/√(rᵢⱼ²+ε²) + ΣmᵢΦ_halo(xᵢ).

O último termo não recebe fator 1/2. Não existe dupla contagem com partículas do halo nesse modo. O Leapfrog KDK existente e os parâmetros físicos das partículas não foram modificados.

Uma fonte externa não esférica exerce torque: L completo só é invariante no controle esférico; Lz é invariante nas formas axisimétricas alinhadas; um halo triaxial ou inclinado em geral não conserva Lz do subsistema bariônico. A interface e os diagnósticos deixam de tratar essa variação como erro universal de integração.

## Implementação rastreável

- `src/physics/halo-ellipsoid.js`: densidade, integral homeoidal, quadratura, normalização, orientação e validação dos eixos.
- `src/physics/halo-geometry.js`: controle esférico preservado, despacho de forma e serialização dos parâmetros.
- `src/compute/gpu-halo-geometry.js`: aceleração externa elipsoidal efetivamente usada pelo WebGPU; mesma função nas sondas das curvas de rotação.
- `src/physics/live-initial.js`: encaminhamento da forma do halo; geração bariônica preservada.
- `src/physics/live-energy.js`: potencial externo da mesma fonte e classificação dos invariantes.
- `src/halo-shape-controls.js`, `src/ncorpos-live-entry.js`, `experimento-ncorpos.html`: controles, nova realização, registro e apresentação.
- `src/render/continuous-halo-density.js`: densidade projetada da mesma distribuição e três contornos de seção principal em m=rₛ. Estes contornos são referências geométricas, não uma película gravitante. O perfil visual central é limitado para desenhar a cúspide; esse limite não entra na força.

A projeção elipsoidal usa Q=Rᵀdiag(1,1/p²,1/q²)R. Para a direção de visão n e deslocamento transversal x, A=nᵀQn, B=xᵀQn, b_eff²=xᵀQx−B²/A. Então Σ_ell(x)=C Σ₀(b_eff)/(pq√A). A escala visual é logarítmica; opacidade e contornos não são entradas do integrador.

## Verificação matemática e numérica

1. Integração da densidade com Jacobiano pq e taper finito: teste de massa com resíduo relativo <10⁻¹⁰ em CPU Float64 para as novas formas. Controle esférico preserva a discrepância histórica δ explicitada acima.
2. Diferenças finitas de Φ versus −a e divergência da força versus −4πGρ no interior suave: testes com resíduos relativos <10⁻⁷ e <10⁻⁶, respectivamente, nos pontos especificados no teste. Não são certificados globais da cúspide e do taper.
3. Rotação da orientação: covariância da aceleração e verificação de m=rₛ para todos os vértices desenhados. Forma esférica reproduz exatamente a função histórica.
4. Referência independente por integração volumétrica 3D (96 nós radiais, 48 polares, 96 azimutes, 4 nós em cada intervalo do taper): nos dois pontos externos testados por forma, a diferença relativa máxima da força com 64 nós foi aproximadamente **5,01×10⁻⁴ = 0,0501%**. A própria referência volumétrica tem erro de quadratura; não é uma solução exata. Comparações de ordens 32/64/128/256/512 estão preservadas. No interior suave a convergência é muito melhor; no taper e exterior há erro de quadratura não monotônico. Formas extremas não foram certificadas por esta amostragem.
5. WebGPU Float32 versus CPU Float64 usando a mesma quadratura e parâmetros efetivos: nove pontos por forma, incluindo centro, 0,001 kpc e campo distante, além de um triaxial orientado (37°,21°,13°). Maior diferença relativa nos casos testados: **9,44×10⁻⁷**. Isso separa o arredondamento GPU da aproximação da integral contínua; não elimina esta última.
6. Hashes SHA-256 de posições, velocidades e massas dos bariões iniciais: idênticos nas quatro geometrias. O backend continua Float32; medir a energia em Float64 não torna a trajetória Float64.

## Ensaios físicos executados

Foram executadas quatro trajetórias até 1.200 Myr com dt=0,1 Myr e quatro controles até 200 Myr com dt=0,05 Myr. N=2048 bariões (511 bojo, 1537 disco), semente 2026, ε=0,1 kpc. O tempo final realmente integrado foi 1200,0000178813934 Myr devido ao dt Float32 efetivo. Sem renderização na campanha de cálculo.

Os h50 usam a mediana ponderada por massa em relação ao plano próprio robusto instantâneo do disco. Plano inicial, σ normal, R50, massas, energia, momento angular e diagnósticos por anéis também foram preservados. Os anéis selecionam populações instantâneas; não são coortes lagrangianas fixas.

| Forma | p | q | h50 inicial (kpc) | h50 200 Myr (kpc) | h50 1200 Myr (kpc) | Crescimento final |
|---|---:|---:|---:|---:|---:|---:|
| Esférico | 1 | 1 | 0,180621 | 0,281401 | 0,426789 | +136,29% |
| Oblato | 1 | 0,8 | 0,180621 | 0,268902 | 0,455430 | +152,15% |
| Prolato | 1 | 1,25 | 0,180621 | 0,301326 | 0,485381 | +168,73% |
| Triaxial | 0,85 | 0,7 | 0,180621 | 0,239340 | 0,400123 | +121,53% |

Os máximos amostrados h50 foram 0,437062, 0,455430, 0,485381 e 0,405671 kpc. Nenhuma forma manteve espessura constante. O triaxial teve menor h50 final neste ensaio; isso não demonstra uma vantagem universal de estabilidade. As condições iniciais foram deliberadamente iguais, oriundas da referência esférica, e não são funções de distribuição reequilibradas nos novos potenciais. Portanto esta comparação mede a resposta ao mudar o campo, incluindo um possível transiente inicial. Uma semente e N baixo não se extrapolam para 80.000 partículas ou bilhões de anos adicionais.

Em R=8 kpc, a velocidade derivada da média azimutal do campo total inicial foi aproximadamente 225,91, 230,58, 221,04 e 238,25 km/s, respectivamente. Os campos bariônicos iniciais são os mesmos. No triaxial, √(−R⟨aR⟩) não é uma velocidade de órbita circular exata.

| Forma | Maior erro energético absoluto até 1200 Myr (%) | Até 200 Myr, dt=0,1 (%) | Até 200 Myr, dt=0,05 (%) | Razão dos erros 0,1/0,05 |
|---|---:|---:|---:|---:|
| Esférico | 0,000517257 | 0,000157230 | 0,000042474 | 3,70 |
| Oblato | 0,000308227 | 0,000135629 | 0,000021104 | 6,43 |
| Prolato | 0,000467063 | 0,000137347 | 0,000039415 | 3,48 |
| Triaxial | 0,000296350 | 0,000117334 | 0,000032072 | 3,66 |

A redução do dt reduziu os máximos energéticos nos quatro controles. A razão não precisa ser exatamente quatro em uma trajetória Float32 não linear e com amostragem finita. Dois passos e uma realização não demonstram uma ordem assintótica global. Energia bem conservada coexistiu com engrossamento significativo.

Tempos medidos na campanha pequena (integração em lotes e sincronização, sem desenho): 4,35 s esférico, 4,36 s oblato, 4,27 s prolato, 4,36 s triaxial. Diagnósticos/leitura: 1,32 s, 1,45 s, 1,39 s e 1,44 s. Tempos totais: 6,20 s, 5,84 s, 5,70 s e 5,84 s. Essa semelhança em N pequeno é dominada também por despacho e sincronização; não significa custo idêntico em toda resolução. As formas usam 64 avaliações adicionais por corpo e exigem nova medição automática do dispositivo quando escolhidas.

## Arquivos reproduzíveis e limites

Pasta `reports/halo-shapes-2026-10-23/`:

- `campaign.html`, `campaign.js`, `campaign-worker.js`: execução GPU reproduzível com progresso, até 1.200/200 Myr.
- `campaign-results.json`: parâmetros efetivos, resultados completos, hashes iniciais, tempos e séries por anéis; `campaign-pre-effective-rounding.json` preserva a avaliação anterior à correção de registro dos parâmetros Float32 efetivos.
- `audit.mjs` e `mathematical-audit.json`: auditoria matemática independente; executar `node reports/halo-shapes-2026-10-23/audit.mjs`.
- `artifacts.mjs`: regenera tabelas e figuras a partir dos dados, sem reintegrar; executar `node reports/halo-shapes-2026-10-23/artifacts.mjs`.
- `summary.csv`, `evolution.csv`, `rings.csv`, `forces.csv`, `rotation-halo.csv`, `rotation-initial.csv`: unidades nos cabeçalhos.
- `h50-comparison.svg`, `energy-comparison.svg`, `rotation-comparison.svg`: estados realmente amostrados; segmentos são guias visuais.
- `gpu-probes.json`, `tests.tap`, `validation.json` e `source-identity.json`: evidências e identidade do código desta entrega.
- `before/`: cópias locais dos arquivos anteriores à alteração, excluídas do build público.

Os campos são estáticos: não há resposta do halo, atrito dinâmico por halo vivo ou troca de momento com suas partículas. Esta implementação testa fontes materiais elipsoidais Newtonianas, não demonstra que geometria do espaço-tempo gera matéria escura. As formas exploratórias não constituem ajuste observacional, e estabilidade para cada forma exigiria condições iniciais compatíveis, convergência em N/ε/dt, sementes e controles mais longos. Nenhum limite percentual foi escolhido para declarar aprovação física.

## Fundamentação

- Jo Bovy, *Dynamics and Astrophysics of Galaxies*, integrais de densidades achatadas e triaxiais: https://galaxiesbook.org/chapters/III-01.-Gravitation-in-Elliptical-Galaxies-and-Dark-Matter-Halos_2-Gravitational-potentials-for-mildly-flattened-and-triaxial-mass-distributions.html
- Documentação oficial galpy, `TriaxialNFWPotential`, coordenada elipsoidal e quadratura: https://docs.galpy.org/en/latest/reference/potentialtriaxialnfw.html

Essas referências fundamentam a formulação, não os valores exploratórios dos eixos. O truncamento finito e a preservação da massa deste projeto são explícitos acima; não se presume que toda implementação NFW externa use o mesmo corte.
