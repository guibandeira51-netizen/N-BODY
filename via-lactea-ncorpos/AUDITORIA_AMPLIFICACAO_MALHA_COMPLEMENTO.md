# Complemento da auditoria visual — câmera e partículas

Data local: 22 de outubro de 2026. Este relatório complementa a primeira auditoria; os seus arquivos e resultados anteriores foram preservados.

## Problemas confirmados

1. Em `src/render/camera.js`, `setComparisonLocked` conservava a pose, mas `matrix` e `snapshot` escolhiam projeção ortográfica pela condição `comparisonLocked`. Assim, travar/destravar a câmera também mudava a projeção. O controle antigo avisava que era ortográfico, mas misturava duas operações, prejudicando comparações.
2. Em `src/render/gpu-renderer.js`, o shader das partículas usava `clip.w` como distância ao observador para calcular diâmetro e opacidade. Isso funciona para a projeção perspectiva deste programa; na ortográfica, `clip.w = 1`, independentemente da distância. A aparência das partículas podia mudar ao trocar de projeção mesmo com pose física idêntica.
3. A auditoria anterior comprovou a proporcionalidade dos vértices, mas não comparou os pixels das partículas. Essa cobertura era insuficiente para a diferença aparente de tamanho e brilho da galáxia nas novas imagens.

As imagens fornecidas não registram as matrizes, a distância da câmera nem o tamanho original do canvas. Portanto, não demonstram por si só qual sequência de controles produziu toda a diferença. Não foi encontrado caminho que transmita a amplificação para massas, força, integração ou condições iniciais.

## Correção exclusivamente visual

- Projeção e travamento são independentes. `setProjection` seleciona explicitamente perspectiva ou ortográfica; travar/destravar preserva a projeção e as matrizes atuais.
- A página começa com projeção ortográfica e câmera fixa, escolhas explicitamente indicadas nos controles. Destravar permite girar, aproximar e selecionar outra projeção.
- O shader recebe a linha de profundidade da matriz de visão, `d = -(V x)_z`, em um uniforme separado. O tamanho/brilho das partículas não usa mais o `w` constante da projeção ortográfica. Os chamadores antigos em perspectiva preservam o cálculo anterior pelo seu `w`.
- O controle de amplificação continua apenas no uniforme da malha: `z = z_c + A f(R)`. O buffer base e o escalar de cor não são recalculados.
- Não foi adicionado autoenquadramento. Uma amplificação grande pode sair da tela. O enquadramento deve ser escolhido antes de travar, sem compensação automática da amplificação.
- Um indicador informa projeção, distância da câmera e dimensões do canvas. Os metadados DOM desse indicador registram também pose, matrizes, A e relógio físico para reproduzir a comparação.

Em perspectiva, a projeção de uma mudança em z pode mudar a largura aparente da própria malha, mesmo com câmera imóvel. A projeção ortográfica elimina essa dependência de profundidade na escala aparente. Isso não significa que a imagem de toda a superfície seja uma dilatação 2D: suas coordenadas horizontais projetadas também contêm a orientação do plano base, que é conservada.

## Teste independente na GPU

Executar `reports/halo-camera-followup-2026-10-22/check.html` no servidor local e pressionar **Auditar 8 → 50**. O teste importa os módulos de produção; não usa o controlador da página principal.

Dois estados de semente 2026, N₀ = 1.024, dt = 0,1 Myr, ε = 0,1 kpc: halo por partículas (N integrado = 1.024) e halo contínuo (N integrado = 615). O estado não é avançado durante a comparação visual.

Para cada modo:

- Compara os 16.640 vértices efetivos com a mesma função WGSL utilizada no desenho e a partir do buffer real da malha.
- Δx máximo = 0; Δy máximo = 0.
- Máximo resíduo de `(z50 − zc) − 6,25 (z8 − zc)` = 2,5257468223571777 × 10⁻⁶ kpc; resíduo relativo máximo = 9,017887956165262 × 10⁻⁸. Compatível com arredondamento Float32; o teste usa tolerância derivada do epsilon de máquina Float32 e das magnitudes envolvidas.
- Cores, potencial de referência e buffer base idênticos. Os limites x/y do bounding box não mudam; os limites z mudam conforme A. Nenhum limite é usado para ajustar a câmera.
- Câmera, near/far, alvo, projeção, zoom e matrizes idênticos entre A = 8 e A = 50.
- Posições, velocidades, acelerações, massas, rótulos, energia e tempo do estado GPU idênticos antes/depois da comparação.
- Desenha **somente as partículas**, com o shader de produção, para isolar sua imagem da sobreposição aditiva da malha. Compara todos os 2.160.000 bytes de uma imagem 900 × 600, em cada projeção. Resultado: **zero bytes diferentes** em todos os quatro pares de imagens.
- Verifica que as imagens não estão vazias: 1.132 pixels diferentes do fundo na ortográfica e 1.161 na perspectiva, em cada modo. Não exige que imagens de projeções diferentes sejam iguais.

Os dados completos estão em `gpu-results.json`. A igualdade de energia nesse teste é a igualdade do mesmo estado ao trocar controles visuais, não um novo ensaio de conservação orbital.

## Fluxo real na interface

Página principal, N₀ = 4.096, halo contínuo, 614 partículas de bojo e 1.844 de disco. Integração pausada em **524,3000078126788 Myr**, **5.243 passos**. Câmera orientada uma vez e afastada manualmente antes de travar, distância **122,423716 kpc** (o valor exato está em `ui-states.json`), canvas **889 × 490 px**.

Depois de travar, alterar somente A = 8 → 50. `ui-states.json` registra câmera, projeção, matrizes, dimensões, tempo e número de passos exatamente iguais, excluindo somente o campo `amplification`. `main-A8.png` e `main-A50.png` mostram a galáxia com a mesma posição e escala, enquanto a malha aprofunda.

O relatório não interpreta o estado de 524 Myr como validação de equilíbrio. Ele serve exclusivamente ao teste visual solicitado.

## Regressão e preservação

- `node --test tests/halo-amplification.test.mjs tests/render.test.mjs`: oito testes, incluindo travamento sem mudança de projeção e profundidade das partículas independente da projeção.
- `node scripts/test.mjs`: 233 testes aprovados.
- `physics-integrity.json`: comparação SHA-256 de todos os 63 arquivos físicos e computacionais com a identidade anterior à alteração visual.
- `before/`: cópias dos arquivos alterados e do manifesto ativo antes deste complemento.
- Nenhum integrador, força, massa, suavização, condição inicial ou resultado histórico foi corrigido nesta tarefa.

O programa não recupera o estado WebGPU de uma página antiga após recarregá-la. A nova versão deve ser aberta após salvar os resultados que o usuário deseje preservar. A verificação foi feita em uma aba nova, sem reiniciar as execuções antigas.
