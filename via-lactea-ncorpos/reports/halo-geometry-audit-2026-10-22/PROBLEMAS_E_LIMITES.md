# Achados da auditoria — sem correções silenciosas

1. **Limitação conhecida / risco de erro de interpretação física:** a força é Newtoniana, com halo NFW estático. `haloWeakMetric()` constrói coeficientes a partir de Φ e retorna a própria aceleração calculada por `haloGeometryAt`; não integra conexões/geodésicas completas. A malha tampouco usa gμν: usa diretamente Φ normalizado. Não há evidência computacional da hipótese de matéria escura emergente da geometria. Proposta: nomes e metadados devem sempre explicitar o limite Newtoniano; uma investigação relativística requer problema físico, fontes, condições de contorno e validação separados.

2. **Falha de validação para uma alegação relativística completa:** não se calculam Einstein, energia-momento, restrições relativísticas nem o campo bariônico relativístico do caso C. A verificação de Poisson feita nesta auditoria é escalar, linearizada e em pontos interiores; não supre essa ausência. Não implementar um halo sem fonte arbitrariamente.

3. **Erro numérico pequeno e mensurado:** integração independente da densidade dá Mhalo=97,63121331395332; a tabela de produção tem 97,6315764173288, diferença relativa 3,71913206×10⁻⁶. Em R200 efetivo, a massa tabulada inicial do taper difere da expressão analítica interior por −0,00001023152698565 em 10¹⁰ M☉; há salto relativo de força −1,09806517×10⁻⁷. Φ é contínuo pela constante de junção, mas não é C¹ exatamente. Proposta futura: tornar a integral/tabulação e a junção consistentes por construção, versionar e refazer a comparação; não modificar massas históricas.

4. **Limitação conhecida do perfil:** a cúspide NFW tem densidade singular e gradiente direcional não definido exatamente em r=0. O backend define a=0 nesse ponto. Não é uma regularização relativística demonstrada. Não introduzir raio de núcleo físico arbitrário para ocultar isso.

5. **Limitação de precisão:** novas sondas revelaram erro relativo de força até 2,12254×10⁻⁶ no conjunto testado, contra a referência Python Float64 com os parâmetros efetivos. Um máximo anterior de 3,28×10⁻⁷ não era um limite global. Órbitas GPU Float32 apresentaram aumento do erro de posição com passos menores nestes controles, enquanto CPU Float64 KDK mostrou redução ≈4 por divisão de dt. Não declarar convergência temporal da GPU apenas pela ordem formal do KDK.

6. **Erro de implementação no alcance do controle da interface:** `Testar CPU × GPU` em `ncorpos-live-entry.js:129` chama o controle original sem escolher o backend contínuo. Proposta futura: despachar o teste correspondente à representação selecionada e mostrar seu alcance. A presente auditoria executou o backend contínuo em harness independente; não alterou o botão.

7. **Limitação / apresentação parcial:** o refinamento é corretamente desabilitado no modo contínuo, mas o filtro visual de partículas de halo permanece, embora não haja corpos a desenhar. O texto genérico sobre três componentes massivas também permanece. Proposta: ajustar somente rótulos/estado desses controles, sem alterar física.

8. **Falha de inferência evitada:** halo vivo ×4 versus campo estático não isola Relatividade Geral, relaxação ou suavização individualmente. Não demonstra superioridade frente a ×32 nem estabilidade do disco. É necessário controle contínuo com Plummer equivalente, refinamentos, sementes e épocas iguais, sem campanha extensa automática.

9. **Limitação de medição de desempenho:** os tempos de `GPUBackend.step` são de parede, incluindo submissão e espera da fila; não timestamps exclusivos do kernel. O wallMs do controle original inclui a espera do ensaio fino de 200 Myr, enquanto computeMs soma somente a trajetória grossa. O novo perfil auxiliar separa etapas, mas a primeira geração de condições iniciais inclui o cache frio de Jeans e a segunda usa cache quente: não atribuir a diferença ao halo ou à RG.

10. **Limitação de reprodutibilidade:** exportações contêm representação, parâmetros efetivos, Hamiltoniana, semente, backend, época das velocidades e hash de código. Não preservam automaticamente todos os arrays em todos os estados medidos. A auditoria nova preserva os discos de todos os seus checkpoints para permitir a conferência independente de h50.

Os 228 testes existentes continuam aprovados. A integridade SHA-256 de 102 arquivos monitorados de produção foi conferida sem diferenças. A classificação e os números acima não transformam testes de software em validação da hipótese física.
