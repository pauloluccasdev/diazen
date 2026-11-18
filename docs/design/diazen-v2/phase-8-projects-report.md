# Fase 8 — Projetos

Em execução na branch `feat/diazen-v2-projetos`. Base atualizada com Fotos `a2bca3f`, cuja CI completa foi aprovada antes da integração na develop. R11 aberta e analisada antes da implementação. Esta fase ainda não está concluída.

## Implementação em validação

Diretório com projeto ativo em destaque, cartões secundários, cinco filtros explícitos (Todos, Ativo, Planejados, Concluídos e Arquivados), contagens reais, paginação e criação. O protótipo mostra mais de um projeto em andamento: a implementação preserva somente um ACTIVE; rascunhos aparecem como Rascunho e têm filtro Planejados. Consultar um cartão abre o dashboard desse projeto, sem ativá-lo.

Desktop claro/escuro: capa editorial, período, barra cronológica, peso com data, referência opcional e diferença neutra entre duas datas. Mobile: cabeçalho próprio, navegação inferior, destaque compacto, informações e ações acessíveis. As imagens são decorativas da marca; não são fotos pessoais, capas cadastradas pelo usuário ou descrição inferida de um objetivo.

Menu de cada cartão abre gerenciamento em diálogo nativo. Mantidos criação, nome, metas, vigência de água, datas de rascunho, ativação, conclusão e arquivamento. Exclusão mantém o diálogo existente com nome e confirmação. Encerrados só permitem consulta e a exclusão explicitamente autorizada para privacidade; não recebem editor operacional.

Feedback centralizado em `ProjectFeedbackProvider`, fora dos cartões: uma mudança de estado pode remover o cartão ativo sem apagar sua confirmação. `ProjectActionForm` reutiliza ActionForm com modo de feedback externo; os modos padrão inline/modal dos outros módulos permanecem. Sucesso de criação reseta os campos e fecha o diálogo; erro mantém preenchimento e permite voltar ao formulário.

## Dados e regras

- `allProjects` lê todas as páginas autorizadas; contagens não representam somente vinte cartões. Ordenação coloca ACTIVE em destaque, mantendo o restante na ordem de criação. Filtros e paginação são consultas, sem alterações dos projetos.
- Tempo é calendário inclusivo: diferença entre a data consultada e o início, mais um, limitada ao prazo quando definido. Projetos futuros ficam em zero; sem término, não se calcula percentual. Encerramento congela o tempo na data real de São Paulo. Nada disso representa execução, aderência ou resultado físico.
- Peso considera o primeiro e o último registro daquele projeto até hoje; cada data fica explícita. Diferença é último menos primeiro, somente quando há duas datas distintas; redução não recebe classificação de sucesso.
- Referências alvo/faixa aparecem apenas quando cadastradas. Sem peso configurado, pode aparecer a referência semanal de sessões, se existente. Sem ambas, o grid se reorganiza, sem criar uma meta.
- Ações e contratos de escrita existentes preservados; novas leituras autenticadas previstas na matriz, sem tabela, comando de escrita ou migração novos. Autenticação, RLS, unicidade ACTIVE e guardas de estado continuam no servidor.
- Pré-requisitos reais inspecionados somente por metadados: função `delete_project(uuid,text)`, índice único ACTIVE, RLS e política proprietária presentes. O ledger remoto não registra 013, embora a função exista; não reaplicamos/resetamos migrações. Nenhuma linha pessoal foi consultada.

## Evidências parciais

- Quatro testes novos de métricas aprovados: contagens acima de mil, limites de datas, encerramento no fuso correto e referências opcionais. Suíte de banco/unidade com 108 aprovados.
- Build, TypeScript, lint e formatação aprovados na implementação atual.
- Nova jornada Chromium e WebKit aprovada: dados reais sintéticos, claro/escuro, 320/390/768/1366/1672, axe/overflow, conflito de ativação, erro preserva formulário, rascunho/reset, confirmação de encerramento, feedback após mudança de cartão, consulta somente leitura e paginação acima de vinte.
- Quatro jornadas direcionadas Chromium finais aprovadas (15,3 s): redesign, onboarding/histórico, validação futura e exclusão com confirmação/offline/limpeza de fotos. Os roteiros passaram a abrir os diálogos reais e selecionar seus campos, preservando asserções e comandos de negócio.

- Regressão Chromium completa executada: 55 aprovados, um ignorado e uma falha somente na expectativa do título anterior em recuperação de erro. O teste mantém a falha de leitura real e a tentativa novamente; passou no WebKit após atualizar título e ação de criação.
- Sete jornadas finais WebKit aprovadas em 1,0 min: redesign, validação, onboarding, exclusão, dois encerramentos concorrentes e recuperação da indisponibilidade. Mantidas confirmação, isolamento, datas, bloqueio offline e ausência de erros inesperados.

## Capturas

- [Desktop claro](screenshots/phase-8-projects/light-1672.webp)
- [Desktop escuro](screenshots/phase-8-projects/dark-1672.webp)
- [Notebook](screenshots/phase-8-projects/viewport-1366.webp)
- [Mobile 390](screenshots/phase-8-projects/viewport-390.webp)
- [Mobile 320](screenshots/phase-8-projects/viewport-320.webp)
- [Tablet](screenshots/phase-8-projects/viewport-768.webp)
- [Sem projeto ativo no filtro](screenshots/phase-8-projects/empty-active-1672.webp)

Capturas após carregamento e fontes prontos, sem molduras e com dados sintéticos. A referência agrupa estados de forma incompatível com um único ACTIVE; foram acrescentados filtros explícitos, mantidos valores reais e diferenças neutras. Não houve homologação em aparelho físico, aprovação visual do proprietário ou comparação pixel a pixel.

As 26 jornadas agent-browser finais passaram, incluindo edição de nome/metas, meta temporal de água, confirmação de conclusão/arquivamento, seleção histórica sem trocar o destino das gravações, paginação, autorização, exportação e exclusão da conta. O roteiro abre diálogos e controles nativos pelo teclado; a abertura automática dos grupos foi limitada ao gerenciamento de Projetos, sem interferir nos menus de água/treinos.

CI completa pendente de envio desta entrega. Não contabilizar a fase como concluída antes desse gate.
