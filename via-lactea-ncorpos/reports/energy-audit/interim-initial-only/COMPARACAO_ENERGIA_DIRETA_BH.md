# Comparação entre energia direta e Barnes–Hut

## Resultado identificável na execução original

Oito registros BH, N=80.000, GPU direta Float32, θ=0,5: máximo |δE| **0.01847195%**, último **0.00532793%** em 1124.600 Myr. A variação de 1,6% não consta do histórico exportado.

No estado inicial real regenerado: K=1.8716261528111353, U_direto=-3.7317652584292538, U_BH=-3.7313387965331022, E_direto=-1.8601391056181185. δU=U_BH−U_direto=0.000426461896152; ε_U=0.000114278864457, isto é **0.01142789% de |U|**. O deslocamento equivale a 0.02292634% de |E_direto(0)|. Custo direto medido: 34.204 s, um processo CPU, 3.199.960.000 pares. Esse custo motiva referências selecionadas e paralelas.

Um viés inicial não é uma deriva. Com b(t)=U_BH(t)−U_direto(t), ΔE_BH=ΔE_direto+b(t)−b(0). Os erros normalizados usam ainda denominadores iniciais diferentes. Sem estados posteriores, **não é possível atribuir uma fração numérica dos alegados 1,6% à árvore**, nem provar que os 0,01847% observados são todos diagnósticos ou todos integração. O viés inicial é da mesma ordem do desvio estimado, o que torna necessária a comparação direta posterior; não autoriza subtrair um valor constante do gráfico.

## Comparação em snapshots idênticos

`theta-snapshots.csv`: trajetórias diretas legacy N=96 e N=256, estados de 0, 500 e 1000 Myr; em cada estado θ=1, 0,7, 0,5, 0,25, 0,1 e 0. A força da trajetória não muda durante essa varredura diagnóstica. `trajectories.csv` preserva energia direta e BH, com os mesmos estados e a mesma época inicial, ao longo das trajetórias. O erro da árvore varia com a configuração e θ, sem monotonicidade temporal universal. θ=0 é um controle sem aceitação de monopolos distantes, sujeito à ordem da soma Float64.

|Ensaio CPU|N|dt [Myr]|Máx. direto [%]|Último direto [%]|Máx. BH [%]|Máx. erro de U [%]|
|---|---:|---:|---:|---:|---:|---:|
|circular-direct-dt0.1|2|0.1|0.269824|0.177136|0.269824|0|
|circular-direct-dt0.05|2|0.05|0.0188734|0.0136576|0.0188734|0|
|circular-direct-dt0.025|2|0.025|0.00121622|0.000919139|0.00121622|0|
|eccentric-direct-dt0.1|2|0.1|476.34|445.868|476.34|0|
|eccentric-direct-dt0.05|2|0.05|132.024|113.75|132.024|0|
|eccentric-direct-dt0.025|2|0.025|12.5166|0.201657|12.5166|0|
|legacy96-direct-dt0.1|96|0.1|3.64344|3.63312|3.76202|0.209935|
|legacy96-direct-dt0.05|96|0.05|0.300102|-0.187047|0.383105|0.213878|
|legacy96-direct-dt0.025|96|0.025|0.0939405|-0.0449705|0.40036|0.181782|
|legacy256-direct-dt0.05|256|0.05|0.126374|0.0298664|0.277317|0.114413|
|legacy96-forceBH-theta0.5|96|0.05|0.322521|0.0904013|0.439894|0.116398|
|legacy96-forceBH-theta0.25|96|0.05|0.626504|0.101547|0.626916|0.00830176|

Os controles de força BH são identificados no nome do ensaio; sua energia direta diagnostica a trajetória da força aproximada. Aumentar precisão do diagnóstico não torna a força BH simétrica nem garante uma Hamiltoniana global da árvore. Nos demais ensaios a força é direta. Para legacy a cadência é 5 Myr; para as binárias compactas de estresse, cada passo. Os ensaios compactos r=0,1 kpc não resolvem adequadamente encontros em dt grosseiro; resultados muito grandes são preservados e classificados como falhas de resolução, não escondidos.

## Convenção nominal e efetiva da GPU

O limite analítico preservado de 1.0.5 é aplicável à convenção de parâmetros de qualquer soma Plummer positiva, sem importar a dinâmica AGAMA. Para G e ε² desta GPU, a razão |U_efetivo|/|U_nominal| fica entre 1,0000000195877132 e 1,0000000307635846, em aritmética ideal. Trata-se de cerca de 2–3×10⁻⁸ relativamente a U: é uma inconsistência real a corrigir, mas sua escala não explica 1,6%. Esse limite não calibra BH, inverseSqrt ou acumulação GPU.

![Erro da árvore](reports/energy-audit/figures/theta-calibration.png)

Os SVG estão junto aos PNG; dados, unidades e hashes constam de `figures/manifest.json`. Não há faixa de incerteza não fundamentada.
