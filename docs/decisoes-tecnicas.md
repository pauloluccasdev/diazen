# Decisões técnicas

## Confirmado — 21/10/2026

- Nome do produto: **Diazen**; empresa: **Lucx Tech**.
- Escopo inicial: MVP 0.1, conforme documentação versão 1.1 fornecida.
- **Banco de dados no Supabase**, definido pelo proprietário ao preparar este repositório.
- **Next.js** como framework da aplicação, aprovado pelo proprietário na discussão de stack.

A decisão pelo Supabase atualiza o item de banco ainda pendente na seção 9 da especificação original. Os documentos originais foram preservados sem alterações.

## Decisão — Next.js — 21/10/2026

- **Contexto:** PWA mobile-first para uso pessoal inicial, priorizando baixo custo e facilidade de manutenção; Vercel ou outra hospedagem gratuita em avaliação.
- **Decisão:** adotar Next.js como framework da aplicação.
- **Motivo:** preferência do proprietário pela alternativa que permite reunir interface React e código de servidor no mesmo projeto.
- **Impacto:** o frontend e as operações de servidor da aplicação poderão ser organizados em um único projeto Next.js, mantendo o banco no Supabase. A implementação deverá preservar autorização no servidor, integridade e leitura offline limitada, sem edição offline.
- **Requisitos relacionados:** RF-018, RF-022; RNF-002, RNF-009, RNF-011 e RNF-014.
- **Limites da aprovação:** não define versão, roteador, linguagem, bibliotecas auxiliares, autenticação, storage ou hospedagem; não autoriza provisionamento ou criação de schema nesta etapa.

## Decisão — Fundação da aplicação — 21/10/2026

- **Contexto e autorização:** após escolher Next.js, o proprietário autorizou iniciar a proposta de stack e definiu branches por funcionalidade, commits de entregas concluídas e push para PR/review próprio.
- **Implementação:** Next.js 16, React 19, TypeScript, App Router, Tailwind CSS 4 e npm com lockfile; Node.js 24 para desenvolvimento e CI. Lucide fornece ícones; fontes usam fallback local do sistema sem download externo.
- **Motivo:** manter interface e futura lógica de servidor no mesmo projeto, com verificação de tipos e deploy compatível com Vercel.
- **Impacto:** primeira entrega contém apenas fundação, prévia do dashboard e PWA com fallback público offline. Não inclui autenticação, persistência ou cache de dados pessoais. RF-018 e RF-022 atendidos apenas parcialmente; RNF-007, RNF-008, RNF-009 e RNF-014 orientam a base.
- **Direção aprovada para as próximas etapas:** Supabase Auth, Storage privado e Vercel conforme proposta anterior aceita ao iniciar. Contas, configurações, schema e deploy continuam sem provisionamento e exigem refinamento operacional.
- **Fluxo Git inicial:** substituído pela decisão de integração em `develop` abaixo.
- **Identidade:** ícone geométrico provisório para instalação; não representa aprovação final de marca.

## Decisão — Integração em develop — 21/10/2026

- **Contexto:** o proprietário definiu que criará a branch `develop` para concentrar o desenvolvimento antes do PR final.
- **Decisão:** cada funcionalidade parte da `develop` atualizada em branch própria, com commits por entrega concluída. Após validar, o agente pode fazer merge na `develop` e push, iniciando a próxima branch a partir da integração atualizada.
- **Motivo:** permitir desenvolvimento contínuo, mantendo a revisão final concentrada no PR de `develop` para `main`.
- **Impacto:** substitui o fluxo anterior de PR por funcionalidade para `main`. O PR final e o code review continuam com o proprietário; o agente não realiza merge na `main` nem force push.
- **Requisitos relacionados:** RNF-014; alteração do processo de desenvolvimento, sem mudança de escopo funcional.

## Decisão — Primeiro incremento de autenticação — 21/10/2026

- **Contexto:** continuação autorizada a partir da `develop`, já contendo a fundação aprovada.
- **Decisão:** integração SSR do Supabase Auth com cookies, renovação via proxy e validação remota com `getUser` no painel. Usar somente URL e chave publicável; sem schema próprio de credenciais ou chave privilegiada.
- **Motivo:** aproveitar a autenticação gerenciada e manter a proteção efetiva no servidor.
- **Impacto:** login, logout do navegador atual, painel privado, mensagens genéricas para falha de acesso e bloqueio offline. RF-001 parcial; RNF-001, RNF-002, RNF-009 e RNF-014. Cadastro, recuperação, SMTP e teste real de renovação de sessão ficam pendentes. Não foram provisionados serviços.
- **Verificação:** testes de navegador contra simulador HTTP local, sem dados reais. A configuração e homologação com Supabase real devem seguir o README antes do uso pessoal.

## Pendente de refinamento

- Hospedagem e divisão das responsabilidades entre Next.js e serviços do Supabase.
- Configuração de Supabase Auth, sessões, recuperação e SMTP.
- Configuração do Supabase Storage privado e processamento de imagens.
- Modelo relacional, migrações, RLS, constraints, auditoria e tratamento da exclusão de conta.
- Fonte nutricional e licença, unidades, metas e vigência temporal.
- Parâmetros de upload, desempenho, backup, restauração, retenção e custos.
- Seleção final dos requisitos de prioridade Média para o lançamento.

O campo conceitual `User.password_hash` do documento não define uma implementação de autenticação. Caso Supabase Auth seja adotado, as credenciais devem permanecer sob responsabilidade do serviço.

## Registro de novas decisões

Registrar data, contexto, decisão, motivo, impacto e requisitos afetados. Mudanças no escopo congelado exigem aprovação explícita conforme RB-11; propostas não devem ser tratadas como decisões aprovadas.

## Decisão — Cadastro e recuperação — 21/10/2026

Continuação do RF-001: confirmação e recuperação por token hash validado pelo Supabase, sem redirecionamento arbitrário. Origem definida por configuração confiável, nunca pelo Host da requisição. Novas senhas de 12–128 caracteres, confirmação local e validação no servidor. Mensagens de envio genéricas para evitar enumeração. SMTP, políticas no provedor e testes de entrega/expiração ainda dependem da homologação real. Não há login social ou armazenamento próprio de senhas.

## Refinamento — Persistência do MVP — 21/10/2026

A autorização para continuar até concluir o desenvolvimento inclui preparar o refinamento técnico e as migrações necessárias ao núcleo. A modelagem está detalhada em `docs/modelagem.md`, com rastreabilidade para RF/RB/RNF, limites, vigências e resolução das divergências de distância nas atividades. O SQL fica versionado para revisão; nenhum serviço remoto foi provisionado e sua aplicação depende da revisão do modelo e homologação. RLS, constraints, triggers e RPCs são testados com roles em PostgreSQL embarcado. Credenciais permanecem em Supabase Auth; exclusão legal usa bloqueio imediato e purge administrativo. RF-009 continua adiado para revisão final de backlog; RF-008, RF-013 e RF-021 integram o núcleo implementado por reutilização dos registros.

## Implementação — Projetos e onboarding — 21/10/2026

RF-002 a RF-005: criação transacional com meta mensurável, rascunho/ativação, edição de nome/metas, encerramento e arquivamento confirmados, seletor para histórico e listagem paginada. A UI não troca o ACTIVE ao consultar histórico. A listagem do seletor contém os 20 projetos da primeira página e o projeto selecionado; o histórico completo fica na página de projetos. O teste de navegador usa Auth simulado e PostgreSQL real embarcado para criação e fechamento, sem conexão remota.

## Implementação — Registros diários — 21/10/2026

RF-006 a RF-008, RF-010 a RF-015 e RF-019: registros manuais, edição/exclusão no ACTIVE, peso e medidas por RPC atômica, refeições fixas e composição proporcional informada, confirmação do dia invalidada por mudanças, meta de água vigente e sessões semanais globais. Totais são agregados no banco independentemente da paginação (20 itens); gráfico de peso mostra até 30 medições recentes. Inserções comuns usam UUID emitido no formulário para impedir duplicação pelo replay da mesma requisição. Alimentação não usa catálogo sem licença aprovada. Os fluxos são exercitados por navegador contra as migrações reais em PostgreSQL embarcado.

## Implementação — Fotografias privadas — 21/10/2026

RF-016/RF-017 e RNF-010: upload com redução no navegador e processamento obrigatório no servidor, WebP, rotação por orientação, remoção de EXIF e miniatura. API limita corpo a 4 MiB e imagem a 3 MiB após a redução; arquivo original selecionado no navegador limitado a 25 MiB. Arquivos ficam em bucket privado e são servidos por rota que verifica sessão e propriedade a cada leitura, sem cache ou URLs públicas. Gravação usa chave privilegiada somente no servidor; metadados só são criados após armazenar as duas versões. Exclusão valida ACTIVE no banco e gera fila para limpeza caso o Storage falhe. Comparação permite manter seleção entre páginas. O teste integrado cobre upload, leitura anônima negada, acesso cruzado negado, comparação, exclusão e leitura de histórico; testes de imagem comprovam orientação e remoção de metadados. Homologar o Storage real antes de uso pessoal.

## Implementação — Privacidade da conta — 21/10/2026

RF-020 e RNF-003/RNF-017: exclusão requer senha atual, texto EXCLUIR e confirmação. A RPC marca bloqueio imediato para RLS, antes de qualquer limpeza. O backend tenta remover todos os objetos do usuário pela API do Storage e então excluir o usuário de Auth; falhas mantêm a solicitação bloqueada para retry pelo comando `privacy:purge`. O processamento administrativo só aceita solicitações existentes. Exportação autenticada em JSON cobre registros operacionais; fotos podem ser obtidas por suas rotas privadas. As páginas de privacidade/termos são informativas para uso pessoal e não representam revisão jurídica nem aprovação para publicação a terceiros. Retenção, contato do responsável e base legal continuam sujeitos à validação da instalação real. Teste integrado cobre senha incorreta, exportação isolada, exclusão de conta contendo foto em histórico fechado e negação de acesso após exclusão.

O registro mínimo `deletion_ledger` mantém apenas UUID e instantes da solicitação/purge, sem FK para a conta apagada e sem acesso pelo usuário final. Ele permite reaplicar exclusões após uma restauração e precisa de cópia separada protegida. O teste de banco faz dump e restauração local e comprova que reaplicar o ledger impede reabertura dos dados excluídos. Isso não substitui o ensaio de restauração no Supabase real, incluindo os arquivos do Storage.

## Implementação — Dashboard e offline — 21/10/2026

RF-018/RF-022: dashboard usa agregações do projeto e da data selecionados, com os quatro módulos principais e acesso à evolução/fotos. Valores ausentes continuam explícitos e subtotais nutricionais indicam incompletude. A PWA inicia no painel autenticado. O único cache do service worker é o fallback público autocontido; APIs, respostas autenticadas e fotos não são armazenadas nele. Um resumo mínimo do dashboard (nome do projeto, data e quatro valores) fica em `sessionStorage` da aba por até 24 horas e é mostrado pelo fallback com aviso de desatualização. Logout e exclusão limpam o resumo; um marcador sem dados pessoais em `localStorage` invalida resumos nas outras abas. Nenhum token, imagem, nota de refeição ou medida detalhada entra no snapshot. O teste verifica leitura offline, expiração e limpeza no logout.

## Validação de release — 21/10/2026

Foram adicionados testes axe para telas essenciais, checagens de layout em seis larguras, headers de proteção, health check sem dados privados, validação de chave pública versus privilegiada, grants mínimos e restrição de TRUNCATE independentemente dos default privileges do Supabase. Código padronizado com Prettier, verificado na CI. A suíte Chromium local passou (25 cenários de navegador); os testes de banco/configuração/imagem também passaram, incluindo dump/restauração e reaplicação de exclusões. A CI inclui WebKit com perfil iPhone; a instalação local do motor foi possível, mas faltam bibliotecas nativas nesta WSL, então sua execução depende do runner. O comando `env:check` exibe somente presença/validez e flags de conexão, sem valores; `db:bundle` prepara SQL revisável para um projeto vazio, sem executar no remoto.

A execução de CI [39700830646](https://github.com/pauloluccasdev/diazen/actions/runs/39700830646) passou também nos 25 cenários WebKit. A revisão visual local do dashboard levou a reduzir a tipografia de estados vazios e compactar os filtros no mobile; valores numéricos preservam a escala de métricas. A checagem de acessibilidade/layout agora espera explicitamente a resposta e o título do conteúdo da tela, e foi repetida com sucesso após esse ajuste.

## Correção — Consistência de upload e limpeza — 21/10/2026

A revisão de falhas identificou duas condições: resposta de INSERT perdida após COMMIT e upload em andamento enquanto Auth é excluído. A API confirma metadados antes de apagar arquivos; o teste HTTP injeta falha de resposta após gravar no PostgreSQL e verifica que ambas as fotos continuam legíveis. A migração 008 remove a FK da fila de limpeza para que ela sobreviva à exclusão de Auth. O worker confirma referências antes de remover objetos e reconcilia órfãos, com janela de 24 horas para contas vivas; erro de provedor não é tratado como conta inexistente. Testes adicionais verificam preservação de fotos válidas/recentes e bloqueio de remoção durante indisponibilidade. Nenhuma migração anterior foi alterada ou aplicada remotamente.

## Decisão — Reutilização do Supabase do Planna — 21/10/2026

O proprietário autorizou buscar as credenciais locais do Planna e resetar o banco para uso pelo Diazen. Após backup completo verificado, o schema da aplicação foi substituído e as oito migrações aplicadas atomicamente; quatro contas antigas foram removidas pela API de Auth. Credenciais e backup permanecem locais, protegidos e ignorados pelo Git. O repositório Planna não foi alterado. A aplicação real passou pelos fluxos essenciais com duas contas sintéticas, isolamento de fotos/dados, concorrência e exclusão completa. As contas de teste foram removidas. Evidências e limites em [homologacao-supabase.md](homologacao-supabase.md); SMTP, configuração de URLs/templates, hospedagem, restauração e revisões finais permanecem pendentes. RNF-002, RNF-004, RNF-010, RNF-013 e RNF-014.

## Implementação — Homologação hospedada e configuração de Auth — 21/10/2026

O proprietário autorizou seguir com autenticação e publicação. Foi criado o projeto `diazen` na Vercel Hobby, com Node.js 24 e produção vinculada a `main`. A primeira implantação foi promovida automaticamente pela plataforma; seu acesso foi protegido e uma prévia própria da `develop` foi criada. As variáveis reais ficam restritas aos previews dessa branch, sem expor o segredo administrativo. Fluxos essenciais e links reais de confirmação/recuperação passaram na hospedagem, incluindo rejeição de reutilização. Contas sintéticas e acesso temporário de automação removidos ao final. Templates versionados e ferramenta de configuração com inspeção, backup antes do PATCH, preservação de credenciais SMTP e verificação posterior; três testes cobrem esses controles. A aplicação da configuração aguarda token de gerenciamento local; entrega de e-mail, restauração, dispositivos físicos e aprovação final seguem pendentes. Detalhes em [publicacao.md](publicacao.md). RF-001/RF-022; RNF-001/RNF-002/RNF-014/RNF-015.

## Correção — Configuração com SMTP padrão — 21/10/2026

Com o acesso de gerenciamento fornecido pelo proprietário, a API real recusou o nome de remetente (401) e os templates (400) por ausência de SMTP personalizado no Free. A ferramenta agora mantém esses campos quando o provedor padrão está em uso, informa a pendência explicitamente e permite aplicar URLs e política de senha separadamente. Teste adicional reproduz a recusa do serviço para impedir regressão. URLs, confirmação obrigatória e senha mínima foram aplicadas e verificadas, com backup local. O primeiro envio ao destinatário autorizado foi aceito antes dessa configuração; foi orientado ignorá-lo. SMTP e entrega com os templates do Diazen permanecem pendentes, sem alterar silenciosamente o fluxo de autenticação aprovado. RF-001; RNF-001/RNF-014.

## Decisão — E-mails padrão do Supabase Free — 21/10/2026

O proprietário definiu usar os templates e o provedor padrão, sem SMTP próprio. Essa decisão substitui a exigência operacional anterior de personalizar os e-mails. Removidos os templates personalizados e sua aplicação pela ferramenta administrativa. Cadastro e recuperação passam a usar o retorno PKCE padrão do provedor: código de uso único, troca de sessão com verificador em cookie e destinos fixos `/painel` e `/nova-senha`. A recuperação tem callback próprio `/auth/recuperar`. As mensagens orientam abrir o e-mail no mesmo navegador e origem da solicitação; outro navegador, verificador adulterado e reutilização são negados. O provedor padrão mantém suas restrições de destinatários e volume, aceitas para o uso pessoal inicial. Entrega real e demais gates de lançamento continuam pendentes. RF-001; RNF-001/RNF-002/RNF-014.

Nos testes com `.env.local` real foi identificado que o Next.js também substitui acessos por alias a variáveis públicas durante o build. A leitura de configuração server-side passou a usar `Reflect.get`, preservando a seleção do ambiente em runtime. A CI compila com valores públicos fictícios diferentes dos usados pelos testes para detectar essa regressão; segredos não entram nesse build. A suíte de Auth verifica o desafio SHA-256 do fluxo PKCE no provedor local, sem enviar e-mails reais.

## Validações e ordem de encerramento — 22/10/2026

O proprietário confirmou recebimento do e-mail padrão e definição de senha pelo fluxo de recuperação. Essa evidência valida a recuperação, sem substituir um teste específico de confirmação de cadastro. Determinou revisar o layout e executar o ensaio de restauração somente no final do projeto. Essas verificações continuam no checklist final, sem bloquear incrementos intermediários e sem alterar o banco atual durante o ensaio. Testar restauração em ambiente isolado, preservando privacidade e reaplicação das exclusões. RF-001; RNF-007/RNF-008/RNF-013/RNF-017.

## Revisão de escopo — Manutenção de projetos — 22/10/2026

A auditoria de RF-003/RF-004 encontrou ausência de filtro por estado e de edição das datas de rascunhos na interface, apesar de o banco já proteger essas operações. A listagem agora filtra antes de paginar e preserva o estado nos links de paginação. Datas podem ser alteradas apenas em DRAFT, com validação no servidor e no banco; o período deve conter as metas de água existentes. ACTIVE e histórico continuam sem edição de datas. Teste integrado cobre persistência após reload, rejeição de período que excluiria meta existente, filtro por estado e ativação removendo o item do filtro de rascunhos. Sem migração ou ampliação de escopo.

## Validação — Restauração nativa isolada — 22/10/2026

Na etapa final técnica foi executado ensaio sintético com PostgreSQL 17.11, pg_dump/pg_restore, cópia separada de imagens e reaplicação de ledger posterior ao backup. Banco restaurado manteve RLS, bucket privado, dados do usuário restante e checksums; dados e arquivos do usuário excluído foram removidos antes de liberar a cópia. O comando `test:restore` reproduz o ensaio em cluster temporário sem TCP e remove o laboratório ao terminar. Não usa credenciais ou banco remotos. Auth/Storage são adaptadores de schema e os arquivos são locais; o resultado não é apresentado como restauração do serviço hospedado. RNF-013/RNF-017; RF-020.

## Decisão — Inclusão das conveniências alimentares — 22/10/2026

Na revisão final de backlog, o proprietário respondeu “Incluir agora” ao RF-009, autorizando alimentos salvos, receitas, recentes, favoritos e cópia confirmada de refeições. Essa decisão substitui o adiamento anterior, sem incluir catálogo externo ou prescrição.

A migração 009 adiciona biblioteca privada por conta, independente dos projetos, e ledger idempotente das cópias. Alimentos próprios têm fonte e nutrientes anuláveis. Receitas compilam de 1 a 100 ingredientes próprios e rendimento em porções, preservando snapshots das quantidades/fontes/composição; nutriente desconhecido em qualquer ingrediente deixa o total correspondente desconhecido. Alterações ou exclusão da biblioteca não recalculam receitas e registros anteriores. Para alterar a composição de uma receita, criar uma nova receita e remover a anterior da biblioteca quando desejado; o diário permanece íntegro. Favoritos e busca têm paginação; recentes mostram os últimos 20 registros da conta.

Adicionar da biblioteca/recentes e copiar refeição resolvem ACTIVE no banco, sob as mesmas constraints de vigência e estado. A cópia exige confirmação, inclui todos os itens da origem, preserva registros existentes e desfaz a conclusão do destino. Ledger por solicitação torna replay seguro inclusive para origem igual ao destino. Biblioteca e ledger têm RLS, FK com exclusão da conta, grants mínimos e inclusão na exportação privada. RF-006/007/009/019/020/021; RB-01 a RB-05/RB-10; RNF-002/004/014/016.

Validação deste incremento: 11 testes de banco/configuração/imagens, 28 cenários Chromium, build, tipos, lint/formato e ensaio nativo de restauração com as nove migrações passaram. Migração 009 aplicada incrementalmente no Supabase, preservando as versões anteriores e as contagens de contas/projetos. Homologação real comprovou composição/snapshots, isolamento e duas cópias concorrentes idempotentes para a própria refeição; contas sintéticas removidas. Detalhes em `docs/homologacao-supabase.md`. WebKit e implantação da integração ainda dependem da CI/publicação deste commit.

## Validação — Restauração com serviços reais — 22/10/2026

Supabase CLI 2.121.0 oferece runtime nativo experimental compatível com esta WSL. Foi usado somente para o laboratório temporário, com PostgreSQL 17.11, Auth, PostgREST e Storage reais. O ensaio passou sem tocar no projeto hospedado: dump de schemas gerenciados/aplicação, imagens exportadas e restauradas pela API, ledger posterior ao backup, login com senha restaurada, isolamento, bucket privado e checksums. O usuário excluído continuou bloqueado e teve Auth/dados/arquivos removidos antes de liberar a cópia. A ferramenta destrói a stack e remove backups/uploads sintéticos ao terminar. RNF-013/RNF-017; RF-020.

A restauração usa `supabase_admin` do laboratório para preservar os proprietários dos schemas gerenciados; conexões dos serviços são reiniciadas após recriar schemas. Não se presume esse privilégio no hospedado. O requisito de ensaio em ambiente controlado foi verificado com serviços reais, sem apresentar isso como recuperação de infraestrutura em nuvem. Política/cifragem externa/retensão dos backups e aprovação operacional permanecem com o proprietário; procedimento em outro projeto hospedado precisa seguir a documentação gerenciada.

A CI do RF-009 [39796697948](https://github.com/pauloluccasdev/diazen/actions/runs/39796697948) e da integração [39797481976](https://github.com/pauloluccasdev/diazen/actions/runs/39797481976) concluiu com sucesso, incluindo os 28 cenários em Chromium e WebKit, além de banco, lint, formato, tipos e build.

## Decisão — Backup local cifrado — 22/10/2026

O proprietário aprovou layout e navegação e escolheu backup em pasta local, indicando `\\wsl.localhost\Ubuntu-22.04\home\paulo_luccas\diazen\backups`. Foi implementado snapshot somente leitura, TLS verificado, cópia separada das imagens e do ledger atual, OpenPGP/AES-256, chave fora do destino e verificação integral antes de publicar o arquivo. Configuração/credenciais/chave ficam privadas, sem Git ou hospedagem. Uma primeira cópia real e o ledger foram criados e conferidos. Frequência/retensão ainda em definição; nenhum agendamento ou descarte foi presumido. RNF-003/RNF-013/RNF-014/RNF-017; RF-020.

O RF-009 também passou pelo fluxo completo em navegador Chromium na prévia HTTPS da Vercel com backend real: alimentos próprios, favoritos, receitas, consumo, recentes, cópia confirmada, exportação e preservação do histórico. Acesso automatizado usou OIDC de desenvolvimento limitado à origem da prévia, sem alterar proteção. Conta sintética removida; conta do proprietário preservada. Evidência local em `artifacts/hosted-food-browser-report.json`.

Ao adicionar `pg` apenas às ferramentas de desenvolvimento, a auditoria indicou uma cadeia já existente de cinco entradas em ESLint/fast-glob/micromatch/braces, relativa a DoS por padrões aninhados em `braces` (GHSA-vfj7-8cjw-p6xm). O registry ainda oferece 3.0.3, dentro da faixa afetada; o downgrade sugerido de eslint-config-next para 14 não é compatível com a base Next 16. Não foi aplicado force/downgrade. Essas dependências são de ferramentas locais/CI que recebem padrões controlados pelo repositório; não tratam entradas dos usuários do aplicativo. `npm audit --omit=dev` retornou zero vulnerabilidades em 22/10/2026. Reavaliar quando houver correção compatível, sem declarar a auditoria completa como zerada.

Validação adicional do próprio comando de backup: uma foto sintética com duas versões foi copiada do Storage real e recuperada do pacote cifrado com bytes/checksums idênticos. Após excluir a conta sintética, nova cópia do ledger confirmou a exclusão concluída. Nenhuma conta/dado do proprietário foi modificado. A CI [39804662416](https://github.com/pauloluccasdev/diazen/actions/runs/39804662416) passou com 12 testes de banco/configuração/imagens/backup, lint, formato, tipos, build e 28 cenários em Chromium e WebKit.

## Correção — Recuperação de falhas de leitura e observabilidade — 22/10/2026

A auditoria pelo `agent-browser` reproduziu uma falha de RNF-005: após indisponibilidade de leitura, `reset()` sozinho reapresentava o erro de Server Components mesmo com o banco disponível. O botão agora solicita `router.refresh()` e reinicia a fronteira em uma transição, com indicação de tentativa em andamento. O teste injeta indisponibilidade apenas no simulador local e comprova recuperação sem alterar os registros; não existe endpoint de injeção no aplicativo publicado.

RNF-012 recebe o evento estruturado `request_failed` pelo hook de instrumentação do Next.js. O evento contém módulo/rota, tipo e instante; não copia mensagens de provedores, URLs de requisição, cabeçalhos, formulários ou dados clínicos. Há teste de minimização e verificação do evento no processo real do servidor. Não substitui serviço externo de alerta ou definição do objetivo de disponibilidade.

O roteiro `tests/manual/agent-browser.mjs` controla o navegador pela CLI, verifica requisitos com dados fictícios, gera relatórios/capturas locais e separa o laboratório do modo hospedado. No laboratório, desligar o próprio processo HTTP comprova a perda de rede também para o service worker, além do bloqueio de escrita por `navigator.onLine`. A prévia protegida usa OIDC limitado à origem; requisições independentes do worker podem ficar sujeitas à proteção da Vercel, sem relaxá-la para o teste. Esse limite é registrado separadamente da validação local de offline.

## Correção — Encerramento durante carregamento — 22/10/2026

A rodada hospedada encontrou uma janela entre a leitura da lista de projetos e a consulta do ACTIVE: um encerramento concorrente podia deixar `selected.status` antigo e `active` vazio. O banco já recusava a escrita, mas a interface ainda oferecia formulário com nome de destino vazio. Registros e fotos agora só permitem edição quando o projeto selecionado também coincide com o ACTIVE confirmado na consulta. A política é conservadora durante transições, preservando a autorização e as constraints existentes, sem migração.

O simulador reproduz a ordem real: devolve a lista consultada antes do encerramento, confirma o encerramento no banco e então atende a consulta seguinte. Os testes de água e fotos falharam na versão anterior; a regressão passa a integrar Chromium, WebKit e o roteiro local de agent-browser. O roteiro também espera o status do cartão, evitando confundir opções do filtro com a confirmação da operação. RF-003/RF-004/RF-017; RB-01/RB-02/RB-03; RNF-002/RNF-004.

A CI fixa `ubuntu-24.04`, a imagem usada na primeira bateria aprovada desta auditoria, para manter o ambiente de navegadores reproduzível durante a migração do rótulo `ubuntu-latest`. O Playwright instalado suporta essa imagem. A seleção não altera o ambiente hospedado da aplicação.

## Validação — Diagnósticos de renderização durante falhas injetadas — 22/10/2026

Uma CI registrou o erro recuperável React 419 somente na checagem acumulada ao final da bateria. Ele indica uma fronteira de Suspense não concluída pelo servidor ([referência oficial](https://react.dev/errors/419)); o registro acumulado não permitia atribuir com segurança a origem a uma etapa específica. O roteiro agora aguarda o documento terminar de carregar e verifica exceções ao final de cada cenário. Nas janelas explícitas de indisponibilidade injetada, registra separadamente apenas esse diagnóstico ou a mensagem sanitizada de erro de Server Components; qualquer outro erro continua reprovando o teste, e esses diagnósticos também reprovam fora das janelas controladas. Não há filtro global nem remoção de cenários. As verificações de recuperação e preservação de registros permanecem obrigatórias.

## Otimização — Leituras independentes dos registros — 22/10/2026

As medições desktop da prévia registraram algumas navegações acima de 2 segundos, incluindo alimentação em aproximadamente 2,3 s. Após resolver conta e projeto no servidor, registros, totais e gráfico/calendário eram consultados em sequência, apesar de não dependerem entre si. Essas leituras agora iniciam juntas com `Promise.all`, mantendo filtros, paginação, validação de cada resultado e consultas específicas somente para o módulo correspondente. Não há nova infraestrutura ou dependência. RF-007/RF-008/RF-014/RF-018; RNF-006/RNF-011. A medição em aparelho físico continua necessária para validar a meta proposta; dados desktop não a substituem.

## Decisão — Prévia pública e revisão geral do protótipo — 22/10/2026

O proprietário autorizou liberar um endereço público para homologar a develop e manter a produção para depois de sua aprovação e PR para main. Foi criada uma exceção de proteção apenas para o alias estável da develop, preservando a proteção dos demais endereços, o login Diazen e o isolamento dos dados. Acesso anônimo à abertura/login e redirecionamento do painel para entrar foram verificados.

Em seguida, o proprietário reabriu a aprovação visual por falta de fidelidade ao protótipo e solicitou revisão geral. Composição da abertura/login, hierarquia do dashboard, projetos, hidratação, modalidades, evolução e perfil foram revistas; a fonte Inter e a fotografia decorativa são servidas localmente. Os valores numéricos do Design System continuam normativos e os elementos fora do MVP continuam ilustrativos. Não foram criados schema, funcionalidades de hábitos ou prescrição. Referências, ativos, prompt e critérios em [revisão visual](revisao-visual.md). RF-001/002/004/005/006/010/012/014/015/017/018/022; RNF-007/008/014. Aprovação anterior substituída por nova revisão pendente do proprietário.

## Correção — Dependências de navegadores na CI — 22/10/2026

Na validação da revisão visual, o runner Ubuntu 24.04 gastou mais de oito minutos baixando apenas parte dos 119 MB de dependências pelo espelho Azure. A CI passa a usar `https://archive.ubuntu.com/ubuntu/` na lista de espelhos do runner quando esse arquivo existe. Repositórios assinados, pacotes e a instalação `playwright install --with-deps chromium webkit` permanecem iguais; nenhuma dependência ou verificação é omitida. Alteração restrita ao ambiente efêmero de CI, sem modificar a WSL ou a Vercel. RNF-014/015.

## Melhoria — Mostrar e ocultar senhas — 22/10/2026

A pedido do proprietário, os campos de login, cadastro, confirmação, nova senha e confirmação de exclusão passam a oferecer botão de mostrar/ocultar com ícone de olho, nome acessível e área de toque de 44 px. Começam ocultos, mantêm valor/autocomplete/validação e o botão não submete o formulário. O estado visual fica somente no componente; não há persistência ou logging da senha. RF-001/RF-020; RNF-001/007/008/014.

## Correção — Formulário de projetos no iPhone e navegação — 22/10/2026

As capturas do proprietário mostraram datas ultrapassando o cartão, campos de peso sem indicação condicional e erro genérico de criação. Controles de data passam a respeitar a largura disponível, inclusive o tamanho intrínseco do WebKit; controles móveis usam fonte de 16 px para evitar zoom automático no foco. A navegação principal indica a rota atual com `aria-current`, cor e borda.

Nome e início são obrigatórios. Apenas acompanhar peso não exige alvo nem faixa; esses campos aparecem e são obrigatórios somente nos modos correspondentes. Para ativar continua sendo necessária pelo menos uma meta mensurável (água, sessões ou peso alvo/faixa). A validação também acontece no servidor e ignora valores de peso que não pertencem ao modo selecionado. Erros de campos têm descrição associada e o resumo recebe foco.

A primeira captura usa início em 23/10, futuro em relação ao horário de Brasília em 22/10. O banco já proibia essa ativação; agora a tela explica o motivo e orienta salvar como rascunho ou ajustar o início, inclusive ao tentar ativar um rascunho futuro. Não há alteração de schema ou flexibilização dessa regra. Testes de navegador cobrem ausência de alvo no modo acompanhar, metas condicionais, proteção do servidor contra início futuro, persistência de rascunho/ativo, navegação e contenção das datas em 320/390 px. RF-002/003/005; RNF-007/008/014/016. A validação visual no iPhone físico permanece com o proprietário.

## Validação — Escopo único dos diagnósticos da falha controlada — 22/10/2026

Na CI da correção de projetos, o roteiro registrou React 419 na segunda checagem de exceções do mesmo cenário de falha deliberada, após a primeira checagem específica. O encerramento de cada cenário agora executa uma única checagem; somente o cenário explícito de indisponibilidade recebe a classificação restrita dos diagnósticos já conhecidos. A recuperação da interface, preservação dos registros e evento estruturado permanecem obrigatórios. Demais cenários continuam exigindo ausência de exceções, e mensagens diferentes continuam reprovando inclusive durante a falha controlada. Não há nova tolerância global, exclusão de cenário ou alteração no aplicativo. RNF-005/012/014.

## Decisão — Planejamento com início futuro — 22/10/2026

Após retestar no iPhone, o proprietário solicitou conseguir planejar um projeto para começar em data futura. Essa instrução substitui a rejeição da data futura na criação descrita acima: o formulário aceita a data e informa, sem erro, que o projeto será salvo como rascunho planejado. O servidor força DRAFT para início posterior ao dia atual de Brasília, mesmo sem a caixa de rascunho marcada. A confirmação explica que o proprietário poderá ativá-lo a partir da data de início; não há ativação automática nem nova infraestrutura agendada. Preservam-se a proibição de registros operacionais em DRAFT e o limite de um ACTIVE por usuário. Nenhum schema ou status novo foi introduzido. RF-002/003/005; RB-01/02/03; RNF-002/004/007/008/014. O teste verifica a criação com data futura sem marcação manual, persistência como DRAFT após recarregar, rejeição da ativação antecipada e criação ativa com início vigente.

## Melhoria — Explicação da meta semanal de sessões — 22/10/2026

A pedido do proprietário, o cadastro de projetos explica junto ao campo que sessões por semana é uma meta opcional de atividades físicas, somada entre modalidades. Cada registro de atividade conta como uma sessão; o exemplo de três treinos de musculação e duas corridas resulta em cinco sessões. A orientação para deixar em branco quando não houver meta fica visível e associada ao campo por `aria-describedby`. Sem alteração da contagem ou das regras de gravação. RF-005/013; RNF-007/008.

## Melhoria — Distribuição da navegação principal no mobile — 22/10/2026

A pedido do proprietário, Dashboard, Projetos e Minha conta passam a dividir igualmente toda a largura disponível até 600 px. Os links mantêm ícone, texto, área mínima de toque e destaque da rota atual, com conteúdo centralizado e espaçamento adequado à largura de 320 px. RF-018; RNF-007/008. A navegação de módulos continua seguindo a composição já aprovada.

## Melhoria — Ajustes do projeto em acordeão — 22/10/2026

O proprietário rejeitou os ajustes exibidos como botões avulsos e forneceu duas referências de listas expansíveis. Datas do rascunho, nome, metas de peso/atividades e meta de água passam a formar linhas de largura integral, com ícone, título e seta de expansão. O formulário aberto integra o mesmo contorno, com separador, espaçamento e botão de salvar de largura integral no mobile. Arquivamento usa a mesma apresentação, separado da lista de edição pela ação principal. Mantêm-se o tema Diazen, os títulos, as confirmações e as regras de negócio existentes. `details`/`summary` preservam interação nativa por teclado e estado expandido, sem novo JavaScript cliente. RF-003/005; RNF-007/008/014.

Verificação local com conta fictícia: estados fechado/aberto e contenção dos controles em 320, 390, 600 e 1280 px, com alvos visíveis de pelo menos 44 px. Capturas e medidas em `artifacts/project-settings/` (não versionadas). A suíte existente de projetos verifica edição/persistência e o axe verifica as telas essenciais; a conferência no iPhone físico permanece com o proprietário.

## Melhoria — Limpar e recolher o cadastro após criar projeto — 22/10/2026

A pedido do proprietário, o cadastro fica em um acordeão "Novo projeto": aberto inicialmente quando a página ainda não lista projetos e recolhido quando já há projetos. Após confirmação de criação, os campos são reiniciados, incluindo os estados de data, rascunho e acompanhamento de peso, e o acordeão é fechado. O foco retorna ao resumo; a mensagem de sucesso continua visível fora da área recolhida. Erros preservam campos e formulário aberto. O comportamento de reset é optativo no componente de formulário, habilitado somente neste cadastro, sem alterar os demais fluxos. RF-002/003; RNF-007/008/014. O teste de projetos cobre reset, expansão manual, feedback visível e preservação dos valores quando a validação reprova. O roteiro de agent-browser abre o novo acordeão por interação real antes de preencher novos projetos.

## Melhoria — Acesso à consulta do projeto — 22/10/2026

A pedido do proprietário, "Consultar projeto" passa de link discreto a ação secundária de largura integral no cartão, com ícone de dashboard, texto e seta. Mantém o destino de consulta já existente e o nome acessível; o estilo segue os tokens e a hierarquia do cartão, com altura mínima de 56 px. RF-003/004/018; RNF-007/008. Os testes existentes verificam o acesso ao histórico e sua condição de somente leitura.

## Melhoria — Ações de consulta e gestão no dashboard — 22/10/2026

A pedido do proprietário, o seletor de projeto/data no dashboard adota a composição de acordeão dos ajustes: ícone, título e seta, com formulário integrado ao contorno quando aberto. "Gerenciar projetos" torna-se uma ação secundária com fundo opaco, ícone e seta, ocupando a largura do conteúdo no mobile para manter legibilidade sobre a fotografia. Títulos, destinos, formulário GET e regras de consulta permanecem iguais. RF-003/004/018; RNF-007/008. Os testes de registros exercitam alteração de projeto/data, destino das gravações e consulta histórica; o axe cobre o dashboard.

## Melhoria — Atalhos de evolução corporal no dashboard — 22/10/2026

A pedido do proprietário, os atalhos de medidas e fotografias deixam de usar a navegação discreta e passam a ações secundárias com fundo, borda, ícone destacado e seta. No mobile, cada ação ocupa uma linha completa; em telas maiores, dividem duas colunas iguais. Altura mínima de 68 px e rótulos/destinos preservados, inclusive o projeto consultado. RF-015/016/018; RNF-007/008. Sem alteração no acesso aos dados ou nas regras de privacidade das fotos.

## Melhoria — Padronização dos botões de retorno — 22/10/2026

A pedido do proprietário, retornos ao dashboard, alimentação, início e login usam um componente comum com seta à esquerda, fundo, borda e área mínima de toque de 48 px. No mobile ocupam a largura disponível. Inclui cadastro, recuperação, exclusão registrada e página não encontrada; links de criação, consulta e filtros permanecem com sua função visual própria. Destinos explícitos são preservados, inclusive o projeto consultado no retorno dos módulos/fotos. Ícone decorativo fica fora do nome acessível; o texto identifica o destino. RF-001/004/018; RNF-007/008/014. Sem depender do histórico do navegador, que pode levar a outra origem.

## Melhoria — Acordeões de registros, fotos e alimentação — 22/10/2026

A pedido do proprietário, as ações marcadas na homologação (excluir registro, adicionar foto, alimentos recentes, copiar refeição e cadastros de alimento/receita) passam ao padrão de linhas expansíveis com ícone, título e seta. A apresentação é compartilhada com os ajustes de projeto; ações de edição, exclusão e uso dos mesmos cartões seguem o padrão para manter consistência. Ações destrutivas têm ícone vermelho, preservando confirmações explícitas. O acesso à biblioteca ganha ícone e seta, com largura integral. Não há mudança nas operações, na composição nutricional, no destino dos registros ou na privacidade das fotos. RF-007/009/014/015/016/017; RNF-007/008/014.

## Melhoria — Ações de registro no início dos módulos — 22/10/2026

O proprietário solicitou evitar a rolagem até o final para adicionar registros no mobile. O cadastro de alimento, água, atividade, peso e medidas passa para depois do cabeçalho/abas e antes dos filtros, indicadores e histórico. A posição é a mesma na ordem do documento e na apresentação, preservando navegação por teclado e leitores de tela; a organização também vale em telas maiores. O cadastro continua recolhido até interação e disponível somente no projeto ativo editável. Adicionar foto já ocupa essa posição e agora usa o acordeão compacto da revisão anterior. RF-007/010/012/014/015/016/018; RNF-007/008/014.

## Melhoria — Carregamento com a marca Diazen — 22/10/2026

A pedido do proprietário, o fallback de carregamento do painel passa a uma sobreposição com fundo opaco e a marca Diazen centralizada, variando suavemente a opacidade enquanto o conteúdo carrega. A sobreposição desaparece assim que a navegação conclui, sem atraso artificial. O status textual permanece disponível a leitores de tela. A preferência `prefers-reduced-motion` desativa a animação e mantém a marca visível. Não há nova imagem, chamada externa ou mudança nas regras de sessão. RNF-007/008/011/014.

A auditoria do roteiro capturou a fase mais apagada da marca e identificou contraste insuficiente. A animação passa a variar entre 65% e 100% de opacidade, mantendo leitura durante o efeito. A apresentação isolada do fallback compilado foi conferida em 320/390/1280 px, incluindo fundo opaco, status e desativação por movimento reduzido, em `artifacts/loading-review/`. Essa prévia não substitui a navegação real, exercitada separadamente pelas suítes.

## Solicitação — Importar dieta em PDF e comparar ingestão com atividades — 22/10/2026

O proprietário destacou duas prioridades para ampliar o MVP: importar o PDF fornecido pela nutricionista e integrar atividades realizadas no Strava para comparar calorias das atividades com as ingeridas. Esses itens estavam no backlog da especificação original. A solicitação inicia o refinamento; não representa funcionalidades já disponíveis nem aprovação de custos externos.

Para o PDF, o fluxo a detalhar é envio privado, extração, revisão pelo usuário e confirmação do plano base. Plano previsto e consumo realizado devem continuar distintos: importar a dieta não registra automaticamente refeições consumidas. Alimentos, porções, alternativas e valores nutricionais precisam de origem identificável; valores ausentes permanecem desconhecidos, e substituições não são somadas como se fossem consumo simultâneo. Um PDF de exemplo é necessário para avaliar texto selecionável versus documento escaneado e definir extração/OCR e eventuais custos antes de escolher serviços.

Para o Strava, a referência técnica oferece `calories` no detalhe de atividades, mas isso não equivale ao gasto energético total diário. A comparação pretendida deve distinguir calorias previstas no plano, efetivamente registradas no diário e informadas para atividades, sem rotular automaticamente a diferença como déficit/superávit. Sincronização futura precisaria resolver duplicidades, autorização, dados ausentes e efeitos no histórico de projetos.

Na consulta de 22/10/2026, a [documentação de início](https://developers.strava.com/docs/getting-started/) exige assinatura Strava para criar uma aplicação e informa modo inicial de uso pela própria conta. A [política da API, seção 5.4](https://www.strava.com/legal/api_policy) proíbe análises e combinação de dados Strava com outros dados do usuário; a seção 6.2 também limita cache a sete dias. A leitura inicial é que o cruzamento solicitado com o diário alimentar depende de esclarecimento/autorização do provedor, não devendo ser prometido como integração já liberada. A [referência de atividades](https://developers.strava.com/docs/reference/#api-models-DetailedActivity) confirma o campo de calorias. Nenhuma credencial foi solicitada, aplicação provisionada, chamada autenticada feita ou dado Strava importado nesta etapa. O cálculo com registros próprios e fontes independentes pode ser refinado separadamente, sem pressupor autorização da API.

Próximo insumo: PDF de exemplo da dieta. Fonte documental original preservada; esta decisão posterior registra a nova prioridade e as dependências reais, sem alterar os critérios gerados do MVP já entregue. RF-007/009/012/013/018; RB-03; RNF-001/002/003/004/014.

## Refinamento — Dois formatos reais de plano alimentar em PDF — 22/10/2026

O proprietário forneceu dois PDFs locais para avaliar a importação. Ambos contêm texto selecionável em todas as páginas: a extração dos exemplos não precisa de OCR ou API de IA paga. A análise foi local, com ferramenta temporária fora das dependências do aplicativo. PDFs, textos extraídos, imagens e JSON de revisão permanecem locais; os nomes dos arquivos de origem foram incluídos apenas no exclude local do Git para evitar versionamento de dados pessoais. Não houve envio a serviços externos nem gravação em contas ou no Supabase.

O primeiro formato tem três páginas, quatro refeições com horário, 15 alimentos base e 32 alternativas. Os valores de calorias e macros estão declarados por porção; a extração de teste preserva a proveniência por página e cada substituto ligado ao seu alimento base. As somas das opções base conferem com os totais impressos em cada refeição. A seção de suplementação é separada do plano alimentar: repetir nela um alimento já presente em uma refeição não cria consumo extra automaticamente. O estado de preparo precisa preservar o que consta no documento, sem inferir cru/cozido quando não estiver claro.

O segundo formato tem dez páginas, quatro refeições principais e um pré-treino condicional. São dez variantes de refeição, com 51 linhas de alimentos base e 115 alternativas extraídas no protótipo; a refeição 3 tem quatro opções e a refeição 4 tem três. Não há calorias nem macros declarados. Campos nutricionais permanecem desconhecidos até associar fonte identificável e revisar alimento, preparo, marca e quantidade. Não converter mililitros em gramas automaticamente. Porções "à vontade", mínimos e ingredientes opcionais precisam de revisão; alternativas e variantes não podem ser somadas simultaneamente como se fossem consumo.

Fluxo refinado: enviar documento privado → extrair refeições/opções/porções → revisar grupos de substituição e mapear as refeições para as categorias do diário → confirmar fontes nutricionais/quantidades pendentes → salvar uma versão do plano base → registrar consumo somente por ação explícita do usuário. O cálculo deve distinguir valor informado no documento, estimativa por fonte nutricional e informação ausente, com totais parciais quando faltarem dados. Novas versões do plano não podem modificar refeições já registradas.

Artefatos privados de análise em `artifacts/pdf-review/`: extrações estruturadas dos dois exemplos e resumo de verificações. O protótipo valida a interpretação desses layouts; não constitui importação disponível no aplicativo, parser universal de PDFs ou schema definitivo. Próxima etapa técnica: implementar leitura desses dois formatos e revisão antes de persistir, definindo também a fonte nutricional para o formato sem calorias. RF-007/009 e ampliação de escopo solicitada; RNF-001/002/003/004/007/014.

## Decisão — TACO como fonte nutricional local — 22/10/2026

O proprietário confirmou que o segundo PDF é seu plano e forneceu a TACO 4ª edição revisada e ampliada para consulta dos valores nutricionais. A solicitação amplia a decisão anterior de alimentação apenas com composição manual: passa a existir catálogo local dessa fonte, sem contratar API, OCR ou IA. A publicação NEPA/UNICAMP de 2011 permite reprodução com atribuição; título, edição, ano, licença e hash do arquivo estão registrados com os dados. Os PDFs pessoais continuam somente no ambiente local.

Foram extraídos e validados os 597 números de alimentos da Tabela 1, preservando kcal, proteínas, carboidratos e lipídeos por 100 g da parte comestível e páginas PDF/impressas. Há 49 itens com algum marcador não numérico nos campos utilizados: traço, análise não solicitada, não aplicável e análise em reavaliação permanecem identificados e sem valor numérico, nunca convertidos em zero. O script reprodutível usa PyMuPDF apenas como ferramenta local; a aplicação serve JSON estático, sem essa dependência em produção.

O cadastro/edição de alimentos próprios oferece busca na TACO sem acentos e seleção explícita do alimento e preparo. A escolha preenche referência 100 g, unidade g, composição e fonte com número do item/página. Os campos permanecem disponíveis para revisão; salvar na biblioteca e consumir no diário exigem confirmações próprias. A busca mantém todos os termos, evitando trocar silenciosamente “light” por uma versão comum. Produtos e ingredientes não encontrados (como rótulos específicos, psyllium, chia e whey nesta edição) continuam pendentes de outra fonte identificada. Não converter ml em g ou escolher cru/cozido sem revisão.

Essa etapa fornece a fonte necessária à importação do plano sem composição; não disponibiliza ainda o envio/extração/revisão de PDF no aplicativo. Não há migração de banco nem alteração nos snapshots anteriores. RF-007/009; RNF-002/004/007/008/011/014. Validações cobrem integridade do catálogo, busca por preparo, proporção por gramas, zero versus marcadores, preenchimento sem submissão, persistência da fonte e cálculo do consumo com os dados selecionados.

## Decisão — Importação e cálculo do plano alimentar — 22/10/2026

O proprietário pediu implementar o envio do seu plano, comparação com a TACO e cálculo das calorias. Isso autoriza a extensão de RF-007/009 registrada nas decisões anteriores (RB-11). Não inclui prescrição ou interpretação clínica, IA, OCR pago ou integração Strava.

A seleção de PDF faz a extração local no navegador com PDF.js 6.4.299 (Apache-2.0), carregado sob demanda e com worker servido pela própria aplicação. O original não é enviado ao servidor nem retido no Storage: apenas a estrutura revisada é persistida após confirmação. Isso reduz exposição de dados pessoais do cabeçalho, armazenamento e custo; o backup existente do banco cobre as versões, sem novo bucket. Limites: 3 MB, 30 páginas, 150 mil caracteres e encerramento do parser após 20 segundos. PDFs com senha, digitalizados ou com tabelas distintas podem ser recusados. Não há promessa de parser universal.

Os dois layouts fornecidos têm refeições, variantes e substituições separadas. Só uma variante por nome de refeição entra no cenário diário; pré-treino condicional e alimentos opcionais são opt-in. Porção e medida doméstica originais permanecem disponíveis para revisão. “À vontade” e mínimos não viram quantidade exata; ml não vira gramas. Valores já informados no PDF são da porção original. Alterar sua quantidade limpa a composição manual e exige informar novamente; composições TACO são recalculadas pela nova quantidade em gramas. Correspondências exigem seleção explícita do alimento/preparo; rótulos/manuais precisam de fonte. Marcadores TACO e composições desconhecidas permanecem ausentes, com subtotal parcial identificado.

A migração 010 cria versões imutáveis de `diet_plans`, ligadas ao projeto e isoladas por proprietário com RLS, exclusão em cascata da conta e auditoria. Criar versões em DRAFT é planejamento, não registro operacional; ACTIVE também permite, enquanto COMPLETED/ARCHIVED são somente leitura. O servidor valida limites, opções e fontes e recompõe referências TACO a partir do catálogo. Tokens e nutrientes submetidos pelo navegador nunca autorizam acesso a outra conta. A exportação JSON inclui os planos; não existem PDFs adicionais a apagar/restaurar. Comparação exibe plano selecionado e consumo registrado na data/projeto consultados, sem gravar refeições ou inferir aderência. RNF-001/002/003/004/007/009/011/014.

## Correção — Compatibilidade da importação com Safari — 23/10/2026

Após relato de falha ao importar no iPhone o mesmo plano já analisado, foi reproduzida a indisponibilidade do leitor ao remover APIs recentes do navegador e do worker (incluindo `Map.getOrInsertComputed`, `Promise.try` e conversões recentes de bytes). O build genérico de PDF.js pressupunha essas funções; a suíte WebKit atual não reproduzia automaticamente versões anteriores do Safari.

Cliente e worker passam juntos ao build `legacy` oficial da mesma versão 6.4.299, com polyfills e endereço do worker distinto para evitar reutilização do arquivo anterior. A seleção continua local, sem enviar PDFs pessoais ao servidor. Mensagens passam a distinguir limite do arquivo, senha, formato não reconhecido, timeout e inicialização/leitura do navegador; detalhes internos e texto do documento não são registrados. A regressão simula a ausência das APIs tanto na página quanto no worker e mantém as verificações de cálculo, revisão, persistência e exportação. O PDF pessoal foi verificado apenas localmente. Também foi ajustado o filtro de data desta tela para ocupar uma linha completa no mobile. RF-007/009; RNF-004/007/008/009/014.

## Correção — Alternativa temporária à leitura local de PDF — 23/10/2026

O proprietário continuou sem conseguir importar no celular após a adoção do build `legacy`. A simulação de APIs ausentes não reproduz todos os defeitos possíveis no Safari físico; não foi obtido um diagnóstico remoto exato do aparelho. Para retirar essa dependência do caminho de importação, uma falha de inicialização/leitura local passa a tentar automaticamente `POST /api/plano/ler`, autenticado, com origem conferida e limite de corpo efetivo de 3 MB. Arquivo inválido, senha e formato não reconhecido mantêm suas mensagens próprias.

Esta decisão substitui a premissa anterior de processamento exclusivamente no navegador: a interface informa, antes da seleção, a possibilidade de leitura temporária na hospedagem do Diazen. O endpoint recebe bytes, processa somente em memória e retorna a estrutura para revisão; não grava o PDF em disco, Storage, banco ou backups e não usa serviços de extração externos. Respostas são privadas e `no-store`; dados só são persistidos pela confirmação de salvar versão já existente. A política de privacidade foi atualizada para refletir o fluxo.

O parsing roda em thread separada com limite de heap de 192 MB, encerramento aos 20 segundos, limite de 30 páginas/150 mil caracteres e cancelamento. A entrada ESM e as dependências são incluídas explicitamente no rastreamento de arquivos do Next/Vercel. Executar a entrada original evita que o empacotamento do worker altere a resolução interna do PDF.js. A função Node tem teto de 30 segundos e o corpo fica abaixo do limite de upload da hospedagem. A geometria de linhas é compartilhada entre leitura local e temporária. Sem migração ou novo serviço provisionado. RF-007/009; RNF-001/002/004/007/009/011/014.

A regressão bloqueia os downloads do leitor no navegador e verifica recuperação, cálculo, confirmação e exportação sem registrar consumo. Testes adicionais conferem sessão, origem, tamanho, arquivo inválido, cancelamento e leitura isolada. PDFs pessoais permanecem fora do Git; a verificação de seu conteúdo no servidor só ocorre conforme o processamento temporário explicitado acima, sem persistência do documento.

## Decisão — Pré-preenchimento nutricional na importação — 23/10/2026

O proprietário solicitou que o upload já apresente composição e totais analisados, sem exigir digitar cada alimento novamente. Isso amplia a decisão anterior de correspondência apenas por seleção manual: nomes equivalentes sem ambiguidade podem preencher a referência TACO automaticamente, mantendo a confirmação geral da revisão antes de salvar.

A análise é local/determinística sobre o catálogo existente, sem IA ou nova API. Compara nomes normalizados, ignora partículas gramaticais e admite equivalências de grafia (muçarela/mussarela/mozarela) e o nome comum pão francês para o item 53. Só nomes exatos após essa normalização ou equivalências explícitas são selecionados automaticamente. Não deduz variedade de fruta/feijão, preparo, pele, marca ou versão light; termos genéricos exibem candidatos para confirmação. Dados já informados no PDF, fontes manuais e referências escolhidas anteriormente são preservados. Ausência na tabela, porção desconhecida e ml sem peso seguem pendentes, sem inventar números ou convertê-los em zero.

Os campos de fonte, calorias e macros ficam preenchidos e somente leitura quando calculados pela TACO para a porção. Alterar a porção recalcula; alterar a identidade do alimento remove a composição anterior. Uma escolha pode ser aplicada explicitamente aos itens ainda pendentes com o mesmo nome, preservando fontes existentes. O botão de analisar pendentes permite completar uma revisão existente sem reimportar e sem alterar versões já salvas. O cenário diário continua somando somente opções e alimentos incluídos. RF-007/009; RNF-004/007/008/014. Sem migração de banco.

## Decisão — Referência padrão online e revisão por alimento — 24/10/2026

O proprietário pediu consultar a internet quando a TACO não cobrir o alimento e autorizou uma referência padrão independente da marca. A escolha da referência permanece explícita e identificada, com indicação de estimativa por marca; a composição não é inventada nem automaticamente atribuída a um produto desconhecido.

Foi adotada consulta sob demanda ao Open Food Facts, sem chave paga: Search-a-licious para localizar códigos por nome e API v3.6 para obter os conjuntos de rótulo. Só o termo/código é enviado, por ação do usuário. O PDF, identidade e plano completo não são compartilhados. A API autenticada do Diazen confere origem, limita corpo e termos, restringe as URLs aos hosts fixos do provedor, limita resposta/tempo, identifica o app no User-Agent e aplica cooldown por tipo de consulta por instância; o provedor também aplica quotas. Não há busca a cada tecla ou varredura de todos os alimentos. Indisponibilidade, ausência de rótulo ou quota mantêm o cadastro manual disponível. Não foram criadas contas nem enviados registros ao provedor.

A API v3.6 pode conter rótulos divergentes no mesmo produto. A importação escolhe um único conjunto `packaging/as_sold` com quantidade/unidade explícitas e maior cobertura dos quatro nutrientes. Não mistura campos do agregado nem conjuntos de rótulo diferentes; valores estimados, modificadores e nutrientes ausentes permanecem sem número. O cálculo usa a porção declarada e só converte proporcionalmente dentro da mesma unidade, sem trocar ml por g. A seleção preenche a composição da porção e os itens ainda pendentes com o mesmo nome; referências anteriores são preservadas. Fonte, URL e base da referência ficam no snapshot já existente do plano, sem migração. Alterar depois a porção limpa a composição informada, como os demais valores por porção.

A interface dá crédito ao Open Food Facts e à licença ODbL. Não espelha catálogo, imagens ou dados pessoais em repositório público. Documentação consultada: https://openfoodfacts.github.io/openfoodfacts-server/api/ e https://openfoodfacts.github.io/documentation/docs/Product-Opener/v2/search/get-search/ (a busca textual usa o serviço Search-a-licious, não a API v2 depreciada). A fonte é colaborativa, não um rótulo garantido da marca atual; o usuário pode usar uma referência padrão ou adaptar os valores manualmente.

Cada alimento passa a mostrar nome, porção e estado do cálculo em um único resumo. “Revisar/completar dados nutricionais”, “Trocar alimento” e “Retirar/Incluir nesta refeição” são ações separadas; a exclusão do cálculo não apaga a composição. Isso elimina a combinação redundante de checkbox, nome repetido e select sempre aberto. RF-007/009; RNF-001/002/004/007/008/011/014. A TACO continua como primeira fonte local.

## Decisão — Busca online automática e edição sem cartões aninhados — 24/10/2026

Por solicitação posterior do proprietário, a consulta online deixa de exigir abrir a busca, escolher um produto e confirmar a referência. Após a TACO, alimentos ainda sem composição e com porção conhecida são pesquisados automaticamente pelo nome no Open Food Facts. Usa-se o primeiro resultado com calorias declaradas e unidade compatível; a referência é padrão independente da marca, fica identificada e editável. Isso substitui a seleção explícita descrita na decisão anterior. Não altera referências TACO, fontes manuais ou composição já preenchida, nem converte ml em g. Ausências e falhas permanecem pendentes.

As consultas passam por fila na aba, com intervalo mínimo por tipo e reaproveitamento de nomes repetidos; itens retirados ou páginas abandonadas não iniciam novos trabalhos pendentes. A fonte e a política de privacidade informam o envio automático apenas dos nomes e códigos, sem PDF, conta ou plano completo. A gravação continua dependendo da revisão e confirmação de uma nova versão. A edição passa a usar divisores e largura disponível, retirando a caixa de busca e as bordas/recuos aninhados. RF-007/009; RNF-001/002/004/007/008/014. Sem migração ou serviço pago.

## Decisão — Aproximações identificadas e refeições recolhíveis — 24/10/2026

O proprietário solicitou recolher refeições após a conferência e preencher calorias aproximadas para alimentos comuns mesmo quando a fonte online falhar. Cada refeição passa a ser um disclosure nativo, inicialmente aberto, com nome e subtotal sempre visíveis. Fechar não desmarca a refeição, não altera suas escolhas e não cancela cálculos em andamento.

Esta decisão amplia o preenchimento estrito por equivalência de nomes: no contexto do plano, nomes genéricos conhecidos recebem uma referência padrão editável e identificada. Exemplos: arroz branco → TACO item 3, tipo 1 cozido; peito de frango → item 410, sem pele grelhado; feijão → item 561, carioca cozido. Preparações explicitadas diferentes e versões light não são confundidas com esses padrões. A correspondência exata da biblioteca TACO mantém suas regras anteriores. Referências existentes e valores revisados permanecem preservados; completar pendências na tela não altera versões salvas.

Saladas genéricas usam como cenário aproximado partes iguais de alface crespa, tomate e cenoura crus, sem molho (TACO 78/157/110). Quando o texto do PDF informa mínimo em gramas, ele é usado; sem peso definido, usa-se porção de referência de 100 g. A porção é explicitamente marcada como estimada e pode ser corrigida. Isso é planejamento, não confirmação de consumo ou aderência.

Para reduzir dependência de disponibilidade online, foram conferidas referências públicas adicionais, armazenadas com fonte, base e data de consulta: chia seca, TBCA BRC0402A (carboidrato disponível); psyllium Relva Verde; requeijão cremoso com queijos light Davaca. São padrões aproximados, não a identificação da marca consumida. Fontes consultadas em 24/10/2026: https://www.tbca.net.br/base-dados-en/int_statistical_composition.php?cod_produto=BRC0402A ; https://www.relvaverde.com.br/produtos/psyllium/ ; https://www.laticiniosdavaca.com.br/produtos/ . A cobertura foi conferida localmente com o PDF pessoal fornecido, que continua fora do Git.

A consulta online dos demais alimentos passa a repetir falhas transitórias/limitação até três tentativas com espera, mantendo os intervalos da fila e permitindo nova tentativa explícita. Ausência real de referência ou porção incompatível não é convertida em número inventado/zero; permanece identificada para correção. RF-007/009; RNF-004/005/007/008/014/016. Sem migração ou serviço pago.

## Decisão — Confirmação de salvamento e comparação no dashboard — 24/10/2026

O proprietário reportou compressão dos campos após surgir a primeira versão salva do plano. O filtro do plano passa a ter regra de grid específica sobre a regra geral do módulo mobile, mantendo data, versões e botão em linhas de largura integral. O salvamento confirmado pelo servidor abre diálogo nativo modal com título, mensagem e fechamento por botão/Escape; o feedback textual permanece na página. Falha de gravação não apresenta confirmação de sucesso.

O dashboard compara o consumo da data com a versão mais recente do plano do projeto salva até o fim daquele dia, usando o cenário de opções efetivamente incluídas e sem recalcular snapshots históricos. Exibe calorias planejadas/registradas e refeições planejadas/com registros. As refeições com registros são categorias distintas do diário naquela data; vários alimentos na mesma categoria contam uma vez. Isso não confirma consumo integral nem aderência. A diferença calórica só aparece quando os dois totais estão completos; ausência permanece distinta de zero. Leituras usam o cliente autenticado, RLS e projeto selecionado; categorias são paginadas para não truncar contagens. Sem alteração do banco. RF-007/009/018; RNF-002/004/007/008/011/014/016.

## Decisão — Registrar refeições planejadas e ajustar porções consumidas — 24/10/2026

O proprietário solicitou uma visão alimentar orientada às refeições importadas, registro explícito de realização, porções manuais com cálculo e substituição da chamada “Adicionar alimento” por “Registrar refeição”. Com versão salva, a alimentação lista as opções incluídas e suas porções. Cada refeição permite confirmar as quantidades do plano ou ajustá-las; a categoria do diário é escolhida explicitamente, sem deduzir a correspondência de títulos genéricos do PDF. O acesso ao planejamento passa a indicar a versão salva, e o upload de outra versão fica recolhido.

A confirmação grava um lote de itens em transação. A origem é identificada por versão, índice da refeição e índice do alimento. O banco valida proprietário, ACTIVE, data/vigência e origem, preserva RLS, impede alterações dessa origem e impõe unicidade por alimento da opção/data. A RPC serializa solicitações por usuário e reutiliza o ledger de requisições idempotentes (com hash dos itens), rejeitando reutilização de ID com conteúdo diferente. Ajustes de porções são calculados novamente no servidor a partir da versão privada; nutrientes enviados pelo cliente são ignorados no registro planejado. Uma falha reverte o lote inteiro. Não se altera o plano nem se confirma automaticamente o diário inteiro.

O registro manual aceita vários alimentos por refeição e mostra o total antes de salvar. Referências locais preenchem composição por quantidade de referência; o usuário pode buscar TACO, solicitar consulta online e revisar dados próprios. Ausência permanece distinta de zero e escrita offline é bloqueada. O dashboard mantém a contagem por categorias com registros e acrescenta a contagem explícita das refeições da versão do plano registradas. Importações e simples consultas continuam sem gerar consumo. RF-007/009/018; RB de projeto ativo/destino e histórico; RNF-002/004/007/008/009/011/014/016. Migração incremental 011, sem reset ou serviço pago.


## Decisão — Dashboard mobile focado no dia — 24/10/2026

Por solicitação do proprietário, em larguras de até 767 px o dashboard oculta o controle “Alterar projeto ou data da consulta” e o link “Gerenciar projetos”. Mantém o resumo do projeto visualizado, os indicadores do dia e os atalhos de alimentação, hidratação, atividades e evolução corporal; a navegação principal continua oferecendo Projetos. Consultas de histórico por links existentes preservam a identificação e o estado somente leitura. Os controles permanecem disponíveis no desktop. Ajuste de apresentação relativo a RF-018 e RNF-004/007/008, sem alteração de dados ou regras de gravação.


## Decisão — Refeições e diário alimentar compactos — 24/10/2026

O proprietário solicitou reduzir a extensão da página alimentar. As refeições planejadas passam a iniciar recolhidas, com nome, estado de registro e calorias planejadas no resumo. A orientação distingue o ajuste de porções consumidas e a inclusão manual de alimentos da versão preservada do plano. Os registros do dia exibem alimento, porção, categoria e calorias em resumos expansíveis; composição, fonte e ações ficam dentro de cada registro. Fontes permanecem disponíveis integralmente. Os acessos ao plano no dashboard e aos registros na refeição usam botões com ícones e área de toque. Apresentação relativa a RF-007/009/018 e RNF-004/007/008; nenhuma mudança em composição, autorização ou gravação.


## Decisão — Agrupar registros do dia por refeição — 24/10/2026

A pedido do proprietário, o diário alimentar passa a agrupar alimentos nas categorias já existentes (café da manhã, lanches, almoço, jantar e ceia), em ordem de refeição. Cada grupo começa recolhido e informa quantidade de alimentos e soma das calorias conhecidas. Itens internos usam linhas sem cartões ou bordas duplicadas; composição e edição continuam expansíveis por alimento. Paginação permanece preservada: em consultas paginadas a quantidade indica “nesta página” e a soma é identificada como subtotal parcial, assim como quando há nutrientes ausentes. Ausência de calorias não vira zero. Ajuste de apresentação de RF-007/009 e RNF-004/007/008/011, sem alteração de persistência.


## Decisão — Status alimentar automático e registro visual de água — 24/10/2026

O proprietário substituiu explicitamente a conclusão manual do dia prevista no fluxo anterior (RF-008). O botão deixa de ser exibido e o status é derivado dos registros: completo quando todos os alimentos selecionados de todas as refeições habilitadas da versão do plano da data possuem registro de origem; parcial quando existem registros sem completar o plano; sem registros quando não há consumo informado. Sem plano não se presume uma quantidade de refeições. Alterações e exclusões refletem-se na próxima leitura, inclusive em datas anteriores; não é necessário cron nem uma gravação automática à meia-noite. Importar não confirma consumo. Dados legados de confirmação permanecem preservados, mas não comandam o status apresentado. O status descreve registro, não aderência. Sem migração do banco.

A hidratação oferece volumes de copo de 100 a 600 ml e quantidade personalizada, mantendo os campos, limites e gravação explícita existentes. Selecionar volume não salva consumo. O link de configuração da meta foi removido dessa tela, conforme solicitação; a gestão continua em Projetos. No dashboard, o indicador circular compara calorias registradas ao plano e mostra quanto falta ou excede; não inventa gasto energético. A comparação fica indisponível quando há dados ausentes/parciais, preservando zero conhecido. RF-007/008/010/018 e RNF-004/007/008/011.


## Decisão — Histórico geral centralizado — 24/10/2026

O proprietário solicitou uma entrada geral no dashboard para centralizar os históricos. A rota autenticada `/painel/historico` reúne alimentação, hidratação, atividades, peso, medidas e metadados de fotos em ordem cronológica, agrupados por dia. Oferece projeto (inclusive concluídos/arquivados ou todos), tipo e intervalo opcional de datas. As consultas usam o cliente autenticado e as políticas RLS existentes. A tela não grava nem muda o projeto ativo. Fotografias continuam privadas: nenhum arquivo é exposto na listagem, e o acesso encaminha à galeria protegida.

A paginação combina deterministicamente as fontes por data, ID e tipo, em páginas de 20 itens; busca os prefixos necessários de cada fonte em lotes de até 1000 para evitar truncamento pelo limite do servidor. Projetos também são lidos em lotes. Datas ou tipo inválidos apresentam erro sem uma busca ampla silenciosa. Filtros são preservados ao paginar e reiniciam a página ao consultar. Nenhuma migração ou serviço adicional.

Peso, medidas e atividades passam a encaminhar a escolha de período ao histórico geral, mantendo seus formulários de registro. Consultas por links com data continuam suportadas. No peso, o gráfico é limitado à data consultada e a ausência de registro no dia exato é diferenciada do último peso conhecido mostrado no resumo. Os filtros diários de alimentação/água permanecem necessários à consulta do diário e ao registro retroativo. RF-014/015/018/019; RNF-002/004/007/008/011.


## Decisão — Calendário diário do projeto ativo no histórico — 24/10/2026

O proprietário substituiu os filtros gerais de projeto/tipo/período por um calendário mensal aberto, limitado ao projeto ativo. A seleção de dia exibe um accordion da data (aberto ao selecionar), com subgrupos recolhidos por refeição e por hidratação, atividades, peso, medidas e fotos. A mesma refeição deixa de aparecer intercalada com outras áreas. O usuário pode navegar entre meses, voltar a hoje e recolher os detalhes. Datas futuras não são selecionáveis.

O servidor resolve o ACTIVE da conta e restringe todas as consultas a esse projeto e à data selecionada; parâmetros antigos de projeto/tipo/período não selecionam outra fonte. Sem ACTIVE, a página orienta a visitar Projetos. Consultar projetos encerrados continua disponível por Projetos e não muda o destino das gravações. Paginação de 20 itens preserva data/mês e identifica contagens limitadas à página. Nenhuma alteração de dados ou migração. RF-018/019; RB de ACTIVE único e isolamento por proprietário; RNF-002/004/007/008/011. Esta decisão substitui a seleção de todos os projetos na versão anterior do histórico central.


## Decisão — Consultas por data somente no histórico e feedback de navegação — 25/10/2026

O proprietário solicitou retirar os componentes de data/consulta das páginas de registro e centralizar essa navegação no Histórico geral. Foram removidos os filtros de consulta diários de Alimentação e Hidratação, a faixa de dias da Alimentação, o seletor de projeto/data do dashboard e a data de comparação da tela do plano. A escolha de versões do plano permanece disponível como “Abrir versão salva”. Os campos de data dos formulários de gravação continuam necessários ao registro retroativo; links com data do histórico também preservam o contexto selecionado. Esta decisão substitui a permanência anterior dos filtros diários.

As buscas de calendário alimentar e as comparações auxiliares de cada dia da faixa deixam de ser executadas, reduzindo chamadas desnecessárias nessa tela. No histórico, links de navegação usam o estado pendente real do App Router (`useLinkStatus`), com logo, fundo opaco e mensagem acessível “Carregando registros…”, sem temporizador artificial ou alteração antecipada dos dados. O indicador some quando a navegação conclui. Teste de navegador retém temporariamente a resposta para comprovar o feedback durante a espera e sua remoção ao apresentar o dia selecionado. RF-018/019; RNF-004/007/008/011. Sem alteração de banco.


## Decisão — Consulta de atividades Strava vinculada à conta — 25/10/2026

O proprietário solicitou integrar o card Atividades ao Strava, confirmou o cadastro da aplicação e autorizou o uso temporário das credenciais fornecidas para testes, com troca posterior. A implementação usa OAuth de leitura, sessão cifrada em cookie HttpOnly vinculado ao usuário e consulta explícita de até cinco atividades recentes. Os testes usam respostas fictícias; nenhuma atividade real é enviada ao agente de desenvolvimento. O consentimento real fica com a pessoa usuária, na tela oficial do Strava.

A política oficial consultada nesta data mantém a proibição de combinar dados Strava com outros dados do usuário e de armazenamento permanente. Assim, o recorte implementado é uma seção independente em Atividades, acessível pelo card do dashboard: não grava na tabela operacional, não soma sessões manuais e Strava e não cruza calorias com alimentação. Mostra calorias informadas pelo provedor por atividade, preservando ausência distinta de zero. O cruzamento pedido anteriormente permanece dependente de autorização específica, conforme a decisão de 22/10. Nenhuma migração ou assinatura adicional.

Foi atualizado o aviso de privacidade. Logout limpa os cookies, desconexão solicita revogação e limpa a sessão local, e exclusão de conta tenta revogar sem impedir a exclusão na indisponibilidade do provedor. Os resultados não entram em exportação, backups ou offline e expiram da memória da tela em quinze minutos. Configuração temporária limitada à prévia da develop; rotação exige nova configuração e reconexão. OAuth não usa tokens copiados manualmente do painel Strava. Ver [integração Strava](integracao-strava.md) para operação, limites e testes. Extensão explicitamente autorizada do backlog Strava, relacionada a RF-012/013/018/020/022; RNF-002/004/007/008/011 e isolamento por proprietário.


## Decisão — Substituição por Garmin Personal API — 25/10/2026

Após a recusa do callback pelo Strava mesmo com ID/domínio conferidos, o proprietário autorizou substituir a conexão pela Garmin Personal API e forneceu uma chave pessoal para configurar no servidor. A consulta fica limitada à própria conta Diazen, por UUID explicitamente configurado em variável privada, verificado antes de acessar o provedor. Não há chave compartilhada entre usuários. A modalidade Personal atende ao uso pessoal; disponibilização comercial multiusuário depende do programa Business e de nova implementação.

A rota autenticada POST valida origem, disponibilidade da conta e proprietário, gera token no host oficial e consulta até cinco atividades recentes. O token é retornado como texto pelo provedor, não como JSON, conforme confirmado no teste real. A interface usa linhas recolhíveis com feedback durante carregamento, fonte Garmin Connect, unidades convertidas e ausência distinta de zero. A leitura não cria atividades no diário, não altera projeto nem cruza calorias com alimentação. Credenciais ficam em configuração privada; respostas da Garmin não são logadas e somente os campos apresentados chegam ao navegador. Sem migração, serviços novos ou dependências adicionadas.

As rotas, componentes e credenciais configuradas do Strava são removidos; limpeza de cookies legados permanece no logout/exclusão. Resultados Garmin ficam em memória da tela por até quinze minutos, sem banco, exportação, backup ou offline. Testes usam dados sintéticos, incluindo isolamento, CSRF, ausência/zero, limites, falhas e acessibilidade mobile. A chave real foi aceita no endpoint de token e a listagem respondeu HTTP 200, sem registrar valores de atividades. RF-012/018/020/022; RB-04/10/11; RNF-002/003/005/007/008/009/012/014/016. Ver [operação Garmin](integracao-garmin.md).


## Correção — Repetição da consulta Garmin sem perder resultados — 25/10/2026

O proprietário reportou a mensagem de espera após uma consulta bem-sucedida. Os logs de status da hospedagem confirmaram HTTP 200 seguido por 429 do limitador interno. A atualização também limpava a lista antes de receber a próxima resposta. Esse limitador foi substituído por reaproveitamento privado do resultado por até um minuto na instância, vinculado ao usuário e à impressão da chave, após revalidar autorização a cada solicitação. Solicitações simultâneas compartilham a leitura; falhas liberam nova tentativa, e rotação invalida o resultado anterior. Nenhuma credencial fica na resposta. A interface preserva atividades durante atualização e falhas temporárias, reiniciando o prazo de exibição somente no sucesso. Ausência de autorização limpa a lista. Limitação real do provedor continua comunicada. Política de privacidade e operação atualizadas para informar a breve retenção em memória do servidor. Testes reproduzem repetição, concorrência, expiração, rotação e falha de atualização sem perda dos resultados. RF-012/018; RNF-002/003/005/006/008/012/014.


## Decisão — Importação seletiva e automática da Garmin — 25/10/2026

O proprietário ampliou a consulta para persistir título, tipo e calorias no Diazen, com escolha das atividades anteriores, e confirmou salvar automaticamente todas as novas. A migração incremental 012 acrescenta campos de título/composição/origem, configurações de sincronização e ledger por conta/ID externo. As RPCs de importação/claim/finalização são administrativas, sem execução por authenticated/anon; o servidor consulta o detalhe oficial, valida a conta, resolve o ACTIVE na transação e mantém as regras de vigência. A origem não pode ser forjada ou alterada pelo cliente. Ausência de composição permanece distinta de zero. Modalidades adicionais usam “Outra atividade” com tipo original preservado, sem inferir musculação.

A automação usa marco inicial UTC da ativação: atividades anteriores dependem de seleção explícita. Importações posteriores usam ID externo para deduplicar, não sobrescrevem edições e mantêm referência após exclusão para não recriar o registro removido. Configurações/ledger participam da exportação, exclusão da conta e backup. A tela informa seleção, resultado e pausa; título/tipo/calorias aparecem no diário e histórico, e as sessões importadas entram no indicador existente. Não se calcula déficit energético nem se altera a origem Garmin.

A Vercel só agenda cron em produção e o Hobby limita frequência a diária. Por isso, a automação da prévia usa Supabase Cron/pg_net a cada quinze minutos, com credencial própria cifrada no Vault e destino HTTPS fixo, além de verificação no aplicativo aberto. Nenhum serviço pago ou novo provedor foi contratado. O job é preparado desativado e só habilitado após validar a implantação. A rota autentica segredo ou sessão/origem, resolve o proprietário no servidor e usa lease/cursor persistidos para concorrência, paginação e retry. Conta excluída, ausência de ACTIVE e pausa bloqueiam gravação. Jobs devem ser pausados antes de restauração e reativados apenas após reaplicar exclusões.

Autorização: solicitação explícita do proprietário, inclusive escolha “Salvar automaticamente todas as novas atividades”. Substitui o recorte somente consulta da decisão anterior, sem alterar os documentos originais gerados. RF-012/013/018/020/022; RB-01/03/04/10/11; RNF-002/003/004/005/007/008/009/012/013/014/016. Backup cifrado/verificado antes da aplicação remota, sem reset; testes sintéticos cobrem integridade/autorização/automação e UI. Operação em [integração Garmin](integracao-garmin.md).

## Correção operacional — Reconfiguração idempotente do agendador Garmin — 25/10/2026

O Supabase executa gatilhos de privilégios mesmo ao receber CREATE EXTENSION IF NOT EXISTS para uma extensão já instalada. A reaplicação pode falhar por privilégios dependentes. A ferramenta passa a consultar pg_extension antes de emitir DDL, preservando extensões existentes e usando cron.alter_job para ativar/desativar somente o job do Diazen. Reaplicação confirmada no serviço real, sem CASCADE, remoção de extensões ou alteração de jobs alheios. A chamada pg_net à rota publicada respondeu HTTP 200 e o job de quinze minutos foi habilitado. Sem alteração do schema operacional ou da interface.

## Verificação — Isolar a falha deliberada do roteiro de auditoria — 25/10/2026

A CI apresentou um diagnóstico recuperável React 419 da simulação intencional de falha de leitura durante a etapa seguinte de fotos, embora os testes Chromium/WebKit e o mesmo roteiro local passassem. O cenário de falha passa a usar sessão de navegador separada, encerrada antes de retornar à sessão normal. A auditoria continua exigindo ausência de exceções nas demais etapas, sem ampliar filtros ou ignorar erros de fotos. O roteiro completo passou localmente com o isolamento. Não altera código ou comportamento do aplicativo.


## Decisão — Accordion Garmin e cards de atividades — 25/10/2026

O proprietário solicitou recolher a apresentação da Garmin a partir da segunda visita e usar cards de sessões inspirados nas referências visuais enviadas. Corrigiu explicitamente o termo inicial “carousel” para “accordion”; a implementação usa disclosures nativos, sem carrossel. A primeira apresentação abre no navegador; nas visitas seguintes começa fechada, com reabertura por toque ou teclado. Um único marcador visual local registra que ela já foi vista, sem conta, credenciais ou atividades; indisponibilidade do armazenamento não bloqueia o acesso. A sincronização continua independente dessa apresentação.

O resumo semanal exibe sessões versus meta quando definida e os dias com registros, com navegação ao histórico central. Projetos encerrados preservam seu contexto somente leitura nos links. As contagens diárias são consultadas com cliente autenticado, projeto selecionado, intervalo semanal e paginação; não derivam da página limitada de registros. Dias sem marca indicam ausência de lançamento, sem inferir ausência de exercício. Os registros usam cards com título, modalidade, duração, distância, calorias disponíveis e origem; ações de edição/exclusão ficam dentro do accordion. Dados ausentes continuam distintos de zero. Mantêm-se tokens grafite/âmbar e métricas de 34 px, sem reproduzir cores ou inventar métricas das referências. RF-012/013/018; RNF-002/004/007/008/011. Sem migração, serviços ou mudanças na importação.


## Ajuste — Consulta semanal na própria tela e comparações no dashboard — 25/10/2026

O proprietário corrigiu a navegação dos dias no resumo de atividades: cada dia seleciona a data na própria tela e apresenta os registros abaixo, com feedback pendente existente e âncora da listagem. O link explícito do histórico permanece disponível. O projeto selecionado é preservado quando informado; a consulta inicial de atividades também se limita ao dia atual. Isso substitui o encaminhamento dos dias ao histórico central da decisão anterior.

Os cards do dashboard comparam alimentação registrada com plano quando disponível, água com meta vigente e sessões com meta semanal. Peso ocupa a largura da grade, reutiliza o gráfico existente das últimas trinta medições até a data selecionada e informa a diferença entre a primeira e a última desse período, sem juízo de aderência ou sucesso. Sem duas medições, permanece o último peso conhecido sem inventar tendência. Consultas autenticadas filtradas pelo projeto, sem migração ou alteração do destino dos registros. RF-012/014/018/019; RNF-002/004/007/008/011.


## Ajuste — Cards de peso e sessões compactos — 25/10/2026

Por solicitação do proprietário, o card Peso volta a ocupar uma coluna da grade, alinhado aos demais, mantendo comparação e gráfico compacto. O card Atividades com meta mostra apenas sessões registradas versus meta e barra âmbar, removendo o título numérico e textos repetidos; sem meta mantém a informação de sessões e ausência de configuração. RF-018; RNF-007/008/011. Sem mudanças de consultas ou banco.
