# Validação científica1.0.3 — domínio efetivamente medido

**O refinamento do halo reduz fortemente o aquecimento numérico em 200 Myr; o candidato permanece experimental, sem equilíbrio estrutural e convergência global validados.**

## Campanha concluída

51 integrações reais: {'baryons20': 12, 'baryons200': 12, 'continuous20': 3, 'continuous200': 6, 'halo20': 12, 'halo200': 6}. Os24 controles curtos de halo/bárions precederam a seleção de200 Myr. Os nove A independentes usam as mesmas condições bariônicas no campo contínuo completo. Os12 primeiros ensaios selecionados200 Myr e a extensão adaptativa de seis controles bariônicos preservam dt/ε/massas e registram custos, hashes, estados e checkpoints.

Com os mesmos bárions e a mesma física contínua, refinar o halo de 4.000 para 40.000 partículas reduziu o crescimento médio de h50 do fino em 200 Myr de 105.729463% para 29.483456% (72.11% menor), e o aumento médio de σ perpendicular de 41.092723% para 17.598522% (57.17% menor). As três sementes refinadas aqueceram menos que seus contrastes grosseiros. Isso demonstra uma contribuição importante da discretização do halo ao excesso de aquecimento deste domínio, incluindo ruído e respostas que ele pode excitar; não quantifica uma fração universal puramente colisional. O resíduo com halo fixo e os contrastes bariônicos mostram outra contribuição: o excesso médio de crescimento de variância vertical do fino B−A, com controles suaves das mesmas fases, foi 217,666789(km/s)² na base e 170,501303(km/s)² com o fino duplicado. Essa redução é preliminar, com apenas três sementes; B−A inclui autogravidade/resposta coletiva dos bárions, não apenas encontros de duas partículas. Refinar só bojo ou espesso não trouxe melhora estrutural/cinemática uniforme. Não se identifica ainda uma causa única para todo o resíduo do modelo refinado.

Não foi iniciado 1 Gyr: nas três sementes com Nh=40.000, h50 e a variância vertical do fino ainda crescem de 100 para 200 Myr, e a resposta estrutural continua dependente da resolução. Os dados não mostram um patamar de estacionariedade/convergência que justifique promover esta realização a referência de longo prazo. Essa decisão usa tendências e controles físicos, não uma porcentagem universal aceitável de espessamento. Nh=40.000 é o halo vivo mais promissor entre os testados para a próxima rodada de convergência; B com fino duplicado é um controle promissor de resolução bariônica, mas a combinação viva não foi testada e não foi promovida.

## Qualificação independente

- Compatibilidade inicial: mesma solução aproximada de campo/DF Plummer da1.0.2; testes de densidade/cinemática preservados, novos testes de campo discreto e halo externo. Resíduos de malha/DF e amostragem permanecem explícitos.
- Conservação: energia direta Float64 das trajetórias efetivas, invariantes adequados a cada Hamiltoniana, cadências declaradas. Não se afirma energia exata nem se usa δE isoladamente para certificar estrutura.
- Estrutura: fino/espesso, σz e σ⊥, σR, R50, planos, densidades, anéis/coortes e modos medidos. h50 global não é o único critério.
- Convergência: quatro resoluções do halo no curto e contraste de uma década em massa no intervalo200; três sementes por grupo. O refinamento bariônico é isolado. Isso não estabelece um limite assintótico conjunto em N,ε,método e várias realizações bariônicas.
- Software:101 testes Node passados, incluindo migração/coortes, deslocamento rígido e gradiente polinomial/cambio da origem de potencial. São verificações de implementação, não a razão da conclusão científica.

## Preservação e entrega

1344 arquivos históricos intactos por hash; código anterior preservado. O padrão histórico não foi substituído. Novo seletor vivo da1.0.3 é explicitamente experimental. B é identificado como controle com halo fixo e não é apresentado como galáxia viva.

Onze figuras PNG/SVG/CSV e os dados brutos acompanham a entrega. As tentativas incompletas de gravação e os erros de interpolação anteriores permanecem separados dos resultados concluídos. Não há curvas fabricadas, períodos não simulados ou seleção exclusiva de sementes favoráveis.

## Referências e alcance

[Ludlow et al.,2021](https://arxiv.org/abs/2105.03561) investigam aquecimento espúrio de discos por halos discretizados, com dependência de massa individual e condições locais. Esse mecanismo motiva o controle, mas a conclusão desta galáxia depende das medidas acima. [AGAMA, Vasiliev](https://arxiv.org/abs/1802.08239) e o [manual](https://arxiv.org/abs/1802.08255) fundamentam o uso de DFs em ações e iteração do campo. A convolução e a avaliação GPU desta implementação foram verificadas separadamente.
