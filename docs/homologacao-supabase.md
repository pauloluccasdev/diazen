# Homologação Supabase — 21/10/2026

## Reutilização autorizada

O proprietário autorizou reutilizar as credenciais e o projeto Supabase do Planna, resetar seu banco e destiná-lo ao Diazen. As credenciais foram copiadas para `.env.local`, com permissão local `0600`, sem versionamento ou exposição no chat. Os arquivos do repositório Planna não foram alterados.

Antes do reset, foi produzido um dump completo em formato custom do PostgreSQL, incluindo Auth e Storage. O arquivo passou por leitura integral com `pg_restore` e tem checksum SHA-256 registrado localmente. Backup e verificação estão em `backups/planna-before-diazen-2026-10-22T01-15-54-543Z/`, ignorados pelo Git e com acesso restrito. Não havia buckets nem objetos no Storage para copiar separadamente. A leitura do arquivo não substitui um ensaio de restauração.

O reset substituiu as 30 tabelas da aplicação Planna e aplicou as oito migrações do Diazen em uma transação. A extensão `btree_gist` foi preservada no schema `extensions`. As quatro contas antigas foram removidas pela API administrativa de Auth. Os schemas gerenciados do Supabase foram preservados. O histórico das oito versões está em `supabase_migrations.schema_migrations`.

**Não reaplicar o bundle:** as migrações 001 a 008 já estão instaladas neste ambiente. Próximas alterações precisam de novas migrações incrementais.

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

## Pendências de lançamento

Ainda verificar templates e URLs de Auth para Diazen, SMTP e entrega real de confirmação/recuperação, expiração e reutilização de links, expiração natural da sessão, hospedagem HTTPS, instalação em dispositivos físicos, desempenho, restauração isolada de banco e arquivos, política operacional e aprovação visual/legal do proprietário. A configuração anterior de Auth pode conter URLs e templates do Planna; o reset do banco não os altera.

Este registro comprova os testes descritos; não declara o MVP integralmente homologado nem substitui o roteiro de `docs/operacao.md`.
