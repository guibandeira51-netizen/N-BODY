# Investigação do aquecimento do disco — 0.9.0

GUILHERME ALEIXO BANDEIRA · UEMS · Projeto de TCC

Versão 0.9.0 · 25 execuções A/B/C concluídas. Números abaixo vêm dos JSON e CSV medidos em reports/v0.9.0/.

## Reprodução do resultado informado

O ZIP original da Área de Trabalho foi verificado por CRC e SHA-256. A configuração real é N=50.000, semente 2026, GPU f32, dt=0,1 Myr, ε=0,1 kpc. O código 0.8.0 foi arquivado e conferido contra sua identidade original antes dos ensaios. A repetição até 2.540,4 Myr reproduziu exatamente r50, R50 e h50 dos três componentes, energia e inclinação por L. A diferença de época registrada é apenas 1,215×10⁻⁹ Myr da soma de passos.

O crescimento histórico h50(z=0) foi 483,849853%; o r50 do bojo cresceu 47,092897%; a inclinação por L foi 2,867570°. As condições iniciais e o resultado não foram inventados a partir de uma figura. Consulte historical-reference.json, historical-comparison.json e historical-reproduction.json. O relatório de reprodução foi criado antes de localizar o ZIP e conserva essa cronologia em seus metadados; a conferência posterior está em historical-comparison.json.

## Correção fundamentada da espessura

A medida antiga continua disponível. Acrescentou-se um centro robusto (mediana geométrica), PCA ponderada com seis iterações Huber, limiar 2,5 escalas MAD-normal e abertura esférica de 20 kpc. O intercepto usa uma mediana de localização simétrica. Medimos distância assinada ao plano, h50 da distância absoluta e dispersão central da velocidade projetada na normal. Nenhuma posição ou velocidade é alterada.

| Época Myr | h50 fixo kpc | h50 instantâneo kpc | σ normal kpc/Myr | Inclinação geométrica ° | Centro robusto z kpc |
|---|---|---|---|---|---|
| 0 | 0.160 | 0.163 | 0.040 | 0.067 | 0.000 |
| 20 | 0.176 | 0.181 | 0.041 | 0.085 | -0.000 |
| 200 | 0.239 | 0.263 | 0.049 | 0.921 | -0.000 |
| 1000 | 0.563 | 0.544 | 0.065 | 4.303 | 0.018 |
| 2540.4 | 0.935 | 0.885 | 0.078 | 7.324 | 0.302 |

No plano instantâneo, h50 cresce 443.655% e σ normal cresce 96.234%. Portanto inclinação e deslocamento explicam apenas parte da medida antiga. A inclinação geométrica 7.324° usa o núcleo robusto; não é a mesma definição da inclinação de L de todo o disco. Aberturas 10/20/30 kpc e planos locais são exportados para examinar warp. A dispersão remove a velocidade média da população, mas não remove uma taxa local ajustada de bending/breathing; movimentos coerentes não resolvidos ainda podem contribuir. A h50 também depende de seleção, resposta coletiva e acomodação; não é uma medida exclusiva de relaxação.

Figura: [espessura e sensibilidade ao plano](reports/v0.9.0/historical-thickness.pdf).

## Massa, força, precisão e halo

A razão original mhalo/mdisco é 16,152283. O halo tem macro partículas muito mais pesadas, apesar de conter só 40% de N. A atribuição m=Mcomponente/Ncomponente está correta: não foi encontrado um fator de massa ou unidade incorreto. Força Plummer, exclusão de auto interação, árvore 3D, gradiente de potencial e KDK têm testes analíticos. Os shaders padrão de força e integração são byte a byte iguais à versão reproduzida. O experimento C reutiliza esses cálculos bariônicos e adiciona o campo externo uma vez.

As séries A/B/C e os controles de sementes, dt e ε estão em [COMPARACAO_HALOS.md](COMPARACAO_HALOS.md). O aquecimento menor ao aumentar somente Nh, se comparado no mesmo tempo e com as mesmas partículas bariônicas, sustenta contribuição da granulação e da resolução do halo. Não se atribui toda a diferença A–C a encontros com macro partículas: C também perde a resposta dinâmica. Duas sementes não permitem extrapolar uma lei universal em 1/N ou um percentual causal. A concordância CPU/GPU em fixtures e integrações curtas não exclui todo erro de f32 em bilhões de interações; a campanha não é uma comparação longa de N=50.000 com força direta f64.

## Condições iniciais e acomodação

O gerador histórico resolve momentos aproximados de Jeans: bojo e halo usam campo esférico médio do disco, e o disco usa pressão vertical e streaming aproximado, com velocidades gaussianas. Momentos de Jeans são condições necessárias sob suas hipóteses, não uma função de distribuição estacionária demonstrada. O campo usado nesses momentos é analítico não suavizado, enquanto as partículas usam Plummer. A falta de admissibilidade da tentativa alternativa de dois integrais já está documentada na 0.8 e segue rejeitada por teste; não se recortaram variâncias negativas para promovê-la.

Como controle adicional, todas as partículas bariônicas foram integradas como traçadoras livres no potencial analítico inicial completo. Elas se movem normalmente; não há congelamento nem correção de velocidades. Esse controle remove granulação e resposta de **todas** as componentes e não é o modelo C. Resultados completos: [mean-field-control.json](reports/v0.9.0/mean-field-control.json). Sua evolução limitada em comparação com A indica que o enorme espessamento não é inevitável nas órbitas do campo inicial. Entretanto não mede quanto das condições iniciais contribui quando o sistema responde autogravitacionalmente. Não foi isolada uma fração causal IC/discretização/modos coletivos.

GALIC e AGAMA oferecem métodos reconhecidos de construção de modelos em equilíbrio por iteração e funções de distribuição. Uma alternativa defensável precisa preservar a densidade finita e parâmetros adotados, demonstrar admissibilidade e reproduzir densidades, momentos e estabilidade em várias sementes/resoluções, incluindo a suavização. Nenhum snapshot novo com essa validação foi obtido nesta atualização; o gerador padrão permanece o histórico. A expansão do bojo e o aquecimento residual continuam problemas em aberto, não resolvidos por uma troca não validada.

## Controle de órbitas no campo inicial completo

| Semente | dt Myr | T Myr | Δh50 instantâneo % | Δσ normal % | Δr50 bojo % | ΔE/|E0| |
|---|---|---|---|---|---|---|
| 2026 | 0.1 | 1000 | -0.602 | 6.088 | 0.025 | 1.178e-7 |
| 2027 | 0.1 | 1000 | 11.079 | -1.450 | -0.089 | 4.952e-7 |
| 2026 | 0.05 | 200 | 5.175 | 4.536 | -2.482 | 5.987e-9 |

Este é um controle de órbitas/função de distribuição aproximada, não um sistema autogravitante estabilizado. Todos os traçadores movem-se livremente e não exercem força uns nos outros. Subtrair estes percentuais dos de A ou C não dá a contribuição causal das condições iniciais.

## Correções e resultado

A correção comprovada é metrológica: espessuras em dois referenciais, diagnóstico de warp, dispersão na normal e Fourier com ruído adequado. A/B/C foram implementados como experimentos físicos reais; o refinamento conserva a massa total. Não se adicionaram forças restauradoras, amortecimento, colisões, Gaia nem braços desenhados. Conservação de energia não é usada como prova de equilíbrio. Uma distribuição de matéria escura assumida no simulador não constitui detecção observacional de matéria escura.

## Conclusões sustentadas pelos experimentos

Com as mesmas 6.000 partículas bariônicas, o crescimento h50 instantâneo em 1.000 Myr caiu de 598.984–634.925% com Nh=4.000 para 213.049–244.663% com Nh=20.000, nas duas sementes. O campo inicial e a redução da massa individual do halo são consistentes com contribuição importante da discretização. C apresentou Δh50=95.940% e C-soft=99.646%: retirar partículas do halo não elimina a evolução. C também remove a resposta dinâmica; essas diferenças não são percentuais causais de relaxação. O refinamento do halo melhora o comportamento medido, mas não produz um modelo globalmente equilibrado. O bojo e a evolução residual do disco exigem investigação de função de distribuição e resposta coletiva em resolução maior.

## Referências

- [Sellwood (2014), Secular Evolution in Disk Galaxies](https://doi.org/10.1103/RevModPhys.86.1).
- [Sellwood (2011), The Lifetimes of Spiral Patterns in Disc Galaxies](https://doi.org/10.1111/j.1365-2966.2010.17545.x).
- [Sellwood (2013), relaxação em discos N-corpos](https://arxiv.org/abs/1303.4919).
- [Hunt & Vasiliev (2025), Milky Way Dynamics in Light of Gaia](https://doi.org/10.1016/j.newar.2024.101721). Ano do artigo 2025; o identificador DOI contém 2024. Nenhum dado Gaia foi integrado nesta versão.
- [Yurin & Springel (2014), GALIC](https://doi.org/10.1093/mnras/stu1421).
- [Vasiliev (2019), AGAMA](https://doi.org/10.1093/mnras/sty2672).
- [Hernquist (1990)](https://doi.org/10.1086/168845), [Miyamoto & Nagai (1975)](https://doi.org/10.1093/pasj/27.4.533), [Navarro, Frenk & White (1997)](https://doi.org/10.1086/304888).
