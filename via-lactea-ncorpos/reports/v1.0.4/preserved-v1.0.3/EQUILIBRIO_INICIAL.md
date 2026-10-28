# Condições iniciais — versão 0.8.0

GUILHERME ALEIXO BANDEIRA · PROJETO DE TCC · UEMS

## Escopo e decisão

Esta entrega implementa um gerador experimental e compara sua evolução livre com o inicializador histórico. A existência do gerador e a aprovação dos testes de implementação **não certificam equilíbrio**. A decisão sobre promoção depende dos resultados em `COMPARACAO_07_08.md`. O padrão histórico continua disponível e preservado integralmente em `src/physics/initial-legacy.js`.

## Por que os momentos históricos não bastam

O modelo usa posições Hernquist, Miyamoto–Nagai e NFW com taper. O bojo e halo recebem Gaussianas com momentos de Jeans esféricos no monopolo do campo total; o disco usa Jeans axisimétrico e Satoh k=1. Resolver esses momentos não fornece automaticamente uma função de distribuição estacionária positiva no potencial conjunto achatado. O contador de velocidades acima do escape analítico permanece exposto. O candidato de dois integrais da versão 0.7 foi rejeitado por segundo momento negativo; não foi reativado nem corrigido por recorte de variâncias.

## Método escolhido e alternativas avaliadas

[GALIC, Yurin & Springel (2014)](https://arxiv.org/abs/1402.1623) otimiza velocidades usando a resposta orbital da densidade. Uma adaptação ao disco MN e ao taper específico deste projeto exige configurar e validar essas densidades; não foi executado GALIC nesta entrega.

[AGAMA, Vasiliev (2019)](https://arxiv.org/abs/1802.08239) oferece funções de distribuição por ações e construção autoconsistente. Ajustar uma DF à densidade MN prescrita e ao halo truncado é um problema adicional, não resolvido apenas por escolher o nome do potencial. AGAMA não foi executado e não se afirma que seja incompatível com o projeto.

Foi implementada uma única abordagem: evolução curta e transferência de velocidades por vizinhança, baseada em [Rodionov, Athanassoula & Sotnikova (2009), seção 2.2](https://arxiv.org/html/0808.1980). No plano (R,z), escolhem-se os dez doadores próximos da mesma componente; privilegia-se o menos reutilizado e, em empate, o mais próximo. As velocidades cilíndricas são transportadas para a base local do receptor. Essa escolha evita impor novamente uma Gaussiana ou a igualdade das dispersões meridionais. A convergência continua sendo uma condição a testar.

## Protocolo implementado

`src/physics/iterative-initial.js` implementa a transferência. O preparo começa na realização histórica, integra todas as componentes com o mesmo motor gravitacional e produz novas amostras espaciais das densidades originais. Cada componente conserva suas massas e quantidade de partículas. O potencial analítico não se soma às forças discretas. Na última transferência restauram-se as posições iniciais da realização pareada; aplica-se uma única mudança de referencial inercial do centro de massa.

Escolhas desta implementação, sem atribuí-las como resultados do artigo: 20 iterações, segmentos de 10 Myr, dt=0,1 Myr, ε=0,1 kpc; semente derivada deterministicamente por iteração; árvore de vizinhos bidimensional com distância euclidiana em kpc; reamostragem sem truncar caudas; evolução simultânea das três componentes. As densidades do bojo e do halo são esféricas, mas suas velocidades podem ser axisimétricas no campo conjunto. Nenhuma anisotropia ou perfil de dispersão adicional foi imposto. O momento angular não é fixado durante o preparo, e pode mudar: não é uma comparação com cinemática inicial idêntica.

A primeira execução de preparo copiou velocidades sem manter pares antipodais. As quatro validações mostraram movimento coletivo vertical e deslocamento do centro do disco. Essa versão está preservada em `reports/v0.8.0/executed-source-unpaired/`, com hashes correspondentes à campanha executada. O refinamento final do mesmo método mantém pares de mesma componente e massa, com posições e velocidades opostas. A imposição acontece somente ao construir os estados iniciais e conserva a distribuição de uma partícula para um alvo com essa simetria. Ela cria correlações entre pares, como no inicializador histórico, e exige quantidades pares por componente. Não é um mecanismo de resfriamento durante a integração livre. Na transferência, `unusedDonors` conta doadores primários não usados; a cópia antipodal do segundo membro é uma restrição de simetria e não uma nova consulta independente.

Este é um processo de **construção** da condição inicial. A soma dos tempos de preparação não é tempo físico livre da galáxia. Após gerar o snapshot, o relógio da validação começa em t=0, e a evolução usa exclusivamente KDK e a gravitação discreta. Não há restauração de densidade, transferência de velocidades, amortecimento, resfriamento ou recentralização durante essa evolução livre.

O histórico do preparo registra reutilização de doadores, distâncias de transferência e contagem de partículas acima do escape do potencial analítico inicial. Esse escape é uma referência aproximada, sem suavização, não uma fronteira exata da energia instantânea discreta. Não são cortadas velocidades para mascarar esse diagnóstico. O snapshot mantém `equilibriumValidated:false`.

## Admissibilidade, caudas e limitações

A transferência copia vetores de velocidade finitos e preserva massas positivas; portanto não toma a raiz de um momento negativo nem cria uma densidade de probabilidade com pesos negativos. Isso **não demonstra** uma DF estacionária. A representação empírica continua sujeita ao número finito de amostras, à resolução local, a relações entre massas e à mudança de densidade ao reassociar velocidades.

As caudas não truncadas do bojo e do disco podem deixar receptores muito distantes de qualquer doador apropriado. As distâncias máximas são exportadas, não escondidas. A métrica (R,z) também não adapta sua escala à espessura local do disco. Esses são mecanismos candidatos de erro de transferência, que não foram isolados causalmente por um único teste. A combinação de reamostragem, ruído e encontros pode contaminar a preparação. Vinte iterações não demonstram convergência; não se extrapola a outras durações de segmento, quantidades de vizinhos ou resoluções.

## Gerar e validar fora da interface

Na raiz do projeto, com Node.js 20.11 ou posterior:

```text
node scripts/prepare-equilibrium.mjs --n 1000 --seed 2026 --iterations 20 --segment 10 --out reports/v0.8.0/snapshots/cpu-candidate-1000-2026.json
node scripts/validate-snapshot.mjs reports/v0.8.0/snapshots/cpu-candidate-1000-2026.json
```

O primeiro comando constrói o candidato usando CPU Barnes–Hut f64; o segundo executa 200 Myr livres e calcula energia por pares diretos nos estados salvos. Os resultados CPU não são substitutos dos testes de N=10000/50000 GPU. A campanha real GPU é reproduzível em `tests/browser-equilibrium-refinement-08.html`, usando os dois valores de N e as sementes 2026/2027. O protocolo amplo com controles está em `tests/browser-equilibrium-08.html`; o histórico executado sem simetria tem sua fonte exata arquivada. Os dois protocolos atuais usam o refinamento antipodal.

O formato `nbody-initial-v1` contém unidades, parâmetros, posições, velocidades, massas, componentes, semente e histórico do preparo. `deserializeInitial()` rejeita unidades/modelos incompatíveis, valores não finitos e massas totais incorretas. Para integração pelo código existente:

```javascript
const state = createGalaxy({initialization:'snapshot', snapshot: parsedJSON});
// CPU: new Leapfrog(state, numerics).initialize();
// GPU: await gpu.initialize(state, numerics);
```

Essa entrada funciona também nas mensagens `initial` e `prepare` do Worker existente. Não foi acrescentado um seletor visual ou um novo gráfico à aplicação. A campanha usa o mesmo backend WebGPU de produção e salva os snapshots iniciais; as séries de validação são independentes do preparo.

## Parâmetros físicos

Massas, escalas, G, unidades, perfil MN, perfil Hernquist e taper do NFW permanecem os mesmos. A alocação alternativa é um experimento de resolução separado, com o inicializador histórico, para investigar massa de macropartícula. Ela não se mistura com o candidato iterativo na comparação principal. Consulte `AUDITORIA_MASSAS.md` e `PARAMETROS_E_FONTES.md`.
