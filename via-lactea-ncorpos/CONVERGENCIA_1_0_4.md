# Convergência 1.0.4

Em 200 Myr, os crescimentos médios de h50 fino foram A: 103,0699%, B: 26,3711%, C: 105,4268% e D: 23,2864%. Com halo de 80 mil/fino×2, E chegou a 17,8935% ±0,8127 p.p.; halo de 40 mil/fino×4, G chegou a 21,3570% ±3,3907 p.p. E melhora a espessura frente a D nas três sementes, mas a mudança de variância vertical não melhora uniformemente: Δσz²(E−D)=[−126,9160; +0,7193; +80,2395](km/s)². De 100 a 200 Myr, todas as sementes D/E/G ainda aumentam h50 e variância vertical. Em E, o aumento tardio médio de h50 é 0,019184 kpc e de σz² é 172,0118 (km/s)²; o último é maior que a média tardia D: 135,4547, com variabilidade de sementes. G não melhora uniformemente o espesso/bojo. Não há patamar estrutural em N nem redução uniforme da taxa tardia. Por isso não foram iniciados 400–600 Myr ou1 Gyr. A decisão usa tendências, controles e variabilidade, sem porcentagem universal aceitável de espessamento. O passo temporal é auditado separadamente; melhorar energia/passo não elimina a dependência de N.

## Resolução adicional após pilotos

E: halo80.000/fino7.092 (N89.546). G: halo40.000/fino14.184 (N56.638). As massas totais e DFs são as mesmas. Populações inalteradas são copiadas; somente a população refinada é amostrada novamente. Não foram lançadas resoluções superiores sem pilotos registrados e medidos de custo/precisão. As decisões de registro estão nos JSON `registration-*`.

| Família | N | Nh | Δh50 fino [%] | Δh50 fino100–200[kpc] |
|---|---:|---:|---:|---:|
| E | 89546 | 80000 | 17.893 ± 0.813 | 0.019 ± 0.004 |
| G | 56638 | 40000 | 21.357 ± 3.391 | 0.017 ± 0.011 |

Pilotos 20 Myr têm cadência 2 Myr; comparação fatorial 20 tem 0,5 Myr. Resolução adicional 200 tem 10 Myr; comparação fatorial 200 e passos temporais têm 5 Myr. Todos os máximos energéticos são amostrados. O intervalo físico é igual; as cadências distintas e o custo aparecem nos protocolos. Não foram interpolados dados para substituir medições.

## Passo temporal e limites

O controle de passo usa exatamente as partículas da família D, com Plummer e GPU direta, e registra dt no manifesto/resultado. As curvas e diferenças de finais são medidas; caos discreto pode fazer duas trajetórias divergir sem um erro energético grande. Uma realização temporal não demonstra convergência estatística de todas as sementes. Nenhum teste de ε diferente foi promovido, pois a preparação atual é específica de ε = 0,1 kpc; mudar ε exigiria nova preparação compatível.

Convergência parcial de energia/força/passo não demonstra convergência estrutural em N. Diferenças de perfis e tendências100–200 Myr são comparadas com a variabilidade entre sementes, sem porcentagem universal admissível de espessamento. Três sementes não estabelecem o limite N→∞ nem uma lei assintótica precisa. O período circular solar deste potencial é 214.668 Myr e o vertical é 96.929 Myr. 200 Myr não cobre vários períodos circulares solares. Nenhum resultado é extrapolado para 1 Gyr.

A convergência em N a ε fixo refere-se ao limite contínuo deste modelo suavizado. Ela não demonstra o limite ε→0, um ajuste observacional exato ou a estacionariedade da Via Láctea real.

## Controles contínuos novos das fases G

Foram integradas as mesmas 16.638 partículas bariônicas de cada realização G em um campo Plummer total fixo, AGAMA DOP853 Float64,200 Myr,41 estados completos. O crescimento de h50 do fino foi 2026: 0.515382%, 2027: 4.272893%, 2028: 1.038071%. Média 1.942115%  e SD2.035361 p.p. O controle evidencia oscilações/limites de preparação e amostra; sua diferença para G vivo também contém toda a resposta autogravitante. Não é um estimador puro de encontros. Fontes/trajectórias e análises estão em reports/v1.0.4/continuous-g/.

Controle temporal, mesmas partículas D/2026: dt=0.025 Myr → h50 fino final=0.252731 kpc, máximo |δE|=1.86e-07; dt=0.05 Myr → h50 fino final=0.253174 kpc, máximo |δE|=1.41e-07; dt=0.1 Myr → h50 fino final=0.253587 kpc, máximo |δE|=4.34e-07. Uma semente temporal não demonstra convergência estatística global.
