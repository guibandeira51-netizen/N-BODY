# Auditoria de energia N-corpos — realização legacy

Data: 2026-10-17. Revisão aditiva do diagnóstico; integradores e massas históricos preservados. Projeto de TCC: Modelagem Computacional de Sistemas N-Corpos Aplicada ao Estudo da Matéria Escura.

## Evidência original, antes da alteração

A execução exportada da aba ativa tinha N=80.000, halo vivo, semente 2026, dt=0,1 Myr, ε=0,1 kpc, θ=0,5, backend efetivo GPU WebGPU direto Float32 e energia por árvore CPU Float64. Foram preservadas oito amostras de 0 a 1124.600000 Myr em `reports/energy-audit/observed-run-before.json`. O maior desvio BH nesses registros é **0.01847195%**; o último é **0.00532793%**, assinado. **A alegação de 1,6% não foi reproduzida nesse histórico.** O eixo já estava em porcentagem; 0,016 no eixo percentual equivale a 0,016%, não a 1,6%. Isso é uma explicação possível para a leitura, não uma afirmação sobre a origem da alegação.

O usuário já havia encerrado o motor. Posições e velocidades posteriores não estavam no JSON antigo, portanto a decomposição retroativa entre erro BH e erro da integração **não é identificável**. O estado inicial pôde ser regenerado, quantizado como no upload Float32, e reproduziu K e U_BH históricos exatamente no código antigo. Não foi fabricada uma referência direta para épocas posteriores.

## Caminho executado e diagnóstico encontrado

|Responsabilidade|Fonte auditada|Resultado|
|K, U e E originais|`src/physics/diagnostics.js`, `forces.js`|K=.5 Σm v²; U direto i<j; E=K+U. Fórmula Plummer correta, mas acumulação antiga simples.|
|Árvore energética|`forces.js`, `barnesHutPotentialEnergy`|Monopolo, folhas de 8, θ do usuário, .5 Σm_i Φ_i; sem auto-interação. Aproximação dirigida, sem limite de erro calibrado por estado.|
|Força CPU|`integrator.js`, `forces.js`|Direta simétrica Float64 ou BH dirigido Float64, conforme seleção. Energia direta pode auditar ambas as trajetórias.|
|Força GPU|`compute/gpu.js`, FORCE_WGSL|Soma direta em Float32; não é uma força BH. InverseSqrt e acumulação Float32 introduzem arredondamento.|
|Escolha do diagnóstico antigo|`main.js`, gpuDiagnosticOptions|Troca independente entre energia direta e BH por custo estimado. No registro observado, força GPU direta e energia BH.|
|Defeito de parâmetros|Entrada ao vivo → Worker|G e ε² efetivos só chegavam à rotação; energia usava valores nominais. Corrigido no diagnóstico aditivo; a força não foi alterada.|
|GPU readback|GPUBackend.snapshot|Espera a fila e lê posições, massas, velocidades e acelerações após o kick final. Conversão Float32→Float64 não restaura dígitos perdidos.|
|E₀ e gráfico|LaboratoryHistory, live-diagnostics|Primeiro estado da sessão, preservado ao reduzir histórico. Gráfico assinado em %, painel antigo absoluto em %. Não havia remoção artificial de tendência.|

G nominal = **0.04498502151469553** kpc³/(Myr²·10¹⁰ M☉). GPU: G=0.04498502239584923, ε²=0.009999999776482582 kpc², dt=f32(0,1)=0,10000000149011612 Myr. O relógio GPU histórico acumula o dt solicitado, enquanto o shader usa dt Float32: diferença relativa 1,49×10⁻⁸, registrada nos ensaios. O diagnóstico direto usa o ε² armazenado, sem fazer sqrt e quadrado novamente. A árvore preservada recebe sqrt(ε²), logo pode haver um arredondamento adicional de um ulp ao elevar novamente ao quadrado; ambos os valores são explicitados e a árvore permanece uma estimativa.

## Hamiltoniana e sincronização

Para o sistema isolado vivo, H = .5 Σm_i|v_i|² − G Σ_(i<j) m_i m_j / sqrt(|r_i−r_j|²+ε²). A derivada dá a força Plummer −Gm_j(r_i−r_j)/(r²+ε²)^(3/2). Cada par aparece uma vez; nenhuma autointeração. As massas individuais efetivas são as lidas do estado, inclusive o arredondamento de upload na GPU. Unidades: kpc, Myr, 10¹⁰ M☉; v em kpc/Myr; energia em 10¹⁰ M☉ kpc²/Myr². Não há força não conservativa nem campo dependente do tempo na realização principal auditada.

CPU KDK: v_(n+1/2)=v_n+(dt/2)a_n; r_(n+1)=r_n+dt v_(n+1/2); recalcula a_(n+1); v_(n+1)=v_(n+1/2)+(dt/2)a_(n+1). O estado devolvido tem r e v no mesmo passo completo. A GPU usa três passes separados e snapshot após finalKick. O teste novo verifica a identidade de ambos os kicks numericamente. **Nenhum erro de sincronização foi encontrado; o integrador não foi modificado.**

## Halo fixo e campos externos: escopo separado

O halo da aba auditada é constituído por partículas vivas. O modelo bariônico simplesmente não inclui partículas de halo. A aba não adiciona simultaneamente um halo analítico. Nos controles históricos de halo fixo, fixedHaloDiagnostics soma U_self + ΣmΦ_ext sem fator 1/2; validateFixedHaloState rejeita halo massivo simultâneo. ExternalGrid usa o potencial escalar interpolado e seu gradiente; o fallback externo e a extrapolação têm limitações registradas. A tabela radial histórica fixed-halo interpola massa e potencial independentemente: o gradiente da interpolação de Φ não é exatamente G M_interp/r² dentro de cada célula. Assim, esse controle não é um oráculo Hamiltoniano exato e requer calibração da tabela. **Esses dados históricos não foram reescritos nem usados para certificar a realização legacy.**

validationSnapshot preservado já oferece ΣmΦ_ext, rejeição de dupla contagem, simetria e condições de conservação. Um teste novo verifica o fator externo sem 1/2 e a rejeição de halo duplicado. Para campos dependentes do tempo, dH/dt=Σm∂Φ/∂t; forças não conservativas acrescentam Σm v·a_nc. Energia das partículas não é então um invariante automático. O novo diagnóstico ao vivo isolado rejeita opções externas para evitar uso silencioso da Hamiltoniana errada.

## Alteração entregue

- `physics/live-energy.js`: K compensado reutilizado de validationSnapshot; BH rápido rotulado; parâmetros efetivos; referência direta i<j compensada de pairEnergyRange; normalização explícita.
- `compute/live-energy-reference.js` e Worker: até quatro Workers independentes, partições de linhas sem repetição, redução compensada, estimativa por piloto, progresso por partição concluída e cancelamento por término dos Workers.
- Worker da aba guarda o estado inicial real; captura consistente seleciona o estado atual e retoma a integração se ela estava rodando. Encerrar preserva os endpoints para auditoria; reiniciar limpa a referência da sessão.
- Um gráfico de energia: linha BH, pontos diretos sem segmentos interpolados, comparação U_BH−U_direto no mesmo estado, referência E₀ própria para cada método, máximos amostrados e épocas explícitas. Nenhuma faixa de incerteza inventada.
- JSON energético preserva snapshots auditados completos; CSV preserva energias e parâmetros, e SVG exporta o gráfico. Não há soma direta por quadro nem referência automática em N grande.
- Não houve reescala de v, amortecimento, ajuste de massa, deslocamento de partículas, correção forçada de E, suavização visual ou remoção de tendência. Demais abas mantêm o design.

## Precisão e incerteza

No snapshot legacy N=96, o cálculo independente Decimal com 80 dígitos, usando os valores binários exatos armazenados, encontrou erro relativo de E **9.998e-17** e de U **2.045e-17**. Isso calibra a avaliação naquele caso, não a trajetória nem um limite universal para N=80.000. Soma compensada reduz erro de acumulação; não é aritmética exata. A fundamentação das técnicas de soma está em [Ogita, Rump e Oishi (2005), Accurate Sum and Dot Product](https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf), seção 1.1. Nenhum resultado desta entrega afirma reproduzir os algoritmos avançados SumK do artigo ou herdar automaticamente seus limites.

As diferenças BH/direto são calibrações determinísticas nos pontos medidos, não intervalos de confiança. Não existe limite formal para o erro aritmético de toda referência em N arbitrário nem para o arredondamento da força GPU. A redução do dt deve ser testada: mais passos também acumulam mais arredondamento, e sistemas caóticos com encontros próximos podem divergir entre trajetórias.

## Dados, código e reprodução

Veja `reports/energy-audit/analysis.json`, `figures/manifest.json`, os CSV e os dois relatórios complementares. Identidade do código e SHA-256 das evidências são registrados no diretório da auditoria. As técnicas de 1.0.4/1.0.5 reutilizadas são a partição de pares, compensação, validationSnapshot e o limite analítico da convenção G/ε² (`hamiltonian-bounds-105.js`). Nenhum valor de conservação AGAMA–Plummer foi transferido para a realização legacy.
