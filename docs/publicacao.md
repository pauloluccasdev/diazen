# Publicação e autenticação

## Ambiente de homologação

Projeto Vercel: `diazen`, na conta do proprietário, Node.js 24 e framework Next.js. A branch de produção continua sendo `main`; o agente não realiza seu merge.

Prévia estável da integração: <https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app>. O acesso está protegido pela autenticação da Vercel para a conta do proprietário durante a homologação. Essa proteção da hospedagem é adicional ao login do Diazen.

As quatro variáveis da aplicação foram configuradas apenas para previews da branch `develop`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` e `SUPABASE_SECRET_KEY`. O segredo administrativo usa armazenamento sensível na plataforma. Outras branches não recebem automaticamente o acesso ao banco real. A prévia de integração compartilha o Supabase dedicado ao Diazen e deve usar somente contas sintéticas enquanto os gates de lançamento estiverem pendentes.

A Vercel promoveu automaticamente a primeira implantação para o target de produção, embora sua origem fosse `develop`. Essa implantação inicial foi protegida e não representa aprovação de lançamento; a implantação seguinte é uma prévia da `develop`. O domínio `diazen.vercel.app` fica reservado para a configuração final de produção após o review. Não usar esse domínio para os testes atuais.

## Configurar Auth

Os templates versionados estão em `supabase/templates/confirmation.html` e `supabase/templates/recovery.html`. Usam token hash e o callback do servidor, sem depender de estado de sessão do navegador que iniciou o cadastro.

A ferramenta administrativa usa um token da Management API do Supabase, separado das chaves da aplicação. Configure `SUPABASE_ACCESS_TOKEN` somente no ambiente local ignorado pelo Git. Não publique esse token na Vercel.

Inspecionar diferenças, sem alterar o serviço:

```bash
npm run auth:configure -- --site-url https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app
```

Aplicar a configuração autorizada:

```bash
npm run auth:configure -- --site-url https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app --apply
```

A ferramenta salva uma cópia protegida dos campos anteriores em `backups/`, ajusta a origem, mantém confirmação de e-mail obrigatória, permite somente callbacks explícitos da origem e do localhost e configura senha mínima de 12 caracteres. Quando há SMTP personalizado, aplica também os dois templates/assuntos e o nome do remetente. Preserva host, usuário, senha e endereço de remetente SMTP existentes. Confere a configuração retornada após a alteração e não exibe segredos nem respostas completas do provedor. Sem `--apply`, apenas consulta e informa diferenças.

Os fluxos essenciais F-01 a F-07 também passaram na prévia hospedada, incluindo processamento de fotos, acesso anônimo/cross-user negado, concorrência, exportação e purge de conta. Links reais de confirmação e recuperação foram gerados administrativamente e percorridos no navegador: confirmação, troca de senha e rejeição de reutilização passaram. Essa geração não envia e-mails e não comprova SMTP, entrega nem templates atualmente configurados no provedor. As contas sintéticas e o acesso temporário de automação foram removidos ao concluir. Evidências técnicas locais, sem valores de credenciais, em `artifacts/vercel-homologation-report.json` e `artifacts/auth-links-homologation-report.json`.

No Supabase Free com provedor padrão, a API recusa alterações de templates, assuntos e remetente. A ferramenta informa `customTemplatesPending: true` e aplica somente os campos permitidos. A edição dos templates exige SMTP próprio; o SMTP padrão também restringe destinatários aos membros da organização e tem limite reduzido de envio. Consulte a [documentação de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Estado observado em 21/10/2026: URLs, confirmação obrigatória e senha mínima de 12 caracteres aplicadas e verificadas no serviço real. Os templates personalizados continuam pendentes de SMTP. Um primeiro envio de teste foi aceito ainda com a configuração anterior, mas não comprova recebimento nem o callback do Diazen e não deve ser usado na homologação. A conta autorizada não foi excluída nem recebeu registros de saúde.

Não considerar resposta de sucesso da API como comprovação de recebimento: o proprietário precisa confirmar a entrega e abrir os links na caixa de entrada autorizada após aplicar os templates do Diazen. O callback atual espera token hash; o envio com templates padrão do provedor não substitui esse gate. Não registrar endereço pessoal, links com token ou senhas nas evidências versionadas.

Configuração manual equivalente: Site URL igual à prévia; Redirect URLs com `/auth/confirmar` nessa origem e em `http://localhost:3000`; assuntos e templates dos arquivos versionados; senha mínima de 12 caracteres. Manter confirmação de e-mail habilitada.

## Antes da produção

Após o PR/review do proprietário, configurar as quatro variáveis para o ambiente Production com `NEXT_PUBLIC_SITE_URL=https://diazen.vercel.app`, ajustar Auth para essa origem e redeployar o código aprovado. Variáveis alteradas só entram em novas implantações. Preservar a proteção de hospedagem enquanto os gates de `docs/operacao.md` estiverem pendentes; o acesso definitivo para uso pessoal deve ser validado pelo proprietário, inclusive a instalação da PWA no celular.

Referências: [Management API de Auth](https://supabase.com/docs/reference/api/v1-update-auth-service-config), [templates Supabase](https://supabase.com/docs/guides/auth/auth-email-templates), [variáveis Vercel](https://vercel.com/docs/environment-variables), [proteção Vercel](https://vercel.com/docs/deployment-protection).
