# Conservação e custo 1.0.4

O Hamiltoniano das famílias vivas é E=Σmᵢ|vᵢ|²/2−GΣᵢ<ⱼmᵢmⱼ/√(|rᵢ−rⱼ|²+ε²). Não há autoenergia de cada macro partícula. No controle com halo fixo soma-se ΣmᵢΦhalo, sem fator 1/2. K, U, E, δE, momento linear, momento angular vetorial, Lz e centro de massa estão nos registros/CSV. Unidades internas: kpc, Myr, 1e10 Msun; energia 1e10 Msun·kpc²/Myr². O Hamiltoniano usa G nominal e ε nominal preservados 1.0.3; os parâmetros efetivos GPU G, dt, ε² arredondados para Float32 estão em cada resultado. A pequena diferença entre constantes nominais/efetivas é declarada; a referência de aceleração usa os valores efetivos.

Máximo |δE| observado entre todos os ensaios novos:2.51090062e-06. Máximo erro angular normalizado pela soma inicial dos módulos individuais:1.00185622e-06; momento linear na normalização análoga:2.00361406e-08. Os totais iniciais de P podem cancelar por simetria, portanto não dividimos pelo quase zero. São máximos das amostras, não limites entre elas. Um sistema isolado Plummer conservativo admite E, P, L constantes idealmente, enquanto KDK e Float32 introduzem erros numéricos medidos.

## Otimização do diagnóstico

A força direta e o integrador são exatamente os da 1.0.3. A energia foi repartida em seis Web Workers: linhas triangulares i<j disjuntas, cada par uma vez, aritmética Float64 e soma compensada em cada partição e na redução. O teste com massas desiguais verifica cobertura e concordância com a soma serial; o navegador compara também realizações completas. Não há cutoff, árvore ou aproximação de força nova. A otimização não pode aquecer partículas porque só lê estados; a igualdade bit a bit da trajetória 200 Myr com controles históricos correspondentes às famílias A/B da semente 2026 também foi verificada.

Os tempos de energia incluem a referência serial adicional quando executada; não devem ser confundidos com o custo recorrente paralelo. Nos 12 resultados iniciais20 Myr, o campo `precisionAudit.parallelSeconds` foi medido após a referência e inclui serial+paralelo: subtrair `serialSeconds` para obter o primeiro custo paralelo. A partir da matriz 200 a marcação foi corrigida. Dados antigos não foram reescritos. A soma serial inicial inclui aquecimento do JIT e não é um benchmark isolado em regime; não se promete um fator universal de aceleração.

| Família | N | Parede total[s] | Passos GPU[s] | Energia[s] | Estrutura[s] | Passos físicos/s, trechoGPU |
|---|---:|---:|---:|---:|---:|---:|
| A | 10000 | 17.53 | 5.61 | 3.66 | 6.53 | 712.48 |
| B | 46000 | 124.40 | 44.65 | 63.95 | 10.39 | 89.58 |
| C | 13546 | 25.52 | 7.42 | 6.22 | 9.98 | 539.26 |
| D | 49546 | 145.96 | 51.09 | 74.85 | 14.21 | 78.29 |
| E | 89546 | 213.98 | 133.10 | 64.37 | 10.75 | 30.05 |
| G | 56638 | 105.62 | 61.24 | 28.67 | 12.20 | 65.31 |

Linhas representativas da semente 2026,200 Myr. Há ainda readback, serialização, salvamento e testes de referência; não se deve atribuir toda a parede ao kernel gravitacional. `forceBatch32Seconds` mede 32 avaliações de força nas posições inalteradas, com espera pela fila, após inicialização: inclui submissão/sincronização, não é um timestamp exclusivamente de hardware. A integração mede força+KDK+submissão, sem diagnósticos. O ambiente é uma sessão interativa, com custo de tarefas locais concorrentes possível; não é um benchmark de máquina dedicada.

Os pilotos mostraram viabilidade do método direto nas resoluções executadas. Não foi introduzido Barnes–HutGPU ou PM sem necessidade demonstrada. Um método novo exigiria validação de componentes radiais/verticais da força, invariantes e estrutura; os dados atuais validam apenas o método direto. A referência Float64 inicial usa até 32 IDs por população de cada ensaio e componentes radial/vertical são auditáveis nos vetores preservados. Arredondamento GPU não desaparece no readback Float64. Não há objetivo de preencher VRAM.
