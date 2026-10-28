# Interface de apresentação do TCC — reorganização posterior à entrega científica 1.0.6

Data: 17 de outubro de 2026. Esta entrega atende à reorganização visual solicitada depois da conclusão da investigação 1.0.6. Os relatórios científicos anteriores e seu ZIP permanecem preservados; suas instruções sobre `index.html` descrevem a organização anterior. Este documento atualiza apenas o fluxo da interface.

## Abrir e apresentar

Execute `node scripts/serve.mjs` na pasta do projeto e abra `http://localhost:4180/`. Se esse servidor já estiver aberto, basta atualizar a página. A navegação principal possui três páginas:

| Página | Finalidade |
|---|---|
| `index.html` — Apresentação | Título completo do TCC, Guilherme Aleixo Bandeira, UEMS, Engenharia Física, objetivo, metodologia e resultados em três cartões. |
| `experimento-ncorpos.html` — Experimento N-corpos | Integração gravitacional real, visualização 3D e dois gráficos da sessão: espessura e erro relativo de energia. |
| `materia-escura.html` — Matéria Escura | Cinco figuras científicas: rotação observada, componentes, resíduos, massa acumulada/fração do halo e órbitas pareadas. |

O link secundário `arquivo-cientifico.html` permite consultar os 83 gráficos históricos por versão, tema e finalidade. As versões começam recolhidas e não carregam todas as imagens automaticamente. `validacao106.html` mantém as duas figuras controladas de estrutura e conservação. O laboratório completo anterior permanece em `simulador-tecnico.html`, junto aos painéis 1.0.1–1.0.5 e aos downloads históricos.

O campo do orientador está preparado, sem nome inventado. A galáxia na apresentação é uma animação artística identificada como ilustrativa. O canvas dessa página não usa nem representa resultados N-corpos; sua animação respeita a preferência de movimento reduzido. A página do experimento usa partículas massivas e posições calculadas pelo integrador.

## Experimento interativo

A nova interface reutiliza os geradores, forças, integrador Leapfrog-KDK, diagnósticos e renderizador existentes. Os 51 arquivos de código anteriores à investigação 1.0.6 não foram alterados por esta reorganização. Foram adicionados um controlador da página e um worker dedicado. O módulo de gráficos é reutilizado sem inicializar o painel completo do laboratório.

O modelo AGAMA carrega os snapshots históricos 1.0.2, com N=1.000 ou 10.000 e semente 2026, verificando seu SHA-256 antes do uso. As etiquetas de população originais selecionam somente o disco fino para h50. As massas físicas permanecem as do snapshot. A preparação requer ε=0,1 kpc; uma configuração incompatível é recusada. O modelo sintético histórico permite outras contagens, respeitados os recursos do dispositivo, e seu disco único recebe o rótulo “disco sintético”. Não é apresentado como uma população fina AGAMA.

CPU oferece força direta Float64 ou Barnes–Hut. GPU usa WebGPU Float32 e força direta. O passo temporal físico não depende da taxa de desenho. O diagnóstico energético é direto Float64, inclusive para Barnes–Hut, e recebe G e ε efetivamente usados pelo backend GPU. Isso não transforma a integração Float32 em Float64. O gráfico mostra ΔE/|E₀| com sinal; não foi aplicada correção de energia, amortecimento ou ajuste vertical às partículas.

Iniciar prepara a configuração alterada em t=0 e integra; Pausar conclui o lote em curso e coleta o estado final; Reiniciar recupera o estado inicial e reinicia a referência energética. Os botões de iniciar, reiniciar e exportar permanecem bloqueados enquanto o lote e a coleta de pausa terminam. A seleção de vista também volta corretamente a Livre no reinício. Ocultar o halo afeta somente o desenho. Trocar de página interrompe a sessão local; campanhas históricas permanecem disponíveis independentemente dela.

O painel Avançado começa fechado. Ele contém semente sintética, abertura Barnes–Hut, identificação do método, exportação e links técnicos. O JSON exportado contém configuração, identificação/hash da condição inicial e amostras medidas dos diagnósticos. Ele não é um checkpoint completo das posições e velocidades finais; a exportação técnica completa anterior permanece no simulador preservado. Até 512 amostras ficam na tela; ao atingir esse limite, o histórico visual é decimado, preservando a amostra final. Essa série interativa não substitui os registros integrais das campanhas.

## Separação científica

A mudança visual não recalculou observações, curvas, massas, órbitas ou campanhas controladas. O conjunto de 38 pontos e seus erros permanece documentado nos seis relatórios 1.0.6. O RMS dos resíduos dos modelos fixos continua 71,59 km/s para bárions e 8,77 km/s para bárions+halo. A comparação é de consistência: os parâmetros históricos já empregaram restrições relacionadas a esses dados. Gás e CGM estão omitidos; não se trata de uma descoberta independente da natureza microscópica da matéria escura.

As trajetórias de 1.200 Myr são partículas-teste em campos fixos e não demonstram estabilidade de uma galáxia viva durante esse intervalo. Os resultados estruturais históricos continuam inconclusivos para equilíbrio global. A nova página mantém o estado Experimental visível.

## Verificação executada

- 116 testes JavaScript aprovados, incluindo avanço de tempo físico, reinício determinístico, referência energética, recusa de ε incompatível, uso dos parâmetros efetivos da GPU e isolamento da população fina na medida de espessura.
- No navegador: carregamento, iniciar/pausar e reiniciar em CPU; integração WebGPU real; exportação JSON em CPU; vistas e exibição do halo; navegação; seleção/projeção/tempo/reprodução de órbitas; filtros do arquivo.
- O teste interativo CPU com N=1.000 chegou a 1,20 Myr, com ΔE/|E₀|≈−3,8315×10⁻⁴ e h50≈0,22252 kpc, partindo de 0,23260 kpc. O JSON original está em `reports/interface-106/ui-cpu-session.json`.
- O teste funcional GPU com N=1.000 foi pausado em 29,00 Myr. A interface mostrou ΔE/|E₀|≈−8,54×10⁻⁷ e h50≈0,5196 kpc. São valores arredondados lidos da interface, registrados no relatório de QA. O forte espessamento impede interpretar esse teste funcional como estabilidade física. As épocas CPU/GPU são distintas; esses dois testes não formam um estudo comparativo de precisão.
- Layout verificado em desktop e em 390 pixels: apresentação, experimento e matéria escura sem rolagem horizontal. O arquivo, filtrado por Conservação, mostrou nove dos 83 gráficos, com todas as versões recolhidas e nenhuma imagem histórica inserida automaticamente.
- A auditoria confere 4.677 arquivos científicos preservados, a identidade dos arquivos de código anteriores e a correspondência dos recursos publicados com `dist`. As capturas de tela ficam em `reports/interface-106/previews/`; não são dados científicos.

Não houve nova campanha N-corpos científica. Os pequenos testes interativos verificam funcionamento da interface; as evidências controladas continuam sendo as campanhas históricas já documentadas.

## Reprodução, build e pacotes

Com Node.js 24, execute `node scripts/test.mjs` e `node scripts/build.mjs`. O build estático em `dist` inclui as três páginas principais, os dados carregados por elas, as figuras e o arquivo técnico. A configuração de GitHub e Vercel permanece estática. Nenhuma publicação remota foi realizada.

O pacote atualizado é `downloads/apresentacao-tcc-1.0.6.zip`, acompanhado de SHA-256 e manifesto interno `SHA256SUMS.txt`. Ele contém o site reorganizado, código, testes, dados públicos necessários às páginas e evidências científicas utilizadas. Os grandes ZIPs de campanhas anteriores permanecem separados no diretório `downloads`; não estão aninhados no novo pacote. Para restaurar todos os downloads históricos, mantenha também esses ZIPs no mesmo diretório. O pacote científico concluído antes desta reorganização, `downloads/materia-escura-1.0.6.zip`, conserva seu hash original.

Os artigos integrais consultados não são redistribuídos no pacote; a tabela numérica e as referências exatas estão incluídas. O registro `reports/interface-106/code-identity.json` identifica o código atual da interface e referencia a identidade científica 1.0.6 preservada. Os scripts de auditoria da investigação original descrevem a entrega anterior; para esta interface, use `node scripts/interface-106/audit.mjs` e, após gerar o build, `node scripts/interface-106/audit.mjs --production`.
