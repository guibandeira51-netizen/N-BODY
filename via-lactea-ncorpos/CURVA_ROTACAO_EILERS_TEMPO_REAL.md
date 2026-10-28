# Eilers no gráfico de rotação em tempo real

Os 38 pontos da Tabela 1 de Eilers et al. (2019), entre 5,27 e 24,82 kpc, foram sobrepostos às contribuições de disco, bojo, halo, disco + bojo e total na aba Experimento N-corpos. Os valores foram conferidos na tabela original, páginas 8–9 do PDF https://arxiv.org/pdf/1810.09466. DOI: https://doi.org/10.3847/1538-4357/aaf648.

## Representação

- Linhas coloridas: campo gravitacional das partículas no instante efetivamente diagnosticado, sem mudança no cálculo de `componentRotationField`.
- Pontos pretos: velocidades circulares inferidas por Eilers usando modelagem de Jeans axisimétrica. Não são velocidades azimutais individuais de estrelas.
- Barras verticais: erros estatísticos assimétricos publicados, preservando separadamente as amplitudes negativa e positiva.
- As incertezas sistemáticas não estão incluídas nas barras, conforme informado na própria figura. Nenhuma barra horizontal de incerteza radial foi inventada.
- Os pontos observacionais não são conectados nem interpolados. Permanecem fixos enquanto o campo do modelo é atualizado.

A comparação é de consistência: os parâmetros históricos do modelo já usaram restrições relacionadas a curvas de rotação, incluindo Eilers. Não constitui um teste independente fora da amostra nem determina isoladamente a natureza microscópica da matéria escura. As hipóteses e a origem ficam também nos tooltips e nos metadados do SVG.

## Origem e reprodução

Foi reutilizado o CSV científico preservado `reports/v1.0.6/observations/eilers2019-jiao2021.csv`. Suas quatro primeiras colunas reproduzem R, vc e os dois erros estatísticos da Tabela 1 de Eilers. A coluna adicional de sistemáticos de Jiao não é apresentada como uma segunda amostra nem misturada silenciosamente às barras estatísticas.

`node scripts/generate-live-eilers.mjs` gera `src/observations/eilers2019.js`, incluindo o SHA-256 do CSV original e a identificação do artigo. O gráfico usa esse módulo local, sem depender de rede externa durante a simulação.

O botão existente “Salvar gráfico” exporta o mesmo SVG exibido, com as cinco curvas, os 38 pontos, barras, unidades, tooltips, fonte, dados observacionais e os dados do campo medido. O conteúdo abaixo da figura permanece apenas o botão de salvar.

## Verificação executada

Os **199 testes passaram**. As regressões novas conferem todas as 152 entradas publicadas, a origem do arquivo, as barras assimétricas e a preservação dos dados do modelo. A verificação SHA-256 confirmou inalteradas as 14 fontes físicas do manifesto histórico de halo de 5 Gyr.

Na interface real da aba Experimento N-corpos foi executado um teste funcional reduzido com N = 1.000 e força direta CPU Float64. O gráfico foi capturado em 2,6 e 8,8 Myr: o campo medido mudou e as 38 observações permaneceram iguais. O botão de exportação foi acionado. Esse ensaio verifica a interface e não certifica conservação ou equilíbrio físico.

As duas figuras de teste e a validação estão em `reports/halo-ui/live-eilers-browser-first.svg`, `live-eilers-browser-second.svg` e `live-eilers-validation.json`. O comando `node scripts/audit-live-eilers.mjs` reproduz a conferência desses registros preservados.

## Execução principal preservada

A aba que já estava aberta permanece com sua realização e seu código carregado. A alteração do renderizador aparece ao abrir/recarregar a versão atualizada da página; a execução existente não foi reiniciada para carregar essa mudança visual.

Para permitir uma comparação imediata sem perder o estado principal, `live-eilers-current-field.svg` sobrepõe Eilers aos valores exatos R/v que já estavam nos tooltips do gráfico da execução do usuário em 309,80000461637974 Myr, com 31 raios e 32 azimutes por raio. É uma figura estática do campo exportado, não uma nova integração, um novo cálculo de forças ou um snapshot de partículas importável. A atualização automática foi verificada separadamente na interface real, como descrito acima.

O build estático mantém a comparação na aplicação principal e preserva os dados e arquivos históricos. Nenhuma publicação remota foi realizada.
