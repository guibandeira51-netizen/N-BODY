# Halo NFW como tecido ilustrativo

A opção **Visualizar halo como tecido do espaço-tempo (representação ilustrativa)** controla somente o desenho de uma superfície associada ao potencial Newtoniano NFW. Pode ser ligada ou desligada tanto em **Halo NFW — partículas** quanto em **Halo NFW — contínuo**. Os valores internos dos modos foram preservados para compatibilidade com os arquivos existentes.

A malha usa z = zcentro + A Φhalo(R,0)/|Φhalo(0)|. A tem unidade visual de kpc e não entra nas forças ou no integrador. As cores seguem a profundidade normalizada |Φhalo|/|Φhalo(0)|: ciano em 0, tendendo ao potencial zero no infinito, e âmbar em 1, no centro. A legenda usa a mesma sequência de cores do shader. A porção visível da malha não precisa conter toda a faixa 0–1.

No modo por partículas, a malha representa o NFW contínuo de referência, não o campo instantâneo ruidoso das macropartículas. No modo contínuo, representa o potencial NFW estático empregado nesse modo. Não representa a contribuição de bojo/disco, uma geometria intrínseca ou uma solução relativística. Bojo e disco mantêm seus controles visuais independentes e continuam sendo integrados normalmente.

Não foram adicionados cálculos relativísticos nem alterados massas, condições iniciais, forças, suavização ou KDK. O teste GPU reproduzível está em reports/halo-visual-illustrative-2026-10-22/check.html: compara os buffers e energias ao desenhar com malha desligada/ligada e amplificação 8/12; compara também 100 passos de uma execução com visualização alternada com outra execução idêntica sem renderização, em cada modo. Os resultados reais ficam em verification.json.
