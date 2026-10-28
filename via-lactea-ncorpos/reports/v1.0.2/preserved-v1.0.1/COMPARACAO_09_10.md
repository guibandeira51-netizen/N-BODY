# Comparação 0.9 / 1.0 — condições iniciais e resposta dinâmica

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

| Ensaio | N | t [Myr] | h50(0) [kpc] | h50(t) [kpc] | Δh50 [%] | σn(t) [km/s] | Δσn [%] |
|---|---:|---:|---:|---:|---:|---:|---:|
| calibrated-A-10k | 10000 | 1000 | 0.2348 | 1.2104 | 415.41 | 79.87 | 89.58 |
| calibrated-A-50k | 50000 | 200 | 0.2379 | 0.3149 | 32.39 | 45.47 | 5.96 |
| calibrated-A-s27 | 10000 | 200 | 0.2479 | 0.5060 | 104.09 | 56.82 | 32.61 |
| calibrated-B-14k | 14000 | 1000 | 0.2348 | 0.7936 | 237.91 | 70.87 | 68.20 |
| calibrated-B-26k | 26000 | 200 | 0.2348 | 0.3454 | 47.07 | 44.75 | 6.20 |
| calibrated-dt-half | 10000 | 200 | 0.2348 | 0.4505 | 91.84 | 56.72 | 34.63 |
| calibrated-epsilon-double | 10000 | 200 | 0.2348 | 0.4305 | 83.32 | 50.63 | 20.17 |
| calibrated-epsilon-half | 10000 | 200 | 0.2348 | 0.5167 | 120.01 | 59.02 | 40.09 |
| calibrated-fixed | 6000 | 1000 | 0.2348 | 0.3593 | 53.00 | 50.56 | 20.00 |
| calibrated-gaussian-same-density | 10000 | 200 | 0.2348 | 0.5842 | 148.75 | 57.92 | 39.26 |
| df-A-10k | 10000 | 1000 | 0.4510 | 1.4859 | 229.43 | 82.99 | 43.03 |
| df-A-50k | 50000 | 200 | 0.4471 | 0.5032 | 12.56 | 57.21 | 0.63 |
| df-A-h27 | 10000 | 1000 | 0.4510 | 1.4202 | 214.86 | 73.89 | 27.36 |
| df-A-s27 | 10000 | 200 | 0.4428 | 0.6963 | 57.26 | 59.70 | 2.50 |
| df-B-14k | 14000 | 1000 | 0.4510 | 0.9953 | 120.66 | 71.74 | 23.65 |
| df-B-26k | 26000 | 200 | 0.4510 | 0.5237 | 16.12 | 59.32 | 2.24 |
| df-dt-half | 10000 | 200 | 0.4510 | 0.6372 | 41.28 | 65.26 | 12.48 |
| df-epsilon-double | 10000 | 200 | 0.4510 | 0.6184 | 37.11 | 63.34 | 9.17 |
| df-epsilon-half | 10000 | 200 | 0.4510 | 0.7052 | 56.36 | 67.06 | 15.59 |
| df-fixed | 6000 | 1000 | 0.4510 | 0.5228 | 15.90 | 60.10 | 3.59 |
| gaussian-same-density | 10000 | 200 | 0.4510 | 0.6737 | 49.37 | 66.17 | 15.55 |
| legacy-10k | 10000 | 1000 | 0.1719 | 1.2019 | 598.98 | 79.96 | 104.03 |

Esta tabela não torna épocas diferentes comparáveis. Os arquivos summary.csv e series.csv permitem comparar 20 e 200 Myr em todos os casos e 1.000 Myr onde o protocolo realmente foi estendido. Espessuras iniciais, massas e perfis mudam entre legado, primeiro candidato e candidato calibrado. Não atribuímos qualquer diferença global exclusivamente ao gerador de velocidades.

## Comparações que isolam parte do problema

Refinamento Nh conserva massa total e exatamente as partículas estelares dentro de cada conjunto. A semente do halo varia separadamente. Alterações de dt e ε partem do mesmo snapshot. O contraste Gaussiano preserva posições e massas do candidato e troca a forma/correlação local das velocidades; usa 64 pares vizinhos e covariância completa, e não deve ser chamado de implementação GALIC ou do inicializador Jeans legado. Partículas Gaussianas não ligadas são registradas sem recorte e não admitidas como candidato de equilíbrio.

Halo fixo versus vivo altera resposta, ruído e suavização do campo, logo não separa um único mecanismo. O controle de campo total congelado elimina também toda autogravitação variável e é apresentado como ensaio orbital. O teste curto de precisão/algoritmo registra diferenças reais, mas não estabelece convergência secular em f64. Esses limites continuam presentes mesmo quando a energia aproximada parece bem conservada.

O resultado original de 50.000 partículas até 2.540,4 Myr e os 25 ensaios da investigação 0.9 permanecem em VALIDACAO_09.md e nos pacotes históricos, preservados por hash. A reprodução legacy-10k desta campanha recupera o crescimento de espessura observado em 1.000 Myr. Não se reescreveram esses registros sob o rótulo 1.0.

## Decisão

O simulador histórico permanece na página inicial. A nova página expõe os snapshots como **experimentos de candidatos**, com qualificação explícita e downloads. Nenhuma realização é promovida automaticamente a equilíbrio validado. Ver VALIDACAO_EQUILIBRIO_1_0.md para resíduos contínuos, limites da campanha e próximos testes necessários.
