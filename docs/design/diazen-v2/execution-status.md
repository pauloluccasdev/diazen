# Diazen 2.0 — progresso da execução

Atualizado em 17/11/2026. Base documental aprovada: `997afe0`.

## Autorização vigente

Após o discovery, o proprietário autorizou seguir por todas as fases sem pausas de aprovação entre entregas, avisando caso uma decisão seja necessária. Essa instrução substitui os gates de pausa descritos nos documentos da Fase 0. Permanecem as exclusões de escopo, as regras de segurança/integridade e o fluxo Git com integração em develop; main continua sob responsabilidade do proprietário. As propostas de implementação e leituras apresentadas na matriz orientam a execução. Não há autorização para migração destrutiva, exposição de dados ou prescrição.

## Ampliações aprovadas

Em 17/11/2026, o proprietário aprovou recipientes de água salvos e perfil com nome opcional/avatar privado, conforme §5 B/C da matriz funcional. Execução aditiva nas fases 4 e 9, com RLS e ciclo completo de privacidade; não implementadas ainda.

## Quadro geral

**2 de 11 fases concluídas (18%).** Percentual por quantidade de fases, não estimativa de horas ou esforço.

| Fase | Entrega                         | Estado                |
| ---- | ------------------------------- | --------------------- |
| 0    | Discovery técnico e visual      | Concluída — `997afe0` |
| 1    | Dashboard desktop, claro/escuro | Concluída — `2c94fc7` |
| 2    | Dashboard mobile e tablet       | Em execução           |
| 3    | Alimentação                     | Pendente              |
| 4    | Hidratação                      | Pendente              |
| 5    | Treinos                         | Pendente              |
| 6    | Evolução corporal               | Pendente              |
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

## Fase 2 — verificação em andamento

- [x] Referência R02 e composição mobile/tablet revisadas.
- [x] Hero/seletor único, calendário, cartões e quatro atalhos funcionais.
- [x] Dados reais, valores ausentes/parciais e diferença neutra de peso.
- [x] Acessibilidade e overflow em 320/390/430/768/1024 e regressão desktop.
- [x] Build, TypeScript, ESLint e formatação locais.
- [x] Três cenários Chromium e três WebKit direcionados aprovados.
- [x] Capturas e relatório [phase-2-mobile-report.md](phase-2-mobile-report.md).
- [ ] CI completa e integração na develop.
