# Modos, anéis e migração 1.0.4

São medidos m=1..4 em anéis de 0–2,2–4,4–6,6–8,8–10,10–12,12–16,16–20 e20–30 kpc. O plano próprio, o plano inicial, a inclinação, o centro, o deslocamento vertical médio e a velocidade normal média são registrados. O ajuste de plano é exclusivamente diagnóstico: nenhuma posição/velocidade é reposicionada na integração.

As coortes mantêm os mesmos IDs e etiquetas físicas ao longo do tempo. Os anéis instantâneos mudam de composição e não podem ser tratados como as mesmas partículas. O CSV de coortes registra contagem, massa, h50 em dois planos, σnormal,σR e R50; o CSV de modos registra amplitudes, fases, ruído condicional e medidas locais. Perfis radiais/verticais e massa encerrada são acompanhados para todas as componentes, incluindo bojo e halo; o perfil vertical padrão integra R<30 kpc e não representa sozinho a vizinhança solar.

## Identidade exata de seleção nos extremos

Para I0=IDs do anel inicial e It=IDs do anel final:

Var[vz(t)|It]−Var[vz(0)|I0] = (Var[vz(t)|It]−Var[vz(0)|It]) + (Var[vz(0)|It]−Var[vz(0)|I0]).

O primeiro termo acompanha os IDs da seleção final e muda suas velocidades; o segundo muda apenas a composição inicial. A soma foi verificada numericamente para cada anel/população/realização com dados suficientes. Também é registrada a mudança da coorte inicial inteira e a fração de massa retida. A decomposição é descritiva, no eixo cartesianoz e anéis cilíndricos fixos, ponderada em massa; movimentos coerentes e resposta coletiva podem contribuir para o primeiro termo. Não é uma decomposição causal única em encontros versus ondas. Anéis esparsos têm grande incerteza; contagem não certifica estabilidade.

## Limites da interpretação coletiva

O início antipodal suprime modos ímpares; os testes não podem medir livremente toda instabilidade m=1. A referência RMS combina ruído de pares e limite conservador de partículas independentes. Probabilidades condicionais e comparações múltiplas não são uma descoberta de barra: os testes são temporalmente correlacionados. O Q armazenado usa frequências iniciais e o coeficiente3,36 de disco infinitamente fino sem suavização; não é limiar de estabilidade para este disco espesso, suavizado e multicomponente.

Persistência/coerência de fase e convergência com N são necessárias para sustentar uma interpretação física dos modos. A diferença halo fixo−vivo inclui a resposta do halo; contrastes de resolução e controles contínuos são usados em conjunto. Não foi atribuída uma fração universal do aquecimento a um único mecanismo.

A literatura demonstra dependência do aquecimento espúrio com a massa individual do halo e suas condições locais; ela não fornece um limite de N ou espessamento universal para este experimento. Referência primária: [Ludlow et al.2021](https://arxiv.org/abs/2105.03561).
