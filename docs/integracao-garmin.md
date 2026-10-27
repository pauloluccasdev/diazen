# Garmin Personal API

Extensão autorizada em 25/10/2026, substituindo Strava. Após a consulta inicial, o proprietário aprovou escolher atividades anteriores e salvar automaticamente todas as novas atividades. Relacionada a RF-012/013/018/020/022, RB-01/03/04/10/11 e RNF-002/003/004/005/007/008/009/012/013/014/016. A modalidade Personal atende somente à conta do titular; integração comercial multiusuário requer o programa Business.

## Configuração privada

- `GARMIN_PERSONAL_API_KEY`: chave criada pelo titular no Garmin Connect.
- `GARMIN_OWNER_USER_ID`: UUID da única conta Diazen autorizada.
- `GARMIN_SYNC_ENABLED=true`: habilita a verificação automática no aplicativo aberto.
- `GARMIN_SYNC_SECRET`: segredo aleatório de 32–128 caracteres base64url, exclusivamente para chamadas do agendador.
- `GARMIN_SYNC_SITE_URL`: origem HTTPS da prévia, usada apenas pela ferramenta administrativa local.

Nenhuma variável usa `NEXT_PUBLIC_`. Chave, segredo e UUID permanecem em `.env.local` ignorado e variáveis privadas da Vercel, restritas a `preview/develop`. Não se configura produção/main. Não envie credenciais pelo chat ou Git. Rotacionar a chave exige atualizar o arquivo privado, a Secret na Vercel e publicar nova implantação. O agendador tem credencial própria, independente da chave Garmin.

O servidor envia `Authorization: ApiKey …` ao endpoint oficial e recebe JWT em `text/plain`. Usa esse token apenas em chamadas ao host oficial com `Authorization: Bearer …`. Não retorna credenciais, não segue redirects e não imprime respostas do provedor. A API pessoal não exige callback OAuth. A integração Strava foi retirada; cookies legados são apagados no logout/exclusão.

## Migração e persistência

Aplicar incrementalmente `202610250012_garmin_activity_import.sql`, sem reset. Ela adiciona título (`name`), calorias (`kcal`) e origem às atividades, configurações de sincronização e ledger de importação. Dados anteriores permanecem preservados. A migração 012 foi aplicada ao Supabase real após backup cifrado e verificado.

A importação manual envia apenas IDs selecionados; o servidor consulta os detalhes oficiais antes de gravar. Não confia em título, composição, data, proprietário ou projeto enviados pelo navegador. O título, tipo original, data local, duração, distância e calorias disponíveis são convertidos para o modelo do diário. Tipos não pertencentes às quatro modalidades originais usam “Outra atividade”, mantendo o tipo Garmin na origem. Não se infere musculação a partir de um tipo desconhecido.

Ausência permanece distinta de zero. Duração utiliza `duration` em segundos, convertida para minutos; distância utiliza metros convertidos para km; calorias são kcal. Distância/calorias ausentes da Garmin podem permanecer sem valor. Campos inválidos ou duração incompatível com os limites do diário exigem revisão. A data deve pertencer à vigência do ACTIVE e não pode ser futura; atividades anteriores continuam disponíveis na Garmin, sem atribuição a projetos encerrados.

O backend usa RPCs administrativas restritas a `service_role`, verifica a conta disponível e resolve o ACTIVE na transação. O navegador não pode executar essas RPCs ou forjar origem por INSERT/UPDATE. RLS protege configurações e ledger; a conta só pode alterar seu campo `enabled`. Importação e ledger são atômicos, serializados por usuário. ID externo único impede duplicação mesmo entre projetos. Editar um registro importado não muda sua origem; novas consultas não sobrescrevem as revisões. Excluir o registro mantém a referência no ledger para impedir recriação automática. Exclusão da conta remove esses dados por cascade e bloqueia novas sincronizações.

Registros importados participam dos indicadores de sessões, histórico, exportação e backup. Não há cálculo de déficit calórico, prescrição ou alteração das atividades originais da Garmin.

## Uso e automação

Dashboard → Atividades → **Consultar atividades da Garmin**. A lista recente começa recolhida. Selecione atividades anteriores e use **Importar selecionadas**. A confirmação informa quantas foram salvas; atividades já importadas aparecem identificadas. Dados fora da vigência/limites não são silenciosamente ajustados. Registros salvos podem ser editados ou excluídos no diário.

A opção **Importar automaticamente novas atividades** começa ativada para o proprietário que autorizou a automação. O marco inicial é a ativação registrada no banco: atividades realizadas antes desse instante precisam de seleção explícita. Ao pausar, preserva-se o diário; ao reativar, buscam-se atividades posteriores ao marco inicial que ainda não foram importadas.

Ao abrir o painel e a cada cinco minutos enquanto a aba estiver visível/online, o aplicativo solicita sincronização. O servidor adquire lease de 90 segundos e evita novas varreduras bem-sucedidas por cinco minutos. O agendamento externo faz a mesma chamada a cada quinze minutos. A Personal API trabalha por consulta; não há webhook nem promessa de importação instantânea.

Cada execução processa no máximo três páginas de cem atividades, com cursor persistido para continuar na execução seguinte. Atividades anteriores ao marco UTC são ignoradas. Ao terminar a varredura, reinicia-se o cursor para detectar sincronizações atrasadas. Falhas não avançam o cursor; leases expiram para permitir recuperação. Exclusões/duplicações do provedor não geram novos lançamentos do mesmo ID.

## Agendamento no Supabase

A Vercel Hobby limita cron a uma execução diária e só executa jobs em produção, portanto não atende à prévia `develop`. Usa-se Supabase Cron (`pg_cron`) e `pg_net`, sem novo provedor ou mudança de plano. O segredo de chamada fica cifrado no Supabase Vault; o job guarda apenas nomes de referências, nunca o token em seu comando.

Com configuração administrativa local e migração aplicada:

```bash
# Preparar/atualizar o agendamento desativado, antes de publicar a rota
npm run garmin:cron -- --apply
# Depois de validar a nova implantação da develop
npm run garmin:cron -- --apply --enable
# Inspecionar somente flags, sem revelar credenciais
npm run garmin:cron
```

A ferramenta instala extensões se ausentes e altera somente o job `diazen-garmin-sync`, programado para `*/15 * * * *`. Revoga acesso dos papéis públicos aos schemas/filas operacionais e às views do Vault. Não remove jobs existentes. A rota `/api/garmin/sync` exige segredo Bearer com comparação segura, ou sessão do proprietário e origem canônica para chamadas do aplicativo. Ignora proprietário e dados fornecidos no corpo. O agendamento resolve a conta pelo servidor e respeita pausa, exclusão e ausência de ACTIVE.

Para pausar o job na infraestrutura, execute novamente `--apply` sem `--enable`. Antes de restaurar o banco, pause esse job e a atualização automática do aplicativo. Reative somente após reaplicar o ledger de exclusões, validar contas/projetos e conferir o marco/cursor. O backup do aplicativo cobre tabelas públicas/privadas, mas não substitui a configuração operacional de Cron/Vault: restauração em outro ambiente exige repetir a configuração com segredos locais protegidos. Não reative um job apontando para outra instalação sem revisar o destino.

## Consulta, privacidade e falhas

Respostas autenticadas são `private, no-store`, com `Vary: Cookie`. A prévia recente é reaproveitada por até um minuto em memória da instância, após revalidar proprietário a cada chamada; rotação da chave invalida o reaproveitamento. Falhas não bloqueiam novas tentativas. O navegador mantém a prévia por até quinze minutos, sem storage/offline. Atualização com falha preserva a lista anterior; limpar a consulta não exclui registros importados.

Chamadas têm timeout, host fixo e limite de leitura de 1 MB. Localização, fotos, perfil e métricas adicionais retornadas pelo provedor são descartados. A referência UTC é usada para identificar atividades posteriores à ativação; a data local é preservada no diário. Credenciais permanecem no servidor. Estado de sincronização e referências de importação integram a exportação/exclusão da conta.

## Verificação

- `npm run test:db`: migrações reais em PostgreSQL embarcado; origem, RLS, privilégios, transação, zero/ausência, duplicação, edição/exclusão, pausa, lease, histórico encerrado e conta excluída. Testes de servidor cobrem CSRF/autenticação, credencial de cron, dados forjados, detalhe oficial, paginação/cursor, falhas e segurança do agendamento.
- `npm run build` e `npx playwright test tests/garmin.spec.ts --project=chromium`: respostas sintéticas, loading real retido, lista recolhida, seleção/importação, pausa, erro preservando resultados, unidades, offline, axe e 320 px.
- Teste real somente leitura confirmou token, lista e detalhe no endpoint oficial. Apenas status/formato foram registrados, sem valores ou credenciais. O detalhe usa timestamps ISO com fração de segundo, enquanto a lista usa separador espaço; ambos são normalizados. Nenhuma atividade antiga do proprietário foi escolhida como teste de gravação.

## Fontes oficiais consultadas em 25/10/2026

- [Garmin Personal/Business](https://developer.garmin.com/gc-developer-program/overview/)
- [Autenticação pessoal](https://developer.garmin.com/gc-developer-program/personal/personal-api/)
- [Validade e revogação](https://developer.garmin.com/gc-developer-program/personal/personal-faq/)
- [OpenAPI oficial](https://developer.garmin.com/gc-developer-program/personal/swagger-docs/): Activity List, Activity Summary, SummaryDTO, ActivityTypeDTO.
- [Supabase Cron](https://supabase.com/docs/guides/cron), [agendamento com Vault/pg_net](https://supabase.com/docs/guides/functions/schedule-functions), [permissões do pg_net](https://supabase.com/docs/guides/database/extensions/pg_net).
- [Limites de cron Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing), [execução em produção](https://vercel.com/docs/cron-jobs/manage-cron-jobs).


## Sono opcional

A extensão de sono reutiliza credenciais e o endpoint agendado existente, com adesão independente. As migrações 014/015 foram aplicadas e a funcionalidade permanece dependente da publicação da hotfix e da ativação pelo usuário. Não criar outro cron nem habilitar automaticamente registros de sono. Ver [Sono Garmin](sono-garmin.md).
