# Ampliações de dados aprovadas — Diazen 2.0

Aprovação explícita do proprietário em 17/11/2026: **“Aprovar as duas ampliações”**, em resposta à proposta de recipientes de água salvos e perfil com nome opcional/avatar privado. Este documento detalha a implementação futura; não declara migrações aplicadas.

## Recipientes — Fase 4

Tabela candidata `water_containers`: UUID, `user_id` com FK Auth/cascade, nome obrigatório de 1–80 caracteres, volume inteiro de 1–5000 ml, data de criação. Cadastro pertence à conta, não a projeto encerrado; selecionar recipiente no formulário de consumo copia nome/volume para o lançamento existente e preserva sua data. Alterações posteriores no cadastro nunca reescrevem lançamentos. Formulário de consumo continua resolvendo o projeto ACTIVE no servidor.

RLS deve exigir proprietário e conta habilitada, com grants mínimos e validação equivalente no servidor. Definir limite de cadastro e paginação antes de escrever a migração; ausência de recipiente não impede consumo manual/atalhos. Incluir na exportação paginada, no inventário de backup/restauração e na exclusão por FK. Testar limites, CRUD, histórico após renomear/excluir, segunda conta, conta em exclusão e bloqueio offline.

## Perfil — Fase 9

Tabela candidata `profiles`: chave `user_id` do Auth/cascade e nome de exibição opcional de até 80 caracteres. Não duplicar senha, e-mail, telefone ou nascimento. Sem perfil cadastrado: ícone neutro; não usar o rosto do protótipo.

Avatar é opcional e privado: validar bytes reais e dimensões, limitar tamanho, reencodar com Sharp sem EXIF, usar caminho aleatório por proprietário e entregar por rota autenticada com cache privado. URL externa fornecida pelo usuário não é aceita. A troca deve confirmar o novo objeto antes de retirar a referência anterior; falhas de storage precisam de limpeza verificável e reconciliação. Remover avatar e excluir conta eliminam objetos/filas correspondentes. RLS de banco/storage, backup, exportação e restauração devem abranger também esses recursos.

Reutilizar padrões de fotos privadas sem associar avatar a projeto ou remover fotos corporais por engano. Testar arquivo inválido/disfarçado, metadados removidos, limites, segunda conta, troca com falha, remoção, exportação e exclusão completa. Dados opcionais vazios não devem virar identidade fictícia.

## Aplicação e evidência

Migrações aditivas, versionadas e verificadas no laboratório PostgreSQL com RLS antes de qualquer aplicação remota. Aplicação remota exige confirmar destino e pré-condições; nenhum reset de produção. Registrar nomes finais de tabelas, bucket, limites e hashes das migrações no relatório de cada fase. Não antecipar a implementação dessas extensões na fase de dashboard.
