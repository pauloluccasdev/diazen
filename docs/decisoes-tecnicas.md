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
