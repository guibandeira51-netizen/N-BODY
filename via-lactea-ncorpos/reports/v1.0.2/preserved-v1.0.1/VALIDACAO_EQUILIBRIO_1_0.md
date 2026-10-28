# Validação de equilíbrio — versão 1.0.0-rc.1

**Classificação: candidato não validado para equilíbrio N-corpos de longa duração.** 22/22 ensaios do protocolo estão preservados e completos. Estado mecânico da campanha: `candidate-not-validated`. A conclusão é sobre o modelo testado; não é uma prova independente de matéria escura.

## Critérios e resultado

A admissibilidade inicial exige massas coerentes, coordenadas finitas, f não negativa nos pontos sorteados e partículas ligadas no campo de preparação. Essas verificações são necessárias e amostrais. A compatibilidade contínua é examinada por iterações de potencial, densidade integrada da DF, equação de Poisson em pontos independentes e constância de f(J) ao longo de órbitas. A estabilidade estrutural requer a evolução temporal e robustez às sementes, N, dt, ε e algoritmo/precisão. Não existe limite universal de 5% ou 10% que aprove um disco.

O modelo não foi promovido: há evolução estrutural e dependência da discretização, além de resíduos do campo/DF e diferença entre o potencial Newtoniano de preparação e o Plummer evoluído. Uma comparação curta CPU/GPU não estabelece convergência Float64 em 1 Gyr. Testes de software não equivalem a testes de equilíbrio físico.

## Medições N-corpos efetivamente concluídas

h50 é a mediana de distância absoluta ao plano geométrico instantâneo do disco, ponderada por massa. σn é a dispersão de velocidade normal ao mesmo plano. h50 fixo, inclinação, centro, flare, warp, dispersões cilíndricas e coortes estão nas séries brutas e tabelas. As linhas de 200 e 1.000 Myr têm durações diferentes: compare épocas iguais em summary.csv/series.csv.

| Ensaio | N | t [Myr] | h50(0) [kpc] | h50(t) [kpc] | Δh50 [%] | σn(t) [km/s] | Δσn [%] |
|---|---:|---:|---:|---:|---:|---:|---:|
| calibrated-A-10k | 10000 | 1000 | 0.2348 | 1.2104 | 415.41 | 79.87 | 89.58 |
| calibrated-A-50k | 50000 | 200 | 0.2379 | 0.3149 | 32.39 | 45.47 | 5.96 |
| calibrated-A-s27 | 10000 | 200 | 0.2479 | 0.5060 | 104.09 | 56.82 | 32.61 |
| calibrated-B-14k | 14000 | 1000 | 0.2348 | 0.7936 | 237.91 | 70.87 | 68.20 |
| calibrated-B-26k | 26000 | 200 | 0.2348 | 0.3454 | 47.07 | 44.75 | 6.20 |
| calibrated-dt-half | 10000 | 200 | 0.2348 | 0.4505 | 91.84 | 56.72 | 34.63 |
| calibrated-epsilon-double | 10000 | 200 | 0.2348 | 0.4305 | 83.32 | 50.63 | 20.17 |
| calibrated-epsilon-half | 10000 | 200 | 0.2348 | 0.5167 | 120.01 | 59.02 | 40.09 |
| calibrated-fixed | 6000 | 1000 | 0.2348 | 0.3593 | 53.00 | 50.56 | 20.00 |
| calibrated-gaussian-same-density | 10000 | 200 | 0.2348 | 0.5842 | 148.75 | 57.92 | 39.26 |
| df-A-10k | 10000 | 1000 | 0.4510 | 1.4859 | 229.43 | 82.99 | 43.03 |
| df-A-50k | 50000 | 200 | 0.4471 | 0.5032 | 12.56 | 57.21 | 0.63 |
| df-A-h27 | 10000 | 1000 | 0.4510 | 1.4202 | 214.86 | 73.89 | 27.36 |
| df-A-s27 | 10000 | 200 | 0.4428 | 0.6963 | 57.26 | 59.70 | 2.50 |
| df-B-14k | 14000 | 1000 | 0.4510 | 0.9953 | 120.66 | 71.74 | 23.65 |
| df-B-26k | 26000 | 200 | 0.4510 | 0.5237 | 16.12 | 59.32 | 2.24 |
| df-dt-half | 10000 | 200 | 0.4510 | 0.6372 | 41.28 | 65.26 | 12.48 |
| df-epsilon-double | 10000 | 200 | 0.4510 | 0.6184 | 37.11 | 63.34 | 9.17 |
| df-epsilon-half | 10000 | 200 | 0.4510 | 0.7052 | 56.36 | 67.06 | 15.59 |
| df-fixed | 6000 | 1000 | 0.4510 | 0.5228 | 15.90 | 60.10 | 3.59 |
| gaussian-same-density | 10000 | 200 | 0.4510 | 0.6737 | 49.37 | 66.17 | 15.55 |
| legacy-10k | 10000 | 1000 | 0.1719 | 1.2019 | 598.98 | 79.96 | 104.03 |

As massas físicas das componentes são mantidas ao variar Nh. A comparação de 0.9 com AGAMA altera também massas e perfis; sua diferença não mede exclusivamente o inicializador. O primeiro candidato AGAMA começou mais espesso. Crescimento percentual menor pode coexistir com espessura final absoluta maior.

## Auditoria contínua e perfis

### agama

Modelo `C20-NFW-collisionless-v1`. Convergência da iteração: True; maior variação final de força = 0.04979%. Massa total finita do halo = 1.049128645e+12 M☉.

Medianas solares de |z| do modelo contínuo final (fino/espesso): 0.366169, 1.245467 kpc; alvos exponenciais de referência: 0.207944, 0.623832 kpc. São medidas em Rsolar, distintas da mediana global da mistura de discos.

Módulo do resíduo relativo de Poisson contra integrais independentes da DF: mediana/p90/máximo = 0.0640%, 0.6515%, 4.3606%. Foram sondados 32 pontos meridionais, não todo o espaço de fases.

Variação de f(J) em órbitas reais no campo congelado, 128 órbitas independentes por subpopulação e semente (|Δln f|; p50/p90/p99/máx):

| Semente | Subpopulação | Quantis | Valores inválidos |
|---|---:|---|---:|
| 2026 | 0 | 0.01736 / 0.11001 / 0.22664 / 0.34990 | 0 |
| 2026 | 1 | 0.01220 / 0.24149 / 1.42356 / 2.24817 | 0 |
| 2026 | 2 | 0.01112 / 0.07403 / 0.20881 / 0.23719 | 0 |
| 2026 | 3 | 0.00056 / 0.00587 / 0.01083 / 0.07545 | 0 |
| 2027 | 0 | 0.01632 / 0.09538 / 0.30906 / 0.36181 | 0 |
| 2027 | 1 | 0.00752 / 0.12263 / 0.57831 / 0.93314 | 0 |
| 2027 | 2 | 0.01150 / 0.08830 / 0.32573 / 0.37503 | 0 |
| 2027 | 3 | 0.00098 / 0.01441 / 0.09445 / 0.11290 | 0 |

As caudas não nulas limitam a estacionariedade da DF com ações aproximadas. Uma pequena mediana não elimina órbitas com desvios grandes.

### agama-calibrated

Modelo `C20-NFW-collisionless-v2-vertical-calibrated`. Convergência da iteração: True; maior variação final de força = 0.05458%. Massa total finita do halo = 1.049128645e+12 M☉.

Medianas solares de |z| do modelo contínuo final (fino/espesso): 0.197089, 0.593090 kpc; alvos exponenciais de referência: 0.207944, 0.623832 kpc. São medidas em Rsolar, distintas da mediana global da mistura de discos.

Módulo do resíduo relativo de Poisson contra integrais independentes da DF: mediana/p90/máximo = 0.1867%, 1.2447%, 1.8647%. Foram sondados 32 pontos meridionais, não todo o espaço de fases.

Variação de f(J) em órbitas reais no campo congelado, 128 órbitas independentes por subpopulação e semente (|Δln f|; p50/p90/p99/máx):

| Semente | Subpopulação | Quantis | Valores inválidos |
|---|---:|---|---:|
| 2026 | 0 | 0.02842 / 0.11098 / 0.27494 / 0.29912 | 0 |
| 2026 | 1 | 0.00604 / 0.15288 / 0.89887 / 1.41520 | 0 |
| 2026 | 2 | 0.00415 / 0.05380 / 0.16164 / 0.21186 | 0 |
| 2026 | 3 | 0.00074 / 0.00951 / 0.03002 / 0.05342 | 0 |
| 2027 | 0 | 0.02221 / 0.13152 / 0.33119 / 0.53844 | 0 |
| 2027 | 1 | 0.00665 / 0.12502 / 0.61237 / 2.46627 | 0 |
| 2027 | 2 | 0.00428 / 0.03701 / 0.26505 / 0.39040 | 0 |
| 2027 | 3 | 0.00047 / 0.00672 / 0.05928 / 0.10711 | 0 |

As caudas não nulas limitam a estacionariedade da DF com ações aproximadas. Uma pequena mediana não elimina órbitas com desvios grandes.

Os perfis radiais e verticais completos, massas esféricas encerradas, densidades superficiais, momentos e frequências próprias estão em cada pasta do modelo. As figuras initial-model e scm-convergence apresentam o campo e a cinemática efetivamente obtidos. Refinar a expansão do potencial a densidade fixa é um teste diferente de recalcular todos os momentos da DF em malhas mais finas; este último não foi estabelecido em toda a configuração.

## Controle no potencial total congelado

| Modelo | Semente | t [Myr] | h50 [kpc] | Δh50 [%] | Δσn [%] | Erro orbital E |
|---|---:|---:|---:|---:|---:|---:|
| agama | 2026 | 1000 | 0.4363 | -3.273 | -0.104 | 1.046e-10 |
| agama | 2027 | 1000 | 0.4567 | 3.129 | -1.629 | 3.809e-10 |
| agama-calibrated | 2026 | 1000 | 0.2320 | -1.188 | 4.239 | 4.540e-09 |
| agama-calibrated | 2027 | 1000 | 0.2504 | 1.018 | -0.849 | 3.620e-09 |

São órbitas DOP853 Float64 no campo contínuo total congelado: energia orbital Σm(v²/2+Φ), sem o fator 1/2 de autogravitação. Não têm retroação ou granulação e não substituem um N-corpos livre.

## Força, energia e controles

A evolução livre usa o KDK e a força direta WebGPU f32 originais. A energia nos ensaios longos é calculada por Barnes–Hut θ=0,5 e explicitamente aproximada; a energia de pares usa Plummer e exclui autointeração. Com halo fixo a energia externa é ΣmΦhalo uma única vez; o halo é retirado da lista de partículas para evitar massa duplicada. Somente Lz permanece protegido pela simetria axisimétrica do campo externo; P e os outros componentes de L não são invariantes gerais nesse controle.

O halo fixo provém da densidade final convergida, não do NFW esférico inicial: o achatamento final é preservado. Sua interpolação Hermite deriva força e potencial do mesmo escalar. O ensaio testa simultaneamente ausência de granulação, ausência de resposta e campo externo Newtoniano sem suavização. Não permite atribuir toda a diferença à massa individual de macro partículas. O controle NFW esférico da 0.9 permanece documentado separadamente.

backend-checks.json e backend-checks-calibrated.json contêm forças e evolução curta CPU/GPU nos mesmos estados. Cada ensaio livre registra o erro de força em 128 alvos contra soma direta f64 e Barnes–Hut θ=0,5/0,25. Os ensaios de dt/2 e ε/2,2ε usam o mesmo snapshot; variar ε muda o Hamiltoniano. As sementes têm pares antipodais e N/2 sorteios independentes, que suprimem inicialmente modos ímpares. A amplitude m=2 mede não axisimetria; sua existência isolada não identifica uma barra persistente ou velocidade de padrão.

## Arquivos e integridade

artifact-audit.json confere hashes, somas de massa, positividade amostral, potencial, identidades estelares entre resoluções do halo e preservação das forças/KDK/renderização históricas. state-export-audit.json recalcula espessuras, dispersões, raios e migração a partir dos estados GPU serializados da campanha calibrada. A campanha inicial sem calibração preserva séries e estados iniciais; não foram inventados estados finais que não foram capturados. A ausência desses arrays antigos está declarada no pacote de estados.

O pacote principal `equilibrio-1.0.0.zip` contém modelos, perfis, tabelas, fontes e documentação. O complementar `ensaios-1.0.0.zip` contém os JSON integrais dos ensaios, inclusive os estados capturados. Extraia os dois na mesma raiz; ENSAIOS_BRUTOS.json registra o hash do complementar. `tabelas-1.0.0.zip` e `estados-1.0.0.zip` oferecem as mesmas medições e estados em CSV para análise externa. O ZIP completo do projeto já reúne esses conteúdos. Cada arquivo comprimido possui verificação de integridade na entrega.

A suíte JavaScript registrou 80 testes aprovados, sem falhas. Os quatro testes oficiais executados da biblioteca AGAMA (coordenadas, ações, órbitas e modelo autoconsistente) também passaram. Os logs preservam essas verificações. Essa aprovação é de software e propriedades numéricas específicas; a classificação física acima permanece não validada.

attempts.json e environment-restart.json registram falhas reais de instalação, revisão de amostragem e interrupção do ambiente. Apenas registros completed até a duração especificada entram nas tabelas acima. Versões, sementes e código executado ficam preservados; arredondamento e dependência de compilador/hardware impedem promessa de reprodução bit a bit em qualquer máquina.

## Reprodução complementar

Depois da preparação descrita em CONDICOES_INICIAIS_1_0.md, para cada pasta `agama` e `agama-calibrated`:

```text
python scripts/equilibrium/prepare_controls.py --out reports/v1.0.0/agama-calibrated --threads 4
python scripts/equilibrium/validate_profiles.py --out reports/v1.0.0/agama-calibrated
python scripts/equilibrium/check_df_consistency.py --out reports/v1.0.0/agama-calibrated
node scripts/equilibrium/analyze-frozen.mjs reports/v1.0.0/agama-calibrated
node scripts/serve.mjs
node scripts/equilibrium/collector.mjs
```

O coletor é um processo local opcional de pesquisa em 127.0.0.1:4181, com origens e IDs limitados. No navegador de localhost:4180, abra tests/browser-equilibrium-batch-v1.html (protocolo original) e tests/browser-equilibrium-batch-calibrated-v1.html (calibrado). Cada botão inicia evolução real e os resultados completos podem ser baixados; a campanha calibrada também grava pelo coletor. O arquivo de retomada começa no índice 7 porque sete ensaios originais já estavam preservados. Para a pequena realização usada nas comparações de backend, acrescente `--counts 150 450 400 --reuse-prepared` ao gerador, com o --config correspondente. O controle de backend é executado pelos botões das páginas browser-equilibrium-backends[-calibrated]-v1.html.

```text
python scripts/equilibrium/audit_artifacts.py
node scripts/equilibrium/audit_states.mjs
python scripts/equilibrium/summarize_results.py
python scripts/equilibrium/export_tables.py
python scripts/equilibrium/write_reports.py
node scripts/test.mjs
node scripts/build.mjs
```

Para repetir historicamente cada etapa, use as fontes em executed-source-* e seus hashes; o gerador entregue passou a conter retomada por checkpoint e outras verificações posteriores. Os snapshots exportados são a referência exata para repetir a evolução sem recompilar o AGAMA.

## Próximas investigações científicas justificadas

Priorizar convergência da malha de densidade/DF e exame das caudas de Δln f; construir preparação compatível com suavização ou quantificar a transição Newtoniano–Plummer; obter convergência de resolução sobretudo do halo nas regiões do disco; ampliar a comparação temporal f64 e sementes antes de atribuir barras, aquecimento ou expansão à física coletiva. Não corrigir o movimento durante a evolução para obter uma aparência estável.
