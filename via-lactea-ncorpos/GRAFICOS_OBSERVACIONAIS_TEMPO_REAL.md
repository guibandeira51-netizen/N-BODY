# Cinco gráficos astrofísicos em tempo real — 23/10/2026

A página Experimento N-corpos preserva todos os controles, modos físicos, geometrias de halo e gráficos anteriores. A rotação existente foi mantida e quatro novos painéis foram acrescentados: resíduos, força vertical, velocidade de escape instantânea e massa acumulada. Permanecem também a espessura do disco e os dois painéis energéticos. São oito figuras, cada uma com seu botão Salvar gráfico em SVG.

## Atualização e preservação da física

Os novos gráficos usam o mesmo snapshot que alimenta os diagnósticos existentes. O tempo físico exato é incluído nos metadados; a interface arredonda apenas o texto de apresentação. Os dados observacionais são fixos. Uma coleta concluída substitui os perfis apresentados, sem criar novos estados físicos entre medições. A coleta acompanha a cadência adaptativa já existente (intervalo físico solicitado de 1 Myr, limite por tempo computacional e custo, além das auditorias de energia e da coleta na pausa). Não é um cálculo a cada quadro renderizado.

Há **1.504 sondas sem massa**, distribuídas em 16 azimutes por grupo: 38 raios exatos de Eilers; 19 raios verticais em z=+1,1 e −1,1 kpc; 17 raios de escape entre 4 e 12 kpc; e uma fronteira externa de comparação em 2R200. O kernel lê posições, massas e rótulos atuais, com a constante G e ε² efetivos do motor. Somente buffers próprios de saída são graváveis. Não há ligação gravável às posições, velocidades ou acelerações do integrador.

Nas sondas, para cada fonte j:

a(x)=GΣ mⱼ(rⱼ−x)/[|rⱼ−x|²+ε²]^(3/2),

Φ(x)=−GΣ mⱼ/√[|rⱼ−x|²+ε²].

São calculados separadamente o campo de todas as partículas e o de bojo+disco. No modo contínuo, o Worker soma o campo externo NFW da mesma geometria e dos mesmos parâmetros efetivos do integrador. No modo de partículas, todas as partículas de halo são incluídas diretamente. A retirada de halo nas curvas bariônicas é uma decomposição do **mesmo estado**, não uma segunda trajetória sem halo reequilibrada.

Unidades internas: kpc, Myr, 10¹⁰ M☉; conversão de velocidade pela constante existente KM_S_TO_KPC_MYR. Não foram alteradas massas, condições iniciais, suavização, G, força do integrador, Leapfrog KDK ou cadência da referência energética direta.

## O que cada figura mede

1. **Curva de rotação:** gráfico anterior preservado, com bojo, disco, halo, bojo+disco, total e os 38 pontos de Eilers et al. (2019). Continua sendo uma média azimutal do campo, não a velocidade média das estrelas do disco. No triaxial, não representa órbitas circulares exatas.
2. **Resíduos:** v_observado−√(−R⟨aR⟩), com o modelo avaliado diretamente nos 38 raios publicados. Não há interpolação dos dados observacionais. Os dois resíduos conservam as barras estatísticas assimétricas de Eilers; RMS é apresentado descritivamente. Não é um ajuste estatístico e não há p-valor, covariância inferida ou faixa bariônica arbitrária.
3. **Força vertical:** Kz=[−⟨az(R,+1,1)⟩+⟨az(R,−1,1)⟩]/2. É uma força restauradora assinada e simetrizada, expressa como Kz/(2πG) em M☉/pc². O fator de conversão das unidades internas é 10⁴. Não equivale automaticamente à coluna real de massa de um disco com curva não plana. Comparação com os 43 valores de força da Tabela 3 de Bovy & Rix (2013), mantendo R0=8 kpc e os erros marginais publicados. Coordenadas e plano iniciais fixos; não se transforma silenciosamente uma tabela observacional ao inclinar o disco simulado.
4. **Escape instantâneo:** √[2(⟨Φ(2R200,φ,0)⟩−⟨Φ(R,φ,0)⟩)]. A fronteira fixa do modelo é aproximadamente 413,25 kpc, derivada do R200 original; não é ajustada aos dados durante a execução. É um diagnóstico de profundidade do potencial congelado, com convenção angular explícita. Em um campo variável ou não esférico, não é um certificado de escape da trajetória real nem uma superfície equipotencial exata. São mostrados somente os valores numéricos verificáveis no texto de Roche et al. (2024), seção V.2, para o bin 8–9 kpc: SEPL 486^(+10)_(-5) km/s e 2PL 539^(+69)_(-34) km/s. A barra horizontal indica a extensão do bin, não erro gaussiano de raio. São métodos alternativos sobre a mesma amostra; não se somam como observações independentes. Não foi digitalizado o resto do perfil a partir de figuras. O artigo adota 2R200c para a tradução entre potencial e escape; o presente painel registra a fronteira do nosso modelo, sem importar o ajuste de massas do artigo.
5. **Massa acumulada:** soma de massas das partículas dentro de esferas de raio r em torno da origem inicial. O halo contínuo é integrado dentro da mesma esfera, incluindo centro deslocado, orientação e geometria elipsoidal. Bojo+disco e total são comparados em unidades de 10¹⁰ M☉. Não se usa M=Rv²/G para substituir a massa de um disco ou halo triaxial. É um perfil previsto pelo modelo; não há novos pontos de massa apresentados como observações independentes.

## Integração da massa do halo contínuo

Usa-se a coordenada principal elipsoidal s e uma direção unitária n. Um ponto do halo é c+sR diag(1,p,q)n. A condição de estar dentro da esfera observacional é quadrática em s; suas raízes delimitam o intervalo de massa radial a integrar naquela direção. O Jacobiano pq cancela a normalização 1/(pq) da densidade. A função de massa radial é a do mesmo halo finito, incluindo o fator C documentado para as formas elipsoidais. Integração angular: Gauss–Legendre de ordem 24 em cosθ e 48 azimutes. Não se declara um intervalo de erro certificado para essa quadratura. A verificação esférica centrada reproduz a função de massa original; no triaxial o teste de esfera externa recupera a massa total e a sequência é monótona.

## Evidências executadas

- **245 testes automatizados**, todos aprovados. Incluem comparação com a força e o potencial analíticos de massas puntiformes suavizadas; unidades de Kz e escape; raios exatos dos resíduos; integridade das observações; massa em esferas; os oito botões de exportação e preservação da estrutura anterior da página.
- Teste WebGPU com **N=2048**, dt=0,1 Myr, ε=0,1 kpc, semente 2026 e 16 passos. Três configurações: halo de partículas, contínuo esférico e contínuo triaxial p=0,85/q=0,7 com orientação (25°,12°,7°). Com os diagnósticos ligados e desligados, posições, velocidades, acelerações, massas e rótulos finais foram **idênticos bit a bit** em cada par.
- Nove sondas escolhidas, cobrindo raios de rotação, ambos os lados do plano, escape e fronteira externa, comparadas com somatório CPU Float64 independente. Em N=2048, o maior resíduo RMS relativo entre os controles foi aproximadamente 7,07×10⁻⁷ para a força e 7,26×10⁻⁷ para o potencial das partículas. A inclusão do halo contínuo usa a rotina física já auditada; esse teste não recalibra o erro homeoidal previamente documentado.
- Medição adicional em N=8192 e **N=80000** com halo contínuo esférico. Em N=80000, os resíduos RMS relativos foram 7,45×10⁻⁶ (força) e 4,76×10⁻⁶ (potencial), coerentes com uma acumulação Float32 mais longa. Float64 na redução não transforma os somatórios da GPU em Float64.
- No navegador, os quatro novos painéis foram observados em épocas distintas da execução de N=8192. As épocas exatas de início/fim dessa verificação estão em `ui-live-states.json`; os painéis novos e a rotação são sincronizados pelo mesmo snapshot. Essa execução é um teste funcional dos gráficos, não uma campanha que certifica equilíbrio em vários Gyr.
- O botão Salvar gráfico foi exercitado na interface e o SVG resultante contém os dados, a época, os parâmetros e as fontes. Todas as figuras são SVG vetorial, com tooltips e metadados incorporados.

## Custo computacional medido

Tempos por coleta adicional, em navegador local sob a carga presente durante o teste:

| Configuração | N | GPU: sondas + leitura | Worker: redução + perfis |
|---|---:|---:|---:|
| Partículas | 2048 | 2,27 ms | 3,82 ms |
| Contínuo esférico | 2048 | 6,54 ms | 12,95 ms |
| Contínuo triaxial | 2048 | 3,22 ms | 23,44 ms |
| Contínuo esférico | 8192 | 2,48 ms | 15,00 ms |
| Contínuo esférico | 80000 | 14,52 ms | 25,59 ms |

São amostras de custo, não médias de uma campanha de desempenho. Despacho, sincronização, JIT e outras abas explicam variações não monótonas em N pequeno. O tempo total do snapshot inclui também os diagnósticos antigos e, na primeira chamada, compilação do pipeline novo. A renderização SVG e a energia direta automática já existente não entram nessas duas colunas. O cálculo adicional das sondas tem complexidade O(NP), P=1504 fixo, e não um novo O(N²) a cada quadro. Os novos buffers GPU de sondas/saída/staging somam aproximadamente 0,115 MiB; a análise CPU e as tabelas têm armazenamento adicional. As estimativas gerais de memória da interface continuam aproximadas, não uma medida de VRAM.

## Limites de interpretação

Os dados astronômicos são inferências publicadas com hipóteses e incertezas; não são medições diretas das partículas do simulador. O modelo continua sem gás e sem ajuste observacional livre dos bariões. Os parâmetros históricos e a curva de Eilers não são completamente independentes. A força vertical tem distância solar de referência própria e possíveis sistemáticas; a estimativa de escape depende do modelo da cauda de velocidades. As figuras não afirmam descoberta da matéria escura, ajuste validado ou equilíbrio estrutural. Diferenças e desacordos com os dados são mantidos.

Arquivos de implementação: `src/compute/gpu-observational-probes.js`, `src/physics/observational-diagnostics.js`, `src/observational-plots.js`, `src/observations/vertical-escape.js`; integração aditiva em `gpu-live.js`, `gpu-diagnostic-worker.js` e `live-diagnostics.js`. O controlador ativa o diagnóstico sem mudar a seleção física.

Evidências: `reports/live-observational-2026-10-23/`, com fontes numéricas CSV/JSON, testes, execução de validação reproduzível, dados do navegador, SVGs efetivamente exportados, hashes e cópias locais anteriores em `before/`. Os arquivos históricos de resultados e campanhas anteriores são preservados.

## Referências primárias

- Eilers et al. (2019), Tabela 1: https://arxiv.org/abs/1810.09466 — dados já preservados no projeto.
- Bovy & Rix (2013), arXiv v3, Tabela 3, página 17 do PDF: https://arxiv.org/abs/1309.0809v3 — colunas R, KZ, δKZ; números e precisão decimal preservados.
- Roche et al. (2024), ApJ 972, 70, versão arXiv v2 consultada em 23/10/2026, seções V.2 e VI.1: https://arxiv.org/html/2402.00108v2 — somente os dois resultados explícitos do intervalo 8–9 kpc.
