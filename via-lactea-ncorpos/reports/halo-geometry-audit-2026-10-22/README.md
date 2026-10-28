# Auditoria física sem alteração de produção

Esta pasta contém somente harnesses de auditoria e dados novos. Não é uma funcionalidade ou nova aba do site principal. Os arquivos em src/, a página original e os resultados históricos não foram corrigidos durante a auditoria.

## Reprodução

1. Execute `node reports/halo-geometry-audit-2026-10-22/prepare.mjs` para registrar hashes e construir os dados de entrada a partir dos parâmetros existentes. Não execute esse passo sobre uma auditoria já preservada sem copiar antes o diretório: ele prepara um novo baseline e inputs.
2. Com o servidor local normal, abra `reports/halo-geometry-audit-2026-10-22/audit.html`, execute o harness e salve o JSON como `gpu-results.json` nesta pasta. O harness integra três sondas sem massa em órbitas circular, excêntrica e inclinada por 200 Myr com três passos temporais; testa retirada da fonte, dependência das velocidades e amplificação da malha; reproduz os dois controles de 1200 Myr. Não usa a sessão física do usuário.
3. Execute `node reports/halo-geometry-audit-2026-10-22/complete-inputs.mjs`.
4. Execute `independent.py` com Python + NumPy. Ele não importa funções físicas JavaScript: calcula integrais adaptativas da densidade, força/potencial do alvo, energia de pares, RK4, KDK e ajuste do plano usando numpy.linalg.eigh. G e os parâmetros físicos declarados são entradas, não ajustes. As órbitas CPU começam dos valores Float32 efetivamente lidos da GPU.
5. Execute `node scripts/test.mjs` para a regressão existente. Compare os hashes do baseline com os arquivos de produção. Nenhum build é necessário para esta auditoria; o build de produção não foi executado para evitar alterações incidentais.

As amostras estruturais são checkpoints, não máximos contínuos. O controle de força discreta usa N0=1024, sementes 2026/2027/2028, fatores 1/4/16/32 e sondas fixas com 16 azimutes; não é uma nova campanha de estabilidade ×32. O controle sem NFW é Newtoniano bariônico e não constitui uma solução relativística do caso C. O potencial NFW tem cúspide: o valor de aceleração zero exatamente na origem é uma convenção de implementação e não um gradiente regular da métrica nesse ponto.

Fontes: Carroll, notas de RG, seção 6, https://preposterousuniverse.com/wp-content/uploads/grnotes-six.pdf ; Ciotti (2022), https://arxiv.org/abs/2207.09736 . A comparação com tensores completos de Einstein/energia-momento não é implementada. O teste de Poisson desta auditoria verifica apenas a relação escalar linearizada no interior suave do perfil NFW.
