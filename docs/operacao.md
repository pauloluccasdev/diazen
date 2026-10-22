# Operação e homologação — Diazen MVP 0.1

## Estado e responsabilidade

O código e os testes locais estão preparados para uso pessoal em ambiente de homologação. Credenciais, migrações no Supabase real, SMTP, hospedagem, backups e revisão legal/visual precisam ser validados na instalação. Há uma prévia protegida na Vercel, descrita em [publicacao.md](publicacao.md); o lançamento em produção segue pendente. As páginas de termos/privacidade são informativas, e não aprovação jurídica ou indicação de base legal definida.

## Preparação

Atualização de 21/10/2026: o projeto Supabase do Planna foi resetado por autorização do proprietário e já recebeu as oito migrações. Configuração, fluxos essenciais, isolamento e concorrência foram testados no serviço real; veja [evidências e pendências](homologacao-supabase.md). Não reaplique o bundle neste projeto. SMTP, URLs/templates e demais gates abaixo continuam sujeitos à homologação.

1. Revise `docs/modelagem.md` e o bundle gerado por `npm run db:bundle`, em `artifacts/diazen-migrations.sql`. Ele é destinado a um projeto vazio; não executa DROP/RESET e não deve ser reaplicado sobre tabelas já existentes.
2. Aplique migrações em ordem após revisar o modelo. Confirme RLS em tabelas e policies específicas do bucket privado `body-photos`. Não exponha o schema `private` no Data API. Não configure outras policies permissivas para o mesmo bucket.
3. Configure `.env.local` conforme `.env.example`; confira `npm run env:check -- --connect`. A origem deve corresponder ao endereço realmente acessado. `localhost` e `127.0.0.1` são origens distintas para cookies e links.
4. Auth: confirmação de e-mail, templates por token hash, SMTP, senha mínima compatível, limites contra força bruta e enumeração. Não publique chaves privilegiadas. Segredos de servidor ficam nas variáveis do projeto de hospedagem, fora do Git.
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

Política operacional proposta para o uso pessoal, a confirmar pelo proprietário: cópia lógica diária e cópia dos arquivos privados, cifradas e fora do repositório; retenção máxima de 30 dias e descarte das cópias vencidas. O ledger mínimo de exclusões deve ter cópia separada atualizada após cada solicitação/purge e permanecer protegido enquanto existir backup capaz de reintroduzir o titular. Prazo final e fundamento dessa retenção devem ser revisados antes de uso real.

O Supabase recomenda exportações externas para o Free; backup do banco contém metadados, **não os arquivos do Storage**. Siga os procedimentos oficiais de [backup](https://supabase.com/docs/guides/platform/backups) e [restauração por CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), verificando inclusão de Auth, customizações de policies, funções e histórico de migrações. Não assuma que exportar apenas `public` recupera a instalação inteira.

Ensaio obrigatório em ambiente isolado:

1. Produza cópias com usuários/dados fictícios e registre contagens e checksums dos arquivos.
2. Exclua uma conta de teste e preserve o ledger atualizado fora da cópia antiga.
3. Restaure banco e arquivos em ambiente isolado, sem habilitar acesso dos usuários ainda.
4. Reaplique o ledger atual: bloqueie as contas listadas, remova seus objetos pela API do Storage e remova os usuários de Auth. Não apague apenas linhas de `storage.objects`, pois isso não elimina os arquivos.
5. Revalide RLS, bucket privado, sessão, contagens dos dados restantes, checksums de fotos e todos os fluxos essenciais. Só então habilite acesso e registre o ensaio sem credenciais/dados pessoais.

O teste local faz dump/restauração do PostgreSQL embarcado e verifica a reaplicação das exclusões. A restauração real do Supabase e de objetos externos continua pendente.

## Revisões antes do lançamento

- Confirmar responsável e canal de contato, finalidade, base legal, operadores, retenção e direitos do titular; revisar termos e privacidade conforme a instalação. Não coletar consentimento genérico como substituto de definir fundamento adequado.
- Aprovar visual das telas reais e selecionar definitivamente os requisitos de prioridade Média; RF-009 está adiado no refinamento atual.
- Confirmar limites de upload, custos, matriz de navegadores e monitoramento; manter restrição ao uso pessoal inicial.
- Guardar evidências de homologação e aprovação no projeto, sem dados sensíveis. O PR final fica com o proprietário.
