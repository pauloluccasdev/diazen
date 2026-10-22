# Refinamento técnico — MVP 0.1

Este refinamento acompanha a implementação autorizada pelo proprietário para concluir o MVP. As migrações são versionadas para revisão no PR final; nenhum banco remoto foi provisionado ou alterado. A aplicação em ambiente real depende da revisão da modelagem e configuração do Supabase.

## Estrutura e invariantes

- `projects`: proprietário vinculado a `auth.users`, estados definidos, índice único parcial para ACTIVE. Ativação exige meta mensurável. Criação com meta/ativação é uma única transação RPC. Projetos não têm DELETE pelo usuário.
- `water_goals`: versões por projeto/data. Meta inicial começa na data de início do projeto em DRAFT. Após ativar, novas versões só começam hoje ou no futuro; versões passadas são imutáveis. Uma correção no próprio dia substitui a versão desse dia. Histórico consulta a última versão vigente na data.
- `water_entries`, `weights`, `measurements`, `activities`, `meal_items`, `meal_days`, `photos`: linhas tipadas, proprietário e projeto em FK composta, datas civis. Triggers resolvem ACTIVE no INSERT, ignorando destino fornecido, e travam a linha do projeto para serializar com encerramento. UPDATE/DELETE validam proprietário e estado e não transferem registros entre projetos.
- Peso único por usuário/data; medidas únicas por usuário/data/tipo. RPCs preservam o ID na substituição e a associação histórica. Subconjuntos de medidas são salvos atomicamente.
- `meal_items`: composição informada por referência na mesma unidade da quantidade consumida. Campos nutricionais independentes e anuláveis; zero é valor conhecido. Totais proporcionais identificam resultados parciais. Fonte manual registrada; não se incorpora catálogo sem fonte/licença aprovada.
- `meal_days`: confirmação manual separada dos alimentos. Mudanças no dia removem confirmação, sem inferir aderência.
- `audit_events`: ator, entidade, ação e instante; sem API de leitura pública. Substituição de peso preserva valor anterior apenas na auditoria interna. Eventos não registram credenciais nem cópias de fotografias.
- `account_deletions`: bloqueio imediato por usuário, inclusive para JWT anterior. Solicitação por RPC específica; purge administrativo pelo backend, com deleção de objetos via API do Storage antes de remover o usuário de Auth.

RLS é obrigatória em todas as tabelas. Não se concede acesso a `anon`. As policies limitam propriedade; triggers complementam estado e integridade, sem confiar na UI. Funções privilegiadas usam `search_path` vazio e EXECUTE restrito. Operações administrativas de exclusão não passam pelo bloqueio operacional de históricos.

## Escolhas para o uso pessoal inicial

- Datas civis em `America/Sao_Paulo`; horas de hidratação são opcionais e locais. Não aceitar datas futuras para registros. Datas de projeto editáveis apenas em DRAFT; nome e metas permitidas continuam editáveis no ACTIVE. Encerrados/arquivados são imutáveis.
- Metas de peso suportam alvo, faixa ou apenas acompanhamento; ativação exige pelo menos um alvo/faixa, meta de água ou sessões semanais. Metas ausentes não viram zero.
- Distância é obrigatória para corrida, ciclismo e natação conforme RF-012; a indicação visual de distância opcional no Design System não se sobrepõe ao RF. Distância não é exigida na musculação.
- Medidas de membros distinguem lados. Esta é uma normalização das categorias fixas de braços, coxas e panturrilhas; não cria categorias livres.
- Limites de entrada para evitar erros: peso 20–500 kg, medidas 1–300 cm, consumo 1–5000 ml por lançamento, meta 100–15000 ml, duração até 1440 min. São limites técnicos de plausibilidade, sem orientação clínica.
- Fotos: WebP processado no servidor, tamanho máximo de arquivo armazenado 3 MiB, principal até 1600 px, miniatura até 360 px. Originais só em memória, sem EXIF ou retenção. Bucket privado, leitura por rota autenticada sem cache; INSERT/DELETE de objetos só pelo backend, evitando corrida entre exclusão do registro e fechamento de projeto. Não publicar URLs permanentes de imagens.
- RF-008, RF-013 e RF-021 entram por proximidade do núcleo. RF-009 foi incluído pelo proprietário na revisão final de backlog de 22/10/2026, substituindo o adiamento inicial; veja o refinamento abaixo.

## Verificação

`npm run test:db` aplica as migrações em PostgreSQL embarcado (PGlite), com roles e contexto de identidade. Testa RLS, constraints, transações, estados e trilha. Os schemas `auth`/`storage` são adaptadores locais nos testes, não substitutos dos serviços reais. Concorrência multi-conexão, Storage HTTP, restauração remota e configuração de Auth precisam de homologação real. SQL deve ser aplicado em ordem somente depois da revisão, por migrações Supabase, nunca pela aplicação em runtime.

A migração 008 mantém a fila de limpeza mesmo se o usuário de Auth já tiver sido removido durante um upload. A limpeza verifica referências existentes antes de apagar bytes; uma resposta perdida após COMMIT não deve quebrar uma foto salva. Reconciliação administrativa cobre arquivos sem fila/metadados após indisponibilidade, com janela de 24 horas para uploads de contas vivas.

## Conveniências alimentares — migração 009

`food_library` pertence à conta, com RLS por proprietário e bloqueio por tombstone. Não é um registro operacional de projeto: pode ser mantida independentemente do estado dos projetos. Itens `food` guardam referência, unidade, fonte e nutrientes informados. Itens `recipe` guardam rendimento em porções e snapshots JSON dos ingredientes; a RPC compila os valores proporcionais e propaga ausência por nutriente. Ingredientes são alimentos próprios, sem receitas recursivas. Alterar/remover alimentos não reinterpreta receitas existentes; alterar/remover biblioteca nunca muda o diário.

`add_library_food` copia a composição atual de um item salvo ou de um registro recente para `meal_items`, que continua resolvendo ACTIVE no trigger e validando data. `copy_meal` copia uma categoria/data do projeto consultado para categoria/data do ACTIVE, sem depender da paginação. `food_copy_requests` preserva parâmetros/contagem por UUID de solicitação para impedir repetição, inclusive quando origem e destino coincidem. As duas tabelas têm FK de proprietário para Auth com cascade, não concedem TRUNCATE ao usuário e integram sua exportação. O ledger de cópias é diferente do ledger mínimo de exclusões: é removido junto com a conta.
