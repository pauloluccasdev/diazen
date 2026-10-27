# Sono da Garmin — extensão autorizada em 27/10/2026

A integração pessoal existente pode sincronizar sono após adesão explícita em Dashboard → Sono ou `/painel/sono`. Não habilitar preferências de uma conta por ferramenta administrativa: o usuário ativa “Sincronizar meu sono com a Garmin”. A chave permanece privada e vinculada exclusivamente ao proprietário configurado, conforme o recorte Personal já aprovado.

## Comportamento funcional

- **RF-SONO-01:** ativar/pausar o sono independentemente da importação de atividades. Pausar mantém o histórico e impede novas gravações após a confirmação.
- **RF-SONO-02:** consultar hoje e os dois dias anteriores, dentro da vigência do projeto ACTIVE. A primeira consulta ocorre na ativação. Repetições verificam revisões e cochilos; uma chave única por usuário/data impede duplicações. Dados de outro projeto, especialmente histórico encerrado, não são reassociados.
- **RF-SONO-03:** atualizar durante todo o dia pelo job existente de quinze minutos, mesmo com o app fechado, após publicar a versão com sono. A consulta em primeiro plano também usa a mesma rota. Uma lease impede chamadas concorrentes; o intervalo mínimo de quatorze minutos absorve pequenas variações de horário do agendador de quinze minutos.
- **RF-SONO-04:** mostrar no dashboard a duração e pontuação da data consultada; detalhes apresentam estágios, tempo acordado, cochilos, fonte e atualização. O histórico geral inclui o grupo Sono. Valores ausentes não são zero; resposta vazia do provedor não cria registro nem informa que a pessoa não dormiu.
- **RF-SONO-05:** preservar registros anteriores em falhas e permitir consulta explícita, respeitando o mesmo intervalo. Preferências e registros entram em exportação, backup, exclusão de conta e exclusão do projeto. O resumo offline não inclui sono.

A informação fica disponível depois de o relógio enviá-la ao Garmin Connect. A Personal API é pull: não há streaming direto do relógio, notificações push ou garantia de disponibilidade em um horário fixo. A janela recente não importa automaticamente meses de histórico nem revisões de períodos anteriores a dois dias.

## Dados e autorização

`garmin_sleep_settings` registra adesão e instantes de consulta/sucesso/falha; lease é administrativa. `sleep_records` guarda data Garmin, segundos de sono principal, cochilos, estágios leve/profundo/REM, tempo acordado, pontuação, início/fim UTC e atualização. Dados de perfil, observações e resposta bruta do provedor são descartados. Não inferir diagnósticos ou aderência a partir desses valores.

As migrações **014** e **015** são incrementais: novas tabelas com RLS, consentimento autenticado e RPCs de claim/importação/finalização administrativas. O servidor valida conta/origem e resolve o proprietário pelo segredo da configuração; o banco resolve ACTIVE, vigência e permissão de consentimento/lease antes de persistir. Uma revisão atualiza somente o mesmo dia/projeto. A migração 015 serializa a pausa com importações e mantém as permissões da 014. Não permite editar dados de projetos encerrados.

As duas migrações foram aplicadas isoladamente ao Supabase hospedado após backup cifrado/verificado, sem reset ou bundle. A sincronização permaneceu desativada por padrão e nenhum sono pessoal foi importado como teste. A leitura real de verificação confirmou acesso e existência de dados, sem imprimir valores ou salvá-los.

## Publicação e operação

1. Integrar a hotfix na main pelo PR do proprietário; a rota já agendada `/api/garmin/sync` passará a executar atividades e sono independentemente.
2. Usar as credenciais Garmin/Supabase e o bypass de automação existentes. Não criar outro job nem mudar o destino de produção.
3. Ativar a sincronização pelo checkbox do Sono. Conferir fonte, data e última consulta; pausar e confirmar que o histórico permanece.
4. Em falhas, conferir somente status e configuração, sem registrar payloads de saúde ou credenciais. A última tentativa e o último sucesso são distintos. Resposta sem dados é uma consulta válida, não um erro.

Backup usa os schemas existentes e inclui automaticamente as novas tabelas. Exclusão de projeto remove o sono por FK; exclusão de conta remove registros e preferências por FK. Pausar automações antes de restaurar backups e reaplicar exclusões conforme o procedimento de operação existente.

## Verificação

`npm run test:db` inclui normalização/limites do provedor, isolamento, escrita privilegiada, adesão, lease, idempotência, revisão, pausa, histórico encerrado e cascata. Após build, `npx playwright test tests/garmin.spec.ts --project=chromium` valida card/estágios, pausa, exportação sem lease, histórico, offline/layout e acessibilidade em 320 px, com dados sintéticos. Testes de worker verificam resposta vazia e falha sem alteração dos dados anteriores. Nunca usar dados pessoais como fixtures.

Fonte técnica: [Swagger oficial Garmin Personal API](https://developer.garmin.com/gc-developer-program/personal/swagger-docs/), endpoint `sleep-service/sleep/dailySleepSummariesByDate`, consultado em 27/10/2026.
