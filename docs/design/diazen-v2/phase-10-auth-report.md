# Fase 10 — Autenticação

Concluída em 18/11/2026. Branch `feat/diazen-v2-autenticacao`, integrada por fast-forward e enviada à develop em `03f5845`.

## Resultado implementado

Boas-vindas, login, cadastro, recuperação, nova senha e confirmação de solicitação de exclusão usam a estrutura pública v2. Mobile Dark Premium; desktop claro/escuro com preferência compartilhada com o painel e leitura inicial no servidor. Boas-vindas têm imagem editorial própria, composição dividida desktop, três apresentações acessíveis e dois CTAs reais; acesso aos primeiros passos permanece disponível.

Formulários usam labels, ícones decorativos, foco, pending/offline e mensagens estruturadas. Erros preservam preenchimento e sucessos de cadastro/recuperação limpam os campos. A confirmação de senha e a regra de 12–128 caracteres foram preservadas, mesmo divergindo da imagem. Login mantém o limite legado. Não há autenticação social, checkbox sem política de sessão ou provedores novos.

Nome opcional do cadastro usa a validação do perfil e metadata Auth como inicialização. O perfil existente é autoritativo, inclusive nome removido. Exportação v1 acrescenta `account.display_name` resolvido pela mesma regra. Não houve migração de schema nem alteração de sessão, PKCE ou autorização. O adaptador QA agora cria identidade própria no cadastro e conserva a metadata, evitando que o teste aprove nome na conta errada.

## Arquivos e componentes

- `src/components/auth/`: AuthShell, AuthFrame, AuthBrand, AuthField e WelcomeExperience; estilos responsivos extraídos de R13.
- `src/lib/desktop-theme.ts`: gravador de preferência compartilhado com PanelShell.
- Páginas públicas `/`, `/entrar`, `/cadastro`, `/recuperar-senha`, `/nova-senha` e `/conta-excluida`.
- LoginForm e AccountForm reutilizam as ações/PasswordInput existentes; envio em transição mantém campos em erro.
- Ação signup e exportação: adição de nome opcional conforme proposta anterior à execução.
- Asset próprio `runner-welcome-v2.webp`, documentado no inventário editorial.
- Testes de autenticação, visibilidade de senha, redesign e restauração nativa; fixture Auth conserva o isolamento da nova identidade.

## Verificação obtida

- Build de produção, lint, formatação e TypeScript aprovados.
- 16 cenários direcionados aprovados no Chromium e no WebKit: fluxos reais do ambiente isolado, nomes, reset/erro, PKCE, temas e cinco larguras.
- Suíte integral Chromium: 62 aprovados e uma amostra privada local ignorada.
- Suíte integral WebKit: 62 aprovados e uma amostra privada local ignorada. O teste de comparação de fotos passou a aguardar a URL com as duas seleções antes de abrir o menu de exclusão; o trace comprovou a navegação ainda pendente. Todas as verificações de privacidade foram mantidas.
- Banco: 136 testes aprovados.
- Agent-browser: 26 jornadas aprovadas no ambiente local isolado, incluindo autorização, histórico, registros, privacidade e offline.
- Restauração PostgreSQL 17 aprovada: nome inicial em metadata Auth preservado no dump/restore e removido ao reaplicar exclusão; perfil/avatar, RLS e arquivos anteriores continuam verificados. Ensaio sintético local, sem alegar restauração do serviço Storage hospedado.
- Capturas locais `artifacts/diazen-v2/auth-fiel/`, mobile/desktop claro/escuro e estados de sucesso. R13 comparada sem molduras; capturas selecionadas estão em `screenshots/phase-10-auth/` (WebP, dados sintéticos).

## Configuração do preview

Conexão já aprovada da develop e URL canônica configuradas somente para a nova branch. A lista de retorno do Supabase recebeu apenas os dois callbacks exatos desse alias controlado, preservando todos os anteriores, o site de produção, confirmação de e-mail e política de senha. Não foram acionados envios de cadastro/recuperação externos por automação; entrega efetiva de e-mail não é certificada por essa verificação.

## Preview verificado

Commit `5ee56d2`, preview READY: login real com e-mail/senha no Supabase, erro preservando campos, identidade da metadata confirmada, remoção do nome persistida, confirmação de senha rejeitada antes de chamar atualização e logout. Nenhuma exceção JavaScript. Conta sintética removida integralmente, sem tocar na conta do proprietário ou enviar e-mails de cadastro/recuperação. Evidência local privada: `artifacts/diazen-v2/auth-hosted-ui-check.json`.

## Conclusão e limites

CI completa aprovada: [código `5ee56d2`](https://github.com/pauloluccasdev/diazen/actions/runs/44401935598) e [auditoria `03f5845`](https://github.com/pauloluccasdev/diazen/actions/runs/44402845118). Revisão transversal concluída na [auditoria final](completion-audit.md), com 13 referências e desktop escuro. Sem pendência de implementação no escopo aprovado. Main permanece sob responsabilidade do proprietário.

A comparação visual é manual, em engines Chromium/WebKit, sem alegação de identidade pixel a pixel ou homologação em aparelho físico. Entrega real de e-mail e restauração do Storage hospedado não são certificadas pelo ensaio local. A próxima etapa do proprietário é revisar a develop e abrir o PR para main; não há próxima sprint automática.
