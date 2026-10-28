# Entrada N do halo contínuo e mapa de densidade

## Contagem solicitada versus integrada

Na página principal, **N no modo contínuo agora significa exatamente o número de partículas integradas de bojo + disco**. A entrada 80.000 é convertida para a resolução legada N₀ = 133.333, que gera 19.999 partículas de bojo e 60.001 de disco. O halo permanece um campo externo NFW estático, sem macropartículas.

`src/live-particle-input.js` inverte por busca binária a função real `liveResolution`. A contagem não é estimada dividindo por 0,6. A configuração exportada registra `requestedN`, `particleCountConvention = active-baryons-v1`, o `baseN` legado, as contagens por componente e `n` efetivamente integrado. Números pequenos e ímpares são tratados pela mesma alocação e precisam resultar exatamente no total solicitado.

O modo por partículas mantém sua convenção anterior: N₀ é a realização de base e o refinamento multiplica apenas o halo. O automático ainda mede a quantidade efetiva na GPU antes de escolhê-la; no modo contínuo escreve o total bariônico no campo, em vez da resolução legada de referência.

Não houve alteração no gerador físico legado, nas leis de força, suavização, integradores, massas totais dos modelos ou parâmetros de densidade. Uma entrada 80.000 no contínuo passa a ser uma nova realização de resolução maior que a antiga entrada 80.000, que integrava apenas 48.000 bariões. Não comparar seus estados como se fossem a mesma amostragem. O painel científico de comparação de representações continua usando sua própria convenção legada de N₀ e preservando os mesmos bariões entre os controles.

## Halo visível sem malha

`src/render/continuous-halo-density.js` desenha um mapa suave de densidade projetada, orientado para a câmera e centrado no mesmo centro do campo NFW. É um plano de representação de uma distribuição esférica; não é uma superfície material, emissão luminosa, novo conjunto de partículas ou solução relativística. O raio externo desenhado corresponde ao truncamento efetivo do campo, sem comprimir artificialmente o halo para caber ao lado do disco.

A densidade vem da distribuição de massa usada na gravidade:

    rho(r) = M'(r) / (4 pi r²)

No interior de R200, usa a derivada NFW analítica. Na transição usa a derivada da mesma interpolação linear de massa do campo efetivo; fora do limite externo a densidade é zero. A coluna projetada é:

    Sigma(b) = 2 integral[0,sqrt(Rexterno²-b²)] rho(sqrt(b²+s²)) ds

São 384 raios logarítmicos e quadratura de 256 pontos, com s = b sinh(u). Os dados são calculados uma vez na inicialização e enviados como tabela de leitura à GPU. O desenho por quadro tem apenas dois triângulos e interpolação da tabela, sem somas de pares adicionais e sem leitura das partículas da GPU.

A cor é proporcional a `log1p(Sigma(b)/Sigma(R200))`, normalizada pelo valor no raio mínimo da tabela. A opacidade usa a raiz da intensidade normalizada para tornar o halo externo visível. O raio mínimo ilustrativo é `rs * 1e-4`, um limite de resolução do desenho da cúspide; ele nunca entra na força, energia ou suavização. O controle de opacidade, inicialmente 55%, altera exclusivamente o desenho. Os dados em `density-profile.csv` têm Sigma em 10¹⁰ massas solares/kpc² e intensidade adimensional; a cor não representa luminosidade.

O botão **Enquadrar halo** permite examinar a extensão; a aparência próxima do disco também depende da distância normal da câmera. Não existe amplificação vertical nem malha. Ocultar o mapa ou colocar sua opacidade em zero mantém o campo NFW ativo.

## Verificação

- Testes novos cobrem contagem exata até 80.000, N ímpares, preservação do modo por partículas, geração dos arrays com as massas originais e densidade projetada sem mutação da fonte. Em b = 8 kpc, a diferença entre quadraturas de 256 e 512 pontos é inferior a 10⁻⁵ em termos relativos; isso verifica o mapa visual naquele raio, não uma precisão global certificada da projeção.
- O teste GPU independente `check.html` integra quatro passos em 4.096 corpos em cada modo e compara snapshots reais antes/depois de ocultar, mostrar e alterar a opacidade da representação. Verifica posições, velocidades, acelerações, massas, rótulos, tempo, energia e câmera bit a bit. As imagens com mapa desligado e opacidade zero devem ser idênticas. No contínuo, ligar o mapa deve alterar pixels; no modo por partículas, não deve alocar nem desenhar o mapa.
- A página principal foi preparada com entrada 80.000 e confirmou 80.000 massivas integradas. A realização de demonstração ficou pausada, sem executar campanha longa nem substituir o estado das abas anteriores.
- Os arquivos de física e computação anteriores são verificados por SHA-256. Os registros históricos permanecem preservados.

Os resultados de software e do desenho não demonstram equilíbrio dinâmico. Os ensaios e limitações físicos existentes continuam válidos nos seus respectivos estados e resoluções.
