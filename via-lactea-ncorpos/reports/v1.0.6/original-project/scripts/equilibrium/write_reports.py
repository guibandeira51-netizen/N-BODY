"""Write the final qualification and comparison from preserved measurements."""
from pathlib import Path
import json,csv

root=Path(__file__).resolve().parents[2];out=root/'reports/v1.0.0'
load=lambda p:json.loads(p.read_text(encoding='utf8'))
a=load(out/'assessment.json');rows=a['rows'];fmt=lambda x,n=4:'—' if x is None else f'{x:.{n}f}'
last=[r for r in rows if r['time_Myr']==max(x['time_Myr'] for x in rows if x['run']==r['run'])]
table='| Ensaio | N | t [Myr] | h50(0) [kpc] | h50(t) [kpc] | Δh50 [%] | σn(t) [km/s] | Δσn [%] |\n|---|---:|---:|---:|---:|---:|---:|---:|\n'
for r in last:
 s=next(x for x in rows if x['run']==r['run'] and x['time_Myr']==0)
 table+=f"| {r['run']} | {r['n']} | {r['time_Myr']} | {fmt(s['h50_instant_kpc'])} | {fmt(r['h50_instant_kpc'])} | {fmt(r['h50_instant_change_percent'],2)} | {fmt(r['sigma_normal_kpc_Myr']/.001022712165,2)} | {fmt(r['sigma_normal_change_percent'],2)} |\n"
dataset_text=''
for key,d in a['datasets'].items():
 dataset_text+=f"\n### {key}\n\nModelo `{d['modelId']}`. Convergência da iteração: {d['iterationConverged']}; maior variação final de força = {fmt(100*d['lastForceChange'],5)}%. Massa total finita do halo = {d['finiteHaloTotalMsun']:.9e} M☉.\n\n"
 if 'measuredSolarMedianAbsZKpc' in d:dataset_text+=f"Medianas solares de |z| do modelo contínuo final (fino/espesso): {', '.join(fmt(x,6) for x in d['measuredSolarMedianAbsZKpc'])} kpc; alvos exponenciais de referência: {', '.join(fmt(x,6) for x in d['referenceExponentialSolarMedianAbsZKpc'])} kpc. São medidas em Rsolar, distintas da mediana global da mistura de discos.\n\n"
 if 'absRelativePoissonResidualPercentiles' in d:dataset_text+=f"Módulo do resíduo relativo de Poisson contra integrais independentes da DF: mediana/p90/máximo = {', '.join(fmt(100*x,4)+'%' for x in d['absRelativePoissonResidualPercentiles'])}. Foram sondados 32 pontos meridionais, não todo o espaço de fases.\n\n"
 if 'fAlongOrbitChecks' in d:
  probes=[x for x in d['fAlongOrbitChecks'] if x['timeMyr']==1000]
  dataset_text+='Variação de f(J) em órbitas reais no campo congelado, 128 órbitas independentes por subpopulação e semente (|Δln f|; p50/p90/p99/máx):\n\n| Semente | Subpopulação | Quantis | Valores inválidos |\n|---|---:|---|---:|\n'
  for x in probes:dataset_text+=f"| {x['seed']} | {x['subpopulation']} | {' / '.join(fmt(v,5) for v in x['absLogFChangeQuantiles50_90_99_Max'])} | {x['invalidOrNonpositiveF']} |\n"
  dataset_text+='\nAs caudas não nulas limitam a estacionariedade da DF com ações aproximadas. Uma pequena mediana não elimina órbitas com desvios grandes.\n'
frozen='| Modelo | Semente | t [Myr] | h50 [kpc] | Δh50 [%] | Δσn [%] | Erro orbital E |\n|---|---:|---:|---:|---:|---:|---:|\n'
for c in a['frozenContinuumControls']:
 for s in c['epochs']:
  if s['timeMyr']==1000:frozen+=f"| {c['dataset']} | {c['snapshot'].split('-s')[-1].split('-')[0]} | {s['timeMyr']} | {fmt(s['h50'])} | {fmt(s['h50ChangePercent'],3)} | {fmt(s['sigmaChangePercent'],3)} | {s['orbitalEnergyRelativeError']:.3e} |\n"
validation=f'''# Validação de equilíbrio — versão 1.0.0-rc.1

**Classificação: candidato não validado para equilíbrio N-corpos de longa duração.** {a['completedRuns']}/{a['plannedRuns']} ensaios do protocolo estão preservados e completos. Estado mecânico da campanha: `{a['status']}`. A conclusão é sobre o modelo testado; não é uma prova independente de matéria escura.

## Critérios e resultado

A admissibilidade inicial exige massas coerentes, coordenadas finitas, f não negativa nos pontos sorteados e partículas ligadas no campo de preparação. Essas verificações são necessárias e amostrais. A compatibilidade contínua é examinada por iterações de potencial, densidade integrada da DF, equação de Poisson em pontos independentes e constância de f(J) ao longo de órbitas. A estabilidade estrutural requer a evolução temporal e robustez às sementes, N, dt, ε e algoritmo/precisão. Não existe limite universal de 5% ou 10% que aprove um disco.

O modelo não foi promovido: há evolução estrutural e dependência da discretização, além de resíduos do campo/DF e diferença entre o potencial Newtoniano de preparação e o Plummer evoluído. Uma comparação curta CPU/GPU não estabelece convergência Float64 em 1 Gyr. Testes de software não equivalem a testes de equilíbrio físico.

## Medições N-corpos efetivamente concluídas

h50 é a mediana de distância absoluta ao plano geométrico instantâneo do disco, ponderada por massa. σn é a dispersão de velocidade normal ao mesmo plano. h50 fixo, inclinação, centro, flare, warp, dispersões cilíndricas e coortes estão nas séries brutas e tabelas. As linhas de 200 e 1.000 Myr têm durações diferentes: compare épocas iguais em summary.csv/series.csv.

{table}
As massas físicas das componentes são mantidas ao variar Nh. A comparação de 0.9 com AGAMA altera também massas e perfis; sua diferença não mede exclusivamente o inicializador. O primeiro candidato AGAMA começou mais espesso. Crescimento percentual menor pode coexistir com espessura final absoluta maior.

## Auditoria contínua e perfis
{dataset_text}
Os perfis radiais e verticais completos, massas esféricas encerradas, densidades superficiais, momentos e frequências próprias estão em cada pasta do modelo. As figuras initial-model e scm-convergence apresentam o campo e a cinemática efetivamente obtidos. Refinar a expansão do potencial a densidade fixa é um teste diferente de recalcular todos os momentos da DF em malhas mais finas; este último não foi estabelecido em toda a configuração.

## Controle no potencial total congelado

{frozen}
São órbitas DOP853 Float64 no campo contínuo total congelado: energia orbital Σm(v²/2+Φ), sem o fator 1/2 de autogravitação. Não têm retroação ou granulação e não substituem um N-corpos livre.

## Força, energia e controles

A evolução livre usa o KDK e a força direta WebGPU f32 originais. A energia nos ensaios longos é calculada por Barnes–Hut θ=0,5 e explicitamente aproximada; a energia de pares usa Plummer e exclui autointeração. Com halo fixo a energia externa é ΣmΦhalo uma única vez; o halo é retirado da lista de partículas para evitar massa duplicada. Somente Lz permanece protegido pela simetria axisimétrica do campo externo; P e os outros componentes de L não são invariantes gerais nesse controle.

O halo fixo provém da densidade final convergida, não do NFW esférico inicial: o achatamento final é preservado. Sua interpolação Hermite deriva força e potencial do mesmo escalar. O ensaio testa simultaneamente ausência de granulação, ausência de resposta e campo externo Newtoniano sem suavização. Não permite atribuir toda a diferença à massa individual de macro partículas. O controle NFW esférico da 0.9 permanece documentado separadamente.

backend-checks.json e backend-checks-calibrated.json contêm forças e evolução curta CPU/GPU nos mesmos estados. Cada ensaio livre registra o erro de força em 128 alvos contra soma direta f64 e Barnes–Hut θ=0,5/0,25. Os ensaios de dt/2 e ε/2,2ε usam o mesmo snapshot; variar ε muda o Hamiltoniano. As sementes têm pares antipodais e N/2 sorteios independentes, que suprimem inicialmente modos ímpares. A amplitude m=2 mede não axisimetria; sua existência isolada não identifica uma barra persistente ou velocidade de padrão.

## Arquivos e integridade

artifact-audit.json confere hashes, somas de massa, positividade amostral, potencial, identidades estelares entre resoluções do halo e preservação das forças/KDK/renderização históricas. state-export-audit.json recalcula espessuras, dispersões, raios e migração a partir dos estados GPU serializados da campanha calibrada. A campanha inicial sem calibração preserva séries e estados iniciais; não foram inventados estados finais que não foram capturados. A ausência desses arrays antigos está declarada no pacote de estados.

O pacote principal `equilibrio-1.0.0.zip` contém modelos, perfis, tabelas, fontes e documentação. O complementar `ensaios-1.0.0.zip` contém os JSON integrais dos ensaios, inclusive os estados capturados. Extraia os dois na mesma raiz; ENSAIOS_BRUTOS.json registra o hash do complementar. `tabelas-1.0.0.zip` e `estados-1.0.0.zip` oferecem as mesmas medições e estados em CSV para análise externa. O ZIP completo do projeto já reúne esses conteúdos. Cada arquivo comprimido possui verificação de integridade na entrega.

A suíte JavaScript registrou 80 testes aprovados, sem falhas. Os quatro testes oficiais executados da biblioteca AGAMA (coordenadas, ações, órbitas e modelo autoconsistente) também passaram. Os logs preservam essas verificações. Essa aprovação é de software e propriedades numéricas específicas; a classificação física acima permanece não validada.

attempts.json e environment-restart.json registram falhas reais de instalação, revisão de amostragem e interrupção do ambiente. Apenas registros completed até a duração especificada entram nas tabelas acima. Versões, sementes e código executado ficam preservados; arredondamento e dependência de compilador/hardware impedem promessa de reprodução bit a bit em qualquer máquina.

## Reprodução complementar

Depois da preparação descrita em CONDICOES_INICIAIS_1_0.md, para cada pasta `agama` e `agama-calibrated`:

```text
python scripts/equilibrium/prepare_controls.py --out reports/v1.0.0/agama-calibrated --threads 4
python scripts/equilibrium/validate_profiles.py --out reports/v1.0.0/agama-calibrated
python scripts/equilibrium/check_df_consistency.py --out reports/v1.0.0/agama-calibrated
node scripts/equilibrium/analyze-frozen.mjs reports/v1.0.0/agama-calibrated
node scripts/serve.mjs
node scripts/equilibrium/collector.mjs
```

O coletor é um processo local opcional de pesquisa em 127.0.0.1:4181, com origens e IDs limitados. No navegador de localhost:4180, abra tests/browser-equilibrium-batch-v1.html (protocolo original) e tests/browser-equilibrium-batch-calibrated-v1.html (calibrado). Cada botão inicia evolução real e os resultados completos podem ser baixados; a campanha calibrada também grava pelo coletor. O arquivo de retomada começa no índice 7 porque sete ensaios originais já estavam preservados. Para a pequena realização usada nas comparações de backend, acrescente `--counts 150 450 400 --reuse-prepared` ao gerador, com o --config correspondente. O controle de backend é executado pelos botões das páginas browser-equilibrium-backends[-calibrated]-v1.html.

```text
python scripts/equilibrium/audit_artifacts.py
node scripts/equilibrium/audit_states.mjs
python scripts/equilibrium/summarize_results.py
python scripts/equilibrium/export_tables.py
python scripts/equilibrium/write_reports.py
node scripts/test.mjs
node scripts/build.mjs
```

Para repetir historicamente cada etapa, use as fontes em executed-source-* e seus hashes; o gerador entregue passou a conter retomada por checkpoint e outras verificações posteriores. Os snapshots exportados são a referência exata para repetir a evolução sem recompilar o AGAMA.

## Próximas investigações científicas justificadas

Priorizar convergência da malha de densidade/DF e exame das caudas de Δln f; construir preparação compatível com suavização ou quantificar a transição Newtoniano–Plummer; obter convergência de resolução sobretudo do halo nas regiões do disco; ampliar a comparação temporal f64 e sementes antes de atribuir barras, aquecimento ou expansão à física coletiva. Não corrigir o movimento durante a evolução para obter uma aparência estável.
'''
(root/'VALIDACAO_EQUILIBRIO_1_0.md').write_text(validation,encoding='utf8')
comparison=f'''# Comparação 0.9 / 1.0 — condições iniciais e resposta dinâmica

O avanço implementado é a preparação por DFs reais, a auditoria observacional e a campanha reproduzível. **A realização 1.0 permanece não validada para estabilidade N-corpos de longa duração.** A mudança de método não garante uma galáxia em equilíbrio discreto.

| Propriedade | Referência 0.9 | Candidatos AGAMA 1.0 |
|---|---|---|
| Bojo | Hernquist; 5,0e9 M☉ | Cautun esferizado e DF QuasiSpherical; 9,2e9 M☉ |
| Disco estelar | Miyamoto–Nagai; 6,8e10 M☉ | duas DFs QuasiIsothermal; 3,98e10 + 1,07e10 M☉ |
| Halo finito total | ~9,763e11 M☉ | ~1,049129e12 M☉; MDM inicial(<207 kpc)=8,2e11 M☉ |
| Distribuição de velocidades | momentos Jeans/Satoh e aproximações Gaussianas | amostragem de f(J), densidades e potencial iterados |
| Perfil vertical | definido pela densidade MN | obtido da DF; controle Hdisk direto e candidato calibrado por mediana inicial |
| Evolução | KDK, Plummer, CPU f64/GPU f32 | mesmos motores; campo externo do novo controle deriva da densidade final |
| Gás/hidrodinâmica | ausentes | ausentes; massa omitida quantificada sem transferi-la às estrelas |

O novo disco não é matematicamente equivalente a Miyamoto–Nagai. A família QuasiIsothermal foi escolhida para gerar um disco rotacional com anisotropia e dispersões ligadas às ações; não se demonstrou uma DF exata para a densidade MN legada. Os dois modelos físicos ficam separados.

## Resultados medidos

{table}
Esta tabela não torna épocas diferentes comparáveis. Os arquivos summary.csv e series.csv permitem comparar 20 e 200 Myr em todos os casos e 1.000 Myr onde o protocolo realmente foi estendido. Espessuras iniciais, massas e perfis mudam entre legado, primeiro candidato e candidato calibrado. Não atribuímos qualquer diferença global exclusivamente ao gerador de velocidades.

## Comparações que isolam parte do problema

Refinamento Nh conserva massa total e exatamente as partículas estelares dentro de cada conjunto. A semente do halo varia separadamente. Alterações de dt e ε partem do mesmo snapshot. O contraste Gaussiano preserva posições e massas do candidato e troca a forma/correlação local das velocidades; usa 64 pares vizinhos e covariância completa, e não deve ser chamado de implementação GALIC ou do inicializador Jeans legado. Partículas Gaussianas não ligadas são registradas sem recorte e não admitidas como candidato de equilíbrio.

Halo fixo versus vivo altera resposta, ruído e suavização do campo, logo não separa um único mecanismo. O controle de campo total congelado elimina também toda autogravitação variável e é apresentado como ensaio orbital. O teste curto de precisão/algoritmo registra diferenças reais, mas não estabelece convergência secular em f64. Esses limites continuam presentes mesmo quando a energia aproximada parece bem conservada.

O resultado original de 50.000 partículas até 2.540,4 Myr e os 25 ensaios da investigação 0.9 permanecem em VALIDACAO_09.md e nos pacotes históricos, preservados por hash. A reprodução legacy-10k desta campanha recupera o crescimento de espessura observado em 1.000 Myr. Não se reescreveram esses registros sob o rótulo 1.0.

## Decisão

O simulador histórico permanece na página inicial. A nova página expõe os snapshots como **experimentos de candidatos**, com qualificação explícita e downloads. Nenhuma realização é promovida automaticamente a equilíbrio validado. Ver VALIDACAO_EQUILIBRIO_1_0.md para resíduos contínuos, limites da campanha e próximos testes necessários.
'''
(root/'COMPARACAO_09_10.md').write_text(comparison,encoding='utf8')
print({'written':['VALIDACAO_EQUILIBRIO_1_0.md','COMPARACAO_09_10.md'],'completedRuns':a['completedRuns']})
