# GPU direta e escolha automática de N

Página principal `experimento-ncorpos.html`, implementação de 22/10/2026. O fluxo ativo não oferece integração CPU/Barnes–Hut nem fallback de integração para CPU. Os códigos e dados das campanhas anteriores permanecem preservados para reprodução histórica.

## Funcionamento

Em modo automático, N começa vazio. A página detecta WebGPU e seus limites, executa uma comparação curta entre força direta GPU e referência CPU Float64 e mede o kernel GPU de produção com 10.000 e 30.000 corpos, quando admitidos pelo orçamento. Só depois propõe uma resolução e mede também o **total efetivo proposto**. O campo N₀ é preenchido após essa verificação.

A projeção usa o custo O(N²), alvo computacional de 20 ms por passo e fator de folga 0,9 em N. São políticas de desempenho, não parâmetros físicos nem garantia de FPS. Há até três verificações/refinamentos de custo antes de informar que a carga do dispositivo impede uma recomendação confiável. N não é inferido apenas pelo nome da placa ou por suposta VRAM.

O refinamento do halo participa da inversão N total → N₀ através da alocação real de bojo/disco/halo. Não confundir as duas contagens. Alterar modo, refinamento, distribuição de massa, orçamento, backend ou seleção automática invalida a recomendação. O modo manual preserva o N informado; não reduz silenciosamente o número de partículas. Uma projeção acima de 2 s por passo é recusada com orientação explícita para reduzir a resolução, antes de alocar a realização.

Sem WebGPU/validação aprovada, a página informa a indisponibilidade e não escolhe CPU. A referência CPU pequena no teste do dispositivo não é um backend de integração.

## Divisão de trabalho

- GPU: força direta Plummer, Leapfrog KDK, potencial gravitacional por pares e campo radial por componente nas 31 × 32 sondas da curva de rotação.
- CPU: geração das condições iniciais, redução compensada de escalares, análise estrutural dos snapshots, interface e referência direta independente Float64 com quatro Workers.
- Não existe chamada Barnes–Hut na rotina ativa de diagnóstico. O Worker novo só gera condições iniciais e analisa estados vindos da GPU.

O motor GPU mantém as mesmas operações xyz da força anterior e os mesmos passes KDK. A componente anteriormente não utilizada `acceleration.w` armazena `0,5 mᵢ Φᵢ`, calculada na travessia direta já executada. O termo de autointeração continua excluído. Não se acrescenta outro somatório N² para o potencial rápido. O resultado é somado em Float64 compensado na leitura do snapshot; a soma de pares de cada partícula continua Float32.

Por isso, o gráfico rápido identifica **Energia estimada — GPU Float32**. Ele não é uma avaliação direta Float64. O segundo gráfico mantém as avaliações CPU Float64 nos estados auditados e sua própria energia inicial. Ambos usam G, ε² e dt efetivos do backend. Nenhuma tendência foi subtraída, nenhum valor energético foi corrigido artificialmente e nenhuma medição foi interpolada.

As curvas de rotação usam os mesmos componentes e sondas, com somatórios de força Float32 na GPU e média azimutal Float64. As contribuições continuam somadas em v²; suporte radial negativo permanece como lacuna em v. Os pontos observacionais de Eilers permanecem inalterados.

Os identificadores antigos de slots gráficos (`bh`, `BH`) são mantidos nos formatos internos compatíveis com séries históricas. Para a execução nova, `estimator="gpu"`, `energyAlgorithm="gpu-pairs-f32"`, rótulos, métodos e precisão indicam GPU. Esses identificadores não representam uma árvore sendo executada. Não se deve atribuir resultados novos aos estimadores históricos.

## Verificações reais

1. Abertura automática: primeiro ensaio preencheu N₀ = 40.796 após medir N = 10.000 (2,96 ms), 30.000 (8,76 ms) e 40.796 (14,97 ms/passo). Reavaliações variaram conforme carga/aquecimento do dispositivo; não é um valor universal fixado para a RX 7600.
2. Halo ×32: N₀ = 3.024, total integrado recomendado 40.503 = 453 bojo + 1.362 disco + 38.688 halo. O custo no total proposto foi 14,21 ms/passo. Testou-se a seleção e contagens; não se certificou equilíbrio dessa realização refinada.
3. Resolução manual: o valor 12.345 permaneceu no campo após selecionar backend GPU; não houve nova imposição automática de N. Nenhuma execução com esse N foi apresentada como resultado físico.
4. Regressão independente em 1.024 partículas, dt = 0,1 Myr e ε = 0,1 kpc: o kernel GPU com potencial e o anterior produziram estados e forças idênticos bit a bit em t = 0 e após quatro passos. Maior erro relativo de U nas cinco avaliações: 9,4554 × 10⁻⁸; maior erro relativo L2 do campo radial: 2,9721 × 10⁻⁷, contra CPU Float64 no mesmo estado quantizado. O envelope de regressão usado escala com γₙ de Float32, não é intervalo formal certificado nem limite global para toda resolução/época.
5. Fluxo completo da página: realização automática de 38.870 corpos, 10.718 passos, tempo físico efetivo 1.071,80001597 Myr. A interface indicou média de 9,03 ms/passo, excluindo diagnósticos/readbacks. Foram preservados 44 estados energéticos rápidos e 22 referências diretas reais, de t = 0 até 1.050,00001565 Myr. As épocas exatas estão em CSV/JSON; duas coletas ocorreram ligeiramente após o limiar solicitado. O maior |δE| direto **amostrado** foi 0,0001507385%, e o último −0,0000640829%. Isso não mede o máximo contínuo entre snapshots nem certifica equilíbrio estrutural.

O ensaio foi pausado; as séries e os SVG exportados foram preservados em `reports/gpu-only-2026-10-22/`. Nenhum dado histórico foi sobrescrito. A aba original foi conferida separadamente para receber o fluxo novo sem apagar uma integração em andamento.

## Reprodução e limites

- `node scripts/test.mjs`: inclui as regressões históricas, a política de N automático, ausência de árvore no diagnóstico GPU e os seletores novos.
- `/tests/browser-gpu-only-check.html`: comparação real dos kernels, energia e curvas com Float64. O botão executa cinco estados de 1.024 partículas e exporta o JSON apresentado.
- `node scripts/build.mjs`: build estático; os arquivos necessários estão em src e as evidências são adicionadas ao build. Não foi feita publicação remota.

Evidências: `browser-validation.json`, `auto-first.json`, `auto-halo32.json`, `manual.json`, `live-ui.json`, `live-energy.json`, `live-energy.csv`, quatro figuras SVG, `code-identity.json`, `tests.tap`, `build.txt` e `verification.json` na pasta datada. As fontes anteriores estão em `before/`, preservadas localmente fora do build público.

GPU direta permanece O(N²). N automático busca um custo interativo, não convergência física. A precisão da integração continua Float32; a auditoria Float64 não a transforma em trajetória Float64. G, massas, perfis, condições iniciais para um mesmo N/semente, dt solicitado e suavização não foram ajustados para obter velocidade ou aparência de estabilidade.
