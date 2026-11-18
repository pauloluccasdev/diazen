# Fase 6 — Evolução corporal

Branch `feat/diazen-v2-evolucao-corporal`, criada da develop `4b740b4`. R09 aberta antes da implementação; reproduzidas as regiões úteis mobile e desktop do composto. **Em execução; ainda não contabilizada como concluída.**

## Implementação

`EvolutionDiary` substitui a apresentação genérica de peso/medidas, mantendo `/painel/peso` e `/painel/medidas`. Desktop claro/escuro: tabs Peso/Medidas/Fotos, calendário, período, peso atual, referência opcional, diferença neutra, gráfico, histórico e ações reais. Mobile: contexto compacto, calendário pelo botão do cabeçalho, hero com fotografia editorial existente, gráfico âmbar legível, referência/diferença quando configuradas e registro rápido. A imagem é decorativa e não uma fotografia pessoal.

`TimeSeriesChart` foi reaproveitado com variante compacta opcional. A geometria padrão do dashboard permanece; no mobile os eixos não são reduzidos a texto ilegível. As duas composições usam os mesmos dados autorizados, sem duplicar consultas. As curvas conectam medições registradas; não geram valores nos dias sem peso.

Medidas apresentam o último valor de cada tipo e sua data. Tipos não informados não viram zero. O histórico permite edição/exclusão e a comparação usa o registro anterior do mesmo tipo. Fotos permanecem em sua rota e recebem o redesign na fase seguinte.

## Dados, fórmulas e integridade

- Leitura autenticada paginada de todos os registros do projeto até a data consultada; selects limitados aos campos necessários. Nenhuma nova tabela ou alteração de contrato público.
- Períodos de 7, 30 e 90 dias são intervalos de calendário inclusivos, limitados ao início do projeto. “Todo o projeto” usa seu início. Não confundir trinta dias com trinta medições. Histórico pagina vinte registros e conserva projeto/data/período nos links.
- Peso atual é a última medição até a data consultada, com sua data explícita, mesmo quando está fora do período do gráfico.
- Variação absoluta: `atual - anterior`; percentual: diferença dividida pelo anterior positivo, multiplicada por cem. Ambas as datas são identificadas. Não classificar automaticamente redução como melhora.
- Meta aparece apenas nos modos alvo/faixa configurados. Diferença é o peso atual menos o limite mais próximo quando fora da referência; dentro da faixa é zero. Não equivale a aderência, diagnóstico ou meta prescrita pelo aplicativo.
- Medidas comparam centímetros do mesmo tipo em datas reais, sem inferir composição corporal.
- Criação usa as ações e RPCs existentes, com projeto ativo resolvido no servidor e unicidade por usuário/data (peso) e usuário/tipo/data (medidas). Sucesso abre feedback modal e reseta campos; erro preserva preenchimento. Edição de peso mantém sua data no formulário e atualiza o valor dessa data. Edição não cria um segundo peso para a mesma data.
- Projetos concluídos/arquivados são somente leitura; DRAFT não recebe registros. Exportação, exclusão da conta, RLS e armazenamento permanecem nos fluxos existentes.

Composição corporal e IMC não são calculados: o modelo auditado não contém os dados/métodos necessários. A região equivalente do protótipo apresenta ausência explícita, sem fatias ou percentuais fictícios e sem classificação corporal.

## Componentes e estilos

Novos `evolution-data.ts`, `evolution-metrics.ts` e `components/evolution/`. Reuso de ModuleContext/ModuleHeading, ActionForm, ActionDisclosure, RecordFields, DisclosureLink e TimeSeriesChart. Calendário preserva o período e Escape devolve foco ao acionador visível. O seletor de período fecha ao mudar a consulta. `--v2-on-primary` centraliza o texto escuro sobre amarelo nos tabs. Ícone vetorial local de balança segue a linguagem dos ícones existentes; nenhuma biblioteca foi adicionada.

## Verificações

- 97 testes de banco/unidade aprovados, incluindo cinco novos cenários de períodos/datas, alvo/faixa opcionais, ausência, comparação por tipo e mais de mil datas.
- Build, TypeScript, ESLint e formatação aprovados.
- Chromium: regressão completa executada (53 aprovados, um ignorado; a fixture do histórico longo precisava de uma meta mensurável para ativar o projeto). Após corrigir somente a fixture, as duas jornadas de Evolução passaram em 21,0 s. Não foram relaxadas constraints, asserções ou timeouts.
- WebKit: duas jornadas finais aprovadas em 38,9 s, além da regressão do cartão de atividades/registro de peso. Filtros, calendário por teclado/Escape, registro/reset, edição/exclusão, metas/faixas opcionais, ausência de composição, exportação e consultas somente leitura exercitados.
- Histórico longo real no PostgreSQL da fixture: 1.005 pesos e 1.005 medidas em datas distintas, gráfico completo, paginação até a última página e exportação sem truncamento. O teste de curva também verifica espaçamento proporcional entre datas irregulares, em vez de pontos equidistantes por índice.
- Axe/overflow em 320/390/768/1366/1672, desktop claro/escuro, medidas e rascunho vazio. Capturas sem molduras externas e somente com usuários sintéticos.
- Validação final do cabeçalho compartilhado: Evolução (duas jornadas) e Alimentação aprovadas em Chromium (3/3, 23,6 s); inclui nome de projeto de 98 caracteres sem espaços em 320 px.
- 26 jornadas agent-browser aprovadas: autorização, registros/edição/exclusão, offline, segunda conta, paginação, exportação e exclusão de conta. O roteiro fecha o novo modal de peso/medidas antes de registrar novamente e verifica o reset. CI completa pendente; a fase permanece em execução até concluir as verificações.

## Capturas

- [Desktop claro](screenshots/phase-6-evolution/light-1672.webp)
- [Desktop escuro](screenshots/phase-6-evolution/dark-1672.webp)
- [Notebook](screenshots/phase-6-evolution/viewport-1366.webp)
- [Mobile 390](screenshots/phase-6-evolution/viewport-390.webp)
- [Mobile 320](screenshots/phase-6-evolution/viewport-320.webp)
- [Tablet](screenshots/phase-6-evolution/viewport-768.webp)
- [Medidas](screenshots/phase-6-evolution/measurements-1672.webp)
- [Rascunho vazio](screenshots/phase-6-evolution/empty-draft-390.webp)
- [Nome longo em 320](screenshots/phase-6-evolution/long-name-320.webp)

A referência contém redução de peso em verde, composição e IMC sem dados do projeto. A implementação mantém a composição visual, mas usa variação neutra, metas reais opcionais e ausência explícita nas regiões sem método/dados. A linha ciano usa o token de contraste para dados no desktop claro. Nenhum percentual corporal ou classificação é inventado.

Sem homologação em aparelho físico, aprovação visual do proprietário ou comparação pixel a pixel. Nenhuma migração ou prescrição foi feita nesta fase.
