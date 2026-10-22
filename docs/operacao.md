# Operação e homologação — Diazen MVP 0.1

## Estado e responsabilidade

O código e os testes locais estão preparados para uso pessoal em ambiente de homologação. Credenciais, migrações no Supabase real, entrega de e-mail, hospedagem, backups e revisão legal/visual precisam ser validados na instalação. Há uma prévia protegida na Vercel, descrita em [publicacao.md](publicacao.md); o lançamento em produção segue pendente. As páginas de termos/privacidade são informativas, e não aprovação jurídica ou indicação de base legal definida.

## Preparação

Atualização de 21/10/2026: o projeto Supabase do Planna foi resetado por autorização do proprietário e recebeu as migrações 001 a 008; em 22/10/2026 recebeu também a 009 incrementalmente, sem novo reset. Configuração, fluxos essenciais, isolamento e concorrência foram testados no serviço real; veja [evidências e pendências](homologacao-supabase.md). Não reaplique o bundle neste projeto. Entrega de e-mail e demais gates abaixo continuam sujeitos à homologação.

1. Revise `docs/modelagem.md` e o bundle gerado por `npm run db:bundle`, em `artifacts/diazen-migrations.sql`. Ele é destinado a um projeto vazio; não executa DROP/RESET e não deve ser reaplicado sobre tabelas já existentes.
2. Aplique migrações em ordem após revisar o modelo. Confirme RLS em tabelas e policies específicas do bucket privado `body-photos`. Não exponha o schema `private` no Data API. Não configure outras policies permissivas para o mesmo bucket.
3. Configure `.env.local` conforme `.env.example`; confira `npm run env:check -- --connect`. A origem deve corresponder ao endereço realmente acessado. `localhost` e `127.0.0.1` são origens distintas para cookies e links.
4. Auth: confirmação de e-mail, templates/provedor padrão do Supabase Free, callbacks PKCE `/auth/confirmar` e `/auth/recuperar`, senha mínima compatível, limites contra força bruta e enumeração. Links abertos no mesmo navegador e origem da solicitação. Não publique chaves privilegiadas. Segredos de servidor ficam nas variáveis do projeto de hospedagem, fora do Git.
5. Vercel: projeto Next.js, Node.js 24, `npm ci`/`npm run build`, HTTPS e variáveis por ambiente. Preview e produção devem usar ambientes de dados separados ou ser explicitamente restritos. `main` só recebe o PR final do proprietário.
6. Limites de referência consultados: Vercel Hobby é para uso pessoal/não comercial; Supabase Free tem cotas e pode pausar por baixa atividade. Confira preços e termos novamente antes de publicar ou ampliar uso. Fotos otimizadas reduzem consumo, sem prometer hospedagem gratuita permanente.

## Roteiro de homologação real

Use exclusivamente contas e fotos de teste até concluir:

| Fluxo | Evidência a registrar |
| --- | --- |
| F-01 | Cadastro, recebimento e confirmação de e-mail, login, projeto com meta, dashboard com persistência após reload. |
| RF-001 | Erros genéricos, link expirado/reutilizado negado, recuperação recebida, troca de senha e renovação após expiração do access token. Logout impede novo acesso ao painel. |
| F-02 | Refeição com quantidade/referência; conferir conta proporcional; valores desconhecidos distintos de zero; editar/excluir e invalidar confirmação do dia. |
| F-03 | Dois consumos somados, edição/exclusão individuais, versão nova da meta sem mudar dias anteriores. |
| F-04 | Musculação sem distância; corrida/bike/natação com distância; histórico e sessões semanais coerentes. |
| F-05 | Peso substituído na mesma data sem duplicar; medidas parciais e únicas; upload, orientação e EXIF; leitura anônima/cross-user negada; comparação e exclusão de foto no ACTIVE. |
| F-06/F-07 | Encerrar com confirmação; histórico sem escrita; selecionar histórico e registrar no ACTIVE sem mudar associação dos dados antigos. |
| RNF-004 | Duas sessões concorrentes tentam ativar projetos, substituir mesmo peso e encerrar durante uma gravação. Verificar transação, unicidade e bloqueio, sem registros parciais. |
| RF-020 | Em conta de teste, exportar e depois excluir com senha/EXCLUIR; verificar bloqueio imediato, purge de fotos inclusive históricas, Auth e registros removidos, ledger mínimo preservado. |
| RF-022 | Instalar em Chrome Android/Safari iOS disponíveis; consultar dashboard online, desligar conexão e abrir outra rota; ler resumo, tentar escrever (bloqueado), testar expiração e logout limpando resumo. |
| RNF-006/008/015 | Dispositivo móvel intermediário, zoom 200%, teclado, leitor de tela, foco, contraste, erro/carregamento e navegação em rede comum; registrar duração, navegadores e revisão visual. |

Os testes locais usam PostgreSQL de fato, mas não o gateway PostgREST, a implementação real de Auth/Storage, e-mail ou concorrência multi-conexão do serviço. Não substituir esta tabela por resultados do simulador.

## Monitoramento e falhas

- `/api/saude` comprova resposta da aplicação; monitore separadamente o provedor e os fluxos autenticados.
- Erros de carga apresentam retry. Erros de gravação não confirmam sucesso. Solicitações administrativas pendentes são consultadas nas tabelas internas com chave de servidor.
- Logs devem guardar somente eventos técnicos, instantes e identificadores necessários; não registrar e-mails, refeições, medidas, fotos, credenciais ou corpos de requisições. O evento `privacy_purge_pending` sinaliza necessidade de reprocessamento sem incluir dados do titular.
- `npm run privacy:purge` remove objetos pela API do Storage, conclui contas solicitantes e limpa a fila de fotos. O comando também reconcilia arquivos órfãos: preserva referências válidas e uploads recentes de contas vivas, remove arquivos sem metadados após 24 horas e remove arquivos de contas confirmadamente inexistentes em Auth. Falha/indisponibilidade não é tratada como exclusão. Execute após falha ou diariamente quando houver uso real; configure um agendamento protegido somente se necessário. Sem chave administrativa, solicitações continuam bloqueadas até o processamento.
- Para pausar uso durante incidente, restrinja o acesso na hospedagem e preserve as evidências técnicas mínimas sem copiar dados sensíveis para issues ou logs públicos.

## Backup e restauração

Destino aprovado em 22/10/2026: pasta local `backups/`, ignorada pelo Git, com banco e arquivos privados cifrados. A proposta de frequência diária e retenção máxima de 30 dias aguarda decisão do proprietário; os comandos já disponíveis não agendam execução nem apagam cópias automaticamente. O ledger mínimo de exclusões deve ter cópia separada atualizada após cada solicitação/purge e permanecer protegido enquanto existir backup capaz de reintroduzir o titular. Prazo final e fundamento dessa retenção devem ser revisados antes de uso real.

O Supabase recomenda exportações externas para o Free; backup do banco contém metadados, **não os arquivos do Storage**. Siga os procedimentos oficiais de [backup](https://supabase.com/docs/guides/platform/backups) e [restauração por CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), verificando inclusão de Auth, customizações de policies, funções e histórico de migrações. Não assuma que exportar apenas `public` recupera a instalação inteira.

Ensaio obrigatório em ambiente isolado:

1. Produza cópias com usuários/dados fictícios e registre contagens e checksums dos arquivos.
2. Exclua uma conta de teste e preserve o ledger atualizado fora da cópia antiga.
3. Restaure banco e arquivos em ambiente isolado, sem habilitar acesso dos usuários ainda.
4. Reaplique o ledger atual: bloqueie as contas listadas, remova seus objetos pela API do Storage e remova os usuários de Auth. Não apague apenas linhas de `storage.objects`, pois isso não elimina os arquivos.
5. Revalide RLS, bucket privado, sessão, contagens dos dados restantes, checksums de fotos e todos os fluxos essenciais. Só então habilite acesso e registre o ensaio sem credenciais/dados pessoais.

Além do teste embarcado, o ensaio controlado com os serviços reais do Supabase local foi concluído em 22/10/2026, conforme a seção abaixo. A aplicação do procedimento em um segundo projeto hospedado não foi executada.

### Ensaio reproduzível em PostgreSQL nativo

`npm run test:restore` cria um cluster temporário exclusivo, acessível somente por socket Unix privado, sem escutar TCP. Não lê `.env.local`, não aceita conexão remota e não altera o Supabase. Requer ferramentas PostgreSQL 17 locais e execução por usuário comum, pois `initdb` não executa como root:

```bash
PG_BIN_DIR=/usr/lib/postgresql/17/bin npm run test:restore
```

Se as ferramentas estiverem extraídas em um diretório local, informe também `PG_SHARE_DIR` com os arquivos compartilhados da mesma versão e, se necessário, `LD_LIBRARY_PATH` para suas bibliotecas. Não é necessário instalar um serviço global.

O comando aplica as migrações em um banco sintético, gera fotos WebP, executa `pg_dump` e `pg_restore` em outro banco e copia os arquivos separadamente. Reaplica o ledger de exclusões posterior ao backup antes de verificar isolamento, remoção dos dados excluídos, preservação dos dados restantes, bucket privado e checksums das imagens. Ao terminar, para o servidor e remove o laboratório; guarda somente um relatório técnico em `artifacts/native-restore-report.json`, ignorado pelo Git.

Ensaio executado com sucesso em 22/10/2026 no PostgreSQL 17.11: dois projetos restaurados; após reaplicar uma exclusão, um projeto e duas imagens do usuário restante preservados com checksums corretos. Auth e Storage usam schemas adaptadores; arquivos são locais. Isso valida ferramentas nativas e a estratégia do ledger, mas ainda não comprova restauração de Auth/Storage hospedados ou recuperação dos arquivos pela API do Supabase.

### Ensaio com Auth e Storage reais do Supabase local

Ensaio controlado concluído em 22/10/2026, com Supabase CLI 2.121.0 e PostgreSQL 17.11. O runtime nativo oficial executa os serviços reais como processos locais, sem adaptadores HTTP/SQL de teste e sem Docker. É experimental e fica restrito a esta verificação; não altera a stack de produção. Requer Linux amd64/arm64 com glibc 2.35 ou posterior, usuário comum, ferramentas PostgreSQL 17 e rede para baixar os serviços na primeira execução.

```bash
# Disponibilizar a versão fixa do CLI no cache do npm.
npx --yes supabase@2.121.0 --version
PG_BIN_DIR=/usr/lib/postgresql/17/bin npm run test:restore:services
```

Se as ferramentas estiverem extraídas, informe `LD_LIBRARY_PATH` como no ensaio anterior. O comando cria uma pasta temporária e uma stack nova, aplica as migrações, gera duas contas/imagens sintéticas e produz dump custom de `public`, `private`, `auth`, `storage` e `supabase_migrations`. Copia as imagens separadamente pela API do Storage. Preserva o ledger posterior ao backup, esvazia somente os dados criados no laboratório e restaura o dump atomicamente, mantendo os proprietários dos objetos. Reaplica o bloqueio e reinicia os serviços para renovar suas conexões após recriar os schemas; só então verifica acesso e reenvia os arquivos pela API. A exclusão é reaplicada com o mesmo processamento da aplicação antes de considerar a cópia disponível.

Foram comprovados: login com a senha restaurada do usuário restante; dados e agregações preservados; RLS e bucket privado; negação de foto existente a outro usuário e ao titular bloqueado; negação de acesso anônimo; checksums das duas imagens restantes; remoção de Auth/dados/arquivos do usuário excluído; ledger mínimo preservado. A stack e a pasta temporária, incluindo backups e uploads sintéticos, são removidas ao terminar. O cache dos executáveis permanece em `artifacts/supabase-native-lab-home/`, protegido localmente e ignorado pelo Git. O relatório sem credenciais fica em `artifacts/supabase-services-restore-report.json`.

O teste não lê `.env.local`, não aceita URLs remotas e só usa endpoints de loopback da stack recém-criada. Ele utiliza o superusuário `supabase_admin` do laboratório para restaurar os schemas gerenciados com seus proprietários originais. Esse privilégio não é presumido no projeto hospedado: uma recuperação em outro Supabase deve seguir o procedimento gerenciado oficial, conferir versões e permissões e ser homologada antes de liberar acesso. O ensaio atende à verificação de RNF-013 em ambiente controlado; não comprova recuperação de infraestrutura hospedada nem define sozinho frequência, cifragem externa, RPO ou retenção dos backups de produção.

Referências: [runtime nativo oficial](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes), [CLI e isolamento de stacks](https://supabase.com/docs/guides/local-development/running-multiple-local-projects).

### Comandos de backup cifrado da instalação

O proprietário definiu o destino `\\wsl.localhost\Ubuntu-22.04\home\paulo_luccas\diazen\backups`, correspondente a `/home/paulo_luccas/diazen/backups`. A pasta local no WSL é ignorada pelo Git. A conexão lê o Supabase hospedado usando TLS com CA e hostname verificados; não realiza gravações remotas. A frequência e o descarte ainda dependem da escolha operacional do proprietário. Não há agendamento ou exclusão automática implícitos.

Configuração local, separada das variáveis da aplicação e nunca publicada na Vercel:

```dotenv
# .env.backup.local — chmod 600; sem valores reais no Git/chat.
DIAZEN_BACKUP_DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/postgres
DIAZEN_BACKUP_CA_FILE=/caminho/privado/supabase-ca.crt
DIAZEN_BACKUP_KEY_FILE=/caminho/privado/backup.key
DIAZEN_BACKUP_DIR=/caminho/para/backups
PG_BIN_DIR=/usr/lib/postgresql/17/bin
# LD_LIBRARY_PATH, somente se as ferramentas estiverem extraídas localmente.
```

As credenciais da API continuam em `.env.local`. Banco e API devem apontar para o mesmo projeto; o comando só aceita conexão direta ou pooler de sessão (5432). O certificado deve ser obtido pela configuração de SSL oficial do Supabase e informado aos dois drivers. A URL não pode enfraquecer a verificação TLS. `pg` 8.23.1 foi adicionado somente como dependência de desenvolvimento para manter a sessão de snapshot; não é usado pelo aplicativo ou enviado ao navegador.

A chave é um segredo aleatório de pelo menos 32 bytes, codificado em base64url, em arquivo privado 0600 e fora da pasta dos backups. Nesta instalação foi criada em `~/.local/share/diazen/backup.key`; seu valor não é impresso, versionado ou enviado à hospedagem. Guarde uma cópia separada dessa chave para conseguir recuperar os arquivos. Não gere outra chave sobre a existente: as cópias anteriores continuam dependendo dela.

```bash
npm run backup
npm run backup:ledger
npm run backup:verify -- /caminho/arquivo.tar.gpg
```

O snapshot PostgreSQL é exportado em transação de leitura e compartilhado entre `pg_dump` e a consulta das referências das fotos. Os arquivos são baixados separadamente pela API; falha ou exclusão concorrente de uma imagem cancela a cópia. O dump inclui `public`, `private`, `auth`, `storage` e `supabase_migrations`, preservando ACLs/proprietários; infraestrutura, roles globais e configurações do provedor não são recriadas automaticamente. Um manifesto registra versão, migrações, caminhos e checksums dentro do pacote cifrado.

A cifragem OpenPGP usa GnuPG/AES-256 com a chave fornecida por stdin, sem colocá-la em argumentos ou logs. A ferramenta abre e verifica integralmente cada pacote antes de publicar seu nome final; arquivos parciais são removidos em falhas normais. Dados temporários ficam em diretório privado e são removidos ao terminar, junto com o agente GPG exclusivo desse trabalho. O verificador rejeita caminhos inesperados, links, conteúdo extra, hashes divergentes, chave incorreta e arquivo corrompido. Ele não executa SQL.

O ledger atual é cifrado separadamente e publicado antes do snapshot. Execute `backup:ledger` após cada solicitação/purge de exclusão e preserve sua cópia mais recente enquanto houver snapshots antigos; restauração deve reaplicá-lo antes de liberar acesso. Os comandos nunca removem cópias já publicadas nem os backups anteriores do Planna. Ao restaurar, confira versões/roles e o procedimento gerenciado; a verificação criptográfica sozinha não substitui o ensaio com Auth/Storage descrito acima.

Primeiro snapshot real e ledger cifrados, criados e verificados em 22/10/2026 na pasta escolhida. O arquivo real continha banco e ledger, sem fotos cadastradas naquele instante; o caminho de imagens e a rejeição de corrupção/chave incorreta também são cobertos pelo teste de empacotamento. O ensaio separado dos serviços reais comprovou restauração de imagens pela API. Não apresentar essa evidência como teste de restauração dos dados pessoais do proprietário.

## Revisões antes do lançamento

- Confirmar responsável e canal de contato, finalidade, base legal, operadores, retenção e direitos do titular; revisar termos e privacidade conforme a instalação. Não coletar consentimento genérico como substituto de definir fundamento adequado.
- Aprovar visual das telas reais e selecionar definitivamente os requisitos de prioridade Média; RF-009 teve inclusão aprovada em 22/10/2026.
- Confirmar limites de upload, custos, matriz de navegadores e monitoramento; manter restrição ao uso pessoal inicial.
- Guardar evidências de homologação e aprovação no projeto, sem dados sensíveis. O PR final fica com o proprietário.
