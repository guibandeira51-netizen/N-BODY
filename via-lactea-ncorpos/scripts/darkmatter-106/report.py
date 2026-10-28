"""Generate the six requested scientific reports from measured artifacts."""
from model import *
import platform,scipy,matplotlib,datetime
if __name__=='__main__':
 m=json.loads((OUT/'model.json').read_text());c=json.loads((OUT/'comparison.json').read_text());o=json.loads((OUT/'orbits.json').read_text());v=json.loads((OUT/'validation.json').read_text());inv=json.loads((OUT/'graph-inventory.json').read_text());q=json.loads((OUT/'mass-quadrature.json').read_text());ident=json.loads((OUT/'code-identity.json').read_text());rot=list(csv.DictReader((OUT/'rotation.csv').open()));solar=min(rot,key=lambda r:abs(float(r['R_kpc'])-8.122));b,h=c['models'];orbitmax=max(r['summary']['maxSampledRelativeEnergyError']for r in o['runs']);lzmax=max(r['summary']['maxRelativeLzError']for r in o['runs']);tight=max(r['summary']['maxPositionDifferenceTighterDOP853Kpc']for r in o['runs']);notes='''
## Hipóteses comuns e limites

O campo 106 é newtoniano, estacionário, axisimétrico e simétrico por reflexão; o sistema é isolado. Gás frio e meio circumgaláctico (CGM) não estão implementados nesta representação. Suas massas não foram somadas às estrelas. O bojo é uma aproximação esférica, os discos são achatados e o halo tem massa finita. Não é uma reprodução completa do ajuste publicado de Cautun nem um novo ajuste da Via Láctea.

Comprimento: kpc; velocidades: km/s; massas: massas solares; potencial e energia específica: (km/s)²; aceleração: (km/s)²/kpc; momento angular específico: kpc km/s. O conversor temporal registrado é 1 km/s = 0,0010227121650537077 kpc/Myr. A biblioteca AGAMA usa tempo em kpc/(km/s). Phi(infinito)=0 para cada potencial; as energias iniciais são diferentes ao retirar o halo, mesmo mantendo posição e velocidade idênticas.

As partículas-teste de 106 não interagem entre si. Sua evolução por 1200 Myr não é um teste de estabilidade autogravitante por 1,2 Gyr. As campanhas históricas mantêm suas massas, sementes, força Plummer e estados científicos originais. A família F105 tem 169546 partículas totais, das quais 160000 no halo. O legacy de 80000 partículas totais/Jeans+Satoh e 1,51 Gyr é outro experimento.

Os dados observacionais são velocidades circulares inferidas por modelagem de Jeans de uma população, e não velocidades azimutais individuais. A assimetria dos erros estatísticos é preservada. Eilers e a tabela de Jiao são o mesmo conjunto, nunca somados como duas amostras independentes. Os parâmetros históricos baseados em Cautun já utilizaram restrições relacionadas à curva de Eilers: esta comparação é de consistência, sem interpretação como teste inteiramente independente ou descoberta da matéria escura.

Não foram calculados p-valores, significâncias em sigma, evidências Bayesianas ou uma medida universal de necessidade do halo. As conclusões são condicionais aos perfis, massas, simetrias, omissões bariônicas e erros adotados. Também não determinam a natureza microscópica da matéria escura.

## Fontes primárias

- Eilers et al. (2019), DOI10.3847/1538-4357/aaf648: https://arxiv.org/abs/1810.09466 — Tabela1, páginas8–9 do PDF. Curva inferida com APOGEE, WISE, 2MASS e Gaia DR2, não Gaia DR3.
- Jiao et al. (2021), DOI10.1051/0004-6361/202141058: https://arxiv.org/abs/2107.00014 — TabelaA.1, página10; sistemáticas e escala comum discutidas na seção2.1. DOI editorial: https://doi.org/10.1051/0004-6361/202141058 .
- Cautun et al. (2020), DOI10.1093/mnras/staa1017: https://arxiv.org/abs/1911.04557 — origem dos parâmetros históricos reduzidos, coluna NFW sem contração; não um ajuste novo desta entrega.
- Vasiliev (2019), AGAMA: https://arxiv.org/abs/1802.08239 — expansão de potenciais e integração orbital; o uso da biblioteca não certifica o equilíbrio das realizações.
'''
 modeltable='| Componente | Massa adotada [M☉] | Normalização da grade |\n|---|---:|---:|\n'+'\n'.join(f'| {name} | {mass:.9g} | {norm:.12g} |'for name,mass,norm in zip(['Bojo','Disco fino','Disco espesso','Halo'],m['componentMassesMsun'],m['numericalMassNormalization']))
 orbitrows='| Caso | Campo | r mínimo/máximo registrado [kpc] | Período azimutal [Myr] | Erro E amostrado |\n|---|---|---:|---:|---:|\n'+'\n'.join(f"| {r['id']} | {r['field']} | {r['summary']['sampledRminKpc']:.4f} / {r['summary']['sampledRmaxKpc']:.4f} | {r['summary']['measuredMeanAzimuthPeriodMyr'] if r['summary']['measuredMeanAzimuthPeriodMyr'] is not None else 'não medido'} | {r['summary']['maxSampledRelativeEnergyError']:.4g} |"for r in o['runs'])
 scoretable='| Modelo | RMS [km/s] | Q estatístico diagonal | Q com sistemática diagonal | Q no cenário correlacionado |\n|---|---:|---:|---:|---:|\n'+'\n'.join(f"| {x['field']} | {x['rmsResidualKmS']:.8f} | {x['QStatisticalDiagonal']:.8f} | {x['QStatPlusJiaoDiagonal']:.8f} | {x['QWithAssumedCommon2PercentCovariance']:.8f} |"for x in c['models'])
 docs={
 'MATERIA_ESCURA_VIA_LACTEA_1_0_6.md':f'''# Matéria escura na Via Láctea — versão1.0.6

## Pergunta e desenho experimental

Como adicionar um halo ao mesmo bojo e discos altera força, velocidade circular, massa encerrada e órbitas? A página principal apresenta cinco figuras astrofísicas; a página de validação, duas. O arquivo científico reúne83 gráficos históricos sob consulta, com classificação por tema e finalidade. Nenhuma campanha N-corpos anterior foi repetida.

ExperimentoA: retirada controlada da contribuição gravitacional do halo, sem reajuste das massas bariônicas. ExperimentoB: cinco vetores iniciais idênticos nos dois campos, dez trajetórias reais. ExperimentoC:38 pontos observacionais publicados confrontados com dois modelos fixos. ExperimentoD: reanálise da auditoria inicial E104, força direta Plummer versus campo contínuo Plummer correspondente; nenhuma nova evolução viva.

## Resultado quantitativo

Resíduo RMS nos mesmos38 pontos: {b['rmsResidualKmS']:.6f} km/s para bárions e {h['rmsResidualKmS']:.6f} km/s com halo. A inclusão do halo reduz os resíduos neste modelo, sem provar ajuste estatístico completo ou inferência independente da calibração histórica. Em R=8,122 kpc, vc bariônica={float(solar['baryons_km_s']):.6f} km/s, vc total={float(solar['total_km_s']):.6f} km/s e diferença={float(solar['delta_v_km_s']):.6f} km/s.

{modeltable}

## Sete figuras da exposição

1. Curva de rotação: observações e modelos.
2. Contribuições gravitacionais do mesmo modelo.
3. Resíduos: onde cada modelo se afasta dos dados.
4. Massa acumulada e fração de matéria escura.
5. Mesma partícula-teste em dois campos gravitacionais.
6. Estabilidade estrutural: avanço e limite medido.
7. Conservação de energia nos ensaios F105.

`reports/v1.0.6/figures/manifest.json` liga cada figura a CSV, SVG, PNG, entradas e hashes. O relatório de inventário justifica a retirada dos demais gráficos da exposição, sem removê-los do projeto. As diferenças entre os campos são consequências da hipótese gravitacional adotada, não observações independentes.
''',
 'CURVAS_ROTACAO_1_0_6.md':f'''# Curvas de rotação1.0.6

## Equação e decomposição

vc²(R)=R dPhi(R,0)/dR=−R aR(R,0). Para a mesma decomposição axisimétrica, vc_total²=vc_bojo²+vc_fino²+vc_espesso²+vc_halo². Os discos são calculados por expansões cilíndricas de sua densidade achatada, sem substituir sua força por GM_esférica(<R)/R. A velocidade azimutal média de um disco quente pode diferir de vc.

O modelo106 é uma representação newtoniana suave nova das grades físicas preservadas em `reports/v1.0.2/corrected/density-*-final.ini`, com as mesmas massas de ação atribuídas às partículas. Seus campos, curvas e órbitas são novos; as campanhas Plummer históricas não foram reclassificadas.

{modeltable}

## Reconstrução numérica da densidade

O teste de monotonicidade encontrou pequenas massas negativas na interpolação angular das grades históricas, além do ruído da rotina genérica de massa encerrada. A definição106 é explícita: rho106_i = M_i max(rho_grid_i,0) / integral max(rho_grid_i,0)dV. As massas físicas M_i permanecem fixas. Não há ajuste à curva observada, amortecimento de órbitas ou correção de partículas vivas. A tentativa com a grade assinada e seus resultados foi preservada em `attempts/signed-density/`.

Maior fração de massa negativa interpolada antes da reconstrução: {max(x['negativeMassFractionOfPositive']for x in q['checks']):.9g}. A normalização usa integral esférica até10000kpc, com quadraturas24×96 e32×160; maior diferença relativa={max(x['maxQuadratureRelativeDifference']for x in q['checks']):.9g}. `mass-quadrature.json` registra todos os números. Isso corrige uma representação numérica de densidade, sem alterar resultados históricos ou produzir estabilidade artificial.

## Massa em esfera e verificações

M_i(<r)=4pi integral_0^r s²ds integral_0^1 rho_i(s sqrt(1−mu²),0,s mu)dmu, usando simetria por reflexão. Essa mesma esfera define bojo, discos, halo e f_DM=M_halo/M_total. Cascas de densidade não negativa dão uma massa acumulada monótona sem filtro cumulativo. A massa em esfera não é a massa em cilindro e não é usada para substituir a força dos discos.

Máxima diferença entre força e derivada numérica do potencial nos probes: {max(x['relativeDifference']for x in m['gradientChecks']):.9g}. Máxima mudança de força radial com expansão mais fina em5–25kpc: {max(x['maxRadialForceRelativeGridRefinement5to25']for x in m['gridChecks']):.9g}. Malhas, potenciais INI e hashes estão em `model.json`. Comparações com os campos Newtoniano e Plummer preservados também estão registradas. Esses são testes de representação do campo, não certificados de equilíbrio dinâmico.

`rotation.csv` contém todas as contribuições, delta_v, diferença percentual relativa ao caso bariônico e acelerações. `enclosed-mass.csv` contém massas esféricas e fração do halo. Não foi calculada faixa de confiança dos modelos: as marginais publicadas não fornecem sozinhas uma distribuição conjunta legítima.
''',
 'COMPARACAO_OBSERVACIONAL_1_0_6.md':f'''# Comparação observacional1.0.6

## Dados e seleção

Foram extraídos os38 pontos de5,27–24,82kpc da Tabela1 de Eilers2019, páginas8–9 do PDF. Todos os152 valores de raio, velocidade e erros estatísticos coincidem exatamente, na precisão decimal publicada, com a TabelaA.1 de Jiao2021, página10. A última acrescenta uma sistemática fracionária. Os dois artigos não constituem duas amostras independentes. Os dados numéricos, tabelas e hashes dos PDFs consultados estão em `observations/`; as fontes oficiais são citadas abaixo. Não se redistribuem artigos completos no pacote106: incluem-se os fatos numéricos e referências exatas aos documentos.

Não foram inventados pontos, suavizada a curva medida ou suposta rotação perfeitamente horizontal. Não se acrescentou um conjunto Gaia DR3 com metodologia diferente. As incertezas estatísticas assimétricas são mantidas nos dados e nas barras da figura1.

## Resíduos e escores

res_i=v_obs_i−v_model_i. RMS=sqrt(mean(res_i²)). Para o diagnóstico Q, sigma_stat_i=(sigma_minus_i+sigma_plus_i)/2. Q_stat=sum(res²/sigma_stat²). O cenário diagonal adicional usa D_ii=sigma_stat²+(frac_Jiao*vobs)², uma combinação em quadratura explicitamente adotada aqui. O cenário correlacionado usa C=D+u u^T, u_i=0,02vobs_i, motivado pela escala comum discutida por Jiao. Esta covariância é uma hipótese de sensibilidade; não uma matriz medida ou a única combinação correta das sistemáticas.

{scoretable}

## O que se pode inferir

Nenhum parâmetro foi ajustado aqui: massas, perfis e origem histórica são iguais para os dois casos, retirando somente o halo. Se todos os erros fossem Gaussianos independentes e as previsões fixas externas,38 seria o número nominal de graus de liberdade. A covariância não foi fornecida, as sistemáticas são modeladas e os parâmetros históricos já usaram restrições relacionadas à curva de Eilers. Por isso não reportamos chi-quadrado reduzido como probabilidade calibrada, p-valores ou significância definitiva.

O halo reduz fortemente os resíduos deste modelo reduzido. Isso não demonstra que o modelo com halo descreve todos os pontos dentro das incertezas, que um ajuste bariônico plausível foi excluído em todas as famílias ou que a natureza da matéria escura foi determinada. Gás e CGM estão ausentes. Um ajuste bariônico com restrições físicas, uma nova parametrização de densidade ou um ajuste de halo seriam experimentos separados, com parâmetros livres e calibração próprios. Não foi realizado um ajuste livre de halo para competir com bárions arbitrariamente fixos.
''',
 'ORBITAS_COM_SEM_HALO_1_0_6.md':f'''# Órbitas com e sem halo1.0.6

## Protocolo

Equações: dx/dt=v e dv/dt=−gradPhi. Cinco vetores iniciais: órbitas no plano em5,8,122,15 e22kpc e uma órbita inclinada iniciada em8,122kpc. No plano, v_phi inicial=0,9vc_total(R); a velocidade NÃO é recalculada para o campo sem halo. A órbita inclinada acrescenta z=0,3kpc, v_R=12km/s e v_z=18km/s. Os vetores completos e hashes dos quatro potenciais estão em `orbit-protocol.json`.

São dez trajetórias DOP853 Float64 até1200Myr, amostradas a cada1Myr, com accuracy1e-10. Todas foram repetidas em accuracy1e-12 e confrontadas com KDK independente dt0,05 e0,025Myr. Não é um experimento N-corpos nem uma continuação viva de F105. A versão106 não realizou nova campanha autogravitante.

{orbitrows}

## Precisão e observáveis

Maior erro relativo de energia amostrado DOP853={orbitmax:.9g}; maior erro relativo de Lz={lzmax:.9g}; maior diferença de posição para a tolerância mais estrita={tight:.9g}kpc. As discrepâncias KDK por órbita e sua redução ao dividir dt estão no JSON; não se extrapola uma ordem universal para outros sistemas. Essas tolerâncias foram conferidas automaticamente.

Distância e pericentros/apocentros usam r=sqrt(x²+y²+z²), enquanto a figura usa projeção x/y ou x/z. Os extremos são detectados nos estados de1Myr; são estimativas amostradas, não soluções analíticas de pontos de retorno. Ausência de extremo ou de volta completa é registrada como null, sem período inventado. O período azimutal é medido apenas por voltas completas. Para E>=0 no potencial com Phi(infinito)=0, não se declara apocentro finito. No campo axisimétrico Lz é conservado; o vetor L completo não é em geral invariante para a órbita inclinada.

Os dois quadros usam a mesma projeção, extensão, época e vetores iniciais. A extensão é determinada por toda a trajetória do par, não muda por quadro e não altera as coordenadas. O controle de tempo reproduz os estados registrados sem interpolar ou integrar geometricamente trajetórias artificiais. Círculo vazio é o início; ponto cheio, o estado selecionado. A tabela de extremos/períodos utiliza toda a trajetória, conforme declarado no painel.
''',
 'VALIDACAO_RESUMIDA_1_0_6.md':f'''# Validação resumida1.0.6

## Separar três objetos

Campo gravitacional médio: força do potencial contínuo, usada para vc e partículas-teste. Cinemática: médias e dispersões das velocidades das partículas, que não são obrigadas a coincidir com vc. Evolução estrutural: crescimento de h50 e distribuição de massa, que pode ocorrer mesmo com energia conservada.

## Gráfico6 — evolução estrutural preservada

Reutilizados12 ensaios de200Myr: A-original3, B-original3, E1053 e F1053. Os metadados, fontes e hashes individuais constam em `validation.json`. h50 é a mediana ponderada da distância absoluta ao plano próprio da população fina. Faixas representam média±desvio amostral entre realizações, não intervalos de confiança. A/B variam três realizações bariônicas; E/F mantêm bárions2026 e variam três halos. Essas dispersões não têm interpretação intercambiável.

F105:169546 partículas totais, contagens1500/7092/954/160000; KDK GPU direta Float32, dt0,05Myr, Plummer epsilon0,1kpc. Crescimento médio do fino18,29%±3,14% em200Myr. F teve somente a menor estimativa pontual entre E105/F105 pareados. O intervalo de confiança da diferença inclui zero. Não foi demonstrada convergência estrutural global ou estacionariedade. Não usar o legacy de80000 partículas totais/1,51Gyr como evidência de estabilidade de E104 ou F105.

## Gráfico7 — energia

As três realizações completas F105 são mostradas, sem selecionar apenas a curva mais favorável. Máximo amostrado no conjunto F representado={v['energyMaxAbsF']:.9g}. A força e a trajetória são Float32 GPU direta; o diagnóstico usa Hamiltoniano de pares Plummer direto compensado Float64, G e epsilon² efetivos f32. Não é estimativa energética Barnes–Hut. Orçamento histórico=1e-5; zero aparece no piso gráfico1e-16, mas os dados brutos mantêm zero. Máximos entre amostras não são limitados por essa figura.

**Conservação energética não implica estacionariedade estrutural.**

## ExperimentoD — campo inicial

Reutilizada a família E104 de89546partículas, três realizações bariônicas e de halo, e28probes fixos. A tabela pública mostra os probes no plano em4,8,122,12 e16kpc. Força de pares Plummer calculada diretamente em NumPy Float64 e comparada ao campo médio Plummer correspondente. As dispersões entre sementes incluem a amostragem dos bárions e do halo. Isso não separa causalmente todos os mecanismos e não define uma lei assintótica de ruído. O campo Newtoniano106 é separado desse teste para evitar misturar leis de força.

## Verificações novas

As sete figuras usam dados calculados ou publicados. Os testes conferem identidade de vetores iniciais, conservação orbital, refinamento KDK, gradiente do potencial, fechamento quadrático de vc, massa esférica monótona, preservação de massas, escores, contagens5+2 e inventário83. A precisão nativa e a dependência do campo com a malha constam nos relatórios próprios. Testes de software não promovem candidatos históricos a equilíbrio certificado.
''',
 'REPRODUCAO_1_0_6.md':f'''# Reprodução1.0.6

## Ambiente e identidade

Python{platform.python_version()}; AGAMA{agama.__version__}; NumPy{np.__version__}; SciPy{scipy.__version__}; Matplotlib{matplotlib.__version__}. Node e hashes por fonte estão em `code-identity.json`. Identidade agregada do código106: `{ident['sha256']}`. A biblioteca nativa AGAMA e dependências científicas precisam estar instaladas; não são instaladas silenciosamente pelo site. Potenciais nativos exportados permitem repetir órbitas sem reconstruir DFs ou refazer SCM.

## Consultar ou servir

`node scripts/serve.mjs` serve o projeto em http://localhost:4180/ . O site é estático, com módulos JavaScript relativos, dados locais e nenhum serviço externo obrigatório em tempo de execução. `node scripts/build.mjs` produz dist, compatível com GitHub Pages conforme a URL/base da publicação e com Vercel pelo vercel.json existente. Não houve publicação remota. O simulador antigo está em simulador-tecnico.html, acessado pelo arquivo científico.

## Ordem de reprodução científica em cópia de trabalho

1. Confira `preservation.json`, `history-verification.json`, hashes do ZIP e SHA256SUMS.txt. `node scripts/darkmatter-106/preserve.mjs --verify` requer o histórico completo indicado no baseline. Não recrie o baseline sobre o original.
2. Baixe as fontes oficiais https://arxiv.org/pdf/1810.09466 e https://arxiv.org/pdf/2107.00014 nos caminhos locais descritos em `observations/provenance.json`. Os PDFs integrais foram consultados e têm hashes; o pacote redistribui a tabela numérica e referências, não os artigos completos. Execute `observations.py` para extrair e cruzar as tabelas. CSV publicado preservado permite reproduzir a análise sem baixar os PDFs.
3. Execute `model.py` para reconstruir as densidades positivas das grades preservadas, normalizar às mesmas massas e gerar quatro potenciais, curva e massa esférica. Não se ajustam massas aos dados. `density.py` define a quadratura; `mass.py` somente audita o resultado, sem reescrever curvas. As tentativas assinadas iniciais estão em attempts/signed-density e não são o modelo final.
4. Execute `orbits.py` e `compare.py`. Estes usam os potenciais exportados, mesmo vetor inicial por par, tolerâncias e protocolo registrados. Não há nova campanha N-corpos.
5. Execute `validation.py` para reanalisar séries e auditoria inicial históricas. Ela exige exatamente os arquivos e hashes identificados no JSON, preserva o limite200Myr e não executa física nova. A tabela do campo suave versus partículas é evidência técnica, não um oitavo gráfico.
6. `node scripts/darkmatter-106/inventory.mjs` gera a auditoria dos83gráficos. `site.mjs` gera as três páginas principais; preserva o HTML antigo em simulador-tecnico.html. `plot.py` produz exatamente sete figuras com PNG, SVG e CSV dos pontos desenhados. Para as órbitas, o PNG/SVG estático usa o caso solar completo; o painel interativo permite cinco casos e estados medidos.
7. Rode `node scripts/test.mjs`, depois `node scripts/darkmatter-106/identity.mjs`, `report.py` e `node scripts/darkmatter-106/audit.mjs`. Grave o log de testes. A documentação deve ser regenerada após mudança real de código ou resultado; as fontes das figuras são conferidas por hash.
8. `package.py` gera o pacote106 e verifica CRC/hashes internos. `node scripts/build.mjs` produz a versão estática, sem refazer campanhas ou alterar downloads históricos. `node scripts/darkmatter-106/audit.mjs --production` confere o build, os dados e a preservação histórica. A auditoria do pacote e a auditoria pós-build ficam externas ao próprio ZIP para evitar autorreferência de hashes.

## Alcance do pacote e do arquivo técnico

O ZIP106 inclui código atual, dados observacionais numéricos, potenciais, trajetórias novas, relatórios, inventário e figuras históricas utilizadas, evidências históricas necessárias à síntese e suas entradas. Não é uma recompressão recursiva de todos os ZIP antigos. Os pacotes completos0.9–1.0.5 continuam preservados separadamente; resultados anteriores não são apagados nem reescritos. Checkpoints parciais e trajetórias antigas não utilizadas permanecem no projeto e nos arquivos históricos. O baseline preserva4382arquivos históricos, incluindo antigos downloads. A cópia original de fontes, scripts e interface está em original-project/.

Cada figura mantém dados tabulares, unidades, hipóteses e referências. `code-identity.json` liga fontes a hashes; `figures/manifest.json` liga gráficos a dados e hashes; `observations/provenance.json` registra as duas tabelas consultadas; `model.json` e `mass-quadrature.json` documentam a representação nova. Não confundir hipóteses numéricas, resultados medidos e observações astronômicas.
'''}
 def polish(s):
  import re
  s=re.sub(r'\b(versão|Reprodução|observacional|rotação|numérica|resumida|halo|Python|AGAMA|NumPy|SciPy|Matplotlib|DOI|Tabela|seção|página|páginas|em|de|por|até|nos|com|partículas|gráficos|preserva|apresenta|ensaios)(?=\d)',r'\1 ',s)
  return re.sub(r'(\d)(?=Myr|kpc|km/s|partículas|probes|arquivos|gráficos)',r'\1 ',s)
 for name,body in docs.items():(ROOT/name).write_text(polish(body+notes),encoding='utf8')
 inventory='| Nº | Versão | Gráfico | Tema | Classificação | Destino |\n|---:|---|---|---|---|---|\n'+'\n'.join(f"| {r['number']} | {r['version']} | {r['title']} | {r['theme']} | {r['category']} | {r['action']} |"for r in inv['figures']);(ROOT/'AUDITORIA_GRAFICOS_1_0_6.md').write_text('# Auditoria dos83 gráficos\n\nAs três áreas públicas exibem cinco figuras astrofísicas e duas de validação. As83 figuras anteriores continuam consultáveis no arquivo técnico. Formatos PNG/SVG/PDF são contados uma vez; variantes interativas de perfil radial e vertical são distintas. Capturas de tela não são gráficos científicos.\n\n'+inventory+'\n',encoding='utf8')
 dump('software.json',{'python':platform.python_version(),'agama':agama.__version__,'numpy':np.__version__,'scipy':scipy.__version__,'matplotlib':matplotlib.__version__,'platform':platform.platform(),'codeIdentity':ident['sha256'],'UTC':datetime.datetime.now(datetime.timezone.utc).isoformat()});print('Six scientific reports and complete graph audit generated')
