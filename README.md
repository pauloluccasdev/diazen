# Diazen

PWA pessoal da **Lucx Tech** para diário alimentar, hidratação, atividades e evolução física. **MVP 0.1 em desenvolvimento, com núcleo implementado e validação local; homologação real ainda pendente.**

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 e Supabase (PostgreSQL, Auth e Storage privado). Hospedagem prevista na Vercel, inicialmente para uso pessoal.

Uma prévia pública da `develop` está disponível na Vercel; o painel exige login Diazen. Veja [publicação e configuração de autenticação](docs/publicacao.md); o lançamento em produção continua pendente dos gates de homologação e review.

O Supabase anteriormente usado pelo Planna foi resetado por autorização do proprietário e já recebeu as migrações 001 a 012. As migrações 009 (conveniências alimentares), 010 (planos) e 011 (registro de refeições) e 012 (importação Garmin) foram aplicadas incrementalmente, sem novo reset. Os fluxos essenciais passaram no serviço real com contas temporárias removidas ao final. Consulte [evidências e pendências de homologação](docs/homologacao-supabase.md). **Não reaplique o bundle nesse ambiente.**

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

`npm run test:restore:services` executa o ensaio com Auth, PostgREST e Storage reais do Supabase em um laboratório local nativo temporário. Requer Linux compatível, CLI 2.121.0 previamente disponível no cache do npm e `PG_BIN_DIR`; na primeira execução baixa os serviços. Não requer Docker nem credenciais remotas. Consulte [operação](docs/operacao.md) antes de executar.

Os testes de navegador usam Auth/Storage HTTP simulados e persistência PostgreSQL real embarcada, **sempre com dados fictícios** e variáveis de teste explícitas. O servidor de teste usa a porta **3100**, e o serviço local, **54329**. Deixe essas portas livres. A configuração é lida dinamicamente no servidor para não incorporar dados do `.env.local` ao build de testes.

A CI executa a suíte em Chromium e WebKit (perfil iPhone), incluindo checagens axe de acessibilidade e layout em 320, 375, 390, 430, 768 e 1280 px. Para WebKit local, instale suas dependências com `npx playwright install --with-deps webkit` em ambiente compatível e use `npm run test:webkit`. O teste WebKit não substitui instalação e uso em Safari iOS físico.

Para produzir capturas das telas reais para revisão visual, após o build, execute `CAPTURE_REVIEW=1 npx playwright test tests/accessibility.spec.ts --project=chromium`. As imagens completas em 390 e 1280 px ficam em `artifacts/visual-review/chromium/`, fora do Git, usando somente o ambiente fictício local. O roteiro de aprovação está em [homologação final](docs/homologacao-final.md).

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

Sem IA, Strava, login social, prescrição de dieta/treino ou barra inferior fixa. Receitas, favoritos, recentes e cópia de refeições (RF-009) foram incluídos por aprovação do proprietário. A pedido do proprietário, foi incorporada a consulta local à TACO (NEPA/UNICAMP, 4ª edição revisada e ampliada, 2011), com 597 alimentos e referência por 100 g. Em Alimentação → Alimentos, receitas e favoritos → Cadastrar alimento próprio, abra “Consultar tabela TACO”, selecione o alimento/preparo e revise antes de salvar. Itens não encontrados, marcas e versões light continuam usando valores informados com fonte identificada. Em **Alimentação → Meu plano alimentar**, selecione um PDF com texto selecionável (até 3 MB/30 páginas), a composição e os totais são pré-preenchidos para nomes reconhecidos sem ambiguidade na TACO. Revise as referências; os demais alimentos já mostram sugestões e busca preenchida. Você pode aplicar uma escolha aos itens pendentes com o mesmo nome ou informar valores de rótulo com fonte. Selecione uma opção por refeição e confirme antes de salvar. O cálculo mostra subtotais parciais quando faltam valores e compara o plano com o consumo registrado na data. A leitura começa no navegador. Se o leitor local falhar, o Diazen usa processamento temporário no próprio servidor, em memória, sem reter o PDF ou enviá-lo a serviços de extração externos; apenas os dados revisados são salvos em versões privadas. Os dois formatos fornecidos são suportados; outros layouts ou PDFs digitalizados podem não ser reconhecidos. Não há OCR, IA ou lançamento automático no diário.

## Fonte nutricional TACO

Fonte: **NEPA – Universidade Estadual de Campinas. Tabela Brasileira de Composição de Alimentos – TACO. 4ª edição revisada e ampliada. Campinas: NEPA/UNICAMP, 2011.** A publicação permite reprodução parcial ou total com citação da fonte (páginas iniciais ii/iii).

O catálogo versionado em `src/data/taco-4.json` contém calorias, proteínas, carboidratos e lipídeos por **100 g de parte comestível**, com número do alimento e páginas de origem. `Tr` (traço), `NA`, células sem análise e `*` (reavaliação) permanecem distintos de zero. Porções em ml não são convertidas em gramas automaticamente. Selecionar um item preenche o formulário; salvar alimento e registrar consumo continuam exigindo ações explícitas. Os registros anteriores mantêm seus snapshots.

Para reproduzir a extração usando o PDF da mesma edição fornecido pelo proprietário, execute em ambiente local com Python/PyMuPDF (não são dependências da aplicação hospedada):

```bash
uv run --with pymupdf==1.28.2 scripts/extract_taco.py /caminho/para/taco_4_edicao_ampliada_e_revisada.pdf
npx prettier --write src/data/taco-4.json
npm run test:db
```

O extrator espera o layout desta edição, valida os IDs 1 a 597 e conserva marcadores não numéricos. O hash do PDF fica nos metadados do catálogo; PDFs de dieta pessoais não são versionados nem enviados a serviços de extração externos.

## Operação e limites da entrega

Veja [operação e homologação](docs/operacao.md), [rastreabilidade](docs/matriz-requisitos.md) e [plano de implementação](docs/plano-implementacao.md). A entrega local não comprova configuração do Supabase real, envio de e-mails, concorrência multi-conexão, restauração remota, desempenho em dispositivo físico ou revisão jurídica/visual do proprietário. Essas pendências devem ser resolvidas antes de declarar o MVP pronto para uso real.

`npm run privacy:purge` reprocessa solicitações e limpezas pendentes usando `.env.local`; só exclui contas que já solicitaram exclusão. Mantenha o ledger mínimo de exclusões protegido e separado dos backups para não reintroduzir dados apagados em uma restauração. O endpoint `/api/saude` monitora apenas a aplicação, sem revelar dados ou configuração de serviços.

`npm audit --omit=dev` não apontou vulnerabilidades de produção nas verificações locais. A auditoria completa aponta `braces <=3.0.3` na cadeia de ferramentas ESLint do Next.js (cinco entradas), sem correção disponível na instalação. Acompanhar atualização; não aplicar downgrade com `npm audit fix --force`.

## Documentação e fluxo Git

Antes de desenvolver, leia [AGENTS.md](AGENTS.md), os [requisitos](docs/requisitos.md), o [Design System](docs/design-system.md), os [tokens](design/Diazen_Design_Tokens_MVP_0_1_v1_1.json) e as [decisões técnicas](docs/decisoes-tecnicas.md). DOCX em `docs/originais/` são a fonte documental; atualize-os antes de regenerar cópias Markdown com `python3 scripts/extrair_documentacao.py`. O showcase é referência estética, sem ampliar escopo.

Cada funcionalidade sai da `develop` atualizada, em `feat/`, `fix/` ou prefixo apropriado. O agente valida, faz commits, push e merge na `develop`, depois inicia a próxima branch pela integração atualizada. O proprietário realiza o PR final de `develop` para `main` e o code review. Não fazer merge na `main` nem force push.

## Biblioteca alimentar

Em Alimentação, acesse **Alimentos, receitas e favoritos** para salvar composições próprias com fonte e referência. Receitas usam ingredientes da biblioteca e rendimento em porções; valores desconhecidos continuam ausentes. Ao consumir, o diário recebe uma cópia da composição, preservada mesmo após editar/remover a biblioteca. Recentes reutilizam os últimos 20 registros da conta. Copiar refeição exige confirmação, inclui todos os itens da origem e adiciona ao ACTIVE sem substituir os registros existentes.

## Auditoria com agent-browser

Após `npm run build`, execute `npm run test:agent-browser`. Requer a CLI `agent-browser` 0.39.1 e Chromium disponível (`agent-browser install`). O comando recusa portas ocupadas, cria seu próprio laboratório nas portas 3100/54329, percorre os formulários, testa falhas e remove os processos ao terminar. Não usa o Supabase remoto. Relatórios e capturas ficam em `artifacts/agent-browser/`, ignorados pelo Git. A CI executa esse roteiro além das suítes Chromium e WebKit; `DIAZEN_QA_PLAYWRIGHT_BROWSER=1` permite usar o binário Chromium já instalado pelo Playwright, mantendo o controle pela CLI.

O modo `test:agent-browser:hosted` é uma homologação explícita da prévia `develop`: executa gravações em contas sintéticas próprias e as exclui no final, incluindo fotos. Requer `.env.local` administrativo e token OIDC temporário, fornecido por `vercel env run -- npm run test:agent-browser:hosted`. Não aponta para produção nem altera a proteção da Vercel. Depois de concluir, atualize a cópia independente do ledger com `npm run backup:ledger`. A confirmação de entrega de e-mails, instalação em aparelho físico e revisão jurídica continuam sendo verificações separadas.

## Cópias cifradas locais

`npm run backup` produz um snapshot do banco e das fotos e uma cópia independente atualizada do ledger de exclusões. `npm run backup:ledger` atualiza somente esse ledger após uma solicitação/purge. `npm run backup:verify -- /caminho/arquivo.tar.gpg` confere abertura, manifesto e checksums sem restaurar nem alterar o banco. Requer ferramentas PostgreSQL 17, GnuPG, tar e configuração privada em `.env.backup.local`; veja [operação](docs/operacao.md). A chave fica separada do destino. Nenhum desses comandos agenda execução ou remove cópias antigas automaticamente.

A migração `202610230010_diet_plans.sql` deve ser aplicada incrementalmente em ambientes existentes antes de usar planos. O worker PDF.js é copiado da dependência fixada por `prebuild`/`predev`; execute `npm run build` ou `npm run dev` normalmente. Os planos participam da exportação, exclusão da conta e backup completo do banco.

Na revisão do plano, cada alimento tem resumo de porção e calorias, ações para revisar dados, trocar por uma alternativa e retirar/reincluir no cálculo. Quando faltar uma referência TACO ou padrão local e houver porção conhecida, o Diazen busca automaticamente pelo nome no Open Food Facts (base colaborativa, ODbL), usando o primeiro resultado com calorias declaradas e unidade compatível. A marca pode variar, conforme preferência aprovada. O alimento mostra a fonte e permite editar os valores em **Revisar dados nutricionais**. A fila respeita os intervalos do provedor e reaproveita nomes repetidos; planos grandes podem levar alguns minutos. Só nome/código é enviado, sem PDF ou identificação pessoal. Falhas, porções incompatíveis e ausência de dados mantêm o preenchimento manual. Valores existentes são preservados.

As refeições do plano podem ser recolhidas pelo cabeçalho, que mantém o subtotal visível. Alimentos comuns usam referências aproximadas identificadas (por exemplo, arroz cozido e peito de frango grelhado da TACO), editáveis para ajustar preparo/porção. Saladas sem peso usam o mínimo indicado no PDF ou uma porção de referência de 100 g, explicitamente estimada. Chia (TBCA), psyllium e requeijão light (rótulos de referência) têm fontes conferidas disponíveis localmente. Dados revisados não são sobrescritos. A consulta dos demais alimentos repete falhas temporárias até três vezes e permite tentar novamente.

Salvar uma versão do plano apresenta confirmação em modal e mantém feedback na página. O dashboard compara calorias do plano e do diário, além das refeições planejadas e categorias com registros na data. Usa a última versão salva até aquela data, preserva ausência distinta de zero e não interpreta um lançamento como confirmação de refeição completa.

Com plano salvo, Alimentação exibe as refeições incluídas e permite **Registrar conforme o plano** ou **Ajustar porções**. Escolha a categoria do diário e confirme; apenas essa ação registra consumo. Porções consumidas não alteram o planejamento. A ação **Registrar refeição** monta um lote manual com vários alimentos e prévia calórica, referências TACO/padrão e consulta online opcional. Nutrientes e fontes podem ser conferidos na seção de composição. Repetições da mesma solicitação não duplicam registros; a refeição do plano já registrada na data é identificada.

A migração incremental `202610240011_plan_meal_records.sql` adiciona origem do planejamento aos itens e a RPC transacional de registro. Deve ser aplicada antes da atualização da aplicação; preserva os registros existentes e não exige reset. A exportação inclui a origem nos itens; os backups completos preservam a versão e as referências.


O dashboard oferece **Histórico geral** (`/painel/historico`) do projeto ativo: calendário mensal aberto, seleção de um dia e resultados em accordion por data, com grupos de refeições, hidratação, atividades, peso, medidas e fotos. A consulta não muda o projeto ativo; fotos abrem na galeria privada. Projetos anteriores continuam disponíveis em Projetos.

A consulta por data fica centralizada no Histórico geral. As telas operacionais mantêm os campos de data para salvar registros retroativos, mas não exibem seletores de consulta nem a faixa de dias da Alimentação. A navegação no calendário mostra logo e “Carregando registros…” enquanto aguarda os dados.


Atividades inclui Garmin Personal API exclusivamente para a conta proprietária configurada no servidor. Permite selecionar atividades anteriores para importar e salvar automaticamente as novas, com título, tipo, data, duração, distância e calorias disponíveis. Respeita o projeto ativo, evita duplicações e preserva edições/exclusões do diário. A sincronização ocorre ao abrir o aplicativo e a cada quinze minutos pelo Supabase Cron. Requer a migração incremental 012 e configuração privada; veja [operação, limites e validação Garmin](docs/integracao-garmin.md).

Na tela Atividades, a apresentação da Garmin abre na primeira visita e começa recolhida nas seguintes, com um accordion acessível. Um marcador visual no navegador guarda apenas que a apresentação já foi vista. O resumo semanal destaca os dias com registros; cada atividade mostra duração, distância e calorias disponíveis em um card, com edição e exclusão recolhidas nos detalhes. A importação automática continua funcionando com a seção fechada.

Selecionar um dia no resumo semanal de Atividades mostra os registros daquela data na própria tela. No dashboard, os cards comparam os registros com as metas ou plano disponíveis; Peso mostra as últimas trinta medições e a variação no período quando há pelo menos duas datas.
