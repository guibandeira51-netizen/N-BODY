# Halo NFW geométrico integrado ao Experimento N-corpos

Versão experimental integrada, 22/10/2026. Esta implementação substitui a navegação para o laboratório separado. O seletor fica no painel original: **Representação do halo de matéria escura**. O usuário permanece no Experimento N-corpos.

## Dois modos, uma interface

**Partículas:** mantém a realização legacy, as interações gravitacionais entre bojo, disco e halo, a suavização Plummer, o Leapfrog KDK e os refinamentos ×1, ×2, ×4, ×8, ×16 e ×32 do halo. As equações e constantes Hernquist e Miyamoto–Nagai continuam na geração e nas referências analíticas; a evolução dessas componentes permanece autogravitante.

**Geometria:** remove as partículas massivas do halo da trajetória e dos buffers GPU. Bojo e disco continuam interagindo por pares Plummer, e recebem adicionalmente a aceleração do NFW contínuo, estático, com a mesma normalização e truncamento do projeto. O refinamento do halo fica desativado porque não há partículas de halo a refinar. Não existe dupla aplicação de campo contínuo e macropartículas.

Mudar a representação pausa a execução e prepara uma nova realização. Não se troca silenciosamente a Hamiltoniana de um sistema em evolução. Para uma comparação controlada, mantenha N₀, semente, dt e ε no modo Manual. A recomendação automática mede o dispositivo e considera o número de corpos efetivamente integrados; seu N₀ pode diferir entre os modos.

## Fundamentação e alcance relativístico

No limite escalar de campo fraco, para uma fonte não relativística:

    ds² ≃ −(1+2Φ/c²)c²dt² + (1−2Φ/c²)d𝐱².

Aqui Φ_NFW é a contribuição do halo à métrica. Na ordem dominante e para partículas lentas, Γⁱ₀₀ ≃ ∂ᵢΦ/c², portanto d²xⁱ/dt² ≃ −∂ᵢΦ. O módulo haloWeakMetric retorna os coeficientes da métrica do halo e a aceleração correspondente, e os testes conferem também a derivada numérica de g00.

A evolução combina essa força externa com a autogravidade bariônica. Ela não resolve a evolução não linear do tensor métrico, não integra geodésicas completas de altas velocidades, não inclui gravitomagnetismo ou retroação relativística e não fornece uma solução galáctica exata de Einstein. A interpretação geométrica tem uma fonte NFW material explícita; não é vácuo nem comprovação de que matéria escura seja geometria. Sem a fonte adicional, a aproximação convencional aqui usada não gera espontaneamente o halo. Referência: [Carroll, campo fraco](https://preposterousuniverse.com/wp-content/uploads/grnotes-six.pdf). A análise de [Ciotti (2022)](https://arxiv.org/abs/2207.09736) também delimita a pequena contribuição das correções relativísticas em discos galácticos nesse regime; o presente modo não implementa o cálculo gravitomagnético daquele trabalho.

O único novo valor físico é c=299792458 m/s, exato no SI, convertido com as mesmas unidades de kpc e Myr do código. Fonte: [BIPM](https://www.bipm.org/en/si-base-units/metre).

## Normalização, truncamento e consistência da força

Permanecem a escala de massa NFW 54 em 10¹⁰ M☉ e rs=15,62 kpc. A escala de massa não é a massa total. São reutilizados R200, o taper suave de densidade entre R200 e 1,2 R200 e a massa finita efetiva calculada em models.js.

O potencial é definido com Φ→0 no infinito:

    Φ(r) = −G ∫ᵣ^∞ M(s)/s² ds; 𝐚(r) = −GM(r) 𝐫/r³.

Dentro de R200 a expressão NFW é analítica, com uma constante determinada pela continuação truncada. No taper, integra-se exatamente a mesma interpolação linear de M(r) usada pela força. Fora do halo finito, Φ=−GMtotal/r. A fronteira analítico/tabela conserva a pequena diferença numérica já presente na tabela de produção; não se inventa outra massa para esconder esse erro. O teste Float64 compara massa e potencial em todo o domínio, incluindo o exterior.

O GPU usa G, centro, escalas e nós efetivos Float32, que ficam registrados no snapshot. No centro, a função log(1+x)−x/(1+x) é avaliada por série para evitar cancelamento Float32; isso melhora a avaliação da mesma função NFW sem alterar a lei física. As sondas sem massa medem o erro real no centro, corpo, taper e exterior. Os envelopes de triagem de arredondamento não são intervalos de incerteza certificados.

## Condições iniciais e referenciais

O modo geométrico parte da mesma realização legacy de N₀ e semente, copiando exatamente as posições, velocidades e massas do bojo e disco. O halo original temporário é gerado somente para conservar o sorteio e o referencial das condições iniciais, e não é integrado no modo geométrico. O refinamento do halo vivo também preserva esse prefixo bariônico. Hashes independentes verificam a igualdade das fases e massas nos ensaios.

O centro contínuo é o negativo do centerShift da realização original, representado em Float32 no backend. Ele permanece fixo nesse referencial inercial. Não há recentragem, amortecimento ou reescala de velocidades durante a evolução. Realizações com contagens ímpares podem ter deslocamentos e movimentos de massa finitos decorrentes do inicializador original; isso não é corrigido artificialmente. O novo campo fixo não acompanha a eventual translação de um halo vivo.

## Energia e invariantes

No modo por partículas, a Hamiltoniana de referência continua:

    E = K − G Σᵢ<ⱼ mᵢmⱼ / √(rᵢⱼ²+ε²).

No modo geométrico:

    E = K + U_bariões,Plummer + Σᵢ mᵢ Φ_NFW(𝐫ᵢ).

O termo externo não leva fator 1/2. Não se acrescenta a autoenergia constante de um halo que não está sendo integrado. A energia de referência é calculada em CPU Float64, com soma compensada, nos estados reais lidos da GPU e com os parâmetros efetivos. A estimativa rápida reutiliza o potencial de pares Float32 da GPU e acrescenta a energia externa em Float64; a força da trajetória continua Float32. Isso é identificado nos dados e nos tooltips.

Cada realização e cada método usam seu próprio E₀ em t=0 e o desvio assinado (E−E₀)/|E₀|. A referência inclui o campo externo correto desde o início, e a integridade do snapshot recusa descritores NFW incompatíveis. Em campo externo estático, a energia das partículas pode ser conservada; o momento linear total dos bariões não é um invariante. O momento angular é avaliado em relação ao centro fixo do halo. A interface informa quando P não é invariante.

As energias totais e os denominadores das duas representações são diferentes. Comparar suas porcentagens não significa que as duas tenham a mesma energia física total. Boa conservação não demonstra equilíbrio estrutural.

## Visualização e curvas de rotação

**Exibir geometria do espaço-tempo** desenha, no mesmo canvas WebGPU e junto das partículas, uma malha de altura z=zcentro+A Φhalo(R,0)/|Φhalo(0)|. A é uma amplitude visual em kpc; não entra no backend gravitacional. A malha é uma superfície ilustrativa do potencial associado à métrica, não curvatura intrínseca nem um diagrama de imersão relativístico. No modo por partículas ela mostra apenas o campo contínuo NFW de referência, e não o ruído do campo instantâneo das macropartículas.

As curvas circulares usam as sondas radiais originais na GPU: contribuições atuais do bojo e disco vivos, e a contribuição de halo correspondente ao modo escolhido. As componentes são somadas em v². O campo contínuo é estático; os bariões e sua curva evoluem. Os pontos de Eilers permanecem fixos e não são ajustados. Espessura, energia e curvas continuam no painel existente, com os botões Salvar gráfico.

## Ensaios obrigatórios e resultado físico

O painel Dispositivo e validação → Comparar representações do halo executa uma campanha assíncrona no mesmo site, sem outro laboratório. O estado principal é pausado e preservado. Há progresso, cancelamento e exportação JSON/CSV. Um ensaio preservado pode aparecer identificado como histórico, sem ser confundido com a execução atual.

Configuração padrão da comparação: N₀=4096, halo vivo ×4, semente 2026, ε=0,1 kpc. São integrados 9010 corpos no modo por partículas (614 bojo, 1844 disco, 6552 halo) e 2458 no geométrico (os mesmos 614+1844 bariões, sem macropartículas de halo).

Primeiro são comparados 200 Myr com dt=0,1 e 0,05 Myr, mesma realização e Hamiltoniana em cada modo, e medidas as forças contra CPU Float64. A continuação até 1200 Myr ocorre se os estados forem finitos, o controle de força passar na triagem e houver redução do máximo energético amostrado com dt/2. Isso é um controle numérico, não um critério de estabilidade física. A redução do erro em duas resoluções temporais não demonstra convergência assintótica global.

Os tempos exatos são passos concluídos × dt efetivo Float32. Assim o alvo nominal de 1200 Myr é registrado como aproximadamente 1200,000017881 Myr. Os máximos energéticos são amostrados nos checkpoints, não máximos contínuos entre eles. As séries incluem h50 no plano próprio instantâneo, dispersão vertical, R50, massa, curvas iniciais e evoluídas, energias e custos. Resultados numéricos finais estão em reports/halo-geometry-integrated-2026-10-22/summary.json e no relatório completo comparison-4096.json.

**O disco engrossa nos dois modos nesta resolução.** O controle contínuo reduz o engrossamento observado nesse ensaio, mas não certifica estabilidade até 1200 Myr. A diferença não isola apenas relaxação por macropartículas: também há ausência de resposta dinâmica do halo e a diferença entre Plummer no halo discreto e o campo contínuo NFW sem suavização de partículas. Nenhuma dessas diferenças é evidência isolada de nova física relativística. Não foi demonstrada convergência em N, sementes ou ε nessa campanha curta de implementação.

Resultados da campanha final salva em 22/10/2026, com dt=0,1 Myr:

| Representação | N integrado | h50 inicial [kpc] | h50 em 200 Myr [kpc] | h50 em 1200 Myr [kpc] | Máx. desvio energético direto amostrado [%] |
|---|---:|---:|---:|---:|---:|
| Partículas NFW ×4 | 9010 | 0,175192 | 0,434267 | 1,069941 | 0,000175801 |
| NFW contínuo | 2458 | 0,175192 | 0,303714 | 0,441712 | 0,000505307 |

O crescimento de h50 foi de 510,72% e 152,13%, respectivamente. O tempo acumulado de cálculo GPU foi 13,539745 s e 3,944350 s; ganho medido de 3,43269×, excluindo diagnósticos e interface. Os diagnósticos consumiram 2,472910 s e 0,527825 s. São custos deste dispositivo e desta resolução, não uma promessa de desempenho para outros N. O maior erro relativo de aceleração das sondas isoladas do halo foi 3,27896×10⁻⁷. Ao reduzir dt de 0,1 para 0,05 Myr no controle de 200 Myr, o máximo energético amostrado diminuiu por fatores 3,35070 e 2,33627. Dois passos temporais e poucos checkpoints não certificam uma ordem assintótica nem resolvem o aquecimento físico.

A interface principal também foi executada de fato nos dois modos. Uma realização geométrica preservada contém 545 passos e 54,5000008121 Myr; outra contém referências diretas em 0 e 51,1000007614 Myr e seu SVG exportado contém dois marcadores reais. O controle por partículas preservado contém 190 passos e 19,0000002831 Myr. São verificações de funcionamento, separadas da campanha controlada. Alterar somente a amplificação visual de 8 para 12 kpc manteve 545 passos e o mesmo tempo físico. O cancelamento da campanha foi testado e não certificou resultados parciais. A regressão automatizada terminou com 228 testes aprovados, sem falhas, e o build estático foi concluído.

## Reprodução e preservação

1. Abra experimento-ncorpos.html com o servidor local normal e configure o modo no seletor existente.
2. Para reproduzir a comparação, use Dispositivo e validação → Comparar representações do halo → N₀=4096 → Executar comparação 200 → 1200 Myr.
3. Baixe JSON e CSV. O resumo preservado é explicitamente identificado quando recuperado do arquivo da campanha.
4. node scripts/halo-geometry-artifacts.mjs gera SVGs e CSV de curvas a partir dos dados reais salvos, sem executar ou inventar novos estados físicos.
5. node scripts/test.mjs e node scripts/build.mjs executam a regressão e o build estático GitHub/Vercel. Não há publicação remota automática.

Os arquivos e resultados históricos são preservados. A página separada e seu seletor de redirecionamento foram retirados da interface ativa; suas fontes anteriores estão arquivadas em before/. Os documentos do laboratório separado são histórico de implementação e não descrevem o fluxo atual. Modelos físicos, G, massas, inicializador legacy e KDK original não foram recalibrados para produzir estabilidade. O modo geométrico é uma representação física alternativa explícita, versionada, não uma alteração silenciosa do modo por partículas.
