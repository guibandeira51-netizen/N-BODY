# Visualização limpa do halo contínuo

A pedido do usuário, a malha ilustrativa foi removida do simulador principal, juntamente com sua amplificação, escala de cores, seletor de projeção e travamento para comparação. A câmera principal voltou à perspectiva interativa, com arraste, roda e vistas superior/lateral/livre.

O renderizador principal não importa, instancia, aloca buffers nem desenha o overlay. O módulo antigo da malha, seus relatórios e dados históricos permanecem preservados para rastreabilidade; não são acionados pela página principal.

O modo físico NFW contínuo permanece disponível e usa o mesmo backend de antes. O cabeçalho mostra um indicador discreto **Halo NFW contínuo · campo estático** somente quando uma realização desse modo está preparada. A seção Visualização informa que esse campo não possui partículas de halo e conserva a autogravidade de bojo e disco. O filtro de partículas do halo fica oculto nesse modo; volta a aparecer no modo por partículas. Trocar a seleção prepara uma nova realização, sem converter silenciosamente a atual.

Os cálculos físicos, massas, forças, condições iniciais, suavização e diagnósticos não foram alterados. A identidade dos 63 arquivos de física e cálculo é verificada em `verification.json` contra a identidade preservada antes das alterações de visualização.

Verificação real em navegador: modo por partículas com N₀ = 4.096 e indicador contínuo ausente; modo contínuo com 614 partículas de bojo, 1.844 de disco e zero partículas de halo. Integração iniciada e pausada em 30 Myr, 300 passos; vista lateral funcional e nenhum erro de console registrado. Este é um teste funcional da interface, não um ensaio de estabilidade. `browser-check.json` contém os resultados observados. A captura final foi feita em uma realização preparada e pausada do modo contínuo.

Os testes existentes de interface foram atualizados para a remoção solicitada da malha e para o novo indicador; os testes físicos permanecem os mesmos. Resultado: 233 testes aprovados. Os arquivos anteriores às alterações estão em `before/`.
