# Correção física 1.0.2 — primeira etapa experimental

Esta entrega encerra a **etapa 1 solicitada**, antes dos refinamentos e otimizações secundárias. Não certifica a estabilidade de longo prazo nem a convergência não colisional. As etapas 2–4 permanecem pendentes. Não se adotou uma porcentagem universal aceitável de espessamento.

## Mudança efetiva

O gerador anterior `scripts/equilibrium/generate_agama.py` construía as DFs de ação em um potencial Newtoniano suave da densidade física. O motor `src/physics/forces.js` e o kernel WGSL em `src/compute/gpu.js` aplicam interação de Plummer. O novo gerador `scripts/equilibrium-102/generate_softened.py` faz a iteração **DF → densidade física → campo médio Plummer → novas ações**, até a convergência numérica. O integrador KDK e a lei de força de evolução foram preservados.

As mesmas funções f_i(J), seus parâmetros de massa, escalas radiais e priors cinemáticos foram mantidos. As ações são recalculadas no potencial suavizado. Isso muda conjuntamente as distribuições espaciais e de velocidade; não é um multiplicador de velocidades. Nenhuma medida de espessamento da evolução entra na solução inicial.

Em cada iteração, `scm.potential=current` invalida o ActionFinder anterior; `scm.iterate()` calcula densidades físicas no campo suavizado e emite um potencial Newtoniano intermediário. Esse resultado é convolvedo antes da próxima avaliação de DF. O potencial Newtoniano intermediário nunca se torna o próximo campo de preparação. O campo final é uma expansão escalar nativa AGAMA, com força derivada do mesmo potencial. Não se confundem densidade física e densidade efetiva de Poisson.

## Convergência e admissibilidade

Foram necessárias 9 iterações; mudanças máximas de força nas duas últimas: 0.000664072793 e 0.000438447558. Ambas abaixo da tolerância numérica anterior 0,001, em duas iterações consecutivas. Essa tolerância não é um critério de estabilidade estrutural. A solução continua aproximada: malha de densidade, quadratura, expansão e ações têm erros distintos, medidos no relatório de compatibilidade.

Seis snapshots reproduzíveis: N=1.000 (150 bojo / 354 fino / 96 espesso / 400 halo) e N=10.000 (1.500 / 3.546 / 954 / 4.000), sementes 2026, 2027 e 2028. O manifesto `reports/v1.0.2/corrected/snapshots.json` inclui hashes, pesos M/N e testes amostrais de DF finita, positiva e órbitas ligadas no contínuo. Isso verifica a amostra, não a positividade global analítica. Nenhuma velocidade foi reduzida durante a evolução.

Massas independentes das DFs, em M☉: bojo 9200015467.282112; fino 39800000000.000008; espesso 10699999999.999998; halo 1049129212118.556641. O halo total truncado não é a massa dentro do raio observacional de referência: ambos seguem a parametrização anterior. Todos os ensaios usam os mesmos pesos físicos por população; a GPU arredonda esses pesos para f32, registrados por leitura real.

## Resultado do mínimo

Em três controles C com N=10.000, 20 Myr, dt=0,05 Myr, ε=0,1 kpc e força direta GPU, a média do crescimento global de h50 passou de 9.082089% para 4.736551% (redução descritiva de 47.85%). A média da mudança de altura em kpc passou de 0.02190931 para 0.01138143. O aumento médio de h50 do disco fino caiu de 0.02592854 para 0.00885579 kpc (65.85% menor).

Essas médias de três sementes não são uma estimativa precisa do efeito causal isolado: as famílias têm amostras diferentes de fase, porque o potencial de preparação mudou. O controle A1 usa **as mesmas condições antigas** em outro campo e isola esse desajuste no contínuo. Os controles C não isolam granularidade de halo e bárions. A amostra de 1.000 partículas é muito ruidosa e uma semente piorou. Consulte todos os resultados, sem seleção da melhor semente.

## Uso e preservação

O padrão anterior foi mantido. `correcao102.html` oferece o candidato como EXPERIMENTAL e `equilibrio.html?modelo=softened-102` apenas o seleciona; é preciso carregar e iniciar explicitamente. A preparação exige ε=0,1 kpc; a interface bloqueia uma Hamiltoniana incompatível. Importar esse snapshot não o certifica como estável. A CPU interativa usa Barnes–Hut e sua energia é aproximada; as evidências C desta etapa usam força e energia diretas.

Fontes anteriores foram copiadas para `reports/v1.0.2/preserved-v1.0.1`. A verificação por SHA-256 abrange 931 arquivos históricos. Os relatórios e pacotes 0.9, 1.0 e 1.0.1 permanecem separados. A correção está disponível localmente e no build; publicação remota não foi realizada.

## Referências

[AGAMA — artigo do autor](https://arxiv.org/abs/1802.08239), [manual técnico](https://arxiv.org/abs/1802.08255). Código AGAMA local usado: commit `f302756b8af2b763db58e278e30478517dc8eea3`, módulo 1.0.161. As fontes permitem potenciais personalizados e DFs em ações num potencial iterado; a convolução Plummer desta entrega é uma implementação adicional, cuja identidade e testes estão arquivados.
