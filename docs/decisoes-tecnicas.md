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
