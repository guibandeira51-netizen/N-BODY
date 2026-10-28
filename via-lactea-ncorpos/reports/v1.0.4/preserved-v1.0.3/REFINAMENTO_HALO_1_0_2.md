# Refinamento do halo — etapa posterior

**Estado: não executado nesta entrega.** Esta entrega encerra a **etapa 1 solicitada**, antes dos refinamentos e otimizações secundárias. Não certifica a estabilidade de longo prazo nem a convergência não colisional. As etapas 2–4 permanecem pendentes. Não se adotou uma porcentagem universal aceitável de espessamento.

A primeira correção melhorou três controles de 10 mil partículas, mas não removeu a granularidade. Não se atribui toda a melhora ou todo o aquecimento ao halo. O modelo D ainda não foi medido com as novas DFs.

## Protocolo para a próxima etapa

Congelar bytes das posições, velocidades, massas e etiquetas de todos os bárions de cada realização corrigida. Amostrar a MESMA DF do halo no MESMO potencial convergido para Nh=4.000,8.000,20.000,40.000, com pelo menos sementes de halo 2026/2027/2028, independentes dos bárions. Manter Mh=1049129212118.556641 M☉ e massa individual Mh/Nh. Não reconstruir nem recentrar os bárions separadamente para cada halo. Medir o momento/COM inicial próprio de cada amostra e acompanhar os resíduos balísticos.

| Nh planejado | massa de cada partícula, M☉ | razão m_h / m_fino |
|---:|---:|---:|
| 4.000 | 2.622823e+08 | 23.3682 |
| 8.000 | 1.311412e+08 | 11.6841 |
| 20.000 | 5.245646e+07 | 4.6736 |
| 40.000 | 2.622823e+07 | 2.3368 |

Estes valores são apenas aritmética do desenho experimental, **não resultados de aquecimento**. Os controles corrigidos atuais têm Nh=400 ou 4.000 junto de resoluções bariônicas diferentes; não isolam o efeito de Nh. Não se usa sua diferença como curva de convergência do halo.

Integrar primeiro 20 Myr e depois 200 Myr, conservando dt, ε e método para os pares; registrar força, energia direta em snapshots, h50 global/fino/espesso, dispersões, perfis, modos m=1–4, inclinação e custo por passo. Diferenciar flutuações entre halos de tendência média antes de selecionar uma resolução. A figura solicitada 4 permanece pendente até existirem esses ensaios. Não foi implementado halo multimassa nem refinamento interno nesta etapa, portanto não há hipótese de peso/amostragem ainda não testada.
