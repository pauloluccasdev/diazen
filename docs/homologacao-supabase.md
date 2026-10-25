# Homologação Supabase — 21/10/2026

## Reutilização autorizada

O proprietário autorizou reutilizar as credenciais e o projeto Supabase do Planna, resetar seu banco e destiná-lo ao Diazen. As credenciais foram copiadas para `.env.local`, com permissão local `0600`, sem versionamento ou exposição no chat. Os arquivos do repositório Planna não foram alterados.

Antes do reset, foi produzido um dump completo em formato custom do PostgreSQL, incluindo Auth e Storage. O arquivo passou por leitura integral com `pg_restore` e tem checksum SHA-256 registrado localmente. Backup e verificação estão em `backups/planna-before-diazen-2026-10-22T01-15-54-543Z/`, ignorados pelo Git e com acesso restrito. Não havia buckets nem objetos no Storage para copiar separadamente. A leitura do arquivo não substitui um ensaio de restauração.

O reset substituiu as 30 tabelas da aplicação Planna e aplicou as oito migrações do Diazen em uma transação. A extensão `btree_gist` foi preservada no schema `extensions`. As quatro contas antigas foram removidas pela API administrativa de Auth. Os schemas gerenciados do Supabase foram preservados. O histórico das oito versões está em `supabase_migrations.schema_migrations`.

**Não reaplicar o bundle:** as migrações 001 a 009 já estão instaladas neste ambiente. Próximas alterações precisam de novas migrações incrementais.

## Evidências reais

Validação feita com build de produção do Next.js em `http://localhost:3000`, Chromium em viewport 390 × 844, Auth, PostgREST e Storage reais. Duas contas temporárias foram criadas administrativamente com e-mail já confirmado; isso não valida entrega de e-mail ou cadastro público.

| Área | Resultado observado |
| --- | --- |
| Configuração | `npm run env:check -- --connect`: banco acessível e bucket `body-photos` privado. |
| Banco | Oito migrações registradas, 13 tabelas públicas com RLS, nenhuma tabela pública sem RLS e policy de leitura privada das fotos presente. |
| F-01 | Login real, onboarding, projeto ACTIVE com meta e persistência após reload. |
| F-02 | Alimentação manual persistida; ausência nutricional distinta de zero; confirmação do dia invalidada após edição. |
| F-03 | Dois consumos de água persistidos e somados corretamente. |
| F-04 | Corrida com duração e distância, histórico e total semanal. |
| F-05 | Substituição de peso sem duplicar; medida parcial; dois uploads reais, leitura WebP e comparação. |
| RNF-002/010 | Foto negada a anônimo; metadados e download direto do Storage negados à segunda conta. |
| F-06/F-07 | Encerramento confirmado e histórico somente leitura; escrita resolve novo ACTIVE mesmo recebendo ID do projeto encerrado. |
| RNF-004 | Duas criações simultâneas geram somente um ACTIVE; duas substituições simultâneas mantêm um peso por data; encerramento concorrente com escrita preserva consistência e bloqueia gravações posteriores. |
| RF-001 | Login e renovação real de sessão por refresh token. |
| RF-020 | Exportação consistente; exclusão pela interface com reautenticação remove Auth, registros e fotos inclusive do histórico encerrado. |

As duas contas temporárias e suas credenciais locais foram removidas ao concluir. O ledger mínimo de exclusões permanece como trilha operacional. Relatórios técnicos locais estão em `artifacts/real-homologation-report.json`, `artifacts/homologation-cleanup-report.json`, `artifacts/database-reset-report.json` e `artifacts/auth-reset-report.json`, fora do Git.

## Conveniências alimentares — 22/10/2026

Inclusão do RF-009 aprovada pelo proprietário. Migração 009 aplicada em transação pela Management API HTTPS com validação de certificado, conferência das oito versões anteriores e de seus SQLs, registro da nova versão e reload do PostgREST. Apenas novas tabelas/funções foram criadas; não houve reset. Contagens de contas e projetos existentes preservadas, nenhuma tabela pública sem RLS. Histórico anterior de migrações e contagens registrados localmente, sem exportar dados pessoais.

Duas contas sintéticas com e-mail já confirmado exercitaram Auth/PostgREST reais: compilação de receita com nutriente desconhecido, consumo proporcional, snapshots preservados após edição/exclusão da biblioteca, favoritos, negação de leitura e de ingrediente de outra conta, reutilização de recente e cópia para a própria refeição. Duas requisições simultâneas com o mesmo UUID copiaram uma única vez, preservando registros existentes e desfazendo a conclusão manual. Isso valida concorrência multi-conexão além do teste local. Biblioteca e ledger de cópias foram removidos pela exclusão em cascade das contas sintéticas; ledger mínimo de exclusões preservado e marcado como concluído. Conta do proprietário não foi alterada.

Relatórios locais: `artifacts/food-migration-report.json` e `artifacts/food-library-homologation-report.json`. Os testes de navegador locais usam o adaptador HTTP; esta validação adicional usa os serviços reais via SDK. Posteriormente o fluxo completo do RF-009 passou também no Chromium da prévia Vercel, incluindo exportação e acessibilidade, com OIDC limitado à origem e sem alterar a proteção; conta sintética removida. Relatório local `artifacts/hosted-food-browser-report.json`.

## Pendências de lançamento

Estado atualizado em 22/10/2026: provedor/templates padrão, URLs e callbacks PKCE configurados; recuperação pelo e-mail padrão confirmada pelo proprietário; prévia HTTPS protegida disponível. Os itens atuais de encerramento estão em [homologação final](homologacao-final.md), incluindo confirmação de cadastro, dispositivos físicos, desempenho, recuperação dos serviços hospedados, política operacional e aprovação visual/legal. Não há pendência de SMTP personalizado, pois o proprietário decidiu usar o provedor padrão.

Este registro comprova os testes descritos; não declara o MVP integralmente homologado nem substitui o roteiro de `docs/operacao.md`.

## Plano alimentar — 23/10/2026

A migração `202610230010_diet_plans.sql` foi aplicada incrementalmente após backup cifrado verificado, sem reset. Verificação confirmou RLS habilitada e ausência de privilégios UPDATE/DELETE para contas autenticadas nas versões imutáveis.

A homologação na prévia pública `develop`, com conta sintética própria, percorreu seleção de PDF fictício no navegador, revisão TACO, cálculo de 125 g de arroz cozido (160 kcal), salvamento, recarga e exportação. O diário permaneceu sem consumo adicionado. Uma segunda conta não acessou o plano da primeira. O layout não apresentou overflow em 320 px. As contas temporárias e seus planos foram removidos pelo fluxo de exclusão, e o ledger independente foi atualizado. Nenhuma conta do proprietário nem seu PDF pessoal foram alterados/enviados ao servidor. Evidências locais ignoradas pelo Git: `artifacts/plan-review/hosted-report.json` e captura correspondente.

Os dois PDFs pessoais foram lidos apenas no laboratório local. A extração preservou, no formato sem composição, 10 variantes em cinco grupos de refeição, 51 alimentos-base e 115 substituições; no formato com composição, quatro refeições, 15 alimentos-base e 32 substituições, com soma de 1453 kcal igual à informada no documento. Isso valida esses layouts, sem prometer reconhecer qualquer PDF ou uma composição completa para itens fora da TACO.
