# Diazen

PWA pessoal da **Lucx Tech** para diário alimentar, hidratação, atividades e evolução física. **MVP 0.1 em desenvolvimento, com núcleo implementado e validação local; homologação real ainda pendente.**

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 e Supabase (PostgreSQL, Auth e Storage privado). Hospedagem prevista na Vercel, inicialmente para uso pessoal.

Uma prévia protegida da `develop` está disponível na Vercel. Veja [publicação e configuração de autenticação](docs/publicacao.md); o lançamento em produção continua pendente dos gates de homologação e review.

O Supabase anteriormente usado pelo Planna foi resetado por autorização do proprietário e já está configurado localmente com as oito migrações. Os fluxos essenciais passaram no serviço real com contas temporárias removidas ao final. Consulte [evidências e pendências de homologação](docs/homologacao-supabase.md). **Não reaplique o bundle nesse ambiente.**

## Executar

Use Node.js 24 (`.nvmrc`) e npm:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000. A abertura pública funciona sem credenciais; autenticação e registros precisam do Supabase configurado. Não coloque valores reais em arquivos versionados nem envie a chave secreta pelo chat.

## Configurar o Supabase

1. Use um projeto dedicado e revise [a modelagem](docs/modelagem.md) e as migrações em `supabase/migrations/`.
2. Preencha `.env.local` com URL, chave **publicável**, origem do app e chave administrativa **somente servidor**. A chave privilegiada nunca deve usar prefixo `NEXT_PUBLIC_`. A configuração rejeita chaves secretas no campo público.
3. Execute `npm run db:bundle`. O arquivo `artifacts/diazen-migrations.sql` reúne as migrações para revisar/aplicar, uma vez, no SQL Editor de um projeto vazio. Para ambientes existentes, use o fluxo de migrações do Supabase e controle quais versões já foram aplicadas; não execute o bundle novamente nem apague tabelas para resolver erros.
4. Em Auth, habilite confirmação de e-mail e mantenha o provedor e os templates padrão do Supabase Free. Configure Site URL e os callbacks `/auth/confirmar` e `/auth/recuperar`. A origem em `NEXT_PUBLIC_SITE_URL` deve ser a URL exata do app, sem caminho; HTTPS em hospedagem.
5. Use o fluxo PKCE padrão: inicie o cadastro/recuperação e abra o link de e-mail no mesmo navegador e origem. O provedor padrão tem destinatários e cota de envio restritos, adequados ao uso pessoal inicial aprovado. Veja [publicação](docs/publicacao.md).
6. Execute `npm run env:check` para verificar presença/formato sem exibir valores; `npm run env:check -- --connect` faz consultas administrativas **somente leitura**, verifica schema/bucket e não cria usuários nem registros.
7. Reinicie o servidor e percorra os fluxos de homologação em [docs/operacao.md](docs/operacao.md).

Os callbacks usam códigos PKCE e destinos fixos para confirmação e recuperação. Novas senhas usam 12–128 caracteres; configure política compatível no Supabase. Senhas e sessões permanecem sob responsabilidade do Auth. Confirme a entrega de e-mail e os limites do provedor padrão antes do uso real.

## Verificar

```bash
npm run format:check
npm run lint
npm run build
npm run typecheck
npm run test:db
npx playwright install chromium
npm run test:e2e
```

`test:db` usa PostgreSQL embarcado (PGlite), com roles, RLS, constraints e migrações reais; inclui orientação/EXIF de fotos, validação de configuração e um ensaio local de backup/restauração com reaplicação de exclusões. Os schemas de Auth/Storage são adaptadores de teste, sem conexão com serviços reais.

`PG_BIN_DIR=/usr/lib/postgresql/17/bin npm run test:restore` executa um ensaio adicional com PostgreSQL nativo, `pg_dump`/`pg_restore`, imagens locais e ledger de exclusões, em cluster temporário isolado. Consulte os requisitos e limites em [operação](docs/operacao.md). Não usa `.env.local` nem altera o Supabase.

Os testes de navegador usam Auth/Storage HTTP simulados e persistência PostgreSQL real embarcada, **sempre com dados fictícios** e variáveis de teste explícitas. O servidor de teste usa a porta **3100**, e o serviço local, **54329**. Deixe essas portas livres. A configuração é lida dinamicamente no servidor para não incorporar dados do `.env.local` ao build de testes.

A CI executa a suíte em Chromium e WebKit (perfil iPhone), incluindo checagens axe de acessibilidade e layout em 320, 375, 390, 430, 768 e 1280 px. Para WebKit local, instale suas dependências com `npx playwright install --with-deps webkit` em ambiente compatível e use `npm run test:webkit`. O teste WebKit não substitui instalação e uso em Safari iOS físico.

## O que está implementado

- Cadastro, confirmação, login, logout e recuperação de acesso por e-mail/senha.
- Onboarding por criação de projeto com meta mensurável; um ACTIVE por usuário; rascunhos, conclusão/arquivamento confirmados e histórico somente leitura.
- Metas de água com vigência, peso alvo/faixa/acompanhamento e sessões semanais globais.
- Água, peso, circunferências, musculação/corrida/bike/natação e alimentação manual com composição informada por referência, sem inventar nutrientes.
- Edição/exclusão em ACTIVE, datas retroativas na vigência, unicidade global de peso/medidas, confirmação diária e auditoria interna.
- Fotos privadas, redução e remoção de metadados, miniaturas, galeria paginada e comparação entre páginas.
- Dashboard por projeto/data, indicadores agregados no banco, gráfico simples e navegação por cartões.
- PWA instalável quando suportado; escrita offline bloqueada; resumo mínimo do dashboard disponível na aba por até 24 h, apagado ao sair da conta. Fotos e respostas autenticadas ficam fora do cache do service worker.
- Exportação de registros em JSON e solicitação de exclusão com reautenticação, bloqueio imediato e purge administrativo.

Sem IA, Strava, login social, prescrição de dieta/treino ou barra inferior fixa. Receitas, favoritos, recentes e cópia de refeições (RF-009, prioridade Média) ficam para a revisão de backlog. O catálogo nutricional não foi incorporado: o núcleo usa valores e fontes informados pelo usuário.

## Operação e limites da entrega

Veja [operação e homologação](docs/operacao.md), [rastreabilidade](docs/matriz-requisitos.md) e [plano de implementação](docs/plano-implementacao.md). A entrega local não comprova configuração do Supabase real, envio de e-mails, concorrência multi-conexão, restauração remota, desempenho em dispositivo físico ou revisão jurídica/visual do proprietário. Essas pendências devem ser resolvidas antes de declarar o MVP pronto para uso real.

`npm run privacy:purge` reprocessa solicitações e limpezas pendentes usando `.env.local`; só exclui contas que já solicitaram exclusão. Mantenha o ledger mínimo de exclusões protegido e separado dos backups para não reintroduzir dados apagados em uma restauração. O endpoint `/api/saude` monitora apenas a aplicação, sem revelar dados ou configuração de serviços.

`npm audit --omit=dev` não apontou vulnerabilidades de produção nas verificações locais. A auditoria completa aponta `braces <=3.0.3` na cadeia de ferramentas ESLint do Next.js (cinco entradas), sem correção disponível na instalação. Acompanhar atualização; não aplicar downgrade com `npm audit fix --force`.

## Documentação e fluxo Git

Antes de desenvolver, leia [AGENTS.md](AGENTS.md), os [requisitos](docs/requisitos.md), o [Design System](docs/design-system.md), os [tokens](design/Diazen_Design_Tokens_MVP_0_1_v1_1.json) e as [decisões técnicas](docs/decisoes-tecnicas.md). DOCX em `docs/originais/` são a fonte documental; atualize-os antes de regenerar cópias Markdown com `python3 scripts/extrair_documentacao.py`. O showcase é referência estética, sem ampliar escopo.

Cada funcionalidade sai da `develop` atualizada, em `feat/`, `fix/` ou prefixo apropriado. O agente valida, faz commits, push e merge na `develop`, depois inicia a próxima branch pela integração atualizada. O proprietário realiza o PR final de `develop` para `main` e o code review. Não fazer merge na `main` nem force push.
