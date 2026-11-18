# Fase 5 — Treinos

Branch `feat/diazen-v2-treinos-fiel`, criada da develop `496ee51`. Referências R07/R08 abertas antes da implementação. **Em validação; ainda não contabilizada como concluída.**

## Implementação

Desktop claro/escuro: quatro indicadores, frequência diária, distribuição por cinco modalidades, referência semanal do projeto, atalhos, quatro registros recentes e resumo semanal. Mobile: contexto/calendário compartilhados, resumo diário, imagem editorial existente, atalhos e recentes. Sem biblioteca adicional.

A rota `/painel/atividades` permanece. `TrainingDiary` separa apresentação das ações. `trainingEntries` consulta duas semanas com paginação autenticada; `recentTraining` consulta quatro registros até a data selecionada. O limite de vinte formulários diários não limita indicadores. Detalhes, edição, exclusão, calendário semanal, planejamento/anexos e integração Garmin existente continuam acessíveis abaixo da composição principal.

Atalhos selecionam a modalidade real e abrem o formulário. Registro usa confirmação modal e reset após sucesso; erro preserva campos. Recentes abrem o registro original, inclusive em outra data, sem copiar. Projeto encerrado é somente leitura; rascunho não recebe lançamentos.

## Métricas e integridade

- Frequência: quantidade registrada por dia/semana, sem inferir realização de um plano.
- Duração: soma de `duration_min`; durações inferiores a um minuto apresentam segundos.
- Calorias: soma dos valores informados. Todos ausentes mostram ausência; zero permanece zero. Ausência parcial recebe rótulo de subtotal parcial. Sem estimativa automática.
- Distância do indicador: soma de corrida e ciclismo, conforme rótulo. Natação permanece na distribuição/resumo.
- Distribuição: registros da modalidade divididos pelo total semanal; não copia percentuais inconsistentes do protótipo.
- Variação: `(atual - anterior) / anterior × 100`, em intervalos equivalentes das semanas, apenas com denominador positivo e dados comparáveis. Apresentação neutra não representa qualidade.
- Referência semanal: frequência atual configurada no projeto. Não é meta diária nem comprovação de aderência histórica. O anel mobile apresenta quantidade diária sem percentual inventado.

Sem migração, alteração de contrato público ou autorização. Ações existentes resolvem projeto ativo no servidor e isolam por proprietário.

## Volume de musculação

O cadastro não possui séries realizadas, repetições e cargas; a região do protótipo mostra **Indisponível**, sem tonelagem fictícia.

Uma ampliação futura exigiria exercícios/unidades, séries realizadas vinculadas à sessão, repetições/carga opcionais, tratamento explícito de exercícios unilaterais, peso corporal e assistência, versão de ficha e comparação por exercício compatível. Só séries completas poderiam compor `repetições × carga externa`, com cobertura parcial identificada e sem interpretar mais volume como melhor. Exige proposta de modelo/RLS/exportação/exclusão antes da execução; não foi adicionada silenciosamente nesta entrega.

## Verificações

- 92 testes de banco/unidade aprovados, incluindo quatro novos cenários de métricas: zero/ausente/parcial, intervalos equivalentes, mais de mil registros e duração inferior a um minuto.
- Build, TypeScript, ESLint e formatação aprovados.
- Jornada nova WebKit aprovada: temas, breakpoints, axe/overflow, registros consecutivos, reset, zero/ausente, edição em outra data, exportação sem duplicação, encerrado somente leitura e rascunho vazio.
- Chromium completo: 52 aprovados e um ignorado; cobre alimentação, hidratação, Garmin, fotos, projetos, privacidade e falhas recuperáveis.
- WebKit direcionado: registros, dashboard e nova jornada de Treinos aprovados (3/3), sem exceções inesperadas.
- 26 cenários agent-browser aprovados: autorização, registros/edição/exclusão, offline, segunda conta, paginação, exportação e exclusão de conta.
- Ajuste visual final agrupa atalhos e recentes à esquerda do resumo semanal, como R07, e compacta o hero mobile. Jornada Chromium final aprovada (1/1, 17,3 s), com capturas e axe em todos os breakpoints do cenário. Build, tipos, lint e formatação novamente aprovados. CI completa e integração pendentes.

Capturas usam usuários sintéticos isolados e a área do viewport, sem molduras. Sem homologação em aparelho físico, aprovação visual do proprietário ou medida pixel a pixel. Configurações e consentimentos Garmin hospedados não foram alterados.

## Capturas da versão final

- [Desktop claro 1672](screenshots/phase-5-training/light-1672.webp)
- [Desktop escuro 1672](screenshots/phase-5-training/dark-1672.webp)
- [Notebook 1366](screenshots/phase-5-training/light-1366.webp)
- [Mobile 390](screenshots/phase-5-training/viewport-390.webp)
- [Mobile 320](screenshots/phase-5-training/viewport-320.webp)
- [Tablet 768](screenshots/phase-5-training/viewport-768.webp)
- [Rascunho vazio](screenshots/phase-5-training/empty-draft-390.webp)

A sidebar/header seguem a navegação canônica já adotada, preservando busca real e seletor de projeto. Não há sino sem comportamento. Calorias são informadas, não estimadas; o anel diário não inventa meta. O resumo semanal atual não presume metas históricas versionadas. A composição principal mantém os fluxos extras existentes abaixo da região ilustrada.
