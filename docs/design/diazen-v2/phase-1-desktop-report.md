# Fase 1 — Dashboard desktop

Implementação em `feat/diazen-v2-desktop-fiel`, a partir da develop com discovery integrado. Autorização posterior do proprietário permite executar todas as fases sem pausas de aprovação; progresso em [execution-status.md](execution-status.md).

## Alterações

- Tokens semânticos centralizados em `src/styles/diazen-v2/tokens.css`; desktop Light/Dark com persistência em cookie de aparência e leitura SSR. Mobile continua dark; autenticação pública será tratada na Fase 10.
- Header com busca real de páginas e ações por botão/Ctrl+K/Cmd+K, modal com foco e Escape; menu de conta e controle de tema. Sem notificações simuladas.
- Sidebar com proporções desktop; projeto/data na faixa da saudação, navegação anterior/próxima e calendário por GET. Consulta não ativa projeto nem grava dados.
- Métricas e nova composição: peso por período com eixo temporal e primeiro registro, distribuição energética de macros, registros recentes de atividade/alimentação/peso, comparação semanal e progresso temporal do projeto. Gráficos e legendas distinguem nulo, zero e parcial.
- Períodos de 7/30/90 dias ou projeto. Leituras completas/paginadas e autenticadas, sem alteração de API pública, schema, RPC de cálculo ou comandos de gravação.
- Plano/consumo, fases, check-in, sono, preferências e acesso ao histórico continuam disponíveis. Comparação detalhada do plano fica em disclosure para preservar a composição principal.
- Texto sobre imagem do card de projeto ativo no tema claro deixa de herdar fundo escuro incompatível; a composição completa de Projetos pertence à Fase 8.

## Arquivos e responsabilidades

`app/painel/layout.tsx`, `components/panel-shell.tsx` e `components/shell/desktop-tools.*` fornecem shell e preferência SSR. `components/dashboard/date-navigator.tsx`, `insights.tsx`, `insight-charts.tsx`, `dashboard.css` e ProjectSelector compõem a apresentação. `lib/dashboard-data.ts` concentra novas leituras; `dashboard-metrics.ts` agrega calorias por data, define períodos e calcula proporções energéticas. Página existente conserva contexto, preferências, resumos e gravações globais no ACTIVE.

O simulador de Auth dos testes passa a emitir/registrar token no momento do login e do callback, mantendo a duração de uma hora. Antes reutilizava token criado ao iniciar o laboratório; um salto do relógio do ambiente podia vencê-lo antes do login. Sem mudança na autenticação de produção ou aumento de TTL. O cenário responsivo aguarda URL e título do destino para não interagir com o formulário da rota anterior durante uma navegação.

## Verificação e evidências

Fluxo verificado: interface → consultas/autenticação no servidor → PostgreSQL embarcado com RLS → indicadores renderizados → alteração de tema/período/data → exportação comprova que registros não foram alterados.

- Build de produção, TypeScript, ESLint e formatação: aprovados localmente.
- Três testes de cálculo: dias bissextos/períodos, zero/nulo/subtotal por data e proporções energéticas, aprovados.
- Jornadas Chromium direcionadas de alimentação, porção zero, atividades, acompanhamento e dashboard passaram durante a implementação. A revisão completa identificou acessibilidade do rótulo da data e alvo de toque em1024px; corrigidos sem relaxar o axe.
- Última execução direcionada Chromium: os dois cenários de dashboard passaram (20,6s), incluindo Light/Dark, HTML inicial do tema, busca/Escape, períodos, datas, ausência de exceções e exportação inalterada.
- Última execução direcionada WebKit: seis cenários aprovados (1,5min), cobrindo desktop/responsividade, alimentação/porção zero, atividades e acompanhamento. CI completa em execução no commit `350f774`: [Qualidade](https://github.com/pauloluccasdev/diazen/actions/runs/44109073955). Não declarar homologação em iPhone físico.

React: efeitos somente para atalhos e fechamento externo, com cleanup; estado de tema inicial vem do servidor; leituras independentes em paralelo, sem cliente administrativo; dados de saúde não entram em índice global de busca ou cookie. SVG usa strings únicas nos títulos e papéis explícitos nos pontos focáveis, preservando correções de hidratação e compatibilidade WebKit.

## Revisão visual

Referência R01 aberta e comparada com capturas em1672×941. Versões notebook1366×768 e amplo1920px foram capturadas. Sidebar, header, quatro métricas, painel peso/macros e três painéis inferiores reproduzem a composição; tema dark conserva geometria. As capturas são de conta/dados sintéticos no laboratório, nunca produção.

- [Light1672](screenshots/phase-1-desktop/light-1672.png)
- [Dark1672](screenshots/phase-1-desktop/dark-1672.png)
- [Notebook light](screenshots/phase-1-desktop/light-1366.png)
- [Notebook dark](screenshots/phase-1-desktop/dark-1366.png)

Adaptações explícitas: meta de treino semanal, não meta diária inventada; dias restantes/primeiro peso/sessões reais substituem hábitos sem modelo; séries semanais mostram apenas dias equivalentes já decorridos; saudação neutra até existir nome pessoal; avatar é ícone enquanto não houver foto cadastrada. Datas/valores de referência são substituídos pelos dados do cenário. A semântica de unidades e os componentes compartilhados continuam sendo refinados nas fases seguintes.

Não houve medição automatizada de equivalência pixel a pixel nem aprovação visual do proprietário. Não se afirma desvio máximo4px para todos os elementos. As imagens aprovadas contêm pequenas inconsistências numéricas que não foram transformadas em regras. O aviso moderado preexistente de Next continua documentado no discovery, sem alteração de dependência nesta entrega.
