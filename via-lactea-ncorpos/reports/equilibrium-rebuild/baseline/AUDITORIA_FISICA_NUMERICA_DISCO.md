# Auditoria física e numérica do crescimento vertical do disco

## Relatório anterior a qualquer correção de produção

Evidência: 2026-10-21T02-54-41-523Z. Versão auditada: 1.0.6-experimental. Os hashes e cópias dos módulos originais estão em 2026-10-21T02-54-41-523Z/protocol-before-corrections.json e before/. A hipótese de 0,162 → 8,11 kpc em 35.200 Myr foi informada pelo usuário; essa realização específica não está disponível. A aba aberta estava sem execução. Não se inventaram snapshots ou resultados desse caso.

## Conclusão sustentada

O modelo vivo legado não demonstrou equilíbrio dinâmico de longo prazo. O crescimento vertical é reproduzido em CPU direta Float64 e é muito maior ao tornar todas as componentes vivas do que no campo analítico fixo. Os resultados são compatíveis com a combinação de granulação/relaxação, resposta coletiva e desajuste entre condições iniciais e campo suavizado. Não foram isoladas porcentagens causais. A precisão do integrador, por si só, não estabiliza uma distribuição que não seja estacionária ou uma realização colisional. Não foi detectada dupla contagem no motor principal.

## Rastreio do código

- Posições, massas e velocidades: src/physics/initial.js seleciona por padrão initial-legacy.js; sem importação silenciosa dos candidatos AGAMA. sampleHernquist, sampleDisk, sampleHalo e createGalaxy geram as componentes; componentCounts aloca 15/45/40% de N, mantendo as massas separadas.
- Campo analítico e densidades: src/physics/models.js. Constantes e conversões: constants.js.
- Força viva: forces.js e shaders em compute/gpu.js. Somatório Plummer de partículas, sem adição do campo analítico na página principal. Barnes–Hut é alternativa aproximada em CPU; GPU é direta Float32.
- Evolução: integrator.js e compute/gpu.js; Leapfrog KDK, com velocidades no passo completo após o segundo kick. Passes GPU separados evitam leitura de posições durante o drift.
- Medição: disk-analysis.js ajusta plano robusto com abertura de 20 kpc, calcula quantis ponderados pela massa e mede a população inteira em relação a esse plano; anéis permitem referenciais global/local. structure-diagnostics.js fornece R50, densidades e momentos. live-diagnostics.js plota diskFrame.instant.h50. O ajuste do plano não modifica partículas.
- Diagnósticos de energia: live-energy.js e pair-energy-partition.js. A linha BH é aproximada; a referência direta Float64 usa a Hamiltoniana suavizada dos snapshots, com auto-interação excluída.

## Unidades, tempo e massa

Unidades: kpc, Myr, 10¹⁰ massas solares nominais; velocidade kpc/Myr; aceleração kpc/Myr²; energia 10¹⁰ M☉ kpc²/Myr². G=0.04498502151469553; 1 km/s=0.001022712165045695 kpc/Myr. G é derivada do GM solar nominal IAU, não introduzida como ajuste. Fontes/valores já existentes: PARAMETROS_E_FONTES.md.

A integração corre independentemente dos FPS e continua até pausa/encerramento, sem tempo físico final predefinido. Com dt solicitado=0,1 Myr, 352.000 passos correspondem a 35.200 Myr = 35,2 Gyr. Isso pode acontecer em pouco tempo de computador. Não há expansão cosmológica ou evolução estelar no sistema isolado; prolongar o tempo não o transforma em uma evolução cosmológica da Via Láctea. Sem o registro da realização citada, não é possível confirmar que ela completou exatamente esses passos.

Foi constatado um erro pequeno de metrologia temporal: o shader usa dt=0.10000000149011612, mas o relógio soma 0,1. A diferença após 352.000 passos seria 0.000524520872069445 Myr, ou ~525 anos. Ela não explica uma alteração de h50 por um fator de cerca de 50.

Bojo: 5×10⁹ M☉; disco: 6,8×10¹⁰ M☉. No halo, 5,4×10¹¹ M☉ é massa de escala NFW, não massa total. R200=206,626 kpc; taper quintico entre R200 e 1,2R200=247,951 kpc. Massa integrada finita=976.316.000.000 M☉; interior a R200=931.778.000.000 M☉. Na alocação padrão par, m_halo/m_disco=16,1523. Alterar N não altera massas físicas totais.

## Forças e perfis

As acelerações Hernquist, Miyamoto–Nagai e NFW têm sinais atrativos e unidades consistentes. Gradientes por diferenças centrais foram refinados com h/R=10⁻³,10⁻⁴,10⁻⁵ em 3D. No domínio interno, o maior erro dos pontos com h<0,001 kpc foi 0,000000066566. A divergência das forças reproduziu as densidades nos pontos internos com maior erro relativo 0,00000508324.

Achado corrigível: no halo após R200, o potencial usa interpolações lineares separadas de massa e termo de cascas. Sua derivada não coincide exatamente com a força tabulada; o maior desvio nos pontos auditados foi 0,0934359%. Isso afeta a referência analítica e controles externos; a autogravidade viva não usa esse potencial como força. A correção deve integrar a mesma massa tabulada, mantendo forças, massas e perfis adotados.

A marginal vertical Miyamoto–Nagai é p(z)=b²/[2(z²+b²)^(3/2)] e h50=b/√3=0,161658 kpc. Em três amostras independentes de 100.000 pontos, os h50 foram 0,160992, 0,160864, 0,161791 kpc. A altura inicial perto de 0,162 kpc é compatível com o modelo. A componente não possui corte radial rígido em 30 kpc; partículas da cauda não são automaticamente fugitivas.

## Condições iniciais e equilíbrio vertical

O disco usa ∂(ρσz²)/∂z=ρa_z, σR=σz e streaming de Satoh k=1. A quadratura independente de 160 a 1.280 pontos e a derivada da pressão dão residual vertical máximo de 0,000000208897 nos pontos avaliados. Isso verifica a equação de momentos, não uma função de distribuição estacionária. Os sorteios locais são Gaussianos. Bojo e halo usam aproximação esférica do campo do disco; compatibilidade exata no potencial achatado combinado não é demonstrada.

O campo usado na geração das velocidades é analítico sem suavização. A trajetória viva usa Plummer, que altera a força de pequenas separações. Na realização preservada de N=49.796, 2Kz/(-Wz) inicial do disco foi 1,00606 no campo analítico, 1,01079 no Newtoniano discreto e 1,05322 no mesmo estado com Plummer ε=0,1 kpc. A diferença identifica uma incompatibilidade inicial de suporte vertical; o virial escalar não prova equilíbrio nem mede sozinho todo o engrossamento futuro.

## Três controles novos antes de correções

Todos usam CPU direta Float64, mesmas partículas iniciais de disco por semente, dt=0,1 Myr e ε=0,1 kpc quando há autogravidade. No campo totalmente fixo, as partículas são traçadoras livres. Em disco-live, bojo e halo analíticos fixos são somados uma vez, sem partículas dessas componentes. Em all-live, todos se movem e não existe campo externo. N-base=800: 120 bojo, 360 disco e 320 halo. Nos dois controles fixos, N integrado=360 e a massa ativa externa é informada separadamente; não se compara a massa das traçadoras com a massa total viva como se houvesse perda.

| Controle | Semente | h50 inicial [kpc] | h50 em 200 Myr [kpc] | Maior módulo de δE amostrado [%] |
|---|---:|---:|---:|---:|
| fixed-total | 2026 | 0,188514 | 0,19633 | 0,0000320067 |
| disk-live | 2026 | 0,188514 | 0,295881 | 0,000659119 |
| all-live | 2026 | 0,188514 | 1,72164 | 0,0549367 |
| fixed-total | 2027 | 0,176626 | 0,178691 | 0,0000168242 |
| disk-live | 2027 | 0,176626 | 0,298508 | 0,000391875 |
| all-live | 2027 | 0,176626 | 1,9569 | 0,00165166 |
| fixed-total | 2028 | 0,169767 | 0,153995 | 0,0000304888 |
| disk-live | 2028 | 0,169767 | 0,267529 | 0,000653974 |
| all-live | 2028 | 0,169767 | 1,4281 | 0,0606698 |

Em campo axisimétrico fixo, o invariante angular é Lz; o vetor L completo pode mudar fisicamente. No sistema totalmente isolado, L vetorial e momento linear são conservados. Todos foram registrados com normalizações explícitas. Energia dos traçadores é K+ΣmΦ; do disco vivo é K+U_discolive+ΣmΦ_bojo+halo; do sistema vivo é K+U_pares, sem fatores 1/2 indevidos no campo externo. Energia de referência é direta, não BH.

Na primeira coleta, σR global ficou nulo por um caminho de exportação incorreto no script de auditoria; σR por anel foi registrado corretamente. Esse erro de coleta foi identificado e corrigido antes de repetições. Não foi inventada uma σR global retrospectiva. Os resultados físicos listados acima não usam esse campo ausente.

## Convergência temporal, resolução e suavização

| dt [Myr] | h50 aos 40 Myr [kpc] | Maior módulo de δE amostrado [%] |
|---:|---:|---:|
| 0.1 | 0,431067 | 0,0195515 |
| 0.05 | 0,433593 | 0,00566386 |
| 0.025 | 0,436811 | 0,00144756 |

O erro energético reduz com dt, mas a espessura não retorna ao valor inicial. N=400/800/1.600, três sementes, ε=0,05/0,1/0,2 kpc e refinamento apenas do halo por quatro foram executados no mesmo tempo de 40 Myr. Todos constam dos JSONs; a seleção não foi feita pela aparência desejada. Diminuir ε também pode exigir menor dt e aumentar encontros fortes; aumentar ε altera o campo e não é uma solução de equilíbrio. As dispersões entre três sementes são descritivas; não fornecem um intervalo estatístico calibrado ou uma extrapolação garantida em N.

No binário Plummer circular, o erro da trajetória demonstrou ordens 1,99995 e 1,99999; no excêntrico, o máximo energético a cada passo demonstrou ordens 1,99803 e 1,99937 ao reduzir dt por dois. Não se usou só a energia final. Esses testes confirmam segunda ordem nesses sistemas simples e não certificam toda galáxia.

## Dados históricos diretamente aplicáveis

A realização preservada N=49.796 teve h50=0,16354 → 2,13717 kpc até 9.900 Myr, com h50 das partículas de energia específica negativa igual ao da população inteira. Nos snapshots auditados, nenhuma partícula do disco tinha energia específica positiva; os estados e métodos estão preservados em reports/disk-heating-live. Isso mostra que engrossar não equivale a escapar. Não permite dizer que as partículas também estavam ligadas na realização diferente de 35.200 Myr.

Nessa realização, o máximo energético direto amostrado foi 0,00042021%, enquanto o máximo BH foi 0,0323159%. Há forte evolução estrutural com boa conservação da energia total; transferências entre componentes e redistribuição entre graus de liberdade continuam possíveis. A separação de inclinação/warp e espessura própria é indispensável.

Os controles históricos em reports/v0.9.0/mean-field-control.json e model-summary.csv, e os estudos em reports/laboratory/convergence.json foram relidos e preservados, sem reutilizar resultados AGAMA 1.0.4/1.0.5 como se fossem dessa realização legacy. Campanhas anteriores com as mesmas 6.000 partículas bariônicas também tiveram menos engrossamento ao refinar só o halo, mas não atingiram equilíbrio global.

## O que é justificável corrigir agora

1. Relógio físico baseado no dt efetivamente representado e número de passos; preservar tempo inicial, passo solicitado e convenção nos relatórios. Isso não altera a força ou o avanço das coordenadas.
2. Referência de potencial externo do halo calculada como integral da mesma massa tabulada usada pela força; preservar a massa total e o campo adotado.
3. Regressões da energia/força dos controles e da medição da espessura própria.

Não há evidência para reescalar velocidades, amortecer z, escolher ε ou massas para aprovar gráficos, ou substituir o gerador por outro candidato não validado. Para corrigir as condições iniciais fisicamente, é necessário construir uma DF positiva/realização orbital estacionária no potencial combinado suavizado e validar que conserva as densidades-alvo Hernquist/MN/NFW, sem trocar o disco por exponenciais ou alterar a massa do halo silenciosamente. A estabilidade física também pode depender da DF e modos coletivos; nem toda densidade e escolha arbitrária de anisotropia admitem o equilíbrio desejado.

## Referências consultadas

- Yurin & Springel (2014), GALIC: https://arxiv.org/abs/1402.1623 ; código oficial e método: https://wwwmpa.mpa-garching.mpg.de/~volker/galic/ . A iteração compara resposta orbital média com densidade-alvo, além de momentos.
- Sellwood (2013), Relaxation in N-body simulations of disk galaxies: https://arxiv.org/abs/1303.4919 . A relaxação colisional afeta especialmente a estrutura vertical e deve ser separada de evolução coletiva.
- Vasiliev (2019), AGAMA: https://arxiv.org/abs/1802.08239 . DFs em ações e modelos autoconsistentes.
- Exemplo oficial AGAMA: https://github.com/GalacticDynamics-Oxford/Agama/blob/master/py/example_self_consistent_model.py . O exemplo distingue amostrar apenas densidades de amostrar posições e velocidades de uma DF no potencial convergido. Seus parâmetros não foram copiados para o TCC.

Nenhum parâmetro físico novo foi introduzido. Os números de N, dt e ε variados são refinamentos numéricos explicitamente registrados, não ajustes observacionais.


## Retificação da separação dos erros de diferenças finitas

O valor de 0,0934% mencionado no primeiro relatório incluía o disco em uma diferença vertical demasiado grosseira a R≈207 kpc. Separando a componente halo e refinando h, o erro persistente máximo correto é 0,0316815% (por exemplo, R≈230 kpc). Após a correção da integral do potencial, o erro máximo nessa seleção cai para 0,00000000010351 relativo. O diagnóstico de inconsistência da interpolação do halo permanece válido. Os dados originais e o relatório inicial foram preservados; esta retificação explicita a decomposição correta.

## Correções aplicadas e regressões

- physical-time.js estabelece t=t0+n_passos×dt_efetivo, sem modificar os kicks ou drifts. CPU usa dt Float64; GPU usa o mesmo dt Float32 armazenado no shader. A época inicial é preservada; contagens inválidas/overflow são rejeitadas antes do avanço.
- models.js integra exatamente M(r)/r² em cada intervalo da massa linear tabulada do halo, com Φ→0 no infinito e continuidade do potencial em R200. O campo de aceleração, a densidade, os valores de M(r), a massa total e o raio externo não foram alterados. Os pequenos erros de quadratura/interpolação da própria densidade/massa continuam limitações numéricas separadas. As tabelas de campos fixos de outras páginas históricas conservam suas próprias aproximações; não se certifica automaticamente todo campo externo histórico.
- Relatórios novos incluem requestedDt/effectiveDt, origem temporal e referência do potencial, além da identidade auditada do código; identidades e resultados históricos não foram sobrescritos.

Arrays iniciais de posições, velocidades, massas e rótulos foram comparados byte a byte em três sementes, sem diferenças. As forças e os dois blocos WGSL são idênticos aos originais. Repetir os três controles deu exatamente as mesmas espessuras finais; as correções metrológicas não foram apresentadas como estabilização. A primeira coleta incompleta de σR global foi preservada e a repetição posterior contém esse diagnóstico global e por anel.

## Condições iniciais: teste adicional da distribuição

Em três realizações N=20.000, σz por anel foi comparada à pressão independente de Jeans; os escores aproximados consideram a correlação dos pares antipodais e não foram usados como classificador de equilíbrio. Em uma reconstrução independente da Gaussiana local associada aos momentos, o operador estacionário de Boltzmann é não nulo. Por exemplo, a R=8,2 kpc e z=0,28 kpc, (df/dt)/f≈-0,0303748 Myr⁻¹ na velocidade amostrada do teste. É um teste pontual dessa aproximação de DF, não uma medida da taxa global de aquecimento. Ele demonstra por que a concordância de momentos não equivale a uma distribuição estacionária.

## Comparação de precisão realmente executada no navegador

Os testes WebGPU partiram do mesmo snapshot Float32 lido da GPU, incluindo massas arredondadas, G, dt e ε² efetivos; a trajetória de referência usa operações CPU Float64. O estado não foi adaptado durante a evolução. A energia foi medida diretamente em Float64 a cada 2 Myr solicitados, com épocas efetivas exatas preservadas.

| dt solicitado [Myr] | t efetivo [Myr] | h50 CPU [kpc] | h50 GPU [kpc] | Erro RMS relativo de posição do disco | Maior módulo de δE CPU / GPU amostrado [%] |
|---:|---:|---:|---:|---:|---|
| 0.1 | 40,000000596 | 0,431075 | 0,43108 | 0,0000054826 | 0,00478935 / 0,00480162 |
| 0.05 | 40,000000596 | 0,433595 | 0,433593 | 0,00000766826 | 0,000898584 / 0,000942663 |

O espessamento também aparece em Float64. Essa comparação curta em N=800 não exclui contribuição de Float32 em 35,2 Gyr com dezenas de milhares de partículas. Máximos amostrados em cadências de 1, 2 e 10 Myr não podem ser tratados como se fossem os mesmos máximos contínuos.

## Refinamentos que impedem uma aprovação artificial

Ao refinar apenas o halo por quatro, mantendo bojo/disco idênticos e massa total inalterada:

| Semente | h50 base em 40 Myr [kpc] | h50 halo refinado [kpc] |
|---|---:|---:|
| 2026 | 0,431067 | 0,320124 |
| 2027 | 0,422978 | 0,341443 |
| 2028 | 0,390737 | 0,295899 |

A redução nas três sementes sustenta contribuição da discretização, mas também altera a amostragem e a resposta do halo. Não fornece uma porcentagem exclusiva de relaxação de dois corpos. Não se alcançou um platô em N que demonstre convergência estrutural.

Na mesma realização até 200 Myr, dt=0,05 e 0,025 Myr deram h50=1,78908 e 1,69473 kpc, contra 1,72164 kpc em dt=0,1 Myr. O máximo energético amostrado caiu para 0,00855696 e 0,000893377%, enquanto o disco continuou muito mais espesso que inicialmente. As trajetórias individuais podem divergir por encontros; não se exige monotonicidade de h50 como critério numérico.

Em ε=0,05 kpc e dt=0,1 Myr, a semente 2028 atingiu máximo energético amostrado de 1,13580%. Repetições com dt=0,05 e 0,025 deram 0,0756947 e 0,0134036%. Logo, reduzir ε sem reduzir dt não está numericamente resolvido nesse teste. Nenhum ε foi promovido a valor físico correto por produzir um disco mais fino.

## Entrega e reprodução

Foram executados 43 ensaios CPU novos e 2 ensaios GPU novos, além dos binários, auditoria analítica e análise das condições iniciais. Eles permanecem separados das campanhas anteriores.

- scripts/disk-audit/run.mjs: controles e refinamentos; cria sempre diretório novo. DISK_AUDIT_PHASE=after refaz controles após correções; long-dt executa refinamento temporal de 200 Myr.
- scripts/disk-audit/analytic.mjs before|after: forças/densidades/Jeans. Arquivos before já produzidos são evidência histórica desta auditoria; preserve-os antes de qualquer reprodução.
- scripts/disk-audit/leapfrog.mjs: testes de duas partículas e ordem, medidos a cada passo.
- scripts/disk-audit/initial-distribution.mjs: dispersões iniciais e operador de Boltzmann.
- tests/browser-disk-audit.html: ensaio WebGPU reproduzível, sem acessar estado interno da aplicação principal.
- series.csv, annuli.csv, summary.json e SVG: dados e figuras da auditoria. Não houve suavização visual dos resultados nem correção cosmética das curvas.

**Conclusão final:** a consistência do relógio e da referência de potencial foi corrigida; a estabilidade dinâmica global ainda não foi demonstrada. O resultado defensável é a identificação e separação dos mecanismos, com controles e limites reproduzíveis. Uma nova realização estacionária precisa ser construída e validada no campo efetivamente integrado, preservando explicitamente as densidades/massas do TCC. Alterar velocidades sem essa demonstração repetiria o procedimento por tentativa e erro que esta auditoria evita.


## Verificação final da entrega

Os 168 testes automatizados passaram (zero falhas). O build estático foi concluído com `node scripts/build.mjs`. A identidade dos 145 arquivos de código auditados foi conferida contra o código atual e a cópia em dist, sem diferenças. Os 4.560 arquivos científicos do manifesto histórico, totalizando 10.909.158.704 bytes, foram comparados por SHA-256: nenhum alterado ou ausente. Evidências: reports/disk-audit-current/tests-final.txt, verification-final.json e preservation-verification.json. Isso verifica a entrega e a preservação; não certifica equilíbrio dinâmico.
