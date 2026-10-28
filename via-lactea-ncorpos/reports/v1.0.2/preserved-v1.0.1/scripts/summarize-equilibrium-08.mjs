import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {csv} from '../src/export/zip.js';
import {relativeChange,energyDrift} from '../src/physics/laboratory.js';
const root=new URL('../',import.meta.url),dir=new URL('reports/v0.8.0/',root);
const read=async name=>JSON.parse(await readFile(new URL(name,dir),'utf8'));
const original=await read('gpu-campaign-unpaired.json'),refined=await read('gpu-campaign-antipodal.json');
if(original.status!=='completed'||original.runs.length!==12||refined.status!=='completed'||refined.runs.length!==4)throw Error('Campanha incompleta.');
const runs=[...original.runs.map(r=>({...r,sourceProtocol:'initial-campaign'})),...refined.runs.map(r=>({...r,sourceProtocol:'antipodal-refinement'}))];
const campaign={schema:'equilibrium-08-merged-v1',assembledUTC:new Date().toISOString(),protocols:{initial:{source:'gpu-campaign-unpaired.json',hashes:original.sourceHashes},antipodal:{source:'gpu-campaign-antipodal.json',hashes:refined.sourceHashes}},runs};
await writeFile(new URL('gpu-campaign.json',dir),JSON.stringify(campaign));
const rows=[];
for(const r of runs)for(const s of r.samples){const a=r.samples[0];for(const c of s.components){const first=a.components.find(x=>x.id===c.id);rows.push([r.label,r.sourceProtocol,r.config.n,r.config.seed,r.config.epsilon,s.timeMyr,c.id,c.mass,c.r50,c.R50,c.massMedianAbsZ,100*relativeChange(c.r50,first.r50),100*relativeChange(c.R50,first.R50),100*relativeChange(c.massMedianAbsZ,first.massMedianAbsZ),...(c.velocity.mean??[null,null,null]),...(c.velocity.dispersion??[null,null,null]),...c.centerOfMass,s.conservation.kinetic,s.conservation.potential,s.conservation.energy,energyDrift(s.conservation,a.conservation),s.conservation.energyApproximate,...s.conservation.momentum,...s.conservation.angularMomentum,s.virial.W,s.virial.ratio,s.diskTiltDegrees]);}}
await writeFile(new URL('series-comparacao.csv',dir),csv(['initialization','protocol','N','seed','epsilon_kpc','time_Myr','component','mass_1e10Msun','r50_kpc','R50_kpc','h50_fixed_plane_kpc','delta_r50_percent','delta_R50_percent','delta_h50_percent','mean_vR_kpc_Myr','mean_vphi_kpc_Myr','mean_vz_kpc_Myr','sigmaR_kpc_Myr','sigmaPhi_kpc_Myr','sigmaZ_kpc_Myr','component_center_x_kpc','component_center_y_kpc','component_center_z_kpc','K_1e10Msun_kpc2_Myr2','U_1e10Msun_kpc2_Myr2','E_1e10Msun_kpc2_Myr2','energy_relative_signed','energy_approximate','Px','Py','Pz','Lx','Ly','Lz','force_virial_W','virial_ratio','disk_tilt_degrees'],rows));
const result=r=>{const a=r.samples[0],b=r.samples.at(-1);return {label:r.label,n:r.config.n,seed:r.config.seed,epsilon:r.config.epsilon,changes:b.components.map((c,i)=>({component:c.id,r50Percent:100*relativeChange(c.r50,a.components[i].r50),R50Percent:100*relativeChange(c.R50,a.components[i].R50),h50Percent:100*relativeChange(c.massMedianAbsZ,a.components[i].massMedianAbsZ),sigmaZPercent:100*relativeChange(c.velocity.dispersion[2],a.components[i].velocity.dispersion[2])})),energyRelativeSigned:energyDrift(b.conservation,a.conservation),initialDiskVz:a.components[1].velocity.mean[2],finalDiskCenterZ:b.components[1].centerOfMass[2]};};
const summary=runs.map(result);
await writeFile(new URL('comparison-summary.json',dir),JSON.stringify({dateUTC:new Date().toISOString(),runCount:runs.length,runs:summary},null,2));
const pct=(s,key)=>s.components.map((c,i)=>100*relativeChange(c[key],s._initial.components[i][key]));
const num=x=>Number.isFinite(x)?x.toFixed(4):'indisponível';
const table=label=>runs.filter(r=>r.label===label).map(r=>{const a=r.samples[0],t20=r.samples.find(s=>s.timeMyr===20),b=r.samples.at(-1);return `| ${r.config.n} | ${r.config.seed} | ${num(100*relativeChange(t20.components[1].massMedianAbsZ,a.components[1].massMedianAbsZ))} | ${num(100*relativeChange(b.components[1].massMedianAbsZ,a.components[1].massMedianAbsZ))} | ${num(100*relativeChange(b.components[0].r50,a.components[0].r50))} | ${num(100*relativeChange(b.components[1].velocity.dispersion[2],a.components[1].velocity.dispersion[2]))} |`;}).join('\n');
const heading='| N | Semente | Δh50 em 20 Myr (%) | Δh50 em 200 Myr (%) | Δr50 bojo em 200 Myr (%) | Δσz em 200 Myr (%) |\n|---:|---:|---:|---:|---:|---:|';
const oldGPU=JSON.parse(await readFile(new URL('reports/laboratory/gpu-resolution.json',root),'utf8'));
const reproduction=runs.filter(r=>r.label==='legacy').map(r=>{const previous=oldGPU.runs.find(x=>x.config.n===r.config.n&&x.config.seed===r.config.seed).samples.at(-1),now=r.samples.find(s=>s.timeMyr===20);const diffs=now.components.map((c,i)=>({component:c.id,r50:c.r50-previous.components[i].r50,R50:c.R50-previous.components[i].R50,h50:c.massMedianAbsZ-previous.components[i].massMedianAbsZ}));return {n:r.config.n,seed:r.config.seed,differences:diffs,exactlyEqual:diffs.every(c=>c.r50===0&&c.R50===0&&c.h50===0)};});
await writeFile(new URL('gpu-reproduction.json',dir),JSON.stringify(reproduction,null,2));
const text=`# Comparação 0.7.0 / 0.8.0 — resultados medidos

GUILHERME ALEIXO BANDEIRA · PROJETO DE TCC · UEMS

## Decisão desta entrega

Massas e forças foram verificadas, e a preparação iterativa foi implementada e submetida a evolução livre. A nova inicialização continua experimental; não há certificação de equilíbrio global. A aplicação mantém a inicialização histórica como padrão. Os números abaixo devem ser avaliados conjuntamente, sem escolher apenas a realização ou a métrica mais favorável.

O refinamento antipodal removeu o movimento coletivo inicial por componente, mas não produziu melhora estrutural robusta nas duas sementes e resoluções. Em N=10000, Δh50 aos 200 Myr ficou em 189,81% e 218,46%, contra 157,10% e 178,02% históricos. Em N=50000, ficou em 64,97% e 49,59%, contra 49,38% e 57,82%. A média das duas realizações também não melhorou. Isso rejeita a promoção desta realização preparada como solução de equilíbrio; não rejeita toda a família do método iterativo. O problema físico de construir uma nova condição inicial validada permanece pendente.

## Protocolo

16 evoluções livres GPU direto f32 de 200 Myr: quatro históricas, quatro candidatos sem pares, quatro refinamentos antipodais e quatro controles de discretização/suavização. As sementes são 2026 e 2027, N=10000/50000 na comparação principal. dt=0,1 Myr e ε=0,1 kpc. Controles: halo refinado N=26000 com 1500/4500/20000 partículas; suavização ε=0,3 kpc em N=10000. Cada estado salvo corresponde a 0,5,10,15,20,50,100,150 ou 200 Myr integrados.

A energia desses ensaios é recalculada em CPU por Barnes–Hut θ=0,5 sobre snapshots GPU, portanto **aproximada**. Não se interpretam seus desvios como erro exato exclusivo do integrador. W usa as acelerações GPU atuais. Os parâmetros físicos permanecem iguais; o candidato modifica as velocidades iniciais por preparação documentada. A etapa de preparo não conta como tempo livre e não continua durante os 200 Myr de validação.

Três reproduções CPU N=2000 recuperaram exatamente as mudanças estruturais históricas de 20 Myr nas sementes 2026/2027/2028. Quatro reproduções GPU N=10000/50000 registram diferenças numéricas em 'gpu-reproduction.json'; os estados de 20 Myr são comparados com a campanha anterior. A energia CPU dessas reproduções foi calculada por soma direta de pares.

## Inicialização histórica

${heading}
${table('legacy')}

## Candidato iterativo com pares antipodais

${heading}
${table('iterative-antipodal')}

## Tentativa iterativa anterior sem pares — preservada

${heading}
${table('iterative-candidate')}

Essa tentativa apresentou velocidade vertical média inicial do disco diferente de zero e deslocamento coletivo durante a evolução. Portanto h50 em z=0 mistura alteração da distribuição vertical e movimento de seu centro. O refinamento impõe pares somente na construção, com momento inicial por componente nulo. Essa simetria elimina o viés coletivo inicial da amostra, sem comprovar uma DF estacionária. A comparação do refinamento com o controle deve examinar também os perfis por anel, σz, centros e bojo.

## Controle: aumentar somente a resolução do halo

${heading}
${table('halo-refined-fixed-baryons')}

As posições, velocidades e massas das partículas bariônicas em t=0 são exatamente as do controle histórico N=10000. A massa por partícula do halo diminui cinco vezes, enquanto Mh é mantida. A melhora nas duas sementes sustenta investigar discretização do halo como contribuição; não mede isoladamente uma taxa de relaxação por encontros nem exclui respostas coletivas ao ruído. O centro do disco e a inclinação permanecem observáveis relevantes.

## Controle: suavização ε=0,3 kpc

${heading}
${table('softening-control')}

Aumentar ε muda o campo resolvido, além de reduzir encontros próximos. Não eliminou a evolução em todos os casos. Não foi adotado ε=0,3 como correção automática do modelo.

## Interpretação e limites

h50 é medido em relação a z=0, com massa real das partículas. Não equivale sozinho a aquecimento. σz é central em velocidade, mas momentos globais podem ser sensíveis às caudas e à redistribuição radial. O raio de meia massa do bojo varia de maneira dependente da semente. A evolução do halo em 200 Myr não cobre múltiplos períodos em todas as suas regiões. Duas sementes não oferecem uma distribuição de incerteza bem estimada.

O candidato inicial e seu refinamento devem ser interpretados como testes do método implementado. Não houve prova de convergência com o número de iterações, duração do segmento, métrica de vizinhos ou quantidade de vizinhos. Positividade de massas e finitude de velocidades não asseguram estacionariedade. Resultados favoráveis em um intervalo curto ou em uma semente não são suficientes para promoção.

As comparações de precisão preservam os testes CPU/GPU da 0.7 e acrescentam a fixture de massas diferentes da 0.8. Não foi executada uma réplica CPU direta f64 de 50000 corpos por 200 Myr. Assim, não se atribui toda diferença entre campanhas a f32, e os testes pequenos não são extrapolados como limite universal.

## Arquivos e reprodução

- 'mass-audit.json', 'mass-gpu.json': massa, unidades e forças reais.
- 'cpu-reproduction.json', 'gpu-reproduction.json': comparação com 0.7.
- 'gpu-campaign-unpaired.json', 'gpu-campaign-antipodal.json': protocolos completos; datas, hardware, hashes e estados.
- 'gpu-campaign.json': conjunto combinado de 16 ensaios, sem substituir os protocolos originais.
- 'series-comparacao.csv', 'comparison-summary.json': medidas por componente e resumo.
- 'snapshots/': condições iniciais, hashes e índice por experimento.
- 'cpu-snapshot-validation.json': gerador offline CPU e 200 Myr livres, sem extrapolação ao GPU de alta resolução.
- 'executed-source-unpaired/': arquivos exatos da primeira campanha, identificados por hash.

Use 'scripts/prepare-equilibrium.mjs', 'scripts/validate-snapshot.mjs', 'tests/browser-mass.html' e 'tests/browser-equilibrium-refinement-08.html'. Consulte 'EQUILIBRIO_INICIAL.md' e 'AUDITORIA_MASSAS.md'. Nenhum resultado simulado é apresentado como detecção independente de matéria escura.
`;
await writeFile(new URL('COMPARACAO_07_08.md',root),text);
console.log(JSON.stringify({runs:runs.length,reproduction,revised:summary.filter(r=>r.label==='iterative-antipodal')}));
