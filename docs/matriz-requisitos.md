# Rastreabilidade e evidências — MVP 0.1

“Implementado/local” significa código presente e teste local pertinente; não significa homologação ou aprovação para produção. As dependências reais estão em `docs/operacao.md`.

Os fluxos essenciais também passaram no Supabase real em 21/10/2026. Consulte [as evidências específicas](homologacao-supabase.md), incluindo concorrência, isolamento do Storage e exclusão completa; os demais gates de lançamento continuam pendentes.

| RF | Implementação | Evidência local / limite |
| --- | --- | --- |
| 001 | Cadastro, login/logout, confirmação, recuperação, nova senha | `tests/auth.spec.ts`; PKCE com verificador criptográfico no provider simulado. Login e renovação também no Auth real; proprietário confirmou recebimento e troca de senha pelo e-mail padrão. Confirmação de cadastro e expiração natural pendentes. |
| 002–005 | Projetos, onboarding, metas e estados | `tests/projects.spec.ts`, `tests/database/core.test.mjs`; criação/ativação atômicas, filtro por estado antes da paginação, edição de datas somente em DRAFT preservando metas e histórico somente leitura. |
| 006–007 | Diário manual e composição informada por referência | `tests/records.spec.ts`, agregações SQL; sem catálogo externo ou nutrientes inventados. |
| 008 | Calendário de sete dias navegável e confirmação manual | Teste de confirmação e invalidação por edição; conclusão não indica aderência. |
| 009 | Biblioteca privada, receitas por ingredientes, favoritos, recentes e cópia confirmada | Inclusão aprovada pelo proprietário em 22/10/2026. `tests/food-library.spec.ts` e `tests/database/food-library.test.mjs`: snapshots, ausência ≠ zero, isolamento, cópia além da paginação e replay sem duplicação. |
| 010–011 | Hidratação e versões de meta | Soma/edição no browser e teste SQL de versão histórica imutável. |
| 012–013 | Atividades manuais e sessões semanais | Persistência e distância requerida por modalidade no browser/banco; sessões ausentes não viram zero confirmado. |
| 014 | Peso único e substituição auditada | Testes SQL de unicidade, substituição e valor anterior; histórico encerrado não é transferido. |
| 015 | Circunferências parciais e únicas | RPC transacional, teste de subconjunto inválido revertendo integralmente. |
| 016–017 | Fotos privadas e comparação | `tests/photos.spec.ts`, `tests/database/images.test.mjs`; orientação, EXIF, thumbnail, acesso cruzado e histórico. Upload, leitura privada, isolamento e comparação também no Storage real. |
| 018 | Dashboard por projeto/data | Agregações SQL e links contextuais; consulta não troca ACTIVE. Snapshot mínimo é apenas leitura. |
| 019 | Registros retroativos | Triggers de vigência/projeto ativo e teste de datas fora de intervalo/futuras. |
| 020 | Exportação e exclusão confirmada | `tests/privacy.spec.ts`; senha incorreta negada e purge de foto histórica. Ledger e ensaio de restauração local. Revisão operacional/legal pendente. |
| 021 | Auditoria interna | Triggers sem API pública, evidência SQL de substituição de peso e grants restritos. |
| 022 | PWA e offline | Manifesto/ícones/fallback; `tests/records.spec.ts` cobre resumo offline, expiração e limpeza no logout. Instalação em dispositivos reais pendente. |

| RNF / RB | Evidência e estado |
| --- | --- |
| RNF-001/002, RB-01/02/03/10 | Auth gerenciado e validação server-side; RLS e constraints testadas entre usuários/estados; grants mínimos e negação de TRUNCATE. HTTPS/rate limits/configuração real a conferir. |
| RNF-003/017 | Minimização, privacidade, termos, exportação e exclusão implementados; revisão jurídica, contato e retenção reais pendentes. |
| RNF-004/016, RB-04/05/06/07 | Tipos, limites, FKs compostas, índices únicos, locks e RPCs; provas locais de rollback/unicidade/ausência ≠ zero. No serviço real, requisições concorrentes comprovaram ACTIVE único, peso único e consistência entre encerramento e escrita. |
| RNF-005/012 | Retry com nova leitura do servidor, erros genéricos, `/api/saude`, evento estruturado `request_failed` e evento técnico de purge pendente. Falha injetada e recuperação preservando registros cobertas por `tests/resilience.spec.ts` e `tests/manual/agent-browser.mjs`; minimização em `tests/database/observability.test.mjs`. Monitoramento externo/SLA inicial ainda a confirmar. |
| RNF-006/011 | Listagens paginadas e totais no banco; índices por proprietário. Meta proposta de ~2 s e volume/dispositivo real precisam de medição. |
| RNF-007/008 | Testes em seis larguras e axe WCAG A/AA nas telas essenciais; teclado básico testado. Leitor de tela, zoom e revisão manual complementam a verificação automática. |
| RNF-009/010, RB-09 | Cache exclusivo do fallback, resumo limitado à aba, fotos sem cache/EXIF com leitura autorizada e processamento no servidor. Sem limite arbitrário por projeto. |
| RNF-013 | Ensaio controlado com PostgreSQL nativo e serviços reais de Auth/PostgREST/Storage do Supabase local: dump/restore, senha restaurada, arquivos pela API/checksums, RLS e ledger reaplicado. `tests/manual/restore-supabase.mjs`; Destino local escolhido pelo proprietário; snapshot/ledger cifrados com `scripts/backup.mjs`, TLS, checksums e verificação de abertura. Frequência/retensão ainda em definição. Restauração em segundo projeto hospedado não executada. |
| RNF-014 | Migrações, tipagem, lint, formato, build e testes na CI; branches de funcionalidade integradas em develop. |
| RNF-015 | Chromium local e suíte WebKit aprovada na CI (perfil iPhone). Testes em dispositivos físicos pendentes. |
| RB-08/11 | Sem prescrição ou metas por modalidade. Decisões registradas; sem IA, Strava, login social ou expansão ilustrativa do showcase. |

## Gate de conclusão

O código pode avançar no review da `develop`, mas o MVP só deve ser declarado homologado quando as evidências reais de `docs/operacao.md` estiverem preenchidas e as revisões do proprietário concluídas. Resultados automáticos não substituem esses gates.

## Auditoria repetível pelo agent-browser

`npm run test:agent-browser` percorre RF-001 a RF-020 e RF-022 pela interface/API autenticada do laboratório, incluindo cenários negativos, isolamento entre contas e falha recuperável. RF-021 e as constraints/RLS têm evidência complementar nos testes SQL; não são inferidos apenas pelo que a interface mostra.

A execução local completa de 22/10/2026 passou em 25 grupos, com axe em 16 telas e layout em seis larguras. Inclui biblioteca/receitas com snapshots, confirmação e invalidação de refeições, meta de água histórica, peso/medidas únicos, quatro modalidades, fotos privadas, offline com servidor indisponível, expiração e limpeza de resumo, histórico, rascunho, arquivamento, exportação e exclusão. O volume atravessa páginas: 25 lançamentos de água, 13 fotos e 21 rascunhos adicionais; totais e comparação entre páginas são conferidos. Cookies adulterados, outro navegador e reutilização de código PKCE são rejeitados.

Relatório e capturas: `artifacts/agent-browser/`; roteiro versionado em `tests/manual/agent-browser.mjs`. O modo hospedado é separado e registra seus limites e a remoção das contas sintéticas. Medições de Web Vitals e tempos nesse ambiente são de desktop/WSL, não comprovação da meta em celular físico. Instalação física, leitor de tela, entrega de e-mail, política de backup, revisão legal e configuração de produção permanecem nos gates correspondentes.
