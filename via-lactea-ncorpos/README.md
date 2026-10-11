# Via Láctea — N-corpos autogravitante

Primeiro protótipo do TCC **Modelagem Computacional de Sistemas N-Corpos Aplicada ao Estudo da Matéria Escura**. Aplicação estática: a hospedagem entrega arquivos; gravitação, integração e desenho ocorrem no dispositivo do visitante. Não usa serviços de cálculo externos, login, telemetria ou dependências de execução baixadas de CDN.

**Estado da versão 0.1.0:** motor e interface funcionais, com validação numérica nos cenários documentados. As condições iniciais de Jeans são aproximadas e mostram acomodação/aquecimento nos ensaios. Esta versão ainda não certifica uma Via Láctea em equilíbrio secular. Consulte `VALIDACAO.md` antes de interpretar a evolução como resultado astrofísico.

## Abrir localmente

Para desenvolver ou testar o pacote, instale Node.js **20.11 ou posterior**, se necessário, pelo [site oficial](https://nodejs.org/). O visitante do site publicado não precisa instalar Node.js.

1. Extraia o ZIP e abra um terminal na pasta `via-lactea-ncorpos`, que contém `package.json`.
2. Execute:

```powershell
node scripts/serve.mjs
```

3. Abra `http://localhost:4180/` em um navegador com WebGL2. WebGPU é usado quando disponibilizado pelo navegador; a alternativa CPU funciona em Web Worker.
4. Clique **Avaliar dispositivo**, ou escolha o modo manual e informe N. Clique **Iniciar**. A primeira inicialização também executa um pequeno ensaio local antes de escolher/admitir o backend.

No Windows, `INICIAR_WINDOWS.cmd` executa o mesmo servidor na porta padrão **4180**. Mantenha seu terminal aberto durante o uso; `Ctrl+C` encerra o servidor. O servidor escuta somente em `127.0.0.1`, acessível também pelo nome `localhost`. Para outra porta, defina a variável `PORT` antes de executar o comando.

Não abra `index.html` diretamente por `file://`: módulos, Workers e WebGPU precisam do ambiente HTTP local ou HTTPS. `localhost`/`127.0.0.1` são origens locais adequadas a esse teste. Suporte e política do navegador determinam a disponibilidade real da GPU.

## Controles e leitura do painel

- **Automático:** o botão de avaliação mede 512 corpos e, se o custo projetado e os recursos permitem, mede também 10.000 na GPU para reduzir o viés de overhead das filas. Estima uma resolução inicial e verifica memória/limites. Ao iniciar, o backend automático realiza um piloto GPU no N solicitado quando a projeção indica custo adequado, e restaura o estado inicial depois do piloto. A aceitação considera o custo CPU projetado e o orçamento de tempo do método direto.
- **Manual:** N é livre, sem um máximo universal imposto pela interface. Limites de buffers, índices, memória estimada e tempo do método direto podem recusar uma tentativa. Uma estimativa não é comprovação de suporte.
- **Backend:** GPU direto em f32, CPU direto em f64 ou CPU Barnes–Hut em f64. O backend automático compara custos estimados a partir do ensaio local. O método direto é recusado quando sua projeção excede 2 s/passo, para reduzir o risco de timeout gráfico; essa política depende do desempenho medido, não de um teto fixo de N.
- **Modelo:** com halo ou sem halo. Cada modelo recalcula as velocidades no seu próprio campo inicial aproximado. As duas inicializações não mantêm velocidades idênticas.
- **Iniciar/Pausar/Reiniciar/Encerrar:** pausa preserva o estado após o passo pendente; reiniciar reconstrói a semente em t=0, pausado; encerrar termina o Worker e descarta os recursos GPU. Alterar parâmetros exige uma nova inicialização.
- **Aba inativa:** uma integração ou preparação ativa é encerrada, incluindo o Worker que poderia estar em um passo longo. O próximo início reconstrói a configuração e a semente. Não há retomada automática de cálculo pesado.
- **Câmera:** arraste para orbitar, use a roda/pinça para zoom; superior, lateral e livre alteram a orientação. “Enquadrar halo” amplia o campo. Filtros visuais não retiram partículas da gravitação.
- **Exportar medição:** salva configuração, último diagnóstico, capacidades e medições em JSON. Os diagnósticos são periódicos; o instante do último diagnóstico pode preceder o tempo de integração mostrado. A curva de partículas também corresponde ao último diagnóstico.

“Partículas integradas” conta o estado físico completo. “Seleção visual” conta os corpos elegíveis para desenho depois dos filtros; a câmera ainda pode recortar partículas fora do campo. Os buffers de desenho usam as posições dessas mesmas partículas, sem multiplicação decorativa de pontos. Cores do halo representam matéria gravitacional invisível, não emissão luminosa.

**FPS** mede desenho; **ms/passo** é a média dos últimos até 64 passos físicos; **Myr/s** mede avanço físico por tempo de relógio. `dt` não depende do FPS. A memória exibida é uma estimativa que exclui driver, canvas, fragmentação e outros aplicativos; não é uma leitura de RAM/VRAM instalada.

Energia usa o potencial de Plummer coerente com a força. “U árvore” significa energia potencial aproximada. Na GPU, o diagnóstico periódico usa força potencial direta em CPU quando a estimativa é até 100 ms; acima disso usa Barnes–Hut. Essa escolha altera somente o diagnóstico, não a gravitação GPU. Momento linear e angular são normalizados por escalas iniciais não nulas (`Σm|v|` e `Σ|m r×v|`), evitando divisão por momento líquido inicial zero. Uma deriva de energia acima de 1% pausa a integração como alerta numérico; esse limiar operacional não certifica precisão científica.

## Física e arquitetura

Unidades internas: kpc, Myr e `10^10 Msun`. Perfis: Hernquist no bojo, densidade exata Miyamoto–Nagai no disco e NFW finito por taper externo no halo. Massas físicas totais não mudam ao alterar N. Os potenciais analíticos fundamentam somente as condições iniciais e curvas de referência; a evolução principal calcula o campo das posições instantâneas das partículas.

| Parte | Implementação |
|---|---|
| Distribuições e unidades | `src/physics/constants.js`, `models.js`, `initial.js` |
| Força direta, octree 3D e potencial | `src/physics/forces.js` |
| Leapfrog Kick–Drift–Kick | `src/physics/integrator.js` |
| Grandezas conservadas e componentes | `src/physics/diagnostics.js` |
| CPU fora da interface | `src/compute/worker.js` |
| WebGPU/WGSL com blocos de 64 | `src/compute/gpu.js` |
| Detecção e estimativas de recursos | `src/compute/capability.js` |
| GPU renderiza os próprios buffers físicos | `src/render/gpu-renderer.js` |
| Renderização CPU por WebGL2 e câmera | `src/render/webgl-renderer.js`, `camera.js` |
| Controles e agendamento independente | `src/main.js` |

Não há cópia completa GPU→CPU a cada quadro. Na GPU, compute e render compartilham buffers; somente diagnósticos periódicos leem o estado. Na CPU, posições para o desenho são enviadas em intervalos mínimos de 50 ms, enquanto o estado físico permanece em f64 no Worker. A árvore é reconstruída a cada avaliação de força.

WebAssembly, SIMD, processadores lógicos, SharedArrayBuffer e isolamento da origem são **detectados**. O kernel CPU desta versão é JavaScript Float64 em **um** Worker; não implementa kernel WASM/SIMD nem um pool de força em vários núcleos. Barnes–Hut está implementado na CPU; a GPU usa método direto. Não há Barnes–Hut GPU, Particle-Mesh ou FMM nesta versão. GalIC/AGAMA foram investigados, mas não estão incorporados.

## Testes e relatórios reproduzíveis

Sem instalação de pacotes:

```powershell
node --test
node scripts/validate-galaxy.mjs
node scripts/audit-initial.mjs
node scripts/benchmark.mjs 1000 10000 100000 1000000
```

O último comando realiza trabalho real: um milhão em CPU leva aproximadamente um minuto **por passo** no hardware medido. Sua preparação exige ainda uma avaliação inicial de força de duração semelhante. Não é teste de equilíbrio longo ou execução de um milhão no navegador.

Para os ensaios GPU, com o servidor ativo, abra `http://localhost:4180/tests/browser-gpu.html`. Execute os sete casos de validação, a comparação galáctica de 10 Myr e os benchmarks. Baixe o JSON da própria página. GPU indisponível é relatada como teste não executado; não há resultado GPU simulado.

Os relatórios em `reports/` contêm medições reais desta entrega. `VALIDACAO.md` explica métodos, tolerâncias, resultados e limitações; `PARAMETROS_E_FONTES.md` registra parâmetros, unidades, origem, incertezas e a revisão das equações do TCC. O documento original não foi editado.

## Comparação de matéria escura

O gráfico compara `v_c² = R ∂Φ/∂R` de bojo, disco, halo, soma bariônica e soma total no plano z=0. Contribuições somam em **v²**. São curvas do modelo analítico inicial; não são o campo discreto medido durante a evolução. Pontos amarelos representam `v_phi` mediana das partículas do disco em anéis com ao menos três partículas, no último diagnóstico. Não são velocidade circular, velocidade solar total ou dados observacionais. Nenhum catálogo observacional está incluído.

Use os dois modelos para verificar a contribuição gravitacional do halo e comparar perfis exportados. A acomodação inicial e o aquecimento por macro partículas precisam ser separados de efeitos físicos antes de concluir sobre estabilidade galáctica. O teste não demonstra diretamente a existência de uma partícula elementar de matéria escura.

## Build e publicação na Vercel

```powershell
node scripts/build.mjs
```

O build gera `dist/index.html`, estilos e módulos estáticos; não compila um servidor de gravitação. `npm run build` executa o mesmo script, quando npm está instalado. Não existem dependências para baixar.

1. Publique o conteúdo desta pasta em um repositório GitHub de sua escolha.
2. Importe esse repositório na Vercel.
3. **Root Directory:** selecione a pasta que contém `package.json` e `vercel.json`. Se o ZIP foi enviado mantendo a pasta `via-lactea-ncorpos`, ela será a raiz a selecionar. Se seus arquivos estão diretamente na raiz do repositório, use a raiz.
4. Framework: **Other**; comando de build `npm run build`; diretório de saída `dist`. O arquivo `vercel.json` já fornece essas configurações e os cabeçalhos de isolamento.
5. Confira no log o build concluído e `dist/index.html`; abra a URL HTTPS e faça a avaliação do dispositivo nesse navegador. Referências oficiais: [configuração de build e Root Directory](https://vercel.com/docs/builds/configure-a-build) e [configuração estática](https://vercel.com/docs/project-configuration/vercel-json).

Esta entrega prepara a publicação; não criou um repositório remoto nem realizou implantação na sua conta. A infraestrutura da Vercel fornece somente arquivos estáticos. Não existem funções serverless de integração.
