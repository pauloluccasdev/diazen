# Fase 9 — Perfil e Configurações: refinamento técnico

18/11/2026. Execução da ampliação explicitamente aprovada em 17/11 (nome opcional/avatar privado, §5 C da matriz). R12 aberta antes da implementação. Este plano antecede o SQL e não representa migração aplicada. Supabase Auth e suas senhas/sessões permanecem nos fluxos existentes.

## Experiência

Mobile Dark Premium: cabeçalho próprio, identidade, lista de destinos reais, seções de edição e logout. Desktop claro/escuro: coluna de identidade/navegação e painéis de dados, referências do projeto e preferências, como R12. As fotografias e o nome do mockup não são dados do usuário. Avatar ausente usa ícone/iniciais de nome confirmado; nome é opcional.

Reusar DisplaySettings, exportação, alteração de senha e exclusão reautenticada. A preferência de tema usa o estado/cookie já existente, compartilhado com o controle do cabeçalho. Mobile permanece dark. Métrico/PT-BR são as capacidades atuais; não criar seletores sem ação. Metas aparecem somente quando configuradas. Não adicionar telefone, nascimento, edição de e-mail, assinatura, notificações avançadas ou novos provedores de login.

## Migração aditiva 020 proposta para execução

- `profiles`: `user_id` PK/FK de Auth com cascade; `display_name` opcional, até 80 caracteres, sem controles ou texto vazio; `avatar_id` UUID opcional; `avatar_key` gerada no banco como `user_id/avatars/avatar_id.webp`, nula quando não há avatar; criação/atualização com datas do servidor.
- RLS `private.owner_enabled(user_id)` em leitura/gravação. Identidade/criação imutáveis. Grants mínimos por coluna e nenhum acesso anônimo. Comandos autenticados estreitos para nome e avatar atualizam somente seu próprio atributo, preservando o outro em concorrência. Nenhuma senha é replicada.
- No primeiro uso do avatar, o comando aceita nome inicial já existente na identidade Auth; aplica-o somente quando cria a linha, preservando o nome em qualquer conflito. O backend valida esse valor. Perfil existente com nome nulo representa escolha explícita e não volta a usar um nome antigo do Auth.
- Auditoria registra proprietário, entidade/ação e identificador, sem copiar nome ou imagem. O trigger genérico existente exige coluna `id`; perfil usa trigger próprio para sua PK `user_id`, sem alterar a auditoria dos registros operacionais.
- `avatar_cleanup`: fila administrativa com PK composta `(user_id, avatar_id)`, FK Auth/cascade, caminho gerado e `available_after`. Sem grants/policies para clientes finais. A PK composta impede interferência entre contas que escolham o mesmo UUID.
- Trocar/remover avatar enfileira o anterior. Upload novo registra trabalho durável antes de enviar bytes, com disponibilidade após quinze minutos, evitando limpeza de envio ainda em andamento. Limpeza verifica se o perfil ainda referencia o objeto antes de removê-lo; uma resposta HTTP perdida pode esconder um commit real.
- Reusar `body-photos`, já privado e compartilhado com referências de planos. Acrescentar somente policy SELECT para o avatar referenciado no próprio perfil. Não liberar upload público nem alterar a política das fotografias corporais. Nenhum novo serviço/bucket necessário.

## API e ciclo de vida

Nome é salvo por ação autenticada. Avatar usa API com verificação de origem, sessão/conta disponível, limite de corpo e validação binária; otimização WebP pequena, remoção de metadados sensíveis e chave gerada no servidor. O cliente não fornece URL de arquivo. GET resolve exclusivamente o próprio perfil e responde privado/no-store, com tipo correto e `Vary: Cookie`. UUID da versão permite atualizar a imagem exibida após substituição. Remoção exige confirmação e preserva o nome.

Remoção compara atomicamente o UUID exibido: uma confirmação antiga não pode apagar um avatar substituído por outra sessão. A fila de um upload confirmado não é apagada indiscriminadamente pela resposta da API, pois outra substituição pode já ter reutilizado essa mesma entrada para limpar a versão anterior.

Erros preservam preenchimento; sucesso limpa a seleção de arquivo. Uma falha de confirmação não autoriza apagar um avatar confirmado: comparar os metadados atuais antes da limpeza. Escritas desconectadas ficam bloqueadas; nenhuma imagem privada vai para cache público.

## Exportação, exclusão e backup

Exportação inclui perfil paginado por `user_id`. O arquivo continua acessível apenas pela rota privada. `purgeAccount` já remove recursivamente o prefixo do proprietário antes de excluir Auth, incluindo a subpasta `avatars`; novas FKs completam a remoção dos metadados/fila. Integrar a fila à limpeza administrativa.

Reconciliador distingue o novo namespace e conserva objetos referenciados; respeita a janela de 24 horas para órfãos e não apaga quando a consulta de Auth/referência falha. Backup mantém formato e bucket atuais: acrescenta referências de avatar, aceita seu namespace seguro e continua aceitando todos os caminhos antigos. Dump inclui as tabelas novas. Ensaio nativo de restauração deve incluir perfil/avatar e reaplicação da exclusão.

## Verificação e aplicação

Testar RLS entre duas contas, anônimo, identidade imutável, nome opcional, caminhos gerados, grants, pedidos de exclusão, atualização concorrente de atributos, fila de substituição/remoção e cascades. Testar API sem sessão/origem, formatos/tamanho/EXIF, respostas incertas e limpeza que não remove o avatar atual. Exercitar UI, tema, nome/avatar, reset/erros, metas reais, exportação e exclusão, além dos módulos existentes.

Aplicar ao Supabase real somente depois de validação local e ensaio de restauração, com preflight apenas de metadados, comparação do histórico e execução incremental da 020. Não ler dados pessoais para validar a migração. Não resetar/reaplicar versões antigas: 013 está ausente do ledger, embora `delete_project` exista. Verificar novas constraints, RLS, grants/policy e hash do arquivo aplicado. A aprovação vigente cobre esta extensão e seu ciclo de privacidade; nenhuma migração destrutiva está autorizada.

## Execução da proposta

Em 18/11/2026, após testes de banco/API/UI, suítes completas Chromium e WebKit, 26 jornadas agent-browser, restauração nativa e backup criptografado verificado, a migração 020 foi aplicada e conferida por metadados. Detalhes no relatório da Fase 9. A seção anterior registra a proposta original, anterior à execução.

## Proposta de correção incremental — relógio da fila

O ensaio posterior com duas contas sintéticas no Supabase real confirmou RLS/Storage privados e expôs diferença de aproximadamente três segundos entre o relógio local e o PostgreSQL. A fila usa `now()` do banco na remoção, mas a seleção de trabalhos comparava com o relógio da aplicação. Assim, uma limpeza imediatamente após a remoção podia não selecionar o trabalho recém-criado. As duas contas do ensaio foram removidas integralmente.

Antes de alterar o código ou executar novo SQL, fica proposta a migração aditiva 021: comando de leitura `due_avatar_jobs`, executável somente por `service_role`, selecionando trabalhos disponíveis com `now()` do próprio PostgreSQL e limite máximo de 100; proprietário opcional preserva o escopo da limpeza disparada pela API. Alterar somente o default de disponibilidade de novos uploads para quinze minutos no banco, retirando o cálculo do relógio da aplicação. O trigger de substituição/remoção continua usando disponibilidade imediata explícita. Nenhum registro existente, grant de usuário, dado pessoal ou bucket é alterado; a 020 já aplicada permanece imutável.

Esta correção faz parte do ciclo de privacidade já aprovado. Verificar a RPC administrativa e negação a clientes, atraso seguro dos uploads, seleção imediata mesmo com relógio da aplicação atrasado, fila/revisão, APIs, regressões e repetição do ensaio real antes da integração. Aplicação remota incremental depois das validações locais e backup verificado, com novo hash/histórico e conferência de permissões.
