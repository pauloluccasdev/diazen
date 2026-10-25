# Garmin Personal API

Extensão de escopo autorizada pelo proprietário em 25/10/2026, substituindo a consulta Strava. Relacionada a RF-012/018/020/022, RB-04/10/11 e RNF-002/003/005/007/008/009/012/014/016. A API pessoal atende somente à conta do titular, não a uma integração comercial multiusuário.

## Configurar

No servidor, configure `GARMIN_PERSONAL_API_KEY` e `GARMIN_OWNER_USER_ID` (UUID da conta Diazen autorizada). Ambas são privadas e não usam prefixo `NEXT_PUBLIC_`. Sem as duas, a seção não aparece. Outra conta autenticada não recebe os resultados nem acesso ao provedor. Nunca aceite o proprietário informado pelo navegador. Não coloque chaves, tokens ou dados pessoais no Git.

A chave é criada pelo titular em Garmin Connect → Personal API Key. A chave pode expirar ou ser revogada no provedor. Para trocar, atualize `.env.local` e a variável Secret da Vercel, restrita ao preview da branch `develop`, e publique nova implantação. Nenhuma configuração foi aplicada à produção/main. O UUID também deve ser configurado nessa branch; somente a configuração da chave não libera outras contas.

Não há OAuth por redirecionamento nem callback: o servidor envia `Authorization: ApiKey …` ao endpoint oficial de token e recebe JWT em `text/plain`. Usa esse token apenas na consulta seguinte com `Authorization: Bearer …`. Não grava nem retorna credenciais, não segue redirects e não imprime o corpo das respostas nos logs.

## Utilizar

Dashboard → Atividades → **Consultar atividades da Garmin**. O carregamento tem mensagem e botão desabilitado. São consultadas até cinco atividades recentes sincronizadas com Garmin Connect, ordenadas por início local decrescente. Atividades-filhas de multisport são excluídas para evitar duplicação com o pai.

Cada linha recolhível apresenta nome, modalidade, data e calorias quando disponíveis; ao abrir, duração em minutos, distância em quilômetros e link para o registro no Garmin Connect. Zero conhecido permanece zero; ausência, número negativo ou inválido permanecem sem valor. Duração usa o campo `duration`, em segundos; distância usa `distance`, em metros; calorias usam `calories`, em kcal. Não são calculados gasto total diário, déficit ou aderência.

A consulta é somente leitura e independente das atividades manuais do projeto; não altera a tabela operacional nem os indicadores do diário. Não há importação automática, cron ou webhook. O botão **Limpar consulta** remove os resultados da tela, sem revogar a chave. Para interromper o acesso do servidor, exclua a chave no Garmin Connect ou remova as variáveis privadas. Logout/exclusão da conta bloqueiam consultas pelo controle de autenticação.

## Proteções e retenção

A rota POST confere origem canônica, sessão válida, disponibilidade da conta e igualdade com o proprietário configurado antes de chamar o provedor. Respostas são `private, no-store`, com `Vary: Cookie`. Consultas têm cooldown de um minuto por instância, além dos limites da Garmin; isso não constitui quota global distribuída. Falhas/limitação mostram mensagens recuperáveis sem detalhes internos.

Chamadas têm prazo total de quinze segundos e limite de leitura de 1 MB. Hosts e caminhos são fixos, sem aceitar URL do cliente. Somente os campos apresentados são devolvidos; dados de localização, perfil e demais métricas são descartados. Não são solicitados arquivos FIT, mapas ou detalhes de saúde adicionais. Resultados ficam apenas na memória da tela por até quinze minutos, não entram no banco, exportação, backup, localStorage, sessionStorage ou cache offline. Chaves e tokens não chegam ao navegador. O código de OAuth Strava foi removido; cookies legados são apagados no logout/exclusão.

## Verificar

- `node --test tests/database/garmin.test.mjs`: proprietário/conta cruzada/visitante, CSRF, hosts, token plain text, redirects/cache, minimização, zero/ausência, respostas inválidas, limite de corpo e cooldown.
- `npm run build` e `npx playwright test tests/garmin.spec.ts --project=chromium`: sessão fictícia, lista compacta, carregamento retido, unidades, ausência, limpeza, offline, axe e layout de 320 px. A fixture injeta chave/UUID fictícios, nunca a credencial real.
- Teste real somente leitura: o endpoint oficial de token aceitou a chave do proprietário e a listagem retornou HTTP 200. Apenas status/formato foram registrados, sem valores das atividades ou credenciais. Isso não valida sincronização em todos os modelos de dispositivo.

## Fontes oficiais consultadas em 25/10/2026

- [Visão geral e modalidades Personal/Business](https://developer.garmin.com/gc-developer-program/overview/)
- [Chave pessoal e autenticação](https://developer.garmin.com/gc-developer-program/personal/personal-api/)
- [FAQ pessoal, validade e revogação](https://developer.garmin.com/gc-developer-program/personal/personal-faq/)
- [Swagger oficial](https://developer.garmin.com/gc-developer-program/personal/swagger-docs/): `POST /personalapitoken-service/personal-api/personal-api-key/token` conforme página de autenticação; `GET /activitylist-service/activities/search/activities`, `SummarizedActivityDTO` e `ActivityTypeDTO` conforme schema OpenAPI incorporado à página pública. Não usa endpoints não documentados do site.
