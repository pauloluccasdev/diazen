# Diazen

Aplicativo da Lucx Tech para diário, check-in, controle nutricional e evolução física.

**Status:** preparação do MVP 0.1. A stack da aplicação ainda não foi definida. O banco de dados será no **Supabase**. Este repositório reúne a documentação de referência antes do desenvolvimento.

## Antes de desenvolver

Leia [AGENTS.md](AGENTS.md), os [requisitos](docs/requisitos.md), o [Design System](docs/design-system.md) e as [decisões técnicas](docs/decisoes-tecnicas.md). Consulte também os [tokens de design](design/Diazen_Design_Tokens_MVP_0_1_v1_1.json) e a [referência visual](docs/referencias/Showcase%20da%20interface%20do%20Diazen%20em%20modo%20escuro.png).

## Documentação

- `docs/originais/`: os dois DOCX originais, versão 1.1, preservados.
- `docs/requisitos.md` e `docs/design-system.md`: cópias textuais com tabelas para consulta e busca pela IA.
- `docs/referencias/`: showcase fornecido; referência estética, sem ampliar o escopo aprovado.
- `design/`: JSON original dos tokens de design.
- `docs/decisoes-tecnicas.md`: decisões confirmadas e questões ainda abertas.

Para atualizar as cópias Markdown após alterar os DOCX, execute `python3 scripts/extrair_documentacao.py`. O script usa apenas a biblioteca padrão do Python. Imagens incorporadas e diagramação continuam disponíveis nos documentos originais.

## Escopo de referência

PWA mobile-first com autenticação, projetos e metas, diário alimentar manual, hidratação, atividades físicas, peso, medidas, fotografias privadas e dashboard. O MVP não inclui importação por IA, Strava, login social ou relatórios avançados.

Não há aplicação executável, dependências, schema SQL ou infraestrutura provisionada nesta etapa. A escolha do Supabase não decide automaticamente autenticação, storage, frontend, backend ou hospedagem.
