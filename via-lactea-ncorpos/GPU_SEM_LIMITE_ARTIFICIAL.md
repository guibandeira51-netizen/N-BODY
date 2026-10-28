# GPU: resolução manual sem teto artificial

Atualização de 22/10/2026. Substitui a política de orçamento e bloqueio temporal descrita anteriormente em GPU_DIRETA_E_N_AUTOMATICO.md, preservando seus resultados históricos.

- Removido o bloqueio por previsão superior a 2 s/passo.
- Removido o campo Orçamento de buffers · MiB da página Experimento N-corpos.
- A página passa enforceMemoryBudget=false até a admissão e a inicialização efetiva do motor GPU. Não há orçamento fixo substituto. As estimativas informativas de memória permanecem.
- As referências energéticas automáticas também deixam de depender do saldo desse orçamento. Continuam assíncronas, sob a cadência escolhida, com uma avaliação ativa e um snapshot pendente. Estados omitidos por atraso não são reconstruídos.
- A resolução automática conserva a recomendação baseada no dispositivo e no custo medido. A recomendação não limita N manual. Não há descarte silencioso de partículas.
- Permanecem os limites reais de buffers, bindings, dispatch e índices WebGPU, bem como validação de parâmetros e tratamento de falhas reais de alocação. Não é possível prometer alocação ilimitada ou ultrapassar limites do navegador/driver.
- Os módulos históricos conservam suas políticas padrão; somente o fluxo atual solicita explicitamente a admissão sem orçamento.

Nenhuma mudança no kernel de força, Hamiltoniana, KDK, massas, condições iniciais ou resultados históricos foi feita nesta atualização.

Validação: 215 testes automatizados aprovados. O teste tests/browser-gpu-unrestricted-check.html verifica em GPU real que um orçamento artificial de 1 byte rejeita o controle legado, mas não rejeita a execução quando a política é explicitamente desligada; integra somente 16 partículas por dois passos. Evidências e identificação do código em reports/gpu-unrestricted-2026-10-22/. O teste não mede desempenho nem estabilidade física em N elevado.
