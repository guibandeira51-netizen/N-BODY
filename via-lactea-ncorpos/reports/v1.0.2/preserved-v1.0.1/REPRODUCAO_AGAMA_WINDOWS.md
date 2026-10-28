# Ambiente AGAMA usado nesta investigação

Os snapshots e os experimentos podem ser carregados no site sem Python ou AGAMA. Este documento descreve o ambiente que realmente preparou os dados; não promete que um comando genérico de pip instalará a extensão em qualquer Windows.

## Proveniência

Foi compilado o AGAMA oficial 1.0.161 no commit `f302756b8af2b763db58e278e30478517dc8eea3`, com Python 3.12.14 x64, NumPy 2.5.4, SciPy 1.18.1 e Matplotlib 3.11.2. A fonte oficial e o arquivo inicialmente baixado da branch foram comparados arquivo a arquivo e correspondem ao mesmo conteúdo. `reports/v1.0.0/dependencies.json` contém URLs, versões, hashes de arquivos e da extensão realmente executada.

Não havia compilador ou distribuição WSL instalada. Uma ferramenta portátil local preparou os pacotes oficiais Microsoft MSVC 14.44.35207 e Windows SDK 10.0.26100 sem registro global. O lock do toolchain está em `reports/v1.0.0/reproduction/portablemsvc.lock`. A pasta de compilação de trabalho é separada do projeto distribuído; compiladores/SDK inteiros não são dependências do site.

## Compilação efetivamente realizada

O `setup.py` oficial tentou construir GSL, mas MSBuild não estava disponível. `build-gsl-executed.py`, incluído com os fontes comprimidos em `reproduction/`, leu a lista de arquivos dos projetos MSVC do port Windows distribuído pelo autor: 628 fontes GSL e 143 CBLAS. Compilou-os com cl e criou as bibliotecas com lib. Os logs guardam as tentativas e a compilação final.

O arquivo `Makefile.local-executed.txt` registra as opções que o setup oficial utilizou. Foram necessários C++17, `/permissive-` para os tokens alternativos do C++, e um cabeçalho de compatibilidade `alloca.h` mapeando a operação para `_alloca` da CRT Microsoft. Os arquivos numéricos oficiais não foram alterados. Não se usou fast-math; as opções principais foram `/O2 /EHsc /openmp /std:c++17 /permissive-`. Eigen foi 3.4.1 e GSL 2.7.

Os caminhos absolutos presentes no Makefile, helper e logs apontam para o ambiente original. Para compilar em outro computador é necessário substituí-los pelos caminhos locais do Python, NumPy, fontes, bibliotecas e SDK, com um toolchain MSVC compatível ativado. Isso é preparação de ambiente, não parte da evolução gravitacional. Como alternativa, siga as instruções de instalação da versão oficial pinada em uma plataforma suportada; o gerador usa a API Python pública da biblioteca.

A extensão foi colocada junto do `__init__.py` e dos auxiliares Python oficiais. Importar somente o `.pyd` não disponibilizava auxiliares de coordenadas: essa tentativa falhou e está registrada. Com o pacote completo, os testes oficiais de coordenadas, órbitas, ações e modelo autoconsistente passaram. Eles validam comportamentos da biblioteca; não validam o equilíbrio da nossa galáxia.

## Executar a preparação

Use um ambiente Python no qual `import agama, numpy, scipy` funcione. Execute os comandos de `CONDICOES_INICIAIS_1_0.md` e `VALIDACAO_EQUILIBRIO_1_0.md` a partir da pasta que contém package.json. `--threads 4` limita o paralelismo. Variáveis do ambiente, versões de BLAS/OpenMP e ordenação de operações podem afetar os últimos bits. As sementes são registradas por subcomponente, mas os snapshots exportados, conferidos por SHA-256, são a referência exata para repetir os mesmos estados iniciais.

Os diretórios `executed-source-*` preservam épocas do gerador e do refinamento que realmente executaram, inclusive revisões anteriores à correção da normalização Monte Carlo. A lista `snapshots.json` identifica somente os arquivos finais admitidos. Não use amostras antigas ou parciais como substitutas silenciosas.

O ramo calibrado tem seu próprio arquivo de configuração, potencial, densidades, perfis, controles e sementes. Seu parâmetro Hdisk foi determinado pela mediana vertical no campo analítico inicial e depois mantido fixo durante a iteração. As alterações de campo entre etapas, o alvo inicial e o perfil final são resultados distintos.

Fontes primárias: [AGAMA oficial](https://github.com/GalacticDynamics-Oxford/Agama), [artigo do método](https://arxiv.org/abs/1802.08239), [modelo de massa Cautun et al.](https://arxiv.org/abs/1911.04557).
