# Protocolo anterior à construção — candidato orbital, perfis legados

## Escopo e hipótese

Preservar Hernquist, Miyamoto–Nagai e NFW com o taper e as massas atuais. O gerador legado, forças, shaders e integradores de produção não serão substituídos. A nova família será experimental e só poderá ser promovida após fidelidade de densidade, estacionariedade e convergência demonstradas. Nenhum teste curto aprova estabilidade em bilhões de anos.

## Campo médio Plummer

Se K_e(r)=1/sqrt(r²+e²), então ΔK_e=-4πW_e, onde W_e=3e²/[4π(r²+e²)^(5/2)]. Logo Φ_e=W_e*Φ_Newton=-G K_e*ρ, com Φ→0 no infinito. Essa identidade permite usar os potenciais físicos existentes sem trocar suas densidades por perfis exponenciais. O operador convolui separadamente cada componente; a massa de W_e é um. A transformação s=e tan(t) dá peso radial 3 sin²(t) cos(t) dt em 0<t<π/2. Usaremos Gauss–Legendre radial/polar e trapézios em azimute, refinados independentemente. A representação tabulada usa um único potencial escalar Hermite, do qual se derivam ambas as forças. Densidade física continua sendo ρ; a densidade de Poisson do campo suavizado é W_e*ρ.

Avaliar separadamente erro da quadratura, erro da tabela, gradiente, simetrias, força vertical e frequências. Fora da tabela, usar a convolução, nunca um monopolo descontínuo sem avaliação. Não somar esse campo à galáxia totalmente viva.

## Escolha do método

Yurin & Springel (2014), https://arxiv.org/html/1402.1623v1, §§2–4, minimizam discrepâncias de ocupação orbital e momentos, ajustando velocidades. GALIC: https://github.com/denisyurin/GALIC. Vasiliev (2019), https://arxiv.org/html/1802.08239v2, §§4–5, constrói DFs em ações e permite ajustes; o exemplo https://github.com/GalacticDynamics-Oxford/Agama/blob/master/py/example_self_consistent_model.py não impõe a densidade exata MN desta realização. Copiar suas DFs alteraria o problema. AGAMA não está importável no Python disponível desta sessão; isso é limitação do ambiente, não impossibilidade física de ajustar DFs.

Escolha inicial: ramo de superposição orbital positiva, relacionado ao princípio de resposta orbital de GALIC/Schwarzschild, **não uma implementação do GALIC oficial**. Construir biblioteca de órbitas no campo suavizado estacionário, ajustar pesos não negativos normalizados à ocupação 2D (R,|z|) de cada densidade-alvo e sortear fases/azimutes independentes para obter partículas de massa igual dentro de cada componente. Pesos são probabilidades da biblioteca, não mudanças das massas físicas. O gerador não é velocidade circular mais ruído. Propostas iniciais podem usar o legado apenas para cobrir o espaço de órbitas; a DF final é a mistura de medidas orbitais. Não impor σR=σz à mistura. Medir o tensor resultante. O sinal de Lz do disco é herdado das propostas, sem impor uma nova dispersão observacional. Componentes esféricas incluem parceiros com Lz oposto para não impor rotação líquida.

Isso evita supor uma DF esférica exata no potencial achatado. Contudo, médias de órbitas finitas não são uma prova de medida invariante: comparar metades temporais, refinar integração/duração/biblioteca, validar com fases e sementes independentes, e comparar bins não utilizados no ajuste. Ajuste de densidade sozinho é degenerado e não garante estabilidade contra modos coletivos. Se a biblioteca não reproduzir os alvos, rejeitar sua promoção; não modificar os alvos nem concluir que nenhum equilíbrio existe.

## Mérito e rejeição

Para células j, matriz A_ji é a fração temporal da órbita i na célula, t_j a massa alvo normalizada, w_i≥0, Σw_i=1. Minimizar KL(t||Aw) por atualização multiplicativa, registrando resíduos, esparsidade, tamanho efetivo da biblioteca e validação temporal independente. Células vazias conservam probabilidade zero; não apagar massa fora do domínio. Incluir um bin de overflow. A densidade-alvo é integrada por amostragem independente dos inversores exatos já auditados; medir seu ruído com duas sementes, sem tratar essas estimativas como observações.

Não escolher tolerância estrutural para aprovar gráficos: comparar variação dos perfis contra erro de integração/quadratura, discrepância entre bibliotecas e variabilidade de amostragem por sementes. Registrar ausência de convergência. Os limites de custo e iterações são orçamento computacional, não parâmetros físicos. A precisão de órbitas deve ser medida a cada passo, e nenhum ajuste de energia é permitido.

## Custo, controles e portas

Começar com bibliotecas pequenas e campo tabulado; estimar custo medido antes de ampliar. Rodar controles de 40 e 200 Myr em CPU Float64 e, quando viável, GPU Float32 do mesmo snapshot: A traçadores no campo total suavizado; B disco vivo com bojo/halo suavizados fixos; C todos vivos sem campo externo. Energia externa entra sem 1/2. Comparar massa, h50 próprio/por anel, dispersões, tensor, perfis, rotação, L, energia e ligação. Estudar N e refinamento independente do halo com massa total fixa. Alterar e exige nova preparação; reaproveitar a mesma DF em outro e é apenas controle de incompatibilidade identificado.

Somente após controles curtos e fidelidade satisfatórios, avançar múltiplos períodos obtidos do campo e depois Gyr. Se uma porta falhar, não gastar uma campanha grande para esconder a falha. Publicar resultados e snapshots experimentais, mantendo o gerador legado como padrão. A página de resultados pode consultar candidatos rejeitados; selecioná-los para execução principal exige aprovação científica demonstrada, não apenas existência do arquivo.

## Aquecimento

Sellwood (2013), https://arxiv.org/abs/1303.4919, orienta separar espessamento por discretização e movimentos coletivos. Diminuir a massa das macropartículas do halo por refino de N_h, mantendo massa total, é um controle. Não é autorização para mudar massas totais, amortecer movimentos ou resfriar a evolução.
