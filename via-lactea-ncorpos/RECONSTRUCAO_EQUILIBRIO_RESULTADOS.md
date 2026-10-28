# Reconstrução experimental das condições iniciais — resultados e limites

**Candidato não aprovado para substituir o legado. Estabilidade dinâmica não demonstrada.**

## Método e rastreabilidade

O protocolo anterior à implementação está em RECONSTRUCAO_EQUILIBRIO_METODO.md. O campo usa a convolução Plummer do potencial Newtoniano das densidades originais, com massas 0,5, 6,8, 97,63158 em 10¹⁰ M☉; ε=0,1 kpc. Nenhuma massa/escala física nova. A biblioteca positiva é uma aproximação de superposição orbital, relacionada ao princípio de resposta orbital de GALIC/Schwarzschild, não uma cópia do GALIC. Não é a repetição de um ajuste de σz ou de velocidades durante a evolução. As Gaussianas legadas servem somente para propor órbitas; os snapshots usam fases de órbitas ponderadas no campo suavizado. Não se impõe σR=σz à mistura final.

AGAMA é uma alternativa viável para ajuste de DFs, mas não foi executado: não está importável no Python disponível. Seus exemplos não fornecem uma DF exata MN/Hernquist/NFW finito deste modelo; copiar DFs exponenciais mudaria o alvo. Isso não demonstra impossibilidade da estratégia B nem unicidade da estratégia escolhida.

## Campo de equilíbrio

Φε=Wε*ΦNewton, Wε=3ε²/[4π(r²+ε²)^(5/2)]. O kernel tem massa unitária; a densidade física permanece a original. O potencial escalar Hermite deriva força radial/vertical coerentes, com soma linear de componentes. Fora da grade é usada a convolução, não um monopolo descontínuo. As pequenas aproximações da tabela NFW original também permanecem.

Resoluções 16×8×16 e 32×12×24 na convolução, grades 64×64 e 112×96. Maior diferença relativa de força entre quadraturas: 0,1008741%; maior erro da grade fina frente à quadratura: 0,01102122%. São diferenças medidas nos pontos auditados, não limites formais globais. Frequências Ω, κ, ν e períodos constam de reports/equilibrium-rebuild/2026-10-21T03-39-56-668Z/field-audit.json; período circular em 8,2 kpc=219,8736 Myr. A suavização modifica o campo, sem autorizar alterar as densidades-alvo. Há 108 comparações de campo discreto com referência (N por componente=1.000 e 4.000; três sementes) e 48 sondas de sensibilidade a ε=0,05/0,1/0,2 kpc; isso não é uma campanha de evolução convergida em ε.

## Mérito orbital e portas de aceitação

Minimiza-se KL(t||Aw) com w≥0, Σw=1, 500 atualizações multiplicativas, usando a primeira metade das órbitas. A segunda metade e uma amostra independente do alvo são usadas para validação. Metade da soma dos desvios absolutos L1 equivale à distância de variação total nos bins; L1 não é um percentual observacional nem uma probabilidade de estabilidade. Alvo integrado por 100.000 sorteios independentes por componente e por réplica. A biblioteca final tem 487/511/323 órbitas resolvidas de bojo/disco/halo; as rejeitadas e seus motivos ficam registradas. Meta de erro de energia específica=10⁻⁵, no máximo 65.536 passos por órbita, 512 fases e oito períodos circulares de referência; isso é orçamento/precisão de construção, não tolerância de estabilidade. Passos não modificam energia ou velocidades para corrigir erro.

| Componente | L1 de ajuste | L1 em metade temporal e alvo independentes | Diferença L1 entre duas amostras do alvo | Órbitas efetivas |
|---|---:|---:|---:|---:|
| Bojo | 0,01667044 | 0,05373769 | 0,02732 | 345,8899 |
| Disco | 0,02068477 | 0,04173639 | 0,02716 | 379,0049 |
| Halo | 0,006119557 | 0,05066664 | 0,0245 | 187,4146 |

Essas diferenças de amostragem são referências descritivas, não intervalos de confiança calibrados. Não foi obtida convergência inequívoca do ajuste nem imposição de todos os momentos cinemáticos. A biblioteca define uma escolha de anisotropia/rotação dependente da cobertura de órbitas, não uma inferência observacional. A reamostragem de três sementes não equivale a três ajustes independentes de DF; bibliotecas com sementes 42/43/44 foram comparadas separadamente. A primeira biblioteca de 128 propostas é um piloto anterior ao refinamento para 512 fases/65.536 passos; seus dados não são relabelados como se tivessem o mesmo protocolo.

## Falha explícita no truncamento do halo

Um diagnóstico esférico independente detectou fração ponderada 0,4868711% das fases do halo além de 247,951 kpc, contra zero no alvo. O mérito em células cilíndricas grosseiras não garante a fronteira esférica exata. **Este é um motivo concreto para rejeitar a promoção deste candidato.** Não se removeram partículas nem se recortaram órbitas dos resultados. A próxima revisão precisa impor suporte orbital compatível com a fronteira, acompanhar raio máximo a cada passo e refazer a fidelidade — não apenas reduzir esse número com cortes no snapshot. A falha desta biblioteca não prova inexistência de uma DF compatível.

## Controles de evolução livre

34 ensaios CPU novos. Todas as integrações vivas usam força direta Plummer e Leapfrog de produção sem alteração. No controle A todas as componentes são traçadoras no campo total suavizado; B integra só o disco vivo com campos de bojo/halo suavizados fixos; C integra todas as componentes sem qualquer campo externo. K+ΣmΦ para A; K+Upares+ΣmΦext para B; K+Upares para C. Energia por componente reparte Upareado pela metade entre seus participantes; não é invariante isolado. Só Lz é invariante nos controles axisimétricos externos. Massa ativa externa não é contada como massa de partículas integradas.

Exemplo: N-base=400, 60/180/160, semente 2026, dt=0,1 Myr, 200 Myr. São realizações amostradas distintas entre geradores; as três modalidades de controle de cada gerador usam a mesma realização.

| Gerador | Controle | h50 inicial [kpc] | h50 final [kpc] | Maior erro direto amostrado [%] |
|---|---|---:|---:|---:|
| Legado | Campo total suavizado fixo | 0,2324855 | 0,1905026 | 0,00007667604 |
| Legado | Disco vivo; bojo/halo suavizados fixos | 0,2324855 | 0,3338709 | 0,002159106 |
| Legado | Galáxia inteiramente viva | 0,2324855 | 2,414988 | 0,4222059 |
| Candidato orbital — não validado | Campo total suavizado fixo | 0,1790887 | 0,1701005 | 0,0001659596 |
| Candidato orbital — não validado | Disco vivo; bojo/halo suavizados fixos | 0,1790887 | 0,4334274 | 0,003076098 |
| Candidato orbital — não validado | Galáxia inteiramente viva | 0,1790887 | 1,466566 | 0,3984683 |

Em N=400, os grandes erros energéticos de algumas execuções com dt=0,1 Myr impedem atribuir toda a evolução à relaxação. Repetições em 0,05 e 0,025 Myr e N=800 constam dos registros. O disco continua engrossando; máximos amostrados não precisam diminuir monotonamente em sistemas de encontros, e nenhum máximo foi estimado entre snapshots. O refino do halo por quatro e por dezesseis manteve as partículas bariônicas idênticas e massas totais fixas. A relação de massa por partícula halo/disco cai por esses fatores; não se alterou a massa física do halo. O contraste muda também sua resposta coletiva e não mede uma porcentagem exclusiva de relaxação.

h50 é medido em plano próprio, com anéis globais/locais. ΣR/Σφ/Σz, covariâncias e momentos estão em structure.velocity, velocidades por anel nos dados, fluxo vertical linear em flow, e modos m=1..4 em disk.rings. Fluxos coerentes e ruído de sementes limitam qualquer classificação de aquecimento secular. Ligação é sinal instantâneo da energia específica; não prova fuga assintótica. Curvas de rotação são calculadas do campo realmente usado em cada controle; a curva de partículas isolada fica separada. Não se identificou uma barra, espiral ou modo vertical físico por uma amplitude isolada.

## Precisão e custo

GPU: 4 ensaios recuperados do navegador nesta entrega. Resultados efetivos, parâmetros Float32 e energia direta Float64 estão em gpu-results.json; comparação curta CPU/GPU usa exatamente o snapshot arredondado e G, dt e ε² efetivos. Custos por execução em wallMs e por medição em measurementMs. Campo: 3 variantes; tempos de construção estão nos field-*.json. Biblioteca final: 110,6311 s nesta máquina; outros custos em assessment.json. A primeira proposta pode gerar órbitas não ligadas ou mal resolvidas, explicitamente rejeitadas; isso limita a cobertura da biblioteca e precisa entrar no estudo de convergência.

## Estado das fases

1. Auditoria reutilizada e código mapeado: concluído, sem releitura de arquivos históricos multigigabyte.
2. Campo Plummer: implementado e erros medidos; convergência global formal pendente.
3. Estratégias: avaliadas; escolhido piloto orbital positivo; AGAMA não executado.
4. Gerador separado, sementes, exportação e importação estrita: implementado.
5. Fidelidade: medida; truncamento e resíduos impedem aprovação.
6. Controles A/B/C: executados em 40/200 Myr.
7. Convergência: estudos curtos de dt, N e halo; ε da evolução, platô não colisional, múltiplos períodos em evolução viva e Gyr pendentes. Não foram executados porque as portas curtas já falharam; não há ganho científico em uma longa campanha com candidato ainda inconsistente.
8. Site: consulta dos resultados auditados; candidato não promovido à integração principal. Legado segue padrão.
9. Relatório, CSV, SVG, snapshots e fontes: entregues.

## Reprodução

Node >=20.11, sem nova dependência. scripts/equilibrium-rebuild/field.mjs cria campo e auditoria; prepare.mjs <propostas por componente> <semente> <períodos> cria biblioteca e snapshots; validate.mjs cria sondas de campo/discretização; run.mjs e run.mjs extended criam controles; tests/browser-equilibrium-rebuild.html roda GPU sob demanda; report.mjs gera tabelas e figuras. Cada execução numérica cria diretório novo; latest-*.json são só ponteiros. Preservar os arquivos de evidência já existentes. O snapshot possui esquema próprio e a importação nunca confere equilíbrio por uma flag JSON. scripts e fontes atuais têm hashes no manifesto de entrega; manifestos dos controles preservam os módulos executados. Nem todo piloto anterior possui cópia individual completa do script; o protocolo e os dados brutos foram conservados e essa limitação não foi ocultada.

## Fontes e parâmetros

Massas, escalas e truncamento: constantes e PARAMETROS_E_FONTES.md do projeto, preservados. Parâmetros novos são numéricos: ordens de quadratura, nós da grade, bins, sementes, tamanho da biblioteca, fases, duração orbital, iterações e meta de erro; suas definições constam do protocolo e JSON. Não são observações nem ajustados para aprovar h50.

- Yurin & Springel (2014), método de resposta orbital: https://arxiv.org/html/1402.1623v1 ; implementação de referência https://github.com/denisyurin/GALIC .
- Vasiliev (2019), DFs em ações e autoconsistência: https://arxiv.org/html/1802.08239v2 .
- Exemplo oficial AGAMA: https://github.com/GalacticDynamics-Oxford/Agama/blob/master/py/example_self_consistent_model.py .
- Sellwood (2013), relaxação e aquecimento vertical por discretização: https://arxiv.org/abs/1303.4919 .

**Conclusão:** existe agora um gerador orbital experimental e um campo médio compatível com a suavização, mas esta primeira família ainda não é uma galáxia de equilíbrio validada. A fidelidade do truncamento, a cobertura da biblioteca, a cinemática degenerada e a convergência estrutural precisam ser resolvidas. O trabalho não força um disco fino nem transforma esse candidato reprovado em resultado físico aprovado.


## Resultados GPU efetivamente recuperados

A primeira apresentação extensa do JSON deixou de responder à automação e as primeiras tentativas de gravação falharam. Os ensaios foram repetidos com resumo compacto e coleta local; os quatro resultados completos desta tabela estão em gpu-results.json, e o arquivo bruto com data e hash é conservado separadamente. Repetições de coleta não são novas sementes ou evidências independentes de equilíbrio. O coletor local foi encerrado após a gravação.

| N | Semente | Tempo efetivo [Myr] | h50 inicial [kpc] | h50 final [kpc] | Maior erro energético direto amostrado [%] | Custo [s] |
|---:|---:|---:|---:|---:|---:|---:|
| 400 | 2026 | 40 | 0,1790887 | 0,5504113 | 0,0002549652 | 1,142945 |
| 2800 | 2026 | 200 | 0,1790887 | 0,6584273 | 0,000296544 | 3,095835 |
| 2800 | 2027 | 200 | 0,1646372 | 0,6446498 | 0,0002158665 | 2,945995 |
| 2800 | 2028 | 200 | 0,1387028 | 0,7861386 | 0,0003544734 | 3,079105 |

Na comparação N=400, CPU Float64 e GPU Float32 partem do mesmo snapshot arredondado: h50 final CPU=0,550253 kpc, GPU=0,5504113 kpc; erro RMS relativo de posição do disco=0,00002105645. Os valores de G, dt e ε² são os efetivamente representados pela GPU.

Nos três ensaios N=2.800, contagens 60/180/2.560, as partículas bariônicas são idênticas às da mesma semente na resolução base; somente a amostragem do halo é refinada. Mesmo com massas de partículas halo/disco próximas, Nd=180 ainda é muito baixo para provar o limite não colisional do disco. O crescimento remanescente não pode ser atribuído exclusivamente a uma causa nem tratado como prova de instabilidade da Via Láctea real.


## Testes fracos da equação de Boltzmann e cinemática

Foi avaliada a identidade orbital <{g,H}>T=[g(T)-g(0)]/T para g=z², z vz, R² e x vx+y vy, com derivadas físicas obtidas do mesmo campo. Os valores, normalizações por soma dos módulos dos termos e taxas de borda estão em weak-stationarity.json. A quadratura esparsa das fases e o KDK finito impedem tratar a identidade como exata numericamente. Os resíduos normalizados do disco foram 0,007777565, 0,0001447425, 0,0002360188, -0,00002796442. Não há aprovação automática por esses números: são testes globais, não uma solução local completa de Jeans/CBE. A simetrização por reversão temporal de bojo/halo cancela momentos ímpares em velocidade na mistura, mas não certifica os demais testes.

Dispersões cilíndricas globais da biblioteca do disco: σR=41,35046, σφ=50,21989, σz=37,3932 km/s. São resultados da biblioteca, não valores observacionais no raio solar. O tensor cruzado também foi registrado. A distribuição não impõe σR=σz.


## Verificação final de software e preservação

177 testes passaram, sem falhas. Build estático concluído. Dos 57 arquivos existentes preservados na linha de base, mudaram somente experimento-ncorpos.html (link de consulta) e scripts/build.mjs (empacotamento dos novos resultados). Física, integradores, shaders e condições iniciais legadas permaneceram idênticos. Não foi feita nova leitura integral do acervo histórico multigigabyte. O manifesto da entrega conserva hashes dos dados novos, código e documentos. Nenhum teste de software promove este candidato a equilíbrio físico.
