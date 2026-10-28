import {readFile,writeFile} from 'node:fs/promises';
import {massAuditMarkdown} from '../src/physics/mass-audit.js';
const root=new URL('../',import.meta.url),audit=JSON.parse(await readFile(new URL('reports/v0.8.0/mass-audit.json',root),'utf8'));
const chosen=audit.realizations.filter(r=>r.seed===2026);
const text=`# Auditoria das massas — 0.8.0

GUILHERME ALEIXO BANDEIRA · PROJETO DE TCC · UEMS

## Respostas às seis perguntas

1. Cada ponto físico é uma macropartícula com massa. O inicializador histórico 'src/physics/initial-legacy.js:createGalaxy' grava 'state.masses[i]=totals[c]/counts[c]' em Float64Array. Desenhar/ocultar não altera sua participação gravitacional. Uma macropartícula não representa necessariamente uma estrela.
2. As tabelas abaixo são produzidas executando o código, não usando massas supostas. Todas as partículas de uma componente têm a mesma massa nesta inicialização; mínimo=máximo=média. Quilogramas são uma conversão de relatório, nunca a unidade de entrada do motor.
3. 'componentCounts' usa 15%/45%/40% com halo, piso inteiro, mínimo de uma partícula ativa e restante no disco. Sem halo usa 25%/75%. São frações de resolução. N=10000: 1500+4500+4000. N=50000: 7500+22500+20000.
4. Mb=5e9 M☉, Md=6.8e10 M☉, Mh=976315764173.288 M☉. Mh é a integral numérica da densidade NFW com taper quintic entre r200 e 1.2 r200, externa nula a 247.95095842704154 kpc. A massa de escala NFW 5.4e11 M☉ não é Mh. A soma usa compensação de Kahan; diferenças de arredondamento não são perda física de massa.
5. 'directAccelerations' multiplica por m[j], com atualização simétrica do par. Octree acumula massa e centro ponderado; sua aproximação monopolar usa a massa agregada. WGSL em 'src/compute/gpu.js' lê massa em 'positions[j].w'; upload converte f64 para f32 e preserva esse canal durante KDK. O integrador usa exclusivamente forças discretas. Campos analíticos entram na inicialização e nos diagnósticos de referência, sem segunda gravitação adicional.
6. Multiplicar N por cinco divide as massas individuais por cinco nas alocações padrão; os totais permanecem iguais. Não garante a mesma trajetória discreta nem prova convergência para o limite não colisional.

${chosen.map(massAuditMarkdown).join('\n')}

## Auditoria dimensional

Unidades internas: comprimento kpc; tempo Myr; massa 10¹⁰ M☉ nominais. 1 Gyr=1000 Myr. Velocidade kpc/Myr, aceleração kpc/Myr², energia 10¹⁰ M☉ kpc²/Myr². O código usa (GM)☉ nominal IAU 2015 =1.3271244e20 m³/s²; G interno=0.04498502151469553. Uma massa de 1 na matriz significa 10¹⁰ massas solares nominais.

Para kg, M☉=(GM)☉/G_SI, com G_SI=6.67430e-11 m³ kg⁻¹ s⁻² (CODATA 2022). A incerteza relativa padrão de G é aproximadamente 2.25e-5; os dígitos do relatório são precisão computacional, não exatidão física. A relação SI foi testada por acelerações físicas calculadas independentemente da expressão em unidades internas. Não se introduziu G_SI na integração.

## Resolução do halo

A razão m_h/m_d é 16.152282863161016 na alocação histórica, tanto em N=10000 quanto em N=50000. O controle N=26000 mantém Nb=1500 e Nd=4500 e aumenta Nh de 4000 para 20000: a razão passa a 3.230456572632203. As posições e velocidades bariônicas iniciais são bit a bit iguais às do controle histórico N=10000; a massa total do halo é preservada. A nova realização do halo tem mais amostras e menos massa individual: este ensaio reduz uma fonte de confusão, mas a flutuação de seu campo não é idêntica.

Não foi mudada a alocação padrão da aplicação. Repartir partículas proporcionalmente à massa total reduziria as partículas do disco e do bojo para um mesmo N, prejudicando sua resolução. A escolha adequada precisa de testes de força e aquecimento locais.

## Evidências

- 'reports/v0.8.0/mass-audit.json': números por componente, somas, min/max/média, unidades e hashes.
- 'tests/mass-audit.test.mjs': massa/resolução, força desigual, centro ponderado, ausência de campo duplicado e equivalência SI.
- 'tests/iterative-initial.test.mjs': alocação controlada e preservação exata das partículas bariônicas.
- 'reports/v0.8.0/mass-gpu.json': ensaio real GPU; RMS relativo 4.161490534102495e-8 para três massas diferentes e 7.231964893205934e-7 na fixture de 1025 partículas. Limites da fixture, não garantia universal.

## Origem dos parâmetros

O TCC fornece os modelos, sem uma tabela completa de massas/escalas dessas componentes. Os valores adotados provêm do modelo Gala MilkyWayPotential v1 reduzido a três componentes, documentado por Marchetti (2021), tabela 2. O núcleo adicional do modelo de referência é omitido, sem redistribuição de massa. O taper e a alocação são escolhas computacionais explícitas. Ver 'PARAMETROS_E_FONTES.md'.

Fontes: [Marchetti (2021)](https://doi.org/10.1093/mnras/stab599), [IAU nominal (Prša et al.)](https://arxiv.org/abs/1605.09788), [CODATA/NIST](https://physics.nist.gov/cuu/pdf/wall_2022.pdf).
`;
await writeFile(new URL('AUDITORIA_MASSAS.md',root),text);

