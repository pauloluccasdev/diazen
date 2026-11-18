# Fase 3 — Alimentação

Branch `feat/diazen-v2-alimentacao-fiel`, a partir da develop `8454f8c`. Referências R03/R04 abertas antes da implementação. Entrega concluída no commit `ddbe1a1`, integrada e enviada à develop.

## Interface e comportamento

Composição própria para desktop claro/escuro e mobile: resumo circular, macronutrientes, plano vigente, calendário, seis categorias fixas e inclusão contextual. O cabeçalho e o seletor compartilham componentes com a estrutura existente. Ilustrações de categorias são decorativas; não representam refeições consumidas.

As seis categorias permanecem visíveis quando vazias. Somente registros conhecidos exibem valores; calorias e macros ausentes continuam distintos de zero, e totais parciais são identificados. Progresso contra o plano exige referências válidas; registro de refeição não é interpretado como aderência nutricional. A composição preserva esses estados mesmo quando a referência apresenta dados completos.

Adicionar em uma categoria abre o formulário existente e seleciona a refeição correspondente, preservando busca nutricional, favoritos, receitas, alimentos recentes, cópia e registros do plano. Reabrir um formulário após fechar funciona mesmo quando a URL já contém `registrar=1`. Alterações de composição continuam invalidando a confirmação existente.

Edição e exclusão individual e por grupo utilizam as ações e confirmações existentes. Projetos encerrados permanecem em consulta. O projeto ativo continua sendo resolvido no servidor para gravações. Offline não recebe uma nova forma de escrita.

## Arquitetura e dados

- `food-diary.tsx` extrai a apresentação da rota genérica, que preserva os fluxos dos demais módulos.
- `food-summary.tsx` e `food-groups.tsx` organizam resumo e categorias; `food.css` usa tokens semânticos compartilhados.
- `food-day.ts` reutiliza o cálculo nutricional existente. `food-day-data.ts` lê o dia completo em páginas de mil itens, com filtro autenticado por projeto/data e ordenação estável. Os vinte formulários por página não limitam os totais do dia.
- `ModuleContext`, `ModuleHeading` e `DisclosureLink` compartilham navegação, calendário e abertura contextual; links mantêm destino GET como alternativa.
- Nenhuma migração, alteração de API pública ou fórmula nutricional foi introduzida nesta fase.

Relacionamento: RF-006 a RF-009 e RNF-011, com preservação das regras de proprietário, projeto ativo, leitura histórica e valores desconhecidos.

## Validação

A primeira execução completa Chromium passou em 50 cenários, com um cenário opcional ignorado. No WebKit, a primeira execução completa teve 49 aprovados, um ignorado e uma falha na asserção final de ausência de exceções: pré-carregamentos de páginas privadas foram cancelados durante uma recarga. A navegação foi ajustada para não fazer esses pré-carregamentos. Os dois cenários direcionados finais (Alimentação e dashboard responsivo) passaram em 55,1s, mantendo a recarga e todas as asserções de erro.

O cenário novo persiste dados sintéticos em PostgreSQL isolado e cobre seis categorias, inclusão, calendário, Light/Dark, acessibilidade com axe, larguras 320/390/430/768/1366/1536, histórico somente leitura, exportação sem alterações e 1005 registros em um único dia. Os totais correspondem aos dados de teste, inclusive quando os números do protótipo não fecham entre si. Não são dados fictícios no fluxo de produção.

Build, TypeScript, ESLint e formatação locais aprovados após o ajuste. Os 83 testes de banco/unidade passaram, incluindo agregação com zero, desconhecidos, proporções e mais de mil registros. Os três cenários Chromium finais (Alimentação, dashboard desktop e responsividade) passaram em 30,9s. Os 26 cenários da jornada agent-browser foram aprovados, incluindo isolamento entre usuários, exportação, exclusão de conta, fotos e leitura offline. A CI remota completa foi aprovada no commit `ddbe1a1` ([44186765025](https://github.com/pauloluccasdev/diazen/actions/runs/44186765025)), incluindo banco, build, tipos, lint, formatação, Chromium, WebKit e agent-browser.

## Limites

Sem homologação em aparelho físico ou medição automatizada de diferença pixel a pixel. Não há declaração de aprovação visual pelo proprietário. A referência não fornece todos os estados vazios, parciais ou de consulta; esses estados seguem a mesma linguagem visual com informação verdadeira. O aviso de segurança preexistente do framework permanece registrado no discovery e não foi ocultado pela alteração de interface.

## Capturas

Capturas WebKit com conta sintética, convertidas para WebP e reduzidas à largura CSS para revisão:

- [Desktop claro](screenshots/phase-3-food/light-1536.webp)
- [Desktop escuro](screenshots/phase-3-food/dark-1536.webp)
- [Mobile 390](screenshots/phase-3-food/viewport-390.webp)
- [Mobile 320](screenshots/phase-3-food/mobile-320.webp)
- [Valores parciais](screenshots/phase-3-food/partial-390.webp)
- [Histórico vazio](screenshots/phase-3-food/empty-history-390.webp)

Prévia do commit `ddbe1a1`: Vercel READY e `/api/saude` respondeu 200 com acesso autenticado da ferramenta à prévia protegida. Verificação somente de leitura, sem usar sessão do proprietário ou gravar dados reais.
