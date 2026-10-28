# Investigação de geometria do espaço-tempo e efeitos atribuídos ao halo

Implementação experimental independente, 22/10/2026. Acesso: Experimento N-corpos → Área de investigação → Experimental · geometria do espaço-tempo → Abrir laboratório. A abertura ocorre em outra aba; o seletor não muda o integrador ou a fonte gravitacional da realização principal.

## Pergunta e conclusão delimitada

É possível que uma contribuição comparável à do halo resulte da dinâmica geométrica de uma solução bariônica das equações de Einstein, sem acrescentar um halo material? Essa pergunta exige especificar fontes, dados iniciais e condições de contorno. Não se confunde com representar um halo material por um potencial contínuo.

O laboratório implementa a ordem escalar dominante de campo fraco, mais um controle de vácuo esférico exato. Nesse regime, nenhuma contribuição adicional comparável a NFW foi derivada da fonte bariônica. A curva com halo inclui explicitamente uma densidade adicional. O trabalho não fornece uma solução completa não linear de Einstein para uma galáxia estelar, nem demonstra impossibilidade para todas as geometrias admitidas pela RG.

## Equações, hipóteses e liberdade geométrica

A equação é Gμν + Λgμν = 8πG Tμν/c⁴. Tμν deve descrever densidade, fluxo, pressões e tensões e satisfazer conservação covariante. Perfis de densidade newtonianos não especificam esse tensor nem uma distribuição estelar relativística completa. Para um tratamento completo, as restrições e as equações de evolução precisam ser satisfeitas em conjunto.

Na aproximação local isolada adotamos Λ=0, condição assintótica Φ→0, matéria não relativística e ausência de radiação incidente imposta. Na ordem escalar dominante:

- ds² = −(1+2Φ/c²)c²dt² + (1−2Ψ/c²)d𝐱²;
- Φ=Ψ, ∇²Φ=4πGρ;
- para traçadores lentos, d²𝐱/dt²=−∇Φ;
- v²c=R ∂RΦ no plano equatorial;
- α=(1/c²)∫∇⊥(Φ+Ψ)dl para a deflexão da luz em Born.

As duas últimas expressões são observáveis aproximados de uma mesma métrica. O fator relativístico dois da deflexão luminosa em relação à estimativa corpuscular não dobra a aceleração orbital das estrelas. O laboratório não integra órbitas newtonianas de fótons para obter lenteamento. Calcula a integral dos dois potenciais da métrica, com Φ=Ψ, e valida 4GM/(bc²) para uma massa pontual. Ver [Carroll, cap. 6](https://preposterousuniverse.com/wp-content/uploads/grnotes-six.pdf) e [Bartelmann e Maturi](https://arxiv.org/abs/1612.06535).

Vácuo significa Rμν=0 quando Λ=0, e não curvatura de Riemann nula. Há curvatura de Weyl, soluções de ondas e parâmetros globais. Birkhoff restringe apenas o vácuo esférico: não é um teorema de inexistência de efeitos relativísticos num disco. O controle exato usa uma massa central compacta hipotética igual a Mb+Md, a 100 kpc, não o campo exato da galáxia estendida. Em Schwarzschild, K=48(GM/c²)²/r⁶, R=0 e a velocidade circular local de observadores estáticos obedece v²=GM/[r(1−2GM/(rc²))]. O raio é areal. Fonte: [Carroll, cap. 7](https://preposterousuniverse.com/wp-content/uploads/grnotes-seven.pdf).

Uma componente harmônica regular, isolada e decrescente em todo o espaço não acrescenta livremente um halo ao problema de Poisson com a mesma fonte. Singularidades, fronteiras especiais, topologia ou ondas exigem uma construção e justificativa próprias. A energia de ondas e a não linearidade gravitacional não equivalem automaticamente a uma distribuição estática NFW. Não foram criadas ondas ou campos fictícios para obter a curva desejada. Uma constante cosmológica positiva também não oferece um ajuste atrativo arbitrário: no controle esférico sua aceleração associada é +Λc²r/3; ela não é variada neste experimento.

## Literatura e limite da investigação

[Ciotti (2022)](https://arxiv.org/abs/2207.09736) calcula o regime gravitomagnético fraco de discos realistas e encontra correções pequenas, incluindo a análise Miyamoto–Nagai. [Lasenby, Hobson e Barker](https://www.repository.cam.ac.uk/handle/1810/358049) examinam criticamente afirmações de grandes efeitos nesse regime. O código desta página não implementa esses cálculos de correntes: usa a ordem escalar anterior a eles. Os valores v²/c² e |Φ|/c² publicados são parâmetros de expansão, não amplitudes pós-newtonianas calculadas, limites rigorosos ou faixas de incerteza.

Há propostas históricas de interpretação galáctica sem halo, como [Cooperstock e Tieu (2005)](https://arxiv.org/abs/astro-ph/0507619). [Korzyński (2005)](https://arxiv.org/abs/astro-ph/0508377) identifica uma fonte singular nessa construção. Elas são apresentadas como proposta e crítica, não como comprovação ou implementação deste laboratório.

A conclusão pertinente é que a RG convencional tem efeitos adicionais fisicamente consistentes (curvatura espacial, deflexão da luz, precessões, gravitomagnetismo e ondas), mas este cálculo e as referências de campo fraco não fornecem um halo galáctico emergente da fonte bariônica adotada. Para sustentar outro regime seria necessário construir e validar sua solução, inclusive suas fontes e observáveis. Não se conclui daí a natureza microscópica da matéria escura.

## Modelos e unidades preservados

As funções e constantes são importadas de src/physics/constants.js e src/physics/models.js. Nenhum desses arquivos foi alterado. Bojo Hernquist: M=0,5 em 10¹⁰ M☉, a=1 kpc. Disco Miyamoto–Nagai: M=6,8, a=3 kpc, b=0,28 kpc. Halo NFW: escala de massa 54, rs=15,62 kpc. O halo conserva o truncamento R200→1,2 R200 e a massa efetiva do código; sua escala não é uma massa total.

Os campos são contínuos, sem suavização de partículas. Não se igualam seus valores aos de um snapshot N-corpos com Plummer sem analisar essa diferença. A simulação principal continua autogravitante; as órbitas do laboratório são traçadores em campos fixos.

Unidades: kpc, Myr, 10¹⁰ M☉, velocidade kpc/Myr (convertida em km/s nos gráficos), potencial e energia específica kpc²/Myr², densidade 10¹⁰ M☉/kpc³, deflexão em radianos e arcsec. G é importado sem mudança. O único novo valor físico é c=299792458 m/s, exato no SI, convertido com os mesmos kpc e Myr do projeto. Fonte: [BIPM](https://www.bipm.org/en/si-base-units/metre).

## Experimentos executados e resultados

Configuração de reprodução padrão: R inicial=8 kpc, z=0, v inicial circular no campo bariônico, igual nos dois casos; T=1000 Myr; dt=0,25 Myr. Esses são controles numéricos, não parâmetros astrofísicos ajustados.

1. Curvas de rotação: em 8 kpc, v bariônica=176,2989998 km/s; v com halo=229,8040909 km/s. |Φb|/c²=4,0294143×10⁻⁷, vb²/c²=3,4582652×10⁻⁷ e ah/ab=0,69908777. A curva RG na ordem dominante coincide com a bariônica pela aproximação; nenhuma segunda medição independente é insinuada.
2. Fonte: diferenças centrais 3D em (R,0,0,5) kpc, R=8,15,25; h=0,04,0,02,0,01 kpc. O resíduo espacial bariônico cai aproximadamente com h². Em (8,0,0,5), ρhalo=9,59651856×10⁻⁴; a fonte extra inferida com h=0,01 é aproximadamente 9,59881072×10⁻⁴ nas unidades de densidade adotadas. A diferença de discretização é preservada. O resíduo relativo exibido é (ρinferida,total−ρb−ρhalo)/ρhalo. O JSON inclui separadamente o resíduo da diferença entre os dois laplacianos, que cancela o erro bariônico comum.
3. Órbitas: integração KDK Float64 local, independente do integrador principal. Com halo, a diferença de posição final entre dt e dt/2 é 0,000644703573 kpc; entre dt/2 e dt/4, 0,000161172753 kpc; razão=4,00007793. O comportamento é o esperado de segunda ordem nesse ensaio. Máximo |δE| específico com halo=5,38007652×10⁻⁶, adimensional; equivale a 0,000538007652%. O gráfico não apresenta esse valor como erro da RG. Lz relativo é monitorado em todos os passos e permanece na escala de arredondamento desse ensaio.
4. Luz: linha de visada perpendicular ao disco, aproximação de Born, deflexão física em distância infinita. Não se estimam posições de imagens, cisalhamento observado ou distâncias cosmológicas. A quadratura transforma z=b tan(θ), sem corte arbitrário na linha de visada, e separa os trechos nas fronteiras do halo. As diferenças 256/512/1024 são publicadas para b=0,5,2,8,20 kpc. Em b=8 kpc: deflexão bariônica ≈0,2375217402 arcsec e referência com halo ≈0,6062064398 arcsec (512 intervalos por trecho). As diferenças de quadratura são numéricas, não intervalos de confiança.
5. Vácuo: o controle Schwarzschild tem R=0 e K=5,85768918×10⁻²² kpc⁻⁴. Isso demonstra curvatura de vácuo no controle, não um halo gerado nessa galáxia.

Não há observações inventadas, ajuste a dados ou comparação quantitativa com uma lente real. Nenhum desses ensaios certifica o equilíbrio de um disco N-corpos nem sua espessura por bilhões de anos.

## Reprodução, exportação e integração

Execute node scripts/geometry-lab.mjs para reproduzir o relatório padrão, CSV, SVG, identificação do código e verificação de preservação do motor principal em reports/geometry-lab-2026-10-22/. Execute node scripts/test.mjs e node scripts/build.mjs para testes e build. O laboratório usa ES modules e Worker e integra o build estático GitHub/Vercel, sem serviço remoto ou publicação automática.

A página exporta SVG com fontes, hipóteses, parâmetros e identificação nos metadados; CSV preserva as amostras e unidades nos nomes das colunas; o JSON reúne dados completos, configuração e convergência. As órbitas retêm amostras reais próximas de cada 5 Myr e o estado final; os máximos de invariantes são avaliados em todos os passos. Não se inventam medições intermediárias. O tempo do ensaio é calculado a partir dos passos realmente executados, com o último passo encurtado quando necessário.

Cancelamento termina o Worker e não apresenta saídas parciais como concluídas. Fontes, massas, condições iniciais, integradores e resultados do N-corpos principal e históricos são preservados por comparação de hashes. O seletor acrescentado faz somente navegação para a página separada.
