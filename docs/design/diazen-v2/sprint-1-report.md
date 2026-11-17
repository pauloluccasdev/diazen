# Diazen 2.0 — entrega da Sprint 1

## Alterações e componentes

Estrutura protegida com sidebar amarela no desktop (>=1024 px), navegação inferior no mobile/tablet, menu Mais acessível por toque/teclado/Escape, cabeçalho com marca/conta e link para pular diretamente ao conteúdo. Menu fecha ao sair do foco ou tocar fora. Rotas de configurações, fotos, evolução e módulos existentes permanecem disponíveis.

Dashboard com hero do projeto no mobile, consulta de projeto/data, visão diária, indicadores, ações rápidas e grid de informações no desktop. O andamento temporal é identificado como tempo decorrido, sem inferir aderência. São reaproveitados peso/gráfico, nutrientes/plano, totais reais das atividades, hidratação, check-in, fases e sono. O acompanhamento diário fica em disclosure; ocultar fotografias também retira seus atalhos da navegação enquanto o dashboard está em consulta.

Criados: `PanelShell`, `ProjectSelector`, `ProjectTimeline`, `QuickActions` e a camada `src/app/diazen-v2.css`. Reutilizados: ProgressRing, WeightChart, CalorieBalance, DayOverview, SleepCard, OfflineSnapshot e LogoutButton. WeightChart recebe apenas correção na emissão do texto acessível do SVG, sem alteração de desenho/dados/cálculo.

Arquivos principais: `src/app/layout.tsx`, `src/app/painel/layout.tsx`, `src/app/painel/page.tsx`, `src/app/diazen-v2.css`, `src/components/panel-shell.tsx`, `src/components/dashboard/*`, `src/components/weight-chart.tsx`; documentação em `docs/design/diazen-v2/` e decisão posterior em `docs/decisoes-tecnicas.md`.

Testes atualizados para a nova navegação/composição: auth, registros, projetos, atividades e acompanhamento. Novo cenário `tests/redesign-dashboard.spec.ts`, com conta sintética isolada adicionada à fixture de Auth. Não há fixture no fluxo de produção.

## Funcionalidades preservadas

Não há alterações de backend, API, banco/migrações, dependências, serviços ou autenticação. Consultas continuam com a conta autenticada e agregações existentes. Selecionar um projeto para consulta não o ativa. Gravações continuam resolvendo ACTIVE no servidor; COMPLETED/ARCHIVED permanecem somente leitura. Ausência não vira zero, parciais continuam identificados, nenhuma calorimetria ou composição corporal é estimada. Metas só aparecem quando existentes. Preferências continuam omitindo indicadores e resumo offline correspondente. Fotos, Storage privado, exclusão, exportação, Garmin e cache offline não foram alterados.

## Verificação

- Build de produção, TypeScript, ESLint e Prettier verificados. O CLI Next apresenta aviso de segurança preexistente antes de permitir a repetição do build; ver ressalva abaixo.
- Chromium completo: 48 aprovados e um cenário opcional de amostras privadas ignorado. Repetido após correção do SVG, com ausência de exceções no novo cenário.
- WebKit completo no laboratório local: 48 aprovados e um cenário opcional ignorado. Biblioteca nativa e launcher de teste ficaram somente em artefatos locais, sem instalação no produto.
- Novo cenário: criação/registro via interface, totais persistidos, zero alteração ao consultar outra data, uma única conta/projeto ACTIVE, menu por teclado/Escape, ausência de exceções e axe/overflow em 320/390/768/1024/1440 px. Reflow adicional em 720 px.
- A CI Qualidade executa novamente banco, formato, lint, build, tipos, Chromium, WebKit e auditoria agent-browser. Consultar o resultado associado ao commit da branch.
- Evidências são exclusivamente de contas/dados sintéticos do laboratório. Inspeção visual realizada em navegador, comparando os dois protótipos de dashboard; não representa homologação em aparelho físico.

## Capturas

Arquivos versionados para revisão, gerados do aplicativo em funcionamento:

| Composição      | Captura                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Mobile estreito | [320 px](screenshots/dashboard-320.png)                                                                |
| Mobile          | [390 px, página completa](screenshots/dashboard-390.png) · [viewport](screenshots/viewport-390.png)    |
| Tablet          | [768 px](screenshots/dashboard-768.png)                                                                |
| Desktop inicial | [1024 px](screenshots/dashboard-1024.png)                                                              |
| Desktop amplo   | [1440 px, página completa](screenshots/dashboard-1440.png) · [viewport](screenshots/viewport-1440.png) |

Capturas adicionais de WebKit e estados vazios estão em `artifacts/diazen-v2/` no workspace, fora do Git. Em página completa, a navegação fixa aparece na posição do viewport da captura; na aplicação, o conteúdo continua rolável e possui espaço inferior reservado.

## Adaptações justificadas e pendências

Mantidos os elementos visuais estruturais dos protótipos: temas, sidebar, bottom navigation, hero, hierarquia, grid e identidade. Não foram criados busca global, notificações, avatar pessoal fictício, comparação semanal, metas diárias de treinos ou índices de hábitos de fachada. O gráfico nutricional não atribui percentuais energéticos a dados incompletos; mostra quantidades reais e comparação do plano somente quando disponível. O gráfico de peso mostra medições, não uma tendência fabricada para dias ausentes. Foi reutilizada a fotografia editorial existente.

Módulos posteriores recebem o shell e os tokens compartilhados, preservando seus formulários/listas até suas próprias sprints. A revisão visual do proprietário e teste em Safari/iPhone físico continuam necessários. Zoom nativo de 200% em aparelho físico não foi homologado; houve teste de reflow em viewport reduzido, não declaração de equivalência com zoom real. O seletor utiliza a lista existente de até 20 projetos mais selecionado/ativo; a listagem completa continua em Projetos.

Risco operacional preexistente: `npm audit --omit=dev` aponta um aviso moderado no Next.js 16.4.2, [GHSA-mfr8-8qww-v76h](https://github.com/advisories/GHSA-mfr8-8qww-v76h). A combinação descrita de `use cache`/`unstable_cache` com root params não aparece no código atual. Recomenda-se manutenção separada para atualização de segurança; a dependência não foi alterada nesta sprint visual. Não há achado de exploração nesta verificação.

## Próxima sprint

Sprint 2 — Alimentação, somente após aprovação explícita: inspecionar seus dois protótipos, redesenhar diário/seis categorias fixas/resumo/busca/registro/edição/exclusão, preservando snapshots, unidades e composição. Nenhuma implementação dessa sprint foi iniciada.

A auditoria agent-browser também foi executada localmente, incluindo ausência de exceções, dados desconhecidos/zero, offline, exportação, privacidade, histórico fechado e isolamento de outra conta. O relatório de execução fica em `artifacts/agent-browser/`.
