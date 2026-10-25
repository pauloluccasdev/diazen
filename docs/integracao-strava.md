> Integração retirada em 25/10/2026 por solicitação do proprietário. Este documento preserva o histórico; o código, rotas e variáveis do Strava foram substituídos pela [Garmin Personal API](integracao-garmin.md).

# Integração com Strava

O card Atividades leva à seção “Sua conta Strava”. Ela permite conectar a conta, consultar até cinco atividades recentes e desconectar. Os registros manuais do Diazen permanecem independentes.

## Configuração

1. Cadastre o aplicativo em [Strava API](https://www.strava.com/settings/api).
2. Na prévia atual, use `diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app` em **Authorization Callback Domain**, sem protocolo ou caminho.
3. O callback completo da aplicação é `https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app/api/strava/callback`.
4. Configure `STRAVA_CLIENT_ID` e `STRAVA_CLIENT_SECRET` como variáveis somente do servidor. Nunca use o prefixo `NEXT_PUBLIC_`, nem coloque valores reais no Git. O `.env.example` contém apenas nomes vazios.
5. Configure as variáveis também no ambiente Preview da branch `develop` e publique uma nova versão. A origem em `NEXT_PUBLIC_SITE_URL` deve ser a origem exata dessa prévia.
6. Entre no Diazen, abra Atividades → Conectar ao Strava e autorize a leitura no site oficial do Strava. Somente a pessoa usuária realiza esse consentimento.

As novas aplicações Strava começam no modo de uso pela própria conta. A capacidade para outros atletas e eventuais revisões são administradas no Strava. Criar uma aplicação exige assinatura conforme a documentação consultada em 25/10/2026. Nenhuma assinatura ou serviço pago foi contratado pelo Diazen.

Para trocar o segredo, atualize o arquivo privado e as variáveis do ambiente correspondente e publique novamente. A rotação invalida os cookies cifrados anteriores: conecte a conta novamente. Não é necessário copiar access token ou refresh token da tela do Strava.

## Funcionamento e limites

- OAuth solicita apenas `activity:read_all`, necessário para consultar também as atividades privadas autorizadas. Não solicita gravação no Strava.
- O cookie de estado é aleatório, cifrado, vinculado à conta e válido por dez minutos. Callback inválido, vencido, reutilizado ou com escopo insuficiente não cria uma conexão.
- A sessão do provedor fica cifrada por AES-256-GCM em cookie HttpOnly, SameSite=Lax e Secure em HTTPS, vinculada à conta Diazen e válida por até sete dias neste navegador. A chave é derivada do segredo do aplicativo com HKDF e separação de finalidade. Não há tabela de tokens.
- Tokens de acesso são renovados no servidor quando necessário. Não são enviados ao JavaScript, incluídos no JSON das atividades nem escritos em logs.
- Os endpoints de leitura são fixos do Strava. A lista é limitada a cinco itens e os detalhes mostram nome, modalidade, data local informada pelo Strava, duração em movimento, distância e calorias, quando existentes. Zero conhecido permanece diferente de ausência. Não se estimam calorias.
- Os dados não são copiados para `activities`, não entram no histórico geral, no resumo de sessões, na alimentação, na exportação, no cache offline ou nos backups. Também não são enviados a IA. O navegador só mantém os resultados em memória temporária, por até quinze minutos; consultar novamente substitui a lista.
- A consulta é explícita, sem sincronização automática. Há um intervalo local de um minuto por conta, além dos limites impostos pelo Strava. Limites, revogação e indisponibilidade exibem feedback, sem fingir que dados ausentes são zero.
- “Desconectar Strava” usa o endpoint atual `/oauth/revoke`, com autenticação do aplicativo e o refresh token, para solicitar a revogação e sempre apaga a conexão e os resultados deste navegador. Se o provedor não confirmar, o texto orienta remover o acesso nas configurações do Strava. Logout remove os cookies locais. Exclusão da conta tenta revogar o acesso e remove os cookies, sem depender da disponibilidade do provedor para concluir a exclusão Diazen.
- Cada atividade tem o link **View on Strava**. A conexão não representa patrocínio ou aprovação do Diazen pelo Strava.

A política consultada em 25/10/2026 proíbe combinar dados da API com outros dados do usuário e restringe retenção. Portanto esta implementação é uma consulta independente, sem importação permanente e sem comparação entre calorias Strava e alimentação. O futuro cruzamento solicitado anteriormente depende de autorização específica do provedor; não está sendo apresentado como implementado.

## Verificação

`npm run test:db` inclui testes sintéticos de cifra, adulteração, estado OAuth, escopo, isolamento entre contas, renovação, ausência/zero, desconexão, revogação, expiração, CSRF e falta de configuração. As chamadas do provedor são simuladas; os testes não consultam dados de atletas reais.

`npx playwright test tests/strava.spec.ts --project=chromium` verifica a tela, conexão simulada, apresentação dos dados fictícios, ausência de gravações no diário, leitura offline bloqueada, desconexão, limpeza no logout, largura de 320 px e acessibilidade. O mesmo teste faz parte do conjunto WebKit. A autorização real é feita pela pessoa proprietária no navegador e deve ser validada por ela; não se afirma um consentimento real com base nos testes simulados.

Fontes oficiais: [autenticação](https://developers.strava.com/docs/authentication/), [início e capacidade](https://developers.strava.com/docs/getting-started/), [política da API](https://www.strava.com/legal/api_policy), [identidade visual](https://developers.strava.com/guidelines/).
