# Motor CPU paralelo — 16 Workers

Integração na página Experimento N-corpos em 22/10/2026. Esta entrega sucede a auditoria em `AUDITORIA_DESEMPENHO_CPU.md`; aquela auditoria e seus resultados permanecem preservados. O protótipo agora tem uma implementação de produção própria em `src/compute/parallel-cpu.js`, sem depender dos módulos experimentais em reports/scripts.

## Uso

Selecione **Backend → CPU · paralelo f64** e **Algoritmo → Barnes–Hut 3D**. No Ryzen 7 5700X, o pool contém 16 Workers persistentes de força. Há também um coordenador para árvore e KDK. A interface mostra a capacidade e, quando diferente, o número ativo: `CPU · 12/16 Workers · f64`.

O modo automático ainda pode escolher GPU ou força direta conforme os ensaios locais. A força direta CPU continua no motor serial original; esta implementação paraleliza o Barnes–Hut. Dispositivos com menos processadores lógicos usam sua contagem disponível, até 16. Sem SharedArrayBuffer, isolamento entre origens ou suporte a Workers, há fallback serial explícito. Falhas de criação do pool também permitem fallback antes da integração.

## Execução e integridade física

- Estado em Float64 compartilhado, sem clonar as partículas em cada Worker. A árvore é construída no coordenador e publicada em buffers compartilhados reaproveitados, somente para leitura durante a travessia.
- Distribuição dinâmica em blocos de 256 alvos por contador atômico. Cada Worker escreve alvos distintos e mantém a ordem aritmética original de cada alvo.
- Mesmas forças Plummer, G, ε, θ, massas, condições iniciais e operações Kick–Drift–Kick. O integrador serial original permanece preservado. A versão assíncrona aguarda a força completa antes do último kick e só então publica a época física.
- As RPCs do coordenador são serializadas. Uma exportação/diagnóstico solicitado durante uma força aguarda o passo completo; não recebe velocidades de meio passo. As cópias exportadas têm ArrayBuffer transferível independente, sem expor o estado mutável compartilhado.
- Falha durante a força encerra o pool e invalida o estado parcial. O coordenador impede novas exportações desse estado e solicita reiniciar a realização; não registra um snapshot incompleto como medição.
- O pool energético continua com quatro Workers e snapshots imutáveis. Enquanto está ativo, o próximo despacho da força usa 12 dos 16 Workers. Quando a referência termina, volta a 16. Uma transição pode coincidir com o passo já em voo; não há alteração da integração para interrompê-lo pela metade.
- A política de memória inclui uma reserva adicional para árvore compartilhada e overhead estimado dos Workers. Runtime/JIT e memória do navegador continuam variáveis; não é medição exata de RAM residente.

`bh-parallel-kernel.js` foi derivado da árvore/travessia original. Um teste compara seu texto com o original, permitindo somente os limites do intervalo de alvos e exports. Não há novo critério de abertura ou reordenação das contribuições de uma partícula. O teste numérico cobre θ = 0 e 0,5, massas desiguais/nulas, épocas iniciais não nulas e alternância de 12/16 Workers.

## Resultados medidos

Produção em Node.js v24.19.0, Ryzen 7 5700X, semente 2026, dt = 0,1 Myr, ε = 0,1 kpc, θ = 0,5. Um passo de aquecimento e três passos medidos. Sem renderização e diagnósticos dentro do tempo por passo:

| N efetivo | Workers de força | Mediana [ms/passo] | CPU lógico equivalente (mediana) |
|---:|---:|---:|---:|
| 80.000 | 16 | 339,86 | 12,92 de 16 |
| 536.000, N₀=40.000 e halo ×32 | 16 | 1.851,97 | 13,38 de 16 |

A coluna de CPU é a mediana de CPU do processo/tempo de parede, não telemetria de cada núcleo nem um limite configurado. Os 16 Workers são disponibilizados; não existe um limitador de utilização em 80–84%. Árvore sequencial, publicação/barreiras, cache, acesso à memória, SMT, runtime e diagnósticos podem reduzir o uso observado. Não há carga artificial para manter um contador em 100%.

Nos dois tamanhos, os hashes de posições, velocidades e acelerações após quatro passos completos coincidiram bit a bit com os resultados seriais preservados da auditoria anterior. O original daquela rodada levou 2.690,27 e 16.930,20 ms/passo, respectivamente; são tempos históricos próximos, não uma nova medição pareada.

No fluxo real da página principal, 80.000 corpos evoluíram com `CPU · 16 Workers · f64`, com cerca de 315,5 ms/passo exibidos após 217 passos. A realização foi pausada em 21,7 Myr. Foram efetivamente calculadas referências diretas em **0 e 12,7 Myr**. Ao retomar durante a segunda avaliação, a interface mostrou `CPU · 12/16 Workers · f64`; após a conclusão voltou aos 16. O estado posterior da simulação não foi atribuído ao ponto energético de 12,7 Myr.

São verificações curtas de execução/equivalência. Não constituem uma nova campanha de estabilidade galáctica, nem certificam conservação durante Gyr.

## Verificação e reprodução

`node scripts/test.mjs`: 206 testes aprovados, incluindo seis novos testes do motor de produção. O teste de interface preserva os controles anteriores e aceita a nova identificação explícita do CPU paralelo.

`node scripts/cpu-performance/production.mjs`: repete o benchmark com o módulo de produção, verifica os hashes dos módulos físicos originais e compara os estados com os hashes seriais preservados. Copie a pasta de evidências antes de repetir, pois a saída usa a pasta datada fixa.

`node scripts/build.mjs`: build estático para GitHub/Vercel. O servidor local e o vercel.json já oferecem COOP/COEP; hospedagens sem os cabeçalhos exigidos usam fallback serial. Nenhuma publicação remota foi realizada.

Evidências: `reports/cpu-parallel-live-2026-10-22/production.json`, `concurrent-ui.json`, `browser-ui.json`, `live-ui.png`, `tests.tap`, `build.txt` e `verification.json`. Fontes anteriores preservadas em `before/`, fora do build público. Os modelos, dados e resultados históricos não foram substituídos.
