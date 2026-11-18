# Fase 10 — Autenticação

18/11/2026. Base: develop integrada em `de5c92f`, Fase 9 aprovada no CI 44389027871 e verificada no preview com contas sintéticas. Escopo autorizado: última fase do redesign, mantendo Supabase Auth, autorização e regras existentes. R13 reaberta antes da implementação.

## Composição e componentes

Reproduzir as quatro regiões mobile e desktop de R13: boas-vindas com corredor, entrar, criar conta e recuperar senha. Incluir nova senha no mesmo padrão. Não reproduzir molduras, barras do sistema operacional ou fundos de apresentação.

- `AuthShell`/`AuthFrame`: composição pública própria, logo, voltar, regiões de formulário e aparência desktop. Cookie de tema existente; mobile permanece dark. Compartilhar o gravador de preferência com o PanelShell, sem alterar o comportamento da área autenticada.
- `WelcomeExperience`: imagem editorial própria já preparada, desktop dividido e mobile com texto sobre a região inferior escurecida, como a referência. Dois CTAs reais. Três indicadores apresentam três textos curtos com controles acessíveis, sem autoplay ou persistência de onboarding. Preservar acesso secundário aos primeiros passos e links legais existentes.
- Formulários: manter LoginForm, AccountForm, PasswordInput e ações. Ícones decorativos, labels associados, foco, estados pending/offline, erro preservando preenchimento e confirmação de sucesso clara. E-mail/senha continuam sendo os únicos meios de autenticação.
- Sem Google/Apple, assinatura, idiomas extras, telefone ou nascimento. Sem checkbox decorativo de sessão: sua política não será alterada. Confirmar senha continua obrigatório, embora o mockup não mostre o campo. Regra permanece 12–128; limite legado de login 1024 não será reduzido.

## Proposta aditiva de backend antes da execução

Para reproduzir o campo de nome usando a ampliação de identidade já aprovada, incluir nome de exibição opcional no cadastro, validado pelo mesmo `normalizeProfileName` do perfil (80 caracteres, sem controles). Quando informado, acrescentar apenas `options.data.display_name` ao signup do Supabase. Nome não autoriza acesso nem substitui e-mail. Não criar perfil operacional antes da confirmação nem alterar callbacks, PKCE, sessão, senha ou provedores.

Após autenticação, a inicialização de identidade da Fase 9 já lê metadata validada quando não existe perfil. Perfil existente permanece a fonte autoritativa, inclusive nome explicitamente removido. Exportação privada acrescentará `account.display_name` resolvido pelo mesmo critério, reutilizando os perfis já consultados; alteração aditiva no JSON v1. Auth e seus metadados já fazem parte do backup e da exclusão da conta. Nenhuma migração nova é necessária.

O adaptador QA de signup precisa criar identidade sintética própria e conservar metadata, em vez de reutilizar a conta padrão para e-mail novo. Cadastro repetido não deve sobrescrever o nome de conta existente. Essa mudança é somente no ambiente isolado de teste, mantendo os fluxos de confirmação/PKCE exercitados.

## Responsividade e referências

Tokens centrais em `src/styles/diazen-v2/tokens.css`, com Dark Premium mobile e Light Premium/alternância escura desktop. Desktop não é mobile ampliado: boas-vindas em duas colunas, demais telas em painéis centrais compactos. Sem sidebar na autenticação. Mobile respeita área segura e teclado; nenhum formulário pode ser cortado em 320 px. Imagem própria é editorial, nunca dado corporal de usuário.

## Critérios e validação

Verificar cadastro com nome opcional, confirmação e leitura da própria identidade; nome inválido preserva campos; conta existente não é alterada por novo cadastro. E-mail/senha, erros genéricos sem enumeração, logout, recuperação, nova senha, PKCE por navegador, reuso e adulteração continuam passando.

Validar temas/cookie/SSR, três apresentações e os dois CTAs, teclado e password toggles, offline, feedback, acessibilidade e ausência de overflow em 320/390/768/1366/1672. Capturar UI sem molduras e comparar com R13, incluindo estados de erro/sucesso. Executar build, lint, formatação, tipos, banco, regressões Chromium/WebKit e agent-browser; publicar branch e integrar somente após CI.

No preview, configurar a conexão já aprovada da develop e a URL canônica somente para a nova branch. Não alterar produção nem replicar segredos de integrações alheias à fase. Testes de backend hospedado usam contas sintéticas, criação administrativa com e-mail confirmado e limpeza; não enviar mensagens/e-mails externos por automação. Entrega documentará os limites da verificação de entrega de e-mail, mantendo o fluxo existente.

## Proposta de configuração de retorno do preview

Antes da execução, a consulta de configuração confirmou `site_url` de produção, confirmação de e-mail habilitada e mínimo de 12 caracteres; a lista de retorno já contém produção, develop e localhost. Para que os links gerados pela nova branch retornem ao mesmo navegador/origem do PKCE, acrescentar somente `/auth/confirmar` e `/auth/recuperar` no alias estável `https://diazen-git-feat-diazen-v2-512339-pauloluccas-projects-58a37ef2.vercel.app`. Preservar todas as entradas anteriores, sem wildcard e sem alterar `site_url`, política de senha, SMTP, confirmação ou sessões. Conferir os valores depois da atualização e registrar somente metadados públicos nos artefatos privados. Não enviar e-mail externo como parte dessa verificação.
