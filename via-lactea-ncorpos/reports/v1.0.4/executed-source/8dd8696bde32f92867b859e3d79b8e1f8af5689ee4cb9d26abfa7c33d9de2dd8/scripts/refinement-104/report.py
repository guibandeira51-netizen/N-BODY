from pathlib import Path
import json,datetime,hashlib,re
import numpy as np
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'reports/v1.0.4';read=lambda n:json.loads((BASE/n).read_text(encoding='utf-8-sig'));s=read('summary.json');decision=read('long-run-decision.json');figures=read('figures/manifest.json')['figures'];campaign=read('campaign.json');ic=read('ic-consistency.json');field=read('field-audit.json');forces=read('force-audit.json');controls=read('control-references.json');groups=s['groups'];get=lambda family,stage='factorial200':next(g for g in groups if g['family']==family and g['stage']==stage)
def polish(text):
 for a,b in [('versão1.0.4','versão 1.0.4'),('halo80mil','halo de 80 mil'),('halo40mil','halo de 40 mil'),('halo80 mil','halo de 80 mil'),('deσz','de σz'),('emN','em N'),('deN','de N'),('aε','a ε'),('limiteε','limite ε'),('ε0,1','ε = 0,1'),('porSHA256','por SHA-256'),('porhash','por hash'),('aritméticaFloat64','aritmética Float64'),('paraFloat32','para Float32'),('readbackFloat64','readback Float64'),('históricosA/B','históricos correspondentes às famílias A/B'),('entreB/D','entre B/D'),('deB','de B'),('K,U,E,δE','K, U, E, δE'),('G,dt,ε²','G, dt, ε²'),('E,P,L','E, P, L'),('kpc,Myr,1e10','kpc, Myr, 1e10'),('noJSON','no JSON'),('doJSON','do JSON')]:text=text.replace(a,b)
 text=re.sub(r'(?<![\w/.-])(Em|De|de|a|é|são|Nos|nos|Os|os|semente|mesmas|mesmos|SD|cadência|tem|têm|desde|até|energia|mede|fator|matriz|fatorial|adicional|Pilotos|alvos|prévios|iniciados|preservados|calibrados|para|trajetória)(?=\d)',r'\1 ',text)
 text=re.sub(r'(?<=\d)(Myr|Gyr|kpc|Msun|GB|p\.p\.)',r' \1',text)
 text=re.sub(r'(?<=\d)(?=\(km/s\))',' ',text)
 text=re.sub(r'\b([ABCD])(?=\d+,)',r'\1: ',text)
 for title in ['final','custo','combinado','Convergência','compatibilidade','migração','Reprodução']:text=text.replace(title+'1.0.4',title+' 1.0.4')
 return text.replace('  ',' ')
decision={**decision,'publicConclusion':polish(decision['publicConclusion']),'explanation':polish(decision['explanation'])}
if len(s['runs'])!=len(campaign['runs']):raise RuntimeError('Incomplete campaign')
main=[get(f)for f in'ABCD'];maxE=max(r['maxAbsEnergyError']for r in s['runs']);maxL=max(r['maxAngularMomentumScaledError']for r in s['runs']);maxP=max(r['maxMomentumScaledError']for r in s['runs']);contrast=next(r for r in s['contrasts']if r['stage']=='factorial200'and r['metric']=='thinGrowth');interaction=contrast['statistics']['interaction'];sun=next(x for x in ic['frequencies']if x['Rkpc']==8.122);nativeG=read('continuous-g/summary.json')
def num(x,d=3):return f'{x:.{d}f}'
def stat(g,k):m=g['metrics'][k];return num(m['mean'])+' ± '+num(m['sd'])
rows='\n'.join('| '+g['family']+' | '+str(g['n'])+' | '+stat(g,'thinGrowth')+' | '+stat(g,'thickGrowth')+' | '+stat(g,'thinSigmaNormalGrowth')+' | '+stat(g,'thinLateHChange')+' |'for g in main)
table='| Família | N total | Δh50 fino [%] | Δh50 espesso [%] | Δσ perpendicular fino [%] | Δh50 fino,100–200 [kpc] |\n|---|---:|---:|---:|---:|---:|\n'+rows
classification={'Conservação energética':f'Demonstrada numericamente no domínio amostrado: máximo |δE|={maxE:.6g}. Hamiltoniano direto Float64 da trajetória GPU; cadências declaradas. Não é conservação exata nem limite de picos não amostrados.','Equilíbrio inicial':'Evidências insuficientes para estacionariedade exata de todas as componentes. Campo médio convergido e DF admissível são evidências parciais; controles contínuos, f(J) ao longo de órbitas e Jeans expõem resíduos e limitações de ações/quadratura.','Estabilidade estrutural':'Não demonstrada no domínio medido. Avaliar espessura, dispersões, perfis e tendências tardias separadamente; crescimento menor não certifica estabilidade.','Convergência numérica':'Parcial: força direta e energia foram verificadas; há controles de N e passo temporal. A dependência residual da resolução e o horizonte temporal limitado impedem uma certificação global.'}
public=decision['publicConclusion'];domain=f"{len(s['runs'])} integrações GPU novas concluídas, três controles contínuos novos do fino quadruplicado, três auditorias nativas f(J) das quatro populações e 12 controles históricos de 200 Myr verificados por fase/hash. Tempo máximo novo: {max(r['duration']for r in s['runs'])} Myr. As três sementes diagonais variam simultaneamente a realização bariônica e a do halo; não constituem nove combinações independentes."
interactionText=f"A interação D−C−B+A no crescimento do fino foi {num(interaction['mean'])} ± {num(interaction['sd'])} pontos percentuais em200 Myr. Valor calculado por semente, sem supor soma dos ganhos; três realizações limitam a inferência."
timeRows=sorted([r for r in s['runs']if r['family']=='D'and r['seed']==2026 and r['duration']==200],key=lambda r:r['dt']);temporalText='Controle temporal, mesmas partículas D/2026: '+ '; '.join(f"dt={r['dt']} Myr → h50 fino final={r['thinHFinal']:.6f} kpc, máximo |δE|={r['maxAbsEnergyError']:.3g}"for r in timeRows)+'. Uma semente temporal não demonstra convergência estatística global.'
assessment={'schema':'refinement-assessment-104','UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'publicConclusion':public,'domain':domain,'groups':groups,'classifications':classification,'longRunDecision':decision,'interactionText':interactionText,'temporalText':temporalText,'figures':figures,'newGPUIntegrations':len(s['runs']),'newFullContinuousControls':3,'preservedControlReferences':12}
(BASE/'assessment.json').write_text(json.dumps(assessment,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
docs={}
docs['REFINAMENTO_COMBINADO_1_0_4.md']=f'''# Refinamento combinado1.0.4 — experimental

{public}

## Comparação fatorial e domínio

{domain}

A: Nh4.000/fino3.546; B: Nh40.000/fino3.546; C: Nh4.000/fino7.092; D: Nh40.000/fino7.092. Bojo1.500 e espesso954 em todos. Três pares de sementes2026/2027/2028. Massas físicas e DFs fixas, ε0,1kpc, dt0,05Myr, Plummer direta WebGPU Float32, leapfrog KDK. Os12 ensaios20Myr e os12 ensaios200Myr são integrações separadas, iniciadas nas mesmas condições; não são24 realizações estatisticamente independentes.

{table}

Média±desvio padrão amostral de três sementes; sem intervalo de confiança assintótico. h50 é uma mediana ponderada em massa no plano próprio da população. σ perpendicular usa esse plano; σz usa o eixo cartesiano fixo. A mediana global contém fino+espesso e não substitui as duas populações.

{interactionText}

Contrastes de halo B−A e D−C preservam todos os bárions por valores exatos. Contrastes C−A e D−B preservam bojo, espesso e halo; o fino foi novamente amostrado da mesma DF em1.0.3. A resolução não foi aumentada com clones coincidentes. Semente pareada não significa que partículas finas de resoluções distintas tenham os mesmos IDs físicos. O início antipodal reduz ruído ímpar e introduz correlação entre pares; N não conta órbitas independentes.

## Rastreabilidade

`reports/v1.0.4/initial-manifest.json` registra hashes dos12 inputs e das quatro populações, pais1.0.3 e contagens. Metadados `meta.version104` e os arrays/manifestos descrevem a realização atual; campos herdados de `meta.preparation` e sementes genéricas dos pais descrevem a preparação anterior, sem substituir a proveniência atual. Os hashes pareados foram verificados antes de integrar.

Os12 controles contínuos/halo fixo de200Myr são resultados preservados1.0.3 reutilizados, não12 novas integrações. Os bárions dos controles de halo fixo coincidem exatamente com o upload novo. No AGAMA, as conversões de unidades introduzem diferenças iniciais da ordem de ulps Float64, tolerância de verificação1e−13 relativa/absoluta na escala de1; o input quantizado antes da evolução é o mesmo. Referências em `control-references.json`.

Halo fixo remove granularidade e resposta dinâmica. Campo completo fixo remove toda a resposta autogravitante. Diferenças desses controles não são uma medida pura de encontros de duas partículas. Os contrastes vivos de N, a cinemática e os modos completam a interpretação.
'''
high='\n'.join('| '+g['family']+' | '+str(g['n'])+' | '+str(g['nh'])+' | '+stat(g,'thinGrowth')+' | '+stat(g,'thinLateHChange')+' |'for g in groups if g['stage']=='higher200')
docs['CONVERGENCIA_1_0_4.md']=f'''# Convergência1.0.4

{decision['explanation']}

## Resolução adicional após pilotos

E: halo80.000/fino7.092 (N89.546). G: halo40.000/fino14.184 (N56.638). As massas totais e DFs são as mesmas. Populações inalteradas são copiadas; somente a população refinada é amostrada novamente. Não foram lançadas resoluções superiores sem pilotos registrados e medidos de custo/precisão. As decisões de registro estão nos JSON `registration-*`.

| Família | N | Nh | Δh50 fino [%] | Δh50 fino100–200[kpc] |
|---|---:|---:|---:|---:|
{high}

Pilotos20Myr têm cadência2Myr; comparação fatorial20 tem0,5Myr. Resolução adicional200 tem10Myr; comparação fatorial200 e passos temporais têm5Myr. Todos os máximos energéticos são amostrados. O intervalo físico é igual; as cadências distintas e o custo aparecem nos protocolos. Não foram interpolados dados para substituir medições.

## Passo temporal e limites

O controle de passo usa exatamente as partículas da família D, com Plummer e GPU direta, e registra dt no manifesto/resultado. As curvas e diferenças de finais são medidas; caos discreto pode fazer duas trajetórias divergir sem um erro energético grande. Uma realização temporal não demonstra convergência estatística de todas as sementes. Nenhum teste de ε diferente foi promovido, pois a preparação atual é específica de ε0,1kpc; mudar ε exigiria nova preparação compatível.

Convergência parcial de energia/força/passo não demonstra convergência estrutural em N. Diferenças de perfis e tendências100–200Myr são comparadas com a variabilidade entre sementes, sem porcentagem universal admissível de espessamento. Três sementes não estabelecem o limite N→∞ nem uma lei assintótica precisa. O período circular solar deste potencial é{sun['circularPeriodMyr']:.3f}Myr e o vertical é{sun['verticalPeriodMyr']:.3f}Myr. 200Myr não cobre vários períodos circulares solares. Nenhum resultado é extrapolado para1Gyr.
'''
docs['CONDICOES_INICIAIS_1_0_4.md']=f'''# Condições iniciais e compatibilidade1.0.4

O gerador AGAMA–Plummer1.0.2 e as massas de ação foram preservados, sem refit ou ajuste de velocidades. Massas físicas Msun: bojo9.200015467e9, fino3.98e10, espesso1.07e10, halo1.049129212e12 (massa total do perfil finito amostrado, distinta da massa encerrada no raio de referência observacional). A quantização GPU em Float32 é registrada e seus pequenos resíduos de massa são auditados.

## Questões auditadas separadamente

1. Operador médio suavizado: nove iterações preservadas; últimas mudanças máximas de força6,64073e−4 e4,38448e−4. Isso é convergência do operador no domínio de probes, não prova de DF estacionária.
2. Densidade/potencial: preservada a convolução Plummer do potencial da densidade física; densidade física não é confundida com densidade efetiva de Poisson suavizada. A representação de densidade tem erros distintos dos da força. As massas da grade contra integrais da DF diferem em aproximadamente0,4995%,0,00276%,0,00737%,0,05236% para bojo/fino/espesso/halo; não foram renormalizadas para esconder isso.
3. Discos fino e espesso: controles contínuos das mesmas fases, medianas por plano próprio, σz/σR e momentos da DF. O alvo observacional de altura é uma calibração prévia, não igualdade exata da densidade atual. Os priors físicos não foram alterados.
4. Bojo e halo: órbitas de teste e f(J) foram auditados também nessas populações; perfis, momentos e massas encerradas são medidos no sistema vivo. Caudas de densidade quase nula do bojo não devem determinar uma qualificação global.
5. Frequências: diferenças finitas do mesmo potencial médio fornecem Ω²,κ²,ν². Todos os pontos auditados são explícitos em `ic-consistency.json`; não são frequências do potencial vivo a cada tempo.
6. Flutuações de força: somas diretas em28 probes, por população e semente, separam flutuações do halo dos bárions. Novas sementes diagonais mudam ambas; não reutilizamos a dispersão com bárions fixos como se fosse a mesma incerteza. Referência contínua1.0.2 por hash em `field-audit.json`.

## Testes novos de consistência da DF

As equações estacionárias axisimétricas de Jeans foram avaliadas por momentos não centrais (ordem XX,YY,ZZ,XY,XZ,YZ confirmada no código-fonte AGAMA), incluindo o estresse cruzado Rz. Usam passos espaciais0,02 e0,01kpc. Resíduos divididos pela soma dos módulos dos termos estão no JSON, por componente e ponto. Derivadas amplificam erros da quadratura e de ações aproximadas; a sensibilidade ao passo, especialmente em certos pontos do halo, impede interpretar cada resíduo como um desequilíbrio físico exato. Os testes radial e vertical não foram substituídos por uma razão virial global.

Em cada uma das três sementes,128 representantes independentes originais por população evoluíram por200Myr no potencial completo fixo, AGAMA DOP853 Float64, precisão solicitada1e−10. Foram preservados41 estados da subamostra, IDs, hashes e valores de f(J). Existem caudas de variação de f mesmo sem encontros, além de pequenos resíduos no controle contínuo completo dos bárions. A energia orbital individual também é monitorada; precisão solicitada do integrador não é uma garantia de erro máximo. Esses resultados sustentam uma classificação de preparação aproximada, sem certificação exata global.

Melhorias futuras devem separar precisão das ações, quadratura da DF e representação do potencial, e revalidar as populações e as restrições observacionais. O experimento fatorial atual manteve o gerador para permitir atribuir os contrastes a N. Nenhuma velocidade foi reduzida para forçar um resultado estrutural.

AGAMA fornece métodos de ações, DFs, momentos e construção iterativa de modelos; usar a biblioteca não dispensa validar a realização resultante. Referência primária: [Vasiliev2019](https://arxiv.org/abs/1802.08239).
'''
performance=[]
for family in'ABCD EG'.replace(' ',''):
 rr=[r for r in s['runs']if r['family']==family and r['duration']==200 and r['dt']==.05]
 if rr:
  r=rr[0];tim=r['timing'];performance.append(f"| {family} | {r['n']} | {r['wallSeconds']:.2f} | {tim['stepSeconds']:.2f} | {tim['energySeconds']:.2f} | {tim['structureSeconds']:.2f} | {200/r['dt']/tim['stepSeconds']:.2f} |")
docs['CONSERVACAO_E_CUSTO_1_0_4.md']=f'''# Conservação e custo1.0.4

O Hamiltoniano das famílias vivas é E=Σmᵢ|vᵢ|²/2−GΣᵢ<ⱼmᵢmⱼ/√(|rᵢ−rⱼ|²+ε²). Não há autoenergia de cada macro partícula. No controle com halo fixo soma-se ΣmᵢΦhalo, sem fator1/2. K,U,E,δE, momento linear, momento angular vetorial, Lz e centro de massa estão nos registros/CSV. Unidades internas: kpc,Myr,1e10Msun; energia1e10Msun·kpc²/Myr². O Hamiltoniano usa G nominal e ε nominal preservados1.0.3; os parâmetros efetivos GPU G,dt,ε² arredondados paraFloat32 estão em cada resultado. A pequena diferença entre constantes nominais/efetivas é declarada; a referência de aceleração usa os valores efetivos.

Máximo |δE| observado entre todos os ensaios novos:{maxE:.9g}. Máximo erro angular normalizado pela soma inicial dos módulos individuais:{maxL:.9g}; momento linear na normalização análoga:{maxP:.9g}. Os totais iniciais de P podem cancelar por simetria, portanto não dividimos pelo quase zero. São máximos das amostras, não limites entre elas. Um sistema isolado Plummer conservativo admite E,P,L constantes idealmente, enquanto KDK e Float32 introduzem erros numéricos medidos.

## Otimização do diagnóstico

A força direta e o integrador são exatamente os da1.0.3. A energia foi repartida em seis Web Workers: linhas triangulares i<j disjuntas, cada par uma vez, aritméticaFloat64 e soma compensada em cada partição e na redução. O teste com massas desiguais verifica cobertura e concordância com a soma serial; o navegador compara também realizações completas. Não há cutoff, árvore ou aproximação de força nova. A otimização não pode aquecer partículas porque só lê estados; a igualdade bit a bit da trajetória200Myr com controles históricosA/B da semente2026 também foi verificada.

Os tempos de energia incluem a referência serial adicional quando executada; não devem ser confundidos com o custo recorrente paralelo. Nos12 resultados iniciais20Myr, o campo `precisionAudit.parallelSeconds` foi medido após a referência e inclui serial+paralelo: subtrair `serialSeconds` para obter o primeiro custo paralelo. A partir da matriz200 a marcação foi corrigida. Dados antigos não foram reescritos. A soma serial inicial inclui aquecimento do JIT e não é um benchmark isolado em regime; não se promete um fator universal de aceleração.

| Família | N | Parede total[s] | Passos GPU[s] | Energia[s] | Estrutura[s] | Passos físicos/s, trechoGPU |
|---|---:|---:|---:|---:|---:|---:|
{chr(10).join(performance)}

Linhas representativas da semente2026,200Myr. Há ainda readback, serialização, salvamento e testes de referência; não se deve atribuir toda a parede ao kernel gravitacional. `forceBatch32Seconds` mede32 avaliações de força nas posições inalteradas, com espera pela fila, após inicialização: inclui submissão/sincronização, não é um timestamp exclusivamente de hardware. A integração mede força+KDK+submissão, sem diagnósticos. O ambiente é uma sessão interativa, com custo de tarefas locais concorrentes possível; não é um benchmark de máquina dedicada.

Os pilotos mostraram viabilidade do método direto nas resoluções executadas. Não foi introduzido Barnes–HutGPU ou PM sem necessidade demonstrada. Um método novo exigiria validação de componentes radiais/verticais da força, invariantes e estrutura; os dados atuais validam apenas o método direto. A referência Float64 inicial usa até32 IDs por população de cada ensaio e componentes radial/vertical são auditáveis nos vetores preservados. Arredondamento GPU não desaparece no readbackFloat64. Não há objetivo de preencher VRAM.
'''
docs['MODOS_E_MIGRACAO_1_0_4.md']='''# Modos, anéis e migração1.0.4

São medidos m=1..4 em anéis de0–2,2–4,4–6,6–8,8–10,10–12,12–16,16–20 e20–30kpc. O plano próprio, o plano inicial, a inclinação, o centro, o deslocamento vertical médio e a velocidade normal média são registrados. O ajuste de plano é exclusivamente diagnóstico: nenhuma posição/velocidade é reposicionada na integração.

As coortes mantêm os mesmos IDs e etiquetas físicas ao longo do tempo. Os anéis instantâneos mudam de composição e não podem ser tratados como as mesmas partículas. O CSV de coortes registra contagem, massa, h50 em dois planos, σnormal,σR e R50; o CSV de modos registra amplitudes, fases, ruído condicional e medidas locais. Perfis radiais/verticais e massa encerrada são acompanhados para todas as componentes, incluindo bojo e halo; o perfil vertical padrão integra R<30kpc e não representa sozinho a vizinhança solar.

## Identidade exata de seleção nos extremos

Para I0=IDs do anel inicial e It=IDs do anel final:

Var[vz(t)|It]−Var[vz(0)|I0] = (Var[vz(t)|It]−Var[vz(0)|It]) + (Var[vz(0)|It]−Var[vz(0)|I0]).

O primeiro termo acompanha os IDs da seleção final e muda suas velocidades; o segundo muda apenas a composição inicial. A soma foi verificada numericamente para cada anel/população/realização com dados suficientes. Também é registrada a mudança da coorte inicial inteira e a fração de massa retida. A decomposição é descritiva, no eixo cartesianoz e anéis cilíndricos fixos, ponderada em massa; movimentos coerentes e resposta coletiva podem contribuir para o primeiro termo. Não é uma decomposição causal única em encontros versus ondas. Anéis esparsos têm grande incerteza; contagem não certifica estabilidade.

## Limites da interpretação coletiva

O início antipodal suprime modos ímpares; os testes não podem medir livremente toda instabilidade m=1. A referência RMS combina ruído de pares e limite conservador de partículas independentes. Probabilidades condicionais e comparações múltiplas não são uma descoberta de barra: os testes são temporalmente correlacionados. O Q armazenado usa frequências iniciais e o coeficiente3,36 de disco infinitamente fino sem suavização; não é limiar de estabilidade para este disco espesso, suavizado e multicomponente.

Persistência/coerência de fase e convergência com N são necessárias para sustentar uma interpretação física dos modos. A diferença halo fixo−vivo inclui a resposta do halo; contrastes de resolução e controles contínuos são usados em conjunto. Não foi atribuída uma fração universal do aquecimento a um único mecanismo.

A literatura demonstra dependência do aquecimento espúrio com a massa individual do halo e suas condições locais; ela não fornece um limite de N ou espessamento universal para este experimento. Referência primária: [Ludlow et al.2021](https://arxiv.org/abs/2105.03561).
'''
docs['VALIDACAO_FINAL_1_0_4.md']=f'''# Validação final1.0.4 — experimental

{public}

{domain}

{table}

## Classificações separadas

'''+''.join(f'**{k}:** {v}\n\n'for k,v in classification.items())+f'''## Decisão sobre o horizonte

{decision['explanation']}

{interactionText}

Os dados não foram extrapolados. Não foram usados amortecimento, congelamento de partículas do modelo vivo, reposicionamento, correção de velocidades, ajuste cosmético de espessura ou alteração das massas observacionais. Os campos fixos são controles científicos separados, explicitamente identificados, e não substituem o modelo vivo.

As versões históricas e seus pacotes foram preservados e verificados porSHA256. O novo ZIP é um complemento reproduzível ao projeto preservado; inclui os inputs, fontes e evidências da1.0.4 e os controles históricos específicos que ela referencia. Pacotes históricos completos permanecem separados. A página e o candidato são opt-in experimentais e não substituem automaticamente o padrão histórico.
'''
docs['REPRODUCAO_1_0_4.md']='''# Reprodução1.0.4

## Ambiente e ordem

Node>=20.11 para servidor/testes/análise/build, navegadorWebGPU; Python com AGAMA1.0.161, NumPy, Matplotlib para geração e figuras. Hardware informado: Ryzen7 5700X,16GBRAM,RX7600 8GB. Não é necessário instalar dependências no navegador para inspecionar snapshots.

Execute em cópia do projeto/pacote. Os geradores e coletor recusam reescrever resultados concluídos; não apague evidências originais. `preservation.json` e `preserved-v1.0.3/` guardam a linha de base, com verificação dos arquivos históricos. Para repetir fisicamente, use uma nova pasta de saída/versionamento e preserve os scripts originais porhash.

1. `node scripts/refinement-104/preserve.mjs` antes de alterações, uma única vez; `--verify` confirma os históricos.
2. `node scripts/refinement-104/prepare.mjs`: combina exatamente as populações selecionadas1.0.3. O pacote inclui os pais necessários e seus manifestos. `prepare-higher.py` amostra somente populações refinadas da mesma DF/potencial1.0.2; veja os argumentos e checks de admissibilidade.
3. `node scripts/refinement-104/controls.mjs` verifica as12 referências preservadas; `ic-audit.py` e `native-df.py` produzem auditorias independentes sem alterar a física.
4. `node scripts/refinement-104/identity.mjs` preserva a identidade das fontes antes da execução. Não altere módulos de física durante uma etapa em execução. O arquivo code-identity final pode apontar uma época posterior; todas as épocas efetivamente executadas permanecem em executed-source.
5. `node scripts/serve.mjs` serve a raiz na porta4180. `node scripts/refinement-104/collector.mjs` coleta somente de origem local4180 para loopback4186. Abra `tests/browser-refinement-104.html?stage=factorial20` e use o botão. O coletor só aceita IDs registrados, hashes/configurações compatíveis e resultados completos; checkpoints parciais ficam separados.
6. Após inspecionar20, `advance.mjs` registra200. Os registros posteriores e a decisão quantitativa documentam a seleção antes de pilotos/horizontes adicionais. O manifesto entregue contém todos os estágios efetivamente concluídos; escolha o nome em `?stage=...` para reproduzir uma etapa. Resultados existentes são reconhecidos, sem nova integração; isso é retomada de resultados completos, não continuação automática de checkpoints parciais.
7. `node scripts/refinement-104/analyze.mjs`, `collective.mjs`, `migration.mjs`, `force-audit.mjs`; Python `field-audit.py`, `plot.py` e `report.py`. Figuras usam somente dados completos; CSV de pontos e hashes acompanhamPNG/SVG. O arquivo de decisão científica não é gerado a partir de um limiar universal de espessamento.
8. `node scripts/test.mjs`; `node scripts/refinement-104/audit.mjs`; Python `package.py`; `node scripts/build.mjs`. Auditoria verifica inputs, massas, fontes executadas, controles, figuras, energia em processo independente e históricos. O ZIP tem CRC eSHA256 de todas as entradas, além doSHA256 do arquivo inteiro.

## Conteúdo e unidades

Cada execução tem41 amostras nos ensaios principais20/200,21 nos refinamentos200 e11 nos pilotos de custo20. Estados completos0/fim, constantes porpartícula, tempos e fontes ficam nosJSONbrutos. Checkpoints mais recentes permanecem no projeto; o pacote pode incluir manifesto de hashes dos parciais em vez de duplicá-los. As trajetórias nativas f(J) guardam41 estados da subamostra original e não são realizações N-corpos autogravitantes. Dados reutilizados1.0.3 são identificados e não contam como execuções novas.

Unidades dos arrays: kpc,Myr,1e10Msun, velocidadeskpc/Myr. CSV de dispersões usa km/s; variâncias(km/s)². Densidades indicam medida geométrica no eixo/arquivo; massas encerradasMsun. Não confunda massa total do halo com massa dentro de um raio,σz comσ perpendicular, ou velocidade circular com componente azimutal da amostra.
'''
docs['REFINAMENTO_COMBINADO_1_0_4.md']+='\n## Consistência entre observáveis\n\nD melhora h50 do fino diante deB nas três sementes, com diferenças−5,5352;−3,3791;−0,3400p.p. A diferença das mudanças de variância vertical D−B foi+34,6295;−8,0074;−65,1761(km/s)²: a melhora cinemática não foi uniforme. O espesso também não melhora uniformemente entreB/D, e os refinamentos adicionais não corrigem todas as componentes. Portanto não se promove o sistema usando apenas a mediana de altura mais favorável.\n'
mechanisms=read('mechanism-contrasts.json');docs['REFINAMENTO_COMBINADO_1_0_4.md']+='\n## Contrastes de mecanismos nas mesmas fases\n\n| Família | Δσz² vivo−halo fixo [(km/s)²] | Δσz² halo fixo−campo total fixo [(km/s)²] |\n|---|---:|---:|\n'+'\n'.join(f"|{g['family']}|{g['metrics']['liveMinusFixedVariance']['mean']:.4f} ±{g['metrics']['liveMinusFixedVariance']['sd']:.4f}|{g['metrics']['fixedMinusContinuousVariance']['mean']:.4f} ±{g['metrics']['fixedMinusContinuousVariance']['sd']:.4f}|"for g in mechanisms['groups'])+'\n\nAs diferenças telescopam algebricamente, mas não são frações causais independentes de encontros: também mudam a resposta dinâmica do halo e a autogravidade/modos dos bárions. Os valores individuais e fontes estão em mechanism-contrasts.json/CSV. A resoluçãoE conserva exatamente os mesmos bárions D; G possui novos controles contínuos dedicados.\n'
docs['CONDICOES_INICIAIS_1_0_4.md']+='\nNo perfil médio físico preservado, as medianas|z| solares são0,199991620kpc (fino) e0,595268891kpc (espesso), contra alvos prévios0,207944154 e0,623832463kpc. A convergência da iteração não impõe igualdade exata com o perfil exponencial de referência. Esses valores de campo médio solar não são as medianas globais das partículas nas tabelas.\n'
docs['CONVERGENCIA_1_0_4.md']+='\nA convergência emN aε fixo refere-se ao limite contínuo deste modelo suavizado. Ela não demonstra o limiteε→0, um ajuste observacional exato ou a estacionariedade da Via Láctea real.\n'
docs['CONVERGENCIA_1_0_4.md']+='\n## Controles contínuos novos das fases G\n\nForam integradas as mesmas16.638 partículas bariônicas de cada realização G em um campo Plummer total fixo, AGAMA DOP853 Float64,200Myr,41 estados completos. O crescimento de h50 do fino foi '+', '.join(f"{r['seed']}: {r['thinGrowth']:.6f}%"for r in nativeG['rows'])+f". Média{np.mean([r['thinGrowth']for r in nativeG['rows']]):.6f}% eSD{np.std([r['thinGrowth']for r in nativeG['rows']],ddof=1):.6f}p.p. O controle evidencia oscilações/limites de preparação e amostra; sua diferença para G vivo também contém toda a resposta autogravitante. Não é um estimador puro de encontros. Fontes/trajectórias e análises estão em reports/v1.0.4/continuous-g/.\n\n"+temporalText+'\n'
docs['REPRODUCAO_1_0_4.md']+='\nOs controles contínuos novos G são preparados por continuous-g.py e analisados por analyze-continuous-g.mjs. Usam todos os mesmos bárions, input quantizado e41 estados0–200Myr, com fonte eJSONL identificados porSHA256. Estes três controles são distintos das três auditorias subamostradas native-df.py e dos12 controles históricos reutilizados.\n'
for name,text in docs.items():
 text=polish(text)
 text=re.sub(r'(?<=\d)(Myr|Gyr|kpc|Msun|GB|M☉)',r' \1',text)
 for a,b in [('de200','de 200'),('de100','de 100'),('em200','em 200'),('em20','em 20'),('em1.0.','em 1.0.'),('da1.0.','da 1.0.'),('a1.0.','a 1.0.'),('Float64','Float64'),('eSD',' e SD'),('Média1','Média 1'),('Partículas','partículas')]:text=text.replace(a,b)
 (ROOT/name).write_text(text,encoding='utf8')
(BASE/'report-manifest.json').write_text(json.dumps({'documents':list(docs),'figures':len(figures),'UTC':assessment['UTC']},indent=2)+'\n',encoding='utf8');print('Generated',len(docs),'scientific documents and assessment')


