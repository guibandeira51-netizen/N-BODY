# Compatibilidade do campo médio suavizado — 1.0.2

## Operador e unidades

Para a densidade física ρ, o operador implementado é

\[
\Phi_\epsilon(\mathbf x)=-G\int\rho(\mathbf y)(|\mathbf x-\mathbf y|^2+\epsilon^2)^{-1/2}\,d^3y.
\]

A identidade usada é Φε = Wε * ΦNewton[ρ], com Wε(r) = 3ε² / [4π(r²+ε²)^(5/2)]. Sua integral espacial é 1 e ∇²Φε=4πG(Wε*ρ). Ela segue da equação de Poisson do potencial de uma massa Plummer e das condições de contorno no infinito. A densidade física que entra na DF continua sendo ρ, não Wε*ρ. Forças são −∇Φ e usam a mesma convolução.

O operador `plummer_mean.py` integra deslocamentos isotrópicos, r=ε tanθ, peso radial 3 sin²θ cosθ. Quadratura principal 24×8×16, referência 48×16×32. As expansões Multipole/CylSpline do AGAMA permitem usar um potencial escalar nativo e ações no laço de densidade. Não há força artificial na evolução. Comprimento kpc, tempo Myr, massa interna 10¹⁰ M☉; o gerador registra explicitamente a conversão de km/s para o G nominal do motor. A GPU herda o arredondamento f32 de G, ε e massas, sem alegar identidade bit a bit com o contínuo f64.

## Campo anterior e novo

Na densidade antiga, em R=8,122 kpc e z=0,1 kpc, a_z Newtoniano = −428,67786 e média Plummer = −398,84336 (km/s)²/kpc: redução de módulo de 6,96%. Em R=1,z=0,1, a mudança é cerca de 8,05%; no centro a diferença pode ser muito maior. O erro não é um único fator constante. `field-proof/proof.json` retém potencial, forças, sondas e ordens de quadratura.

No campo corrigido, 77 sondas com R=0,25–20 kpc e z=0–2 kpc: erro relativo vetorial da expansão nativa contra convolução refinada, percentis 50/90/máximo = 2,919e−5 / 5,519e−5 / 9,934e−5. Isso mede a representação de um campo de uma dada densidade de malha, não todo o erro da DF física. A concordância entre densidade de Poisson e Wε*ρ tem resíduos absolutos relativos 50/90/máximo de 0,0331% / 0,1443% / 0,5563%.

`field-validation/frequencies.json` registra Ω²=−aR/R, κ²=4Ω²+R dΩ²/dR, ν²=−∂az/∂z, e gradientes por diferenças finitas, antes/depois. Sinais e frequências são consequências do campo total, não parâmetros ajustados para produzir um disco fino. A figura 1 mostra forças, potencial e ν²; as tabelas contêm os demais diagnósticos.

## Fechamento DF, densidade e observações

Integrações independentes em velocidade em 15 pontos fora da malha: erro absoluto relativo da densidade física TOTAL, mediana 0,0993%, p90 0,8131%, máximo 1,2708%. A população do bojo apresenta erro relativo local de até cerca de 80% em sua cauda muito rarefeita; os valores absolutos e relativos de cada população estão em `df-validation/closure.json`. Não se declara precisão universal de 10⁻⁴ da solução física.

A massa da representação de densidade difere da integral independente da DF em: bojo +0,49947%; fino +0,002759%; espesso +0,007373%; halo +0,052365%. Os pesos das partículas usam as integrais de DF preservadas, sem renormalizar silenciosamente as massas para a malha. Esse resíduo permanece como limite do fechamento campo/amostra.

As DFs e seus priors observacionais são os mesmos: fino R_d=2,43 kpc, σR solar de referência 35 km/s; espesso R_d=3,88 kpc, σR de referência 50 km/s; alvos de altura exponencial 0,3 e 0,9 kpc. A nova densidade solar tem medianas |z| de 0,19999162 e 0,59526889 kpc, contra 0,197089 e 0,593090 anteriores e alvos 0,20794415 e 0,62383246. Os resíduos em relação aos alvos são aproximadamente −3,83% e −4,58%. Preservar os priors não equivale a reproduzir exatamente toda a densidade e cinemática observacional.

`kinematic-profiles.csv` contém densidade, rotação média, σR, σφ e σz no plano para as quatro populações e 24 raios. Os segundos momentos foram convertidos em variâncias subtraindo o quadrado da média. `corrected/kinematic-moments.json` guarda os dados AGAMA originais. As densidades radiais iniciais/finais amostradas e perfis contínuos estão nas figuras/tabelas. Não se fez um novo ajuste observacional nem se promete que o perfil radial final seja exatamente exponencial. Antes da campanha longa, ajustar simultaneamente densidade e cinemática com incertezas observacionais continua necessário.

## Ruído discreto e viés

Três realizações por família, N=1.000 e 10.000, nas mesmas sondas fixas. `field-validation/ensemble.json` separa referência Plummer da densidade, campo de preparação, média das forças discretas, desvio entre sementes e erro padrão. A norma relativa do desajuste sistemático de preparação caiu de 0,058035 para 0,00003949, contra a densidade representada. O erro da média discreta em N=10.000 foi 0,13854 antigo e 0,16023 novo; o desvio entre realizações foi 0,27929 e 0,358996. Não se esconde que a nova amostragem ainda pode ser mais ruidosa. Com apenas três sementes, a ausência de viés de amostragem não está demonstrada. Não há obrigação de cada força instantânea coincidir com o campo médio.

## Estacionariedade no contínuo

A variação de f(J) foi medida ao longo de órbitas de 20 Myr com ações aproximadas. Média entre sementes dos percentis 50/90 de |Δln f| no fino: antigo em seu próprio campo 0,003813/0,05557; mesmas condições antigas no campo Plummer 0,02244/0,10045; novo em seu campo Plummer 0,004002/0,06161. A preparação corrigida recupera aproximadamente o nível de compatibilidade do controle original nesse diagnóstico; não torna as ações exatas. Bojo, espesso e halo estão em `df-validation/f-along-orbits.json`.

Quatro testes independentes em `test_plummer_mean.py`: normalização/axisimetria, gradiente do potencial, referência esférica por integração direta da densidade física com o Green suavizado, e limite ε=0/parâmetros inválidos. A referência esférica não usa a mesma convolução de potenciais, evitando um teste circular.
