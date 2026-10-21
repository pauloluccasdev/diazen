# Diazen

Aplicativo da Lucx Tech para diário, check-in, controle nutricional e evolução física.

**Status:** preparação do MVP 0.1. O framework da aplicação será **Next.js**, com banco de dados no **Supabase**. Base em TypeScript, App Router e Tailwind CSS. O repositório contém a fundação da aplicação e a documentação de referência.

## Antes de desenvolver

Leia [AGENTS.md](AGENTS.md), os [requisitos](docs/requisitos.md), o [Design System](docs/design-system.md) e as [decisões técnicas](docs/decisoes-tecnicas.md). Consulte também os [tokens de design](design/Diazen_Design_Tokens_MVP_0_1_v1_1.json) e a [referência visual](docs/referencias/Showcase%20da%20interface%20do%20Diazen%20em%20modo%20escuro.png).

## Documentação

- `docs/originais/`: os dois DOCX originais, versão 1.1, preservados.
- `docs/requisitos.md` e `docs/design-system.md`: cópias textuais com tabelas para consulta e busca pela IA.
- `docs/referencias/`: showcase fornecido; referência estética, sem ampliar o escopo aprovado.
- `design/`: JSON original dos tokens de design.
- `docs/decisoes-tecnicas.md`: decisões confirmadas e questões ainda abertas.

Para atualizar as cópias Markdown após alterar os DOCX, execute `python3 scripts/extrair_documentacao.py`. O script usa apenas a biblioteca padrão do Python. Imagens incorporadas e diagramação continuam disponíveis nos documentos originais.

## Escopo de referência

PWA mobile-first com autenticação, projetos e metas, diário alimentar manual, hidratação, atividades físicas, peso, medidas, fotografias privadas e dashboard. O MVP não inclui importação por IA, Strava, login social ou relatórios avançados.

## Executar localmente

Use Node.js 24 (arquivo `.nvmrc`) e npm:

```bash
npm ci
npm run dev
```

Abra http://localhost:3000. A prévia pública funciona sem variáveis. Para habilitar o login, copie `.env.example` para `.env.local` e informe a URL e a chave publicável do Supabase.

## Verificar

```bash
npm run lint
npm run build
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Os testes de navegador iniciam o servidor de produção na porta 3000; deixe-a livre. No Linux/CI, use `npx playwright install --with-deps chromium` quando necessário. A CI executa lint, build, tipagem e os testes de navegador.

## Estado da implementação

- Fundação Next.js com TypeScript, App Router, Tailwind e tokens do Diazen.
- Prévia responsiva do dashboard, sem dados fictícios ou persistência.
- Manifesto e ícones PWA; service worker habilitado somente em produção.
- Offline: aviso de indisponibilidade e cache exclusivo de uma página pública de fallback. Cache de dados pessoais ainda não foi implementado. O fallback permanece legível sem CSS/JavaScript previamente carregado.
- Login e logout com Supabase Auth, sessão em cookies e painel protegido por validação remota do usuário no servidor. Login/logout são bloqueados offline.
- Cadastro, recuperação de senha, projetos, registros e otimização de fotos ainda não estão implementados. Não há schema SQL nem infraestrutura provisionada.

Para verificar a PWA, execute `npm run build` e `npm start`, acesse localhost e confira Manifest e Service Workers nas ferramentas do navegador. Após o worker estar ativo, recarregue a página e simule offline. A instalação depende do navegador; em hospedagem, requer HTTPS.

## Fluxo de desenvolvimento

A `develop` concentra a integração. Cada funcionalidade deve partir da `develop` atualizada em branch `feat/<nome>` (ou `fix/`, `docs/`, conforme a mudança). Faça commits por entrega concluída, valide e envie a branch ao remoto. O agente está autorizado a realizar merge das entregas na `develop`, validar a integração e fazer push. A próxima branch parte dessa `develop` atualizada. O proprietário realiza o PR final de `develop` para `main` e o code review; o agente não realiza merge na `main`.

## Dependências

O lockfile fixa as versões instaladas. `npm audit --omit=dev` não apontou vulnerabilidades na fundação. A auditoria completa apontou um aviso de severidade alta em `braces <=3.0.3`, propagado pela cadeia do ESLint do Next.js (cinco entradas no relatório), sem versão corrigida disponível na instalação. Acompanhar a atualização; não aplicar downgrade automático do framework com `npm audit fix --force`.

## Autenticação: configuração e verificação

A entrega de acesso existente atende parcialmente RF-001 e aplica RNF-001/RNF-002: login por e-mail/senha, logout local ao navegador, validação remota de identidade para o painel e respostas privadas sem cache. As senhas são enviadas ao Supabase Auth, sem tabela de credenciais na aplicação. O provedor é responsável por hash e limites de autenticação; revisar esses limites antes do uso real.

1. Em um projeto Supabase próprio, copie a URL e a chave **publicável** para `.env.local`. Não use `service_role` ou chave secreta. Reinicie o servidor após configurar.
2. Nesta etapa, use uma conta de teste previamente criada no Supabase Auth; ainda não há cadastro pela interface. Teste credenciais corretas e incorretas em `/entrar`.
3. Confirme que `/painel` redireciona para `/entrar` sem sessão, que o login permite acesso e que sair impede acesso novamente. Confira a renovação de sessão após expiração do token no projeto real.
4. Confirme em outro navegador que a sessão não é compartilhada. Simule offline: ações ficam bloqueadas e o cache contém apenas `/offline`.

Os testes automatizados usam exclusivamente um simulador HTTP local de Auth (`tests/fixtures/auth-server.mjs`), com dados fictícios. Cobrem sucesso, falhas genéricas sem indicar existência de conta, logout, rota protegida, cookie inválido, cache e offline. Não conectam ao Supabase real nem comprovam hash, força bruta, SMTP, renovação de tokens ou configuração do provedor. A validação real permanece pendente das configurações acima; RF-001 só estará completo com cadastro e recuperação. Nenhum teste depende de credenciais pessoais.

Referência de implementação: [Supabase Auth para Next.js com cookies](https://supabase.com/docs/guides/auth/server-side/creating-a-client). A renovação passa pelo proxy; o painel verifica o usuário no servidor com `getUser`, sem confiar apenas no conteúdo dos cookies. Próximas rotas privadas e operações deverão repetir a validação e aplicar autorização sobre o recurso.

### Cadastro e recuperação

Configure também `NEXT_PUBLIC_SITE_URL` com a origem exata da aplicação (HTTPS em hospedagem). No Supabase, habilite confirmação de e-mail e configure Site URL e redirect URLs. Os templates devem usar:

- Confirmação: `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email`
- Recuperação: `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery`

Configure SMTP próprio antes de uso real. O callback aceita somente os dois tipos previstos e ignora destinos externos. `/nova-senha` exige identidade validada no servidor. A política inicial de novas senhas é de 12 a 128 caracteres; configure política compatível no Supabase. Teste entrega, expiração e uso único de links em homologação. As mensagens de cadastro/recuperação não confirmam existência de conta nem garantem entrega de e-mail.
