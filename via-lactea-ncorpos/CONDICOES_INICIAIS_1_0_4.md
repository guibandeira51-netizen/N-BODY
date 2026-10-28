# Condições iniciais e compatibilidade 1.0.4

O gerador AGAMA–Plummer1.0.2 e as massas de ação foram preservados, sem refit ou ajuste de velocidades. Massas físicas Msun: bojo9.200015467e9, fino3.98e10, espesso1.07e10, halo1.049129212e12 (massa total do perfil finito amostrado, distinta da massa encerrada no raio de referência observacional). A quantização GPU em Float32 é registrada e seus pequenos resíduos de massa são auditados.

## Questões auditadas separadamente

1. Operador médio suavizado: nove iterações preservadas; últimas mudanças máximas de força6,64073e−4 e4,38448e−4. Isso é convergência do operador no domínio de probes, não prova de DF estacionária.
2. Densidade/potencial: preservada a convolução Plummer do potencial da densidade física; densidade física não é confundida com densidade efetiva de Poisson suavizada. A representação de densidade tem erros distintos dos da força. As massas da grade contra integrais da DF diferem em aproximadamente0,4995%,0,00276%,0,00737%,0,05236% para bojo/fino/espesso/halo; não foram renormalizadas para esconder isso.
3. Discos fino e espesso: controles contínuos das mesmas fases, medianas por plano próprio, σz/σR e momentos da DF. O alvo observacional de altura é uma calibração prévia, não igualdade exata da densidade atual. Os priors físicos não foram alterados.
4. Bojo e halo: órbitas de teste e f(J) foram auditados também nessas populações; perfis, momentos e massas encerradas são medidos no sistema vivo. Caudas de densidade quase nula do bojo não devem determinar uma qualificação global.
5. Frequências: diferenças finitas do mesmo potencial médio fornecem Ω²,κ²,ν². Todos os pontos auditados são explícitos em `ic-consistency.json`; não são frequências do potencial vivo a cada tempo.
6. Flutuações de força: somas diretas em28 probes, por população e semente, separam flutuações do halo dos bárions. Novas sementes diagonais mudam ambas; não reutilizamos a dispersão com bárions fixos como se fosse a mesma incerteza. Referência contínua 1.0.2 por hash em `field-audit.json`.

## Testes novos de consistência da DF

As equações estacionárias axisimétricas de Jeans foram avaliadas por momentos não centrais (ordem XX,YY,ZZ,XY,XZ,YZ confirmada no código-fonte AGAMA), incluindo o estresse cruzado Rz. Usam passos espaciais0,02 e0,01 kpc. Resíduos divididos pela soma dos módulos dos termos estão no JSON, por componente e ponto. Derivadas amplificam erros da quadratura e de ações aproximadas; a sensibilidade ao passo, especialmente em certos pontos do halo, impede interpretar cada resíduo como um desequilíbrio físico exato. Os testes radial e vertical não foram substituídos por uma razão virial global.

Em cada uma das três sementes,128 representantes independentes originais por população evoluíram por200 Myr no potencial completo fixo, AGAMA DOP853 Float64, precisão solicitada1e−10. Foram preservados 41 estados da subamostra, IDs, hashes e valores de f(J). Existem caudas de variação de f mesmo sem encontros, além de pequenos resíduos no controle contínuo completo dos bárions. A energia orbital individual também é monitorada; precisão solicitada do integrador não é uma garantia de erro máximo. Esses resultados sustentam uma classificação de preparação aproximada, sem certificação exata global.

Melhorias futuras devem separar precisão das ações, quadratura da DF e representação do potencial, e revalidar as populações e as restrições observacionais. O experimento fatorial atual manteve o gerador para permitir atribuir os contrastes a N. Nenhuma velocidade foi reduzida para forçar um resultado estrutural.

AGAMA fornece métodos de ações, DFs, momentos e construção iterativa de modelos; usar a biblioteca não dispensa validar a realização resultante. Referência primária: [Vasiliev2019](https://arxiv.org/abs/1802.08239).

No perfil médio físico preservado, as medianas|z| solares são 0,199991620 kpc (fino) e0,595268891 kpc (espesso), contra alvos prévios 0,207944154 e0,623832463 kpc. A convergência da iteração não impõe igualdade exata com o perfil exponencial de referência. Esses valores de campo médio solar não são as medianas globais das partículas nas tabelas.
