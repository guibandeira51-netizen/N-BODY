# Amplificação 8 → 50: auditoria e comparação visual

O shader anterior já implementava exclusivamente `vec3(p.xy,p.z+A*p.w)`. Não havia recalibração do potencial, regeneração da malha por A, bounding box dirigindo a câmera ou auto-fit ligado à amplificação. O perfil e a normalização eram calculados somente na inicialização. O problema encontrado é a falta de um modo de comparação livre de perspectiva: depois da transformação de câmera, a divisão por w muda também a posição horizontal projetada quando z muda, mesmo que a câmera esteja absolutamente parada. Cortes pelo frustum podem acentuar essa aparência.

Foi acrescentado o controle explícito **Comparar amplificações · câmera fixa (ortográfica)**. Ele congela posição, alvo, distância, ângulos, projeção, viewport de referência e near/far. Roda, arraste, vistas e enquadramento ficam desativados enquanto a opção estiver marcada. A ativação/desativação troca explicitamente a projeção; alterar A não troca a projeção nem a câmera. O modo normal continua em perspectiva. Ajuste o enquadramento antes de travar; não há auto-fit para manter toda a malha na tela em A alto.

A malha base fica em armazenamento privado, carregada uma única vez no buffer. As cópias de auditoria não permitem alterar a base do renderer. A mesma função WGSL `halo_mesh_position` usada pelo shader é exercitada em um compute de auditoria para ler os vértices antes da projeção. Cores continuam dependentes somente de `-p.w`, sem A. Não foram alterados o potencial, as partículas ou o integrador.

Para os mesmos vértices: x50=x8, y50=y8 e z50−zc=6,25(z8−zc), dentro do arredondamento Float32. O bounding box base permanece idêntico; o bounding box deslocado preserva x/y e muda z conforme a amplificação. Exigir o mesmo bounding box vertical depois de ampliar a altura seria incompatível com essa transformação. Nenhum dos bounding boxes é utilizado para reenquadrar a câmera.

## Reprodução

1. `node --test tests/halo-amplification.test.mjs` verifica proporção com centro não nulo, bloqueio da câmera e distinção entre perspectiva/ortográfica.
2. `node reports/halo-amplification-2026-10-22/cpu-audit.mjs` salva cpu-results.json e verifica que os módulos físicos e de computação permanecem byte a byte iguais ao baseline.
3. Com o servidor normal, abra reports/halo-amplification-2026-10-22/check.html, clique Auditar 8 → 50 e salve o JSON. O harness testa os dois modos de halo, com a simulação parada, lê 16.640 vértices da GPU, verifica base, cores, parâmetros do campo, estado físico, energia e todos os parâmetros/matrizes da câmera. gpu-results.json contém a medição efetiva.
4. Na página principal: pause, ajuste a vista/zoom, ligue a malha, marque a comparação ortográfica e altere A de 8 para 50. As vistas e o enquadramento ficam desabilitados até desmarcar a comparação.

As matrizes da câmera não dependem de A. A projeção em perspectiva, porém, não é linear em coordenadas de tela; por isso uma escala puramente vertical no espaço não garante uma simples dilatação vertical na imagem. A projeção ortográfica elimina essa divisão variável por profundidade.
