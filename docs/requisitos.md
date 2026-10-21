# Requisitos funcionais e não funcionais — Diazen

> Cópia de consulta gerada de [DOCX original](originais/Diazen_Especificacao_Funcional_Nao_Funcional_MVP_0_1_v1_1.docx). O original é a fonte documental; esta extração preserva texto e tabelas, sem reproduzir a diagramação ou imagens incorporadas.

DIAZEN

Especificação de Requisitos Funcionais e Não Funcionais

Versão do documento: 1.1  |  Produto: Diazen — MVP 0.1  |  Data: 21/10/2026  |  Status: baseline funcional para refinamento técnico

Origem: discovery funcional encerrado na decisão 65, originalmente conduzido sob o nome de trabalho “Projeto 30 Trincado”. O produto passa a se chamar Diazen; “Projeto 30 Trincado” é um projeto pessoal criado dentro do aplicativo. Esta revisão não altera o escopo aprovado nem reproduz literalmente as 938 regras históricas. Divergências devem ser resolvidas por rastreabilidade e controle de mudanças.

Identificação do produto: Diazen é o aplicativo de diário, check-in, controle nutricional e evolução física, desenvolvido pela Lucx Tech. “Projeto 30 Trincado” é apenas o nome de um projeto de acompanhamento cadastrado pelo usuário. A nomenclatura deverá ser mantida em interface, API, documentação, testes e comunicação.

Direção de interface aprovada: Design System “Dark Premium”, com superfícies grafite, cor de destaque âmbar, bordas discretas, sombras suaves, cantos arredondados e dashboard como navegação principal. Os mockups são referências visuais; elementos não previstos no escopo 0.1 (por exemplo, login social, planejamento detalhado de treinos, hábitos extras ou barra inferior fixa) não devem ser implementados apenas por aparecerem no protótipo.

1. Visão, objetivo e fronteiras

Objetivo: permitir a uma pessoa acompanhar um projeto de evolução física por meio de registros manuais de alimentação, água, exercícios, peso, medidas e fotografias, com visualização consolidada no dashboard de uma PWA mobile-first.

Público da primeira entrega: uso pessoal, com autenticação individual e estrutura de dados segregada por usuário para evolução futura. O produto não prescreve dieta, treino ou tratamento.

1.1 Incluído na versão 0.1

Conta e autenticação por e-mail/senha; recuperação de acesso; onboarding guiado mínimo.

Projetos e metas, com no máximo um projeto ativo por usuário; histórico consultável e estados definidos.

Diário alimentar manual com categorias fixas, quantidades, valores nutricionais quando disponíveis e totais diários.

Hidratação com meta configurável, lançamentos individuais e total diário.

Atividades físicas registradas manualmente, com campos por modalidade.

Evolução corporal: peso, circunferências fixas, fotos privadas e comparação simples.

Dashboard do projeto selecionado com cartões e indicadores básicos; seletor de projetos.

Segurança, privacidade, controles de acesso, integridade e testes mínimos para lançamento.

1.2 Fora da versão 0.1 (backlog)

Importação e interpretação de documentos por IA; revisão de extração e versionamento de planos importados.

Integração Strava, sincronização automática, reconciliação de duplicados.

Resumos semanais por IA, análise avançada, notificações push e gamificação.

Relatórios PDF completos e comparações nutricionais contra plano importado; prescrições de treinos e dietas.

Nota: itens futuros já foram descobertos funcionalmente, mas não constituem critérios de aceite do MVP 0.1. A exportação/portabilidade de dados exigida pela legislação aplicável permanece sujeita à avaliação de conformidade, independentemente do adiamento de relatórios PDF.

2. Atores e estados

| Elemento | Definição |
| --- | --- |
| Usuário autenticado | Dono dos projetos e registros; acesso exclusivo aos próprios dados. |
| Projeto DRAFT | Configuração inicial; não recebe registros operacionais. |
| Projeto ACTIVE | Único projeto apto a receber registros operacionais. |
| Projeto COMPLETED | Encerrado manualmente; histórico somente leitura. |
| Projeto ARCHIVED | Arquivado; histórico somente leitura. |
| Projeto visualizado | Projeto selecionado no dashboard, que pode diferir do projeto ativo. |

Invariantes: apenas um ACTIVE por usuário; todo novo registro operacional pertence ao projeto ACTIVE; datas retroativas devem estar no período válido do projeto ACTIVE; consultar projetos antigos não os reativa. Alterações em COMPLETED/ARCHIVED são bloqueadas, exceto procedimentos legais de privacidade/exclusão.

3. Requisitos funcionais (RF)

| ID | Módulo | Descrição | Prioridade | Critério de aceite resumido |
| --- | --- | --- | --- | --- |
| RF-001 | Autenticação | Cadastrar conta com e-mail e senha, autenticar, encerrar sessão e recuperar acesso. | Alta | Fluxos válidos e inválidos; sessão protegida; mensagens sem vazamento de existência de conta. |
| RF-002 | Onboarding | Solicitar dados mínimos e criação/configuração de projeto com pelo menos uma meta mensurável; campos opcionais não bloqueiam o início. | Alta | Usuário conclui onboarding e acessa dashboard de projeto ativo. |
| RF-003 | Projetos | Criar, editar configurações permitidas, ativar e encerrar manualmente projetos; um ACTIVE por usuário. | Alta | Tentativa de segundo ACTIVE falha; encerramento exige confirmação. |
| RF-004 | Histórico de projetos | Listar projetos por estado, selecionar para consulta e mostrar modo somente leitura nos encerrados. | Alta | Selecionar histórico não altera ACTIVE; ações de escrita são rejeitadas. |
| RF-005 | Metas | Configurar metas básicas por projeto (ex.: peso como alvo/faixa/acompanhamento, água, sessões semanais). | Alta | Metas são exibidas com unidade, período e ausência de valor quando não configuradas. |
| RF-006 | Alimentação: diário | Cadastrar refeições em categorias fixas: café, lanche manhã, almoço, lanche tarde, jantar e ceia; incluir alimentos e quantidades. | Alta | Registros associados ao projeto ACTIVE e à data informada; editar/excluir enquanto ativo. |
| RF-007 | Alimentação: composição | Calcular calorias, proteínas, carboidratos e gorduras com base em fonte nutricional identificável ou dados informados; não inventar valores ausentes. | Alta | Totais coerentes com porção/unidade; campo desconhecido não é tratado como zero. |
| RF-008 | Alimentação: calendário | Exibir dias sem registro, parciais e marcados como concluídos; permitir conclusão manual e desfazer. | Média | Alteração após conclusão retorna dia ao estado não confirmado; concluído não significa aderência. |
| RF-009 | Alimentação: conveniências | Permitir alimentos próprios, receitas, recentes, favoritos e copiar refeição quando viável no núcleo. | Média | Cópias exigem confirmação e não sobrescrevem registros existentes. |
| RF-010 | Hidratação | Configurar meta diária e registrar volume por recipiente, com data e horário opcional. | Alta | Total diário é soma dos lançamentos, não campo editável isolado. |
| RF-011 | Hidratação: manutenção | Editar/excluir lançamentos individuais e registrar alterações de meta com vigência temporal. | Alta | Histórico preserva meta vigente no dia; não há reinterpretação retroativa. |
| RF-012 | Atividades | Registrar musculação (data, duração, descrição opcional) e corrida/bike/natação (data, duração, distância e campos opcionais). | Alta | Registro sem campos avançados é aceito; histórico por data e modalidade. |
| RF-013 | Treinos semanais | Exibir total de sessões da semana versus meta geral; sem metas separadas por modalidade. | Média | Contagem semanal não duplica sessões; dias sem registro não significam treino zero confirmado. |
| RF-014 | Peso | Registrar um peso por usuário/data; atualização substitui registro existente, com trilha interna. | Alta | Unicidade por usuário/data; último peso e gráfico simples corretos. |
| RF-015 | Circunferências | Registrar subconjunto das medidas fixas (cintura, abdômen, quadril, peito, braços, coxas, panturrilhas) por data. | Alta | No máximo um valor por tipo/usuário/data; registro parcial aceito. |
| RF-016 | Fotografias | Enviar fotos nas categorias frente, costas, lateral e outras; otimizar e armazenar em acesso privado. | Alta | Orientação preservada, EXIF sensível removido; arquivo original não retido permanentemente. |
| RF-017 | Galeria e comparação | Listar fotos cronologicamente e comparar lado a lado, preferencialmente na mesma categoria; excluir individualmente em ACTIVE. | Alta | Projeto encerrado não permite exclusão individual; paginação em galerias extensas. |
| RF-018 | Dashboard | Mostrar cartões de navegação e indicadores básicos do projeto selecionado; sem barra inferior fixa obrigatória. | Alta | Dados pertencem ao projeto selecionado; ações globais de registro destinam-se ao ACTIVE. |
| RF-019 | Registros retroativos | Permitir registros com data anterior dentro da vigência do projeto ACTIVE, sujeitos às regras de unicidade. | Alta | Nunca associar automaticamente a projeto encerrado. |
| RF-020 | Privacidade da conta | Permitir solicitar exclusão imediata da conta, com confirmação e processamento seguro; considerar obrigações legais de retenção. | Alta | Dados deixam de ser acessíveis; tratamento de backups/retensão documentado. |
| RF-021 | Auditoria interna | Registrar alterações/exclusões relevantes sem oferecer interface de histórico detalhado ao usuário na versão 0.1. | Média | Eventos incluem usuário, ação, entidade, data e identificador. |
| RF-022 | PWA | Instalável quando suportado; leitura offline limitada a dados previamente armazenados em cache, sem edição offline. | Alta | Sem conexão, escrita bloqueada e status claramente informado. |

Priorização: Alta = bloqueia a primeira versão utilizável; Média = implementar após núcleo crítico, desde que não comprometa o lançamento. A inclusão definitiva dos itens de prioridade Média será fechada na revisão de backlog, sem expandir o escopo-base.

4. Regras de negócio consolidadas

RB-01: só um projeto ACTIVE por usuário; DRAFT não recebe registros operacionais.

RB-02: COMPLETED e ARCHIVED são somente leitura; encerramento manual e confirmado.

RB-03: gravações resolvem o ACTIVE no servidor; projeto exibido na UI não define destino.

RB-04: dados ausentes são distintos de valores iguais a zero; indicadores não inferem aderência.

RB-05: diário alimentar permite registros retroativos sem prazo fixo, apenas dentro do projeto ativo.

RB-06: peso é único por usuário/data; medida é única por tipo/usuário/data.

RB-07: hidratação diária é soma dos lançamentos; metas com data de vigência.

RB-08: treinos são histórico, sem prescrição; meta semanal é global.

RB-09: fotos privadas e otimizadas; sem limite fixo por projeto, mas com proteção de armazenamento e tamanho por arquivo.

RB-10: todo acesso a registros valida propriedade do usuário e estado do projeto.

RB-11: mudanças após congelamento do MVP exigem justificativa, impacto e aprovação explícita.

5. Requisitos não funcionais (RNF)

| ID | Categoria | Exigência | Verificação |
| --- | --- | --- | --- |
| RNF-001 | Segurança | HTTPS obrigatório; senhas armazenadas por algoritmo de hash adaptativo; proteção contra força bruta e enumeração. | Teste de configuração e cenários de autenticação. |
| RNF-002 | Autorização | Autorização server-side em toda leitura e escrita; isolamento por usuário/projeto, incluindo URLs e storage. | Testes automatizados de acesso cruzado retornam negação. |
| RNF-003 | Privacidade | Dados de saúde e fotos tratados como sensíveis; minimização, finalidade explícita, consentimentos/bases legais avaliados e política de privacidade. | Revisão LGPD e inventário de dados antes do lançamento. |
| RNF-004 | Integridade | Transações e constraints para unicidade de ACTIVE, peso e medidas; gravação idempotente quando aplicável. | Testes concorrentes e de duplicidade. |
| RNF-005 | Disponibilidade | Objetivo inicial de disponibilidade a definir após escolha de hospedagem; falhas comunicadas e recuperáveis. | Monitoramento de saúde e testes de indisponibilidade. |
| RNF-006 | Desempenho | Meta inicial proposta: navegação principal responsiva e operações usuais em até ~2 s em rede comum, exceto upload. | Medição em dispositivo móvel intermediário; meta revisável. |
| RNF-007 | Responsividade | Interface mobile-first, funcional em larguras pequenas e desktop; alvos de toque acessíveis. | Teste manual em tamanhos de tela representativos. |
| RNF-008 | Acessibilidade | Rótulos, contraste adequado, navegação por teclado, mensagens acessíveis e sem dependência exclusiva de cor. | Checklist WCAG 2.2 AA como alvo recomendado. |
| RNF-009 | PWA/offline | Manifesto, ícones, service worker; cache apenas para leitura; escrita offline indisponível. | Teste de instalação e comportamento offline. |
| RNF-010 | Armazenamento de imagens | Compressão/redimensionamento, remoção de metadados sensíveis, armazenamento privado e URLs temporárias/autorizadas. | Teste de acesso anônimo negado e metadados removidos. |
| RNF-011 | Escalabilidade | Monólito modular; paginação em listagens e galeria; capacidade inicial para uso pessoal, sem otimização prematura. | Teste com volume sintético representativo. |
| RNF-012 | Observabilidade | Logs estruturados, erros monitorados, sem senhas, tokens, imagens ou dados clínicos desnecessários. | Inspeção dos logs e rastreio de falhas. |
| RNF-013 | Backup e recuperação | Política de backup e restauração definida antes de produção; proteção de backups e retenção compatível com exclusão de conta. | Ensaio de restauração em ambiente controlado. |
| RNF-014 | Manutenibilidade | Separação por módulos, migrações versionadas, testes automatizados e configuração por ambiente. | CI executa lint, testes e build. |
| RNF-015 | Compatibilidade | Suporte aos navegadores móveis atuais e desktop definidos em matriz de teste. | Testes em Chrome Android e Safari iOS, quando disponíveis. |
| RNF-016 | Qualidade de dados | Validação de unidades, faixas plausíveis, datas, formatos e fontes nutricionais; ausente ≠ zero. | Testes de limites e entradas inválidas. |
| RNF-017 | Conformidade | Termos, privacidade, direitos do titular e política de retenção revisados antes de uso real. | Checklist jurídico e operacional documentado. |

6. Fluxos de usuário essenciais

| Fluxo | Nome | Passos |
| --- | --- | --- |
| F-01 | Primeiro acesso | Criar conta → autenticar → onboarding → configurar projeto → ativar → dashboard. |
| F-02 | Refeição | Dashboard → alimentação → selecionar data/categoria → adicionar alimentos/porções → validar → salvar → atualizar totais. |
| F-03 | Água | Dashboard → hidratação → escolher recipiente/volume → registrar → atualizar total do dia. |
| F-04 | Atividade | Dashboard → atividades → selecionar modalidade → informar campos básicos → salvar → atualizar histórico semanal. |
| F-05 | Evolução | Dashboard → evolução → registrar peso/medidas ou enviar foto → visualizar histórico/comparação. |
| F-06 | Projeto antigo | Dashboard → seletor → projeto concluído → consultar histórico sem opções de alteração. |
| F-07 | Encerramento | Projeto ativo → solicitar conclusão → aviso de somente leitura → confirmar → histórico preservado. |

7. Modelo conceitual de dados (inicial)

| Entidade | Campos conceituais |
| --- | --- |
| User | id, email, password_hash, created_at, deleted_at |
| Project | id, user_id, name, starts_on, ends_on, status, closed_at |
| ProjectGoal | id, project_id, goal_type, target_value/range, unit, effective_from |
| Food | id, owner_user_id (nullable catálogo), name, nutritional_source, nutrients_per_reference |
| Recipe | id, user_id, name; RecipeIngredient vincula Food e quantidade |
| MealEntry | id, project_id, user_id, logged_on, category, completed_day? (estado diário separado) |
| MealItem | id, meal_entry_id, food_id, amount, unit, nutrient_snapshot |
| WaterGoalVersion | id, project_id, effective_from, target_ml |
| WaterEntry | id, project_id, logged_at, volume_ml, container_label |
| Activity | id, project_id, modality, occurred_on, duration_min, distance_km?, notes?, perceived_effort? |
| WeightEntry | id, project_id, user_id, measured_on, kg |
| BodyMeasurement | id, project_id, user_id, measured_on, measurement_type, value_cm |
| BodyPhoto | id, project_id, taken_on, category, storage_key, thumbnail_key, metadata |
| AuditEvent | id, user_id, project_id?, action, entity_type, entity_id, timestamp |

Atenção à modelagem: uma única medição de peso por usuário/data pode atravessar projetos; o banco deve impor essa regra global sem perder a associação histórica ao projeto. O status diário do diário alimentar deve ser modelado separadamente das refeições. Os campos listados são conceituais, não um esquema SQL definitivo.

8. Critérios de aceite de lançamento (Definition of Done)

Fluxos F-01 a F-07 demonstrados com dados persistidos em ambiente de homologação.

Sem acesso indevido a registros de outros usuários ou projetos, comprovado por testes.

Validações de projeto ativo/encerrado aplicadas no backend.

Registros editáveis e exclusões consistentes; dados ausentes não exibidos como zero.

PWA responsiva, instalável quando suportado e com comportamento offline de leitura claro.

Fotografias privadas, otimizadas, com tratamento de erros e carregamento progressivo.

Backups, restauração, monitoramento e processo de exclusão de conta revisados.

Nenhuma dependência de IA ou Strava para concluir os fluxos essenciais.

9. Dependências e decisões técnicas pendentes

Stack de frontend, backend e banco; escolha entre serviço gerenciado e infraestrutura própria.

Fonte de composição nutricional e licença/normalização de dados (TACO/TBCA ou alternativa viável); cobertura de alimentos e unidade padrão.

Estratégia de autenticação, e-mail transacional, sessões e recuperação de senha.

Serviço de armazenamento privado, política de compressão, tamanho máximo por upload e retenção.

Modelo definitivo de metas e histórico de versões, incluindo casos de mudança de datas do projeto.

Revisão de viabilidade da galeria comparativa e das conveniências do diário na primeira entrega.

Parâmetros mensuráveis de performance, backup, custos e navegadores suportados.

Checklist de privacidade, direitos do titular e descarte de dados.

10. Backlog sugerido e ordem de implementação

| Sprint/Incremento | Entrega | Dependências |
| --- | --- | --- |
| Fundação | Repositório, CI, banco, autenticação, autorização, PWA base | Definições técnicas |
| Projetos | Onboarding, projetos, metas, estados, seletor | Fundação |
| Registros leves | Hidratação, peso, circunferências | Projetos |
| Treinos | Atividades manuais e histórico semanal | Projetos |
| Alimentação | Catálogo/dados nutricionais, refeições, totais e calendário | Projetos e fonte nutricional |
| Fotos | Upload privado, otimização, galeria e comparação | Storage e autorização |
| Dashboard | Indicadores, cartões e navegação contextual | Módulos de registros |
| Release | Testes integrados, segurança, backup, documentação e deploy | Todos os anteriores |

11. Controle de mudanças e rastreabilidade

Baseline: decisões 01–65. Novas solicitações devem receber ID, descrição, motivo, impacto em escopo/custo/risco, decisão (aprovar/adiar/rejeitar) e versão de destino. Não reabrir discovery funcional sem necessidade comprovada.

Referências centrais: decisões 21 (PWA), 27 (uso pessoal), 28–29 (estados), 35–38 (registros), 45–46 (diário), 54–58 (evolução/fotos), 59–61 (projetos e destino dos registros), 63 (navegação), 64 (núcleo funcional) e 65 (controle de escopo).

Pontos a reconciliar no refinamento: regras históricas originalmente desenhadas para importação por IA, Strava, relatórios e notificações devem ser marcadas como futuras; eventuais regras antigas de edição em projetos encerrados ficam substituídas pela decisão 60.
