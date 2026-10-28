# Populações, coortes e modos coletivos — 1.0.3

As etiquetas físicas fino/espesso são herdadas do snapshot e nunca redefinidas pela altura atual. Cada população tem plano próprio, h50, σ perpendicular e medidas no eixo z fixo. São registrados σR, raio de meia massa, centro do plano, inclinação, média de altura/velocidade normal, densidades e anéis instantâneos. Coortes dos anéis INICIAIS mantêm os mesmos IDs, complementando os anéis que permitem entrada/saída por migração.

`cohort-series.csv` inclui contagens, número máximo de pares independentes e uma indicação de baixa contagem (<60 partículas). Esse corte é aviso amostral, não limiar de estabilidade. Os testes de software verificam que deslocar rigidamente o plano não gera espessamento intrínseco e que migração radial não redefine as coortes.

## Modos azimutais e verticais

m=1..4, amplitudes e fases por anel, referência condicional de ruído por pares e alterações de planos estão em collective-modes.csv/json. O início antipodal suprime modos ímpares: ausência de m=1 não demonstra estabilidade geral. Testes ao longo do tempo são correlacionados e a referência aproximada não é uma significância temporal calibrada.

| Ensaio | maior amplitude m2 inicial, anéis2–12 kpc | maior amplitude m2 final, mesmos limites instantâneos |
|---|---:|---:|
| A-base-s2026-t20 | 0.080969 | 0.091374 |
| A-base-s2026-t200 | 0.080969 | 0.104991 |
| A-base-s2027-t20 | 0.070328 | 0.067569 |
| A-base-s2027-t200 | 0.070328 | 0.068208 |
| A-base-s2028-t20 | 0.075430 | 0.063616 |
| A-base-s2028-t200 | 0.075430 | 0.102609 |
| A-thin2-s2026-t200 | 0.058601 | 0.122123 |
| A-thin2-s2027-t200 | 0.035212 | 0.056818 |
| A-thin2-s2028-t200 | 0.082961 | 0.055316 |
| B-base-s2026-t20 | 0.080969 | 0.099689 |
| B-base-s2026-t200 | 0.080969 | 0.191575 |
| B-base-s2027-t20 | 0.070328 | 0.063535 |
| B-base-s2027-t200 | 0.070328 | 0.158248 |
| B-base-s2028-t20 | 0.075430 | 0.067275 |
| B-base-s2028-t200 | 0.075430 | 0.224954 |
| B-bulge2-s2026-t20 | 0.080969 | 0.099685 |
| B-bulge2-s2026-t200 | 0.080969 | 0.157917 |
| B-bulge2-s2027-t20 | 0.070328 | 0.067848 |
| B-bulge2-s2027-t200 | 0.070328 | 0.129740 |
| B-bulge2-s2028-t20 | 0.075430 | 0.067263 |
| B-bulge2-s2028-t200 | 0.075430 | 0.261317 |
| B-thick2-s2026-t20 | 0.064987 | 0.111112 |
| B-thick2-s2026-t200 | 0.064987 | 0.187853 |
| B-thick2-s2027-t20 | 0.044896 | 0.047910 |
| B-thick2-s2027-t200 | 0.044896 | 0.141937 |
| B-thick2-s2028-t20 | 0.071741 | 0.058770 |
| B-thick2-s2028-t200 | 0.071741 | 0.254381 |
| B-thin2-s2026-t20 | 0.058601 | 0.081503 |
| B-thin2-s2026-t200 | 0.058601 | 0.095672 |
| B-thin2-s2027-t20 | 0.035212 | 0.055305 |
| B-thin2-s2027-t200 | 0.035212 | 0.059103 |
| B-thin2-s2028-t20 | 0.082961 | 0.074523 |
| B-thin2-s2028-t200 | 0.082961 | 0.182318 |
| H-nh20000-b2026-h2026-t20 | 0.080969 | 0.085137 |
| H-nh20000-b2026-h2027-t20 | 0.080969 | 0.105776 |
| H-nh20000-b2026-h2028-t20 | 0.080969 | 0.093118 |
| H-nh4000-b2026-h2026-t20 | 0.080969 | 0.120502 |
| H-nh4000-b2026-h2026-t200 | 0.080969 | 0.273053 |
| H-nh4000-b2026-h2027-t20 | 0.080969 | 0.096835 |
| H-nh4000-b2026-h2027-t200 | 0.080969 | 0.364609 |
| H-nh4000-b2026-h2028-t20 | 0.080969 | 0.100535 |
| H-nh4000-b2026-h2028-t200 | 0.080969 | 0.434219 |
| H-nh40000-b2026-h2026-t20 | 0.080969 | 0.102935 |
| H-nh40000-b2026-h2026-t200 | 0.080969 | 0.131795 |
| H-nh40000-b2026-h2027-t20 | 0.080969 | 0.097482 |
| H-nh40000-b2026-h2027-t200 | 0.080969 | 0.177568 |
| H-nh40000-b2026-h2028-t20 | 0.080969 | 0.111736 |
| H-nh40000-b2026-h2028-t200 | 0.080969 | 0.090308 |
| H-nh8000-b2026-h2026-t20 | 0.080969 | 0.100769 |
| H-nh8000-b2026-h2027-t20 | 0.080969 | 0.112349 |
| H-nh8000-b2026-h2028-t20 | 0.080969 | 0.103761 |

O máximo entre anéis não é a amplitude de uma barra global nem evidencia, sozinho, uma fase coerente. As medidas de inclinação, altura e velocidade normal por anel ajudam a distinguir translação, inclinação, flexão e aquecimento; subtrair a média populacional de velocidade não remove todo movimento coerente espacial.

## Toomre Q e interpretação

O proxy usa σR κinicial/(3,36 GΣ), com frequências iniciais do campo Plummer e densidade superficial amostrada. O coeficiente3,36 pertence à aproximação de disco fino sem suavização; espessura finita, mistura de populações, suavização e evolução do potencial limitam seu uso. Não se usa Q=1 como critério automático de estabilidade deste modelo.

Com os mesmos bárions e a mesma física contínua, refinar o halo de 4.000 para 40.000 partículas reduziu o crescimento médio de h50 do fino em 200 Myr de 105.729463% para 29.483456% (72.11% menor), e o aumento médio de σ perpendicular de 41.092723% para 17.598522% (57.17% menor). As três sementes refinadas aqueceram menos que seus contrastes grosseiros. Isso demonstra uma contribuição importante da discretização do halo ao excesso de aquecimento deste domínio, incluindo ruído e respostas que ele pode excitar; não quantifica uma fração universal puramente colisional. O resíduo com halo fixo e os contrastes bariônicos mostram outra contribuição: o excesso médio de crescimento de variância vertical do fino B−A, com controles suaves das mesmas fases, foi 217,666789(km/s)² na base e 170,501303(km/s)² com o fino duplicado. Essa redução é preliminar, com apenas três sementes; B−A inclui autogravidade/resposta coletiva dos bárions, não apenas encontros de duas partículas. Refinar só bojo ou espesso não trouxe melhora estrutural/cinemática uniforme. Não se identifica ainda uma causa única para todo o resíduo do modelo refinado.

Uma instabilidade física exige persistência e convergência de resolução/semente/perfil, além de coerência espacial/temporal apropriada. Não se injetaram braços, barra, modos, damping ou correções de órbitas. Os intervalos200 Myr ainda não cobrem vários períodos solares. As mudanças observadas permanecem nos dados, sem serem suprimidas para melhorar a aparência.
