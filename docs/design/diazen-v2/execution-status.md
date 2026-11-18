# Diazen 2.0 — progresso da execução

Atualizado em 18/11/2026. Base documental aprovada: `997afe0`.

## Autorização vigente

Após o discovery, o proprietário autorizou seguir por todas as fases sem pausas de aprovação entre entregas, avisando caso uma decisão seja necessária. Essa instrução substitui os gates de pausa descritos nos documentos da Fase 0. Permanecem as exclusões de escopo, as regras de segurança/integridade e o fluxo Git com integração em develop; main continua sob responsabilidade do proprietário. As propostas de implementação e leituras apresentadas na matriz orientam a execução. Não há autorização para migração destrutiva, exposição de dados ou prescrição.

## Ampliações aprovadas

Em 17/11/2026, o proprietário aprovou recipientes de água salvos e perfil com nome opcional/avatar privado, conforme §5 B/C da matriz funcional. Execução aditiva nas fases 4 e 9, com RLS e ciclo completo de privacidade. Migração dos recipientes `202611170019` aplicada e verificada; interface da Fase 4 concluída e verificada. Perfil/avatar permanecem pendentes.

## Quadro geral

**6 de 11 fases concluídas (55%).** Percentual por quantidade de fases, não estimativa de horas ou esforço.

| Fase | Entrega                         | Estado                |
| ---- | ------------------------------- | --------------------- |
| 0    | Discovery técnico e visual      | Concluída — `997afe0` |
| 1    | Dashboard desktop, claro/escuro | Concluída — `2c94fc7` |
| 2    | Dashboard mobile e tablet       | Concluída — `8454f8c` |
| 3    | Alimentação                     | Concluída — `ddbe1a1` |
| 4    | Hidratação                      | Concluída — `0ed58fb` |
| 5    | Treinos                         | Concluída — `4b740b4` |
| 6    | Evolução corporal               | Em execução           |
| 7    | Fotos de evolução               | Pendente              |
| 8    | Projetos                        | Pendente              |
| 9    | Perfil e configurações          | Pendente              |
| 10   | Autenticação                    | Pendente              |

## Fase 1 — verificada

- [x] Tokens de tema e alternância desktop com persistência por navegador e estado inicial SSR.
- [x] Busca de páginas/ações, menu de conta e navegação de datas.
- [x] Leituras autenticadas para comparativo semanal, registros recentes e peso por período.
- [x] Nova composição peso/macros e três painéis inferiores, com dados reais e estados parciais.
- [x] Testes de cálculo: nulos, zero, proporções energéticas e datas.
- [x] Build de produção.
- [x] Revisão visual contra R01 em notebook/amplo, light/dark; diferenças funcionais documentadas.
- [x] Jornadas direcionadas Chromium/WebKit e fluxos pertinentes; seis cenários WebKit aprovados.
- [x] CI completa aprovada no commit `2c94fc7` ([execução 44111144869](https://github.com/pauloluccasdev/diazen/actions/runs/44111144869)); integração na develop nesta entrega.

Uma fase só muda para concluída com evidência de implementação e verificação. Séries realizadas/tonelagem e demais extensões condicionais da matriz não são contabilizadas como entregues pelo simples redesign de suas regiões.

## Fase 2 — verificada

- [x] Referência R02 e composição mobile/tablet revisadas.
- [x] Hero/seletor único, calendário, cartões e quatro atalhos funcionais.
- [x] Dados reais, valores ausentes/parciais e diferença neutra de peso.
- [x] Acessibilidade e overflow em 320/390/430/768/1024 e regressão desktop.
- [x] Build, TypeScript, ESLint e formatação locais.
- [x] Três cenários Chromium e três WebKit direcionados aprovados.
- [x] Capturas e relatório [phase-2-mobile-report.md](phase-2-mobile-report.md).
- [x] CI completa do commit `e7f5ca0` aprovada ([44118454686](https://github.com/pauloluccasdev/diazen/actions/runs/44118454686)).
- [x] Ajuste adicional de tablet: build, dois cenários Chromium e dois WebKit aprovados; integração na develop nesta entrega.
- [x] CI do ajuste final `8454f8c` aprovada ([44124581261](https://github.com/pauloluccasdev/diazen/actions/runs/44124581261)); integrado e enviado à develop.

## Fase 3 — verificada

- [x] R03/R04, seis categorias, desktop claro/escuro, mobile e calendário.
- [x] Busca/registro, edição, exclusão, cópia, plano e valores parciais preservados.
- [x] Totais completos com 1005 lançamentos, paginação e consulta somente leitura.
- [x] 83 testes de banco/unidade e 26 cenários agent-browser aprovados localmente.
- [x] Build, tipos, lint e formatação aprovados; regressão final Chromium 3/3 e WebKit 2/2.
- [x] CI completa do commit `ddbe1a1` aprovada ([44186765025](https://github.com/pauloluccasdev/diazen/actions/runs/44186765025)); integrado e enviado à develop.
- [x] Relatório e capturas em [phase-3-food-report.md](phase-3-food-report.md).

## Fase 4 — verificada

- [x] R05/R06, desktop claro/escuro, mobile/tablet, metas temporais e gráficos reais.
- [x] Recipientes da conta, consumo, edição/exclusão, atalhos e reset de formulário.
- [x] Migração `202611170019` aplicada e verificada; exportação, RLS e cascade.
- [x] 88 testes de banco/unidade, 26 cenários agent-browser e ensaio PostgreSQL de restauração aprovados.
- [x] Capturas, axe e overflow; edição em 320 px e registros consecutivos no WebKit.
- [x] Build, tipos, lint e formatação locais.
- [x] CI completa de `0ed58fb` aprovada ([44215004775](https://github.com/pauloluccasdev/diazen/actions/runs/44215004775)); integrado e enviado à develop.
- [x] Prévia READY, saúde 200 e rota privada sem sessão redireciona (307); verificação somente de leitura.

Manutenção de dependências integrada na develop em `496ee51`, com CI completa aprovada ([44218101467](https://github.com/pauloluccasdev/diazen/actions/runs/44218101467)). Não conta como uma fase adicional. Fase 5 concluída; Fase 6 em execução.

## Fase 5 — verificada

- [x] R07/R08, cinco modalidades, desktop claro/escuro e mobile/tablet.
- [x] Indicadores paginados, calorias parciais, nulos/zero e intervalos semanais equivalentes.
- [x] Atalhos reais, reset/modal, edição de outro dia e consultas somente leitura.
- [x] 92 testes de banco/unidade, Chromium completo (52 aprovados/1 ignorado), WebKit direcionado (3/3) e 26 cenários agent-browser locais.
- [x] Build, tipos, lint, formatação, axe/overflow e capturas finais aprovados.
- [x] CI completa de `4b740b4` aprovada ([44304490660](https://github.com/pauloluccasdev/diazen/actions/runs/44304490660)); integrado e enviado à develop.
- [x] Prévia READY; nenhuma alteração de banco, estimativa de gasto ou tonelagem inventada.
- [x] Relatório e capturas em [phase-5-training-report.md](phase-5-training-report.md).
