# Publicação e autenticação

## Ambiente de homologação

Projeto Vercel: `diazen`, na conta do proprietário, Node.js 24 e framework Next.js. A branch de produção continua sendo `main`; o agente não realiza seu merge.

Prévia estável da integração: <https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app>. O acesso está protegido pela autenticação da Vercel para a conta do proprietário durante a homologação. Essa proteção da hospedagem é adicional ao login do Diazen.

As quatro variáveis da aplicação foram configuradas apenas para previews da branch `develop`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` e `SUPABASE_SECRET_KEY`. O segredo administrativo usa armazenamento sensível na plataforma. Outras branches não recebem automaticamente o acesso ao banco real. A prévia de integração compartilha o Supabase dedicado ao Diazen e deve usar somente contas sintéticas enquanto os gates de lançamento estiverem pendentes.

A Vercel promoveu automaticamente a primeira implantação para o target de produção, embora sua origem fosse `develop`. Essa implantação inicial foi protegida e não representa aprovação de lançamento; a implantação seguinte é uma prévia da `develop`. O domínio `diazen.vercel.app` fica reservado para a configuração final de produção após o review. Não usar esse domínio para os testes atuais.

## Configurar Auth

Decisão do proprietário: usar o provedor de e-mail e os templates padrão do Supabase Free. SMTP próprio e templates personalizados não fazem parte da configuração atual.

Cadastro e recuperação usam PKCE pelo cliente SSR do Supabase. O e-mail padrão aponta para a verificação no provedor, que devolve um código de uso único ao aplicativo. `/auth/confirmar` troca esse código por sessão e abre o painel; `/auth/recuperar` abre a troca de senha. Os destinos são fixos e as rotas não aceitam redirecionamentos arbitrários. Não é necessário editar templates nem receber `token_hash` no aplicativo.

O link precisa ser aberto no mesmo navegador e na mesma origem em que o fluxo foi iniciado, pois o verificador fica em cookie. O aplicativo orienta isso na confirmação de envio. Ao abrir em outro navegador, confirmar o e-mail no provedor pode concluir, mas a sessão do aplicativo não é criada; nesse caso, o usuário pode entrar com sua senha. Para recuperação, deve solicitar novo link no navegador em que deseja continuar.

A ferramenta administrativa usa um token da Management API separado das chaves da aplicação. Configure `SUPABASE_ACCESS_TOKEN` apenas no ambiente local ignorado pelo Git; nunca publique esse token na Vercel.

Inspecionar sem alterar o serviço:

```bash
npm run auth:configure -- --site-url https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app
```

Aplicar a configuração autorizada:

```bash
npm run auth:configure -- --site-url https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app --apply
```

A ferramenta salva backup dos campos alterados em `backups/`, configura a origem, os callbacks `/auth/confirmar` e `/auth/recuperar` nessa origem e em localhost, exige confirmação de e-mail e senha mínima de 12 caracteres. Preserva templates, assuntos, remetente e credenciais do provedor. Confere a configuração retornada e não exibe segredos. Sem `--apply`, apenas consulta diferenças.

O provedor padrão limita destinatários aos membros da organização Supabase e tem cota reduzida de envio, atualmente duas mensagens por hora. Essa limitação é aceita para o uso pessoal inicial e não depende de criar SMTP próprio. Consulte a [documentação do provedor padrão](https://supabase.com/docs/guides/auth/auth-smtp).

Os fluxos de domínio e fotos já passaram na prévia hospedada. Os testes anteriores de links por token hash pertencem à implementação substituída; o novo fluxo PKCE tem validação de navegador com verificador criptográfico, negação de outro navegador, adulteração e reutilização. A entrega real precisa ser confirmada pelo proprietário, iniciando cadastro/recuperação na própria prévia e abrindo o e-mail nesse mesmo navegador. Resposta de sucesso da API não comprova recebimento. Não versionar endereço pessoal, links com código ou senhas.

Um primeiro e-mail foi enviado antes da configuração atual e deve ser ignorado. A conta autorizada foi preservada sem registros de saúde.

## Antes da produção

Após o PR/review do proprietário, configurar as quatro variáveis para o ambiente Production com `NEXT_PUBLIC_SITE_URL=https://diazen.vercel.app`, ajustar Auth para essa origem e redeployar o código aprovado. Variáveis alteradas só entram em novas implantações. Preservar a proteção de hospedagem enquanto os gates de `docs/operacao.md` estiverem pendentes; o acesso definitivo para uso pessoal deve ser validado pelo proprietário, inclusive a instalação da PWA no celular.

Referências: [Management API de Auth](https://supabase.com/docs/reference/api/v1-update-auth-service-config), [templates Supabase](https://supabase.com/docs/guides/auth/auth-email-templates), [variáveis Vercel](https://vercel.com/docs/environment-variables), [proteção Vercel](https://vercel.com/docs/deployment-protection).
