# Comparação das versões1.0.1,1.0.2 e1.0.3

A1.0.1 demonstrou que boa conservação energética não eliminava reajustes e que reduzir dt não resolvia o aquecimento. A1.0.2 mudou efetivamente a preparação para o campo médio Plummer, mantendo as DFs/priors: crescimento médio global em20 Myr,N=10.000, passou de9,082089% para4,736551% em três realizações bariônicas distintas.

A1.0.3 não trocou silenciosamente o modelo físico. Mantém a solução1.0.2 e varia a discretização. No refinamento do halo, TODOS os bárions são da semente2026, enquanto o halo usa2026/27/28. Portanto, a média H-Nh4000(3.743139%) não é a média histórica1.0.2 de4,736551%: os protocolos têm amostras bariônicas diferentes. H-Nh4000-h2026 reproduziu a trajetória curta de referência corrigida s2026, crescimento global4,190688%.

| Grupo | N de ensaios | h50 global | h50 fino | h50 espesso | σ⊥ fino |
|---|---:|---:|---:|---:|---:|
| Nh=4000 | 3 | +3.743% ± 2.797 pp | +4.656% ± 1.902 pp | +1.822% ± 0.467 pp | +5.473% ± 2.691 pp |
| Nh=8000 | 3 | +1.979% ± 2.266 pp | +4.643% ± 2.298 pp | +1.629% ± 1.602 pp | +3.905% ± 2.386 pp |
| Nh=20000 | 3 | +2.858% ± 1.920 pp | +5.471% ± 2.865 pp | +0.581% ± 1.065 pp | +4.902% ± 0.774 pp |
| Nh=40000 | 3 | +2.225% ± 2.279 pp | +5.363% ± 1.420 pp | +0.984% ± 0.577 pp | +3.320% ± 0.945 pp |

| Grupo | N de ensaios | h50 global | h50 fino | h50 espesso | σ⊥ fino |
|---|---:|---:|---:|---:|---:|
| Nh=4000 | 3 | +93.096% ± 13.658 pp | +105.729% ± 17.444 pp | +39.062% ± 3.834 pp | +41.093% ± 5.918 pp |
| Nh=40000 | 3 | +25.288% ± 2.283 pp | +29.483% ± 1.581 pp | +4.867% ± 8.293 pp | +17.599% ± 4.609 pp |

Os novos200 Myr não foram extrapolados dos20 Myr. A versão1.0.2 anterior só havia testado o candidato corrigido por20 Myr; os antigos200/1.000 Myr tinham outra preparação e não foram relabelados. A figura10 separa esses desenhos. A comparação com B tem campo Plummer novo e não usa a antiga tabela de halo Newtoniana.

Não foi iniciado 1 Gyr: nas três sementes com Nh=40.000, h50 e a variância vertical do fino ainda crescem de 100 para 200 Myr, e a resposta estrutural continua dependente da resolução. Os dados não mostram um patamar de estacionariedade/convergência que justifique promover esta realização a referência de longo prazo. Essa decisão usa tendências e controles físicos, não uma porcentagem universal aceitável de espessamento. Nh=40.000 é o halo vivo mais promissor entre os testados para a próxima rodada de convergência; B com fino duplicado é um controle promissor de resolução bariônica, mas a combinação viva não foi testada e não foi promovida.

1344 arquivos históricos e os pacotes anteriores foram verificados por SHA-256; as fontes anteriores estão em preserved-v1.0.2. As funções anteriores do site e o modelo padrão foram preservados. A página1.0.3 e o seletor opt-in identificam o candidato como experimental. Não foi feita publicação remota nesta tarefa.
