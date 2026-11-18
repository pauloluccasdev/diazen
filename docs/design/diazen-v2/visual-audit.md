# Diazen 2.0 — auditoria visual e técnica

Data: 17/11/2026. Fase 0, somente discovery. Base inspecionada: `develop` em `b7d718c24f6d8e7396f9bb0e092f98dcc1c6ad48`. A nova solicitação substitui o objetivo de aproximação da Sprint 1 por reprodução de alta fidelidade. Nenhum código de produção foi alterado nesta auditoria. A opção dark no desktop, solicitada durante o discovery, integra a proposta.

## 1. Diagnóstico

O núcleo funcional tem implementação substancial: persistência, RLS, autorização, registros, planos privados, histórico, exclusão e testes. Não é necessário reconstruir esse núcleo. A camada de apresentação ainda não reproduz as referências: a Sprint 1 estabeleceu temas, navegação e dashboard, mas alterou proporções, ordem, densidade e componentes importantes. Os demais módulos continuam predominantemente no layout anterior, recebendo tokens e shell novos.

O resultado atual **não está homologado como reprodução de alta fidelidade**. Suíte funcional aprovada não equivale a aprovação visual. O trabalho seguinte deve substituir composições por módulo, com comparação de telas reais, em vez de acumular novos overrides globais.

## 2. Arquitetura encontrada

| Camada       | Evidência no repositório                                                                         | Consequência para a evolução                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Aplicação    | Next.js 16.4.2, React 19.3.1, TypeScript 6, App Router; `package.json`                           | Preservar stack e rotas; sem framework novo                                                    |
| Apresentação | Tailwind 4, CSS majoritariamente explícito, Inter local, Lucide; `globals.css` + `diazen-v2.css` | Centralizar tokens e migrar estilos por componente, sem terceira camada de overrides           |
| Composição   | `app/painel/layout.tsx`, `components/panel-shell.tsx`; dashboard server component                | Shell responsivo reutilizável, dados continuam no servidor                                     |
| Registros    | `app/painel/[modulo]/page.tsx` e `actions.ts` atendem cinco módulos                              | Separar visualizações especializadas mantendo comandos e validações existentes                 |
| Dados        | `lib/data.ts`, `records.ts`, `dashboard-plan.ts`, `daily-data.ts`, `phase-plan-data.ts`          | Reutilizar leituras autorizadas; ampliar consultas somente mediante proposta quando necessário |
| Autenticação | Supabase SSR, `proxy.ts`, `requireAccount()`, callbacks PKCE                                     | Não confiar em cookie ou estado de UI como autorização; manter checagem remota                 |
| Banco        | PostgreSQL/Supabase, 18 migrações versionadas                                                    | RLS, constraints, triggers e RPCs já impõem invariantes; não recriar schema                    |
| Arquivos     | Storage privado, rotas autorizadas de fotos/referências, otimização em `lib/images.ts`           | Nenhuma foto pessoal em asset público, snapshot ou fixture de produção                         |
| Integrações  | Garmin atividades/sono, TACO local, consulta online Open Food Facts, leitura PDF                 | Preservar fluxos; não adicionar provedores para reproduzir aparência                           |
| Offline      | `public/sw.js`, `lib/offline.ts`, `OfflineSnapshot`                                              | Leitura limitada; nenhuma nova fila de escrita offline                                         |
| Qualidade    | Playwright Chromium/WebKit, axe, PGlite, agent-browser, CI                                       | Acrescentar comparação visual determinística; preservar testes de regras e isolamento          |

Pastas: `src/app` contém páginas, layouts, Route Handlers e Server Actions; `src/components` apresentação/formulários; `src/lib` regras e acesso; `src/data` catálogo; `supabase/migrations` DDL/RLS/RPCs; `tests` laboratório sintético; `public` assets e PWA; `docs` decisões e rastreabilidade. Não há biblioteca pronta de dashboards ou gráficos a substituir.

### Rotas e contratos existentes

- Dashboard: `/painel?projeto=&data=`. Projetos: `/painel/projetos?estado=&pagina=`.
- Registros: `/painel/alimentacao`, `/agua`, `/atividades`, `/peso`, `/medidas`, todos sob `/painel`; consulta por projeto/data/página conforme módulo.
- Conveniências: `/painel/alimentos`; plano alimentar `/painel/plano`; planos de fase `/painel/planos`, `/painel/planos/novo`; fases `/painel/fases`; acompanhamento `/painel/acompanhamento`; sono `/painel/sono`.
- Fotos: `/painel/fotos?categoria=&pagina=&a=&b=&projeto=`; histórico `/painel/historico`; conta `/painel/perfil`.
- Públicas: `/`, `/entrar`, `/cadastro`, `/recuperar-senha`, `/nova-senha`, `/privacidade`, `/termos` e callbacks `/auth/confirmar`, `/auth/recuperar`.
- APIs: `/api/alimentos/online`, `/api/exportar`, `/api/fotos[/id]`, `/api/plano/ler`, `/api/planos/referencias[/id]`, `/api/garmin/{activities,import,settings,sleep,sync}`, `/api/saude`.
- Gravações normalmente são Server Actions, não uma API REST genérica. Preservar contratos de formulário e respostas de erro/sucesso durante a troca da apresentação.

### Modelagem existente relevante

`projects`, `water_goals`, `water_entries`, `weights`, `measurements`, `activities`, `meal_items`, `meal_days`, `photos`; biblioteca/receitas em `food_library`; versões em `diet_plans`; idempotência/vínculos em `food_copy_requests` e colunas de plano no diário; configurações/importações Garmin e `sleep_records`; `display_preferences`, `project_phases`, `daily_checkins`, `eating_context_events`; `phase_plans`, `plan_assets`, `workout_links`; auditoria e filas/ledger de exclusão.

Não foram encontradas entidades de recipientes personalizados, perfil pessoal editável/avatar, notificações, hábitos ou séries efetivamente executadas. Fichas de musculação **já existem**, com exercícios, séries e faixas de repetições planejadas; execução cria/vincula uma atividade. Isso não fornece cargas nem séries realizadas para calcular tonelagem.

Esta é auditoria do código e migrações versionadas, sem consulta a dados pessoais ou certificação de igualdade do schema remoto. Não foram executadas migrações nem operações no Supabase real.

## 3. Catálogo dos 13 protótipos abertos

Todos foram abertos visualmente, incluindo as regiões mobile/desktop dos compostos. Os nomes locais não têm `(1)`; não existe evidência de uma segunda revisão diferente. O mapeamento nominal está em [references/README.md](references/README.md). Preservados os originais, sem renomear ou duplicar PNGs.

As coordenadas abaixo são delimitações aproximadas na imagem original, para orientar o recorte de análise; **não são dimensões CSS**. Excluir molduras, status bar/home indicator do sistema, perspectiva, pranchas e formas externas. Nos compostos, considerar o interior dos dispositivos, não a borda branca de apresentação.

| ID  | Arquivo local                                                                | Região útil e composição observada                                                                                                                                                                      | Diferença atual / tratamento                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R01 | [Dashboard desktop](<references/Dashboard de Progresso Diazen.png>)          | Prancha 1672×941, UI completa. Sidebar ~227 px; busca/perfil no topo; saudação e projeto/data; quatro métricas ~121 px; segunda faixa peso/macros; terceira faixa com três painéis                      | Atual: sidebar 206 px, tagline em vez de busca, falta saudação pessoal, cards mais altos, ações rápidas inseridas entre métricas e gráfico, só dois painéis inferiores. Reproduzir grid e alturas da referência    |
| R02 | [Dashboard mobile](<references/Painel fitness Diazen em modo escuro-1.png>)  | Interior aproximado x92–850/y40–1628; conteúdo x116–826. Logo, hero com recorte atlético, data em linha, alimentação mais larga que água, duas faixas horizontais treino/peso, quatro ações, bottom nav | Atual: seletor extra toma uma faixa inteira; métricas de igual largura; hero com outra fotografia; anel/calorias/legendas e ilustrações divergentes. Integrar seleção no hero, manter consulta histórica acessível |
| R03 | [Alimentação desktop](<references/Painel de Alimentação Diazen.png>)         | UI completa 1536×1024. Header projeto/conta; título/data; resumo anel/macros e meta; tabela de seis refeições com imagem, hora, itens, porções, kcal e ações                                            | Atual: disclosures e blocos verticais, apenas categorias com itens na página. Exibir sempre seis linhas e obter totais completos, sem somar apenas a página                                                        |
| R04 | [Alimentação mobile](<references/Diário alimentar em modo escuro-1.png>)     | Interior de smartphone como R02. Header de módulo sem repetir marca; faixa de data; painel anel/macros; seis linhas compactas com ícones; CTA amplo                                                     | Atual: header global + retorno + introdução/formulários antes do resumo. Reorganizar; nenhuma foto exigida para registro                                                                                           |
| R05 | [Hidratação desktop](<references/Painel Diazen de Hidratação Diária.png>)    | UI completa 1672×941. Topo projeto/data; três cards meta/resumo/registro; abaixo gráfico semanal, lista com horários e atalhos/recipientes                                                              | Atual: um resumo circular e listagem/formulários; sem gráfico semanal nem biblioteca de recipientes. Preservar metas com vigência                                                                                  |
| R06 | [Hidratação mobile](<references/App de Hidratação em Modo Escuro.png>)       | Header/data; painel anel à esquerda, meta/restante/garrafa à direita; linhas volume/hora/menu; quatro volumes; CTA                                                                                      | Atual: anel e texto simples, seletor de muitos volumes dentro do formulário. Reproduzir hierarquia e presets 250/500/750/1000 ml                                                                                   |
| R07 | [Treinos desktop](<references/Painel de Treinos Diazen 2.0.png>)             | UI completa 1672×941. Quatro KPIs; frequência, distribuição e meta em três painéis; cinco atalhos de modalidade; tabela recente; resumo lateral                                                         | Atual: calendário semanal e registros do dia; não há essa composição nem agregação semanal completa de duração/modalidades. Calorias só informadas/importadas                                                      |
| R08 | [Treinos mobile](<references/Tela de Treinos Diazen 2.0.png>)                | Header/data; painel anel/resumo com halter; cinco modalidades; três recentes e CTA                                                                                                                      | Atual: visão de semana extensa, sem painel equivalente; tonelagem não disponível. Não converter ficha planejada em volume executado                                                                                |
| R09 | [Evolução corporal](<references/Interfaces de Evolução Corporal Diazen.png>) | Mobile x34–424/y39–978; desktop x467–1503/y100–907. Tabs Peso/Medidas/Fotos, métricas, curva, histórico; desktop com composição e IMC                                                                   | Tabs e CRUD existem, mas layouts, meta, comparações e filtros divergem. Composição/IMC não têm dados/método suficientes; propor estados informativos no mesmo espaço                                               |
| R10 | [Fotos](<references/Mockup Diazen_ Evolução Fitness.png>)                    | Mobile e desktop nas mesmas regiões gerais de R09. Galeria/Comparar/Linha do tempo; poses, datas, comparação e mudanças                                                                                 | Comparação e filtros existem em formulários separados. Faltam navegação por tabs/timeline/contagens; mudança de peso/cintura pode ser lida de registros, gordura não                                               |
| R11 | [Projetos](<references/Painel de Projetos Diazen em Dois Modos.png>)         | Mobile à esquerda, desktop à direita. Tabs de estado, projeto principal com imagem, métricas e menu; demais cards; criar                                                                                | Atual: cards extensos com todos os formulários abertos na hierarquia. Separar resumo e gerenciamento. Corrigir múltiplos estados “em andamento” do desenho para um único ACTIVE                                    |
| R12 | [Perfil](<references/Diazen_ Perfil e Configurações.png>)                    | Mobile à esquerda: identidade e lista; desktop à direita: subnav de perfil, formulário pessoal, metas e preferências                                                                                    | Atual: e-mail/ícone, links, preferências de ocultar dados, exportação/exclusão. Nome, foto, telefone/nascimento e edição pessoal não implementados; proposta de modelo antes de construir                          |
| R13 | [Autenticação](<references/Fluxo de Autenticação Diazen em UI.png>)          | Prancha 1536×1024; quatro mobile no topo (x~329–1490/y40–530); quatro painéis desktop abaixo (x~148–1504/y591–977)                                                                                      | Não é uma página com oito formulários lado a lado. Reproduzir cada estado/rota individualmente. Atual é dark também no desktop, sem composição lateral. Sem Google/Apple; senha real 12–128, não 8 como desenho    |

### Inconsistências que não podem virar regras

- R01 não define a unidade do comparativo semanal nem como medir “4/7 hábitos ativos”. Proposta: kcal registradas, com totais parciais identificados, e retirar o escore de hábitos sem modelo aprovado.
- R03 mostra total de 1.850 kcal, mas as cinco refeições exibidas somam 1.610 kcal. Fixtures de revisão devem ser internamente coerentes, preservando a aparência sem repetir erro aritmético.
- R07 apresenta cinco treinos no KPI, mas as barras somam seis; a distribuição por modalidade não corresponde às contagens do resumo. Calcular de um mesmo conjunto completo de registros.
- R11 mostra outro projeto “Em andamento” e percentuais que não correspondem às datas/tempo decorrido. Preservar um ACTIVE; rotular rascunhos “Planejado”; progresso temporal explicitamente identificado.
- R06/R08 destacam Diário na bottom nav, enquanto o shell atual usa Mais para água/treino. Proposta: Diário representa alimentação, hidratação e atividades; Mais representa conta e destinos complementares. Destinos devem permanecer inequívocos no menu do diário.
- Redução de peso em verde não deve significar automaticamente melhora: respeitar objetivo ou usar cor neutra. R09/R10 não autorizam inferir gordura corporal de fotografias. R13 não autoriza reduzir a política de senha.

## 4. Evidências da implementação atual

Executado `CAPTURE_REVIEW=1 npx playwright test tests/accessibility.spec.ts --project=chromium --workers=1`: aprovado, 19,7 s, em laboratório sintético local, sem serviços reais. Capturas em 390/1280 px e checks de overflow em 320/375/390/430/768/1280. Foram inspecionadas capturas de alimentação, água, treinos, peso, fotos, projetos, perfil e login. Elas documentam a estrutura e estados vazios, **não** uma comparação equivalente com os exemplos populados das referências.

| Módulo atual                                    | Mobile                                                    | Desktop                                                     |
| ----------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Dashboard populado, captura da entrega anterior | [390](screenshots/viewport-390.png)                       | [1440](screenshots/viewport-1440.png)                       |
| Alimentação                                     | [390](screenshots/discovery-baseline/alimentacao-390.png) | [1280](screenshots/discovery-baseline/alimentacao-1280.png) |
| Hidratação                                      | [390](screenshots/discovery-baseline/agua-390.png)        | [1280](screenshots/discovery-baseline/agua-1280.png)        |
| Treinos                                         | [390](screenshots/discovery-baseline/atividades-390.png)  | [1280](screenshots/discovery-baseline/atividades-1280.png)  |
| Peso                                            | [390](screenshots/discovery-baseline/peso-390.png)        | [1280](screenshots/discovery-baseline/peso-1280.png)        |
| Fotos                                           | [390](screenshots/discovery-baseline/fotos-390.png)       | [1280](screenshots/discovery-baseline/fotos-1280.png)       |
| Projetos                                        | [390](screenshots/discovery-baseline/projetos-390.png)    | [1280](screenshots/discovery-baseline/projetos-1280.png)    |
| Perfil                                          | [390](screenshots/discovery-baseline/perfil-390.png)      | [1280](screenshots/discovery-baseline/perfil-1280.png)      |
| Login                                           | [390](screenshots/discovery-baseline/entrar-390.png)      | [1280](screenshots/discovery-baseline/entrar-1280.png)      |

Uma captura full-page inclui a bottom nav fixa na altura do viewport; isso não prova sobreposição durante a rolagem. Validar também viewport/scroll/foco ao homologar cada fase.

## 5. Achados técnicos e visuais priorizados

| ID  | Achado                                                                                                        | Impacto e tratamento proposto                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| V01 | Grid desktop do dashboard é 2+2 painéis e inclui faixa de ações diferente da referência 2+3                   | Alta prioridade da Fase 1: reestruturar regiões e proporções, não apenas CSS de cor                                                                 |
| V02 | Sidebar/header/ícones/tamanho de texto não seguem as mesmas proporções                                        | Definir medidas normalizadas e componentes, validar em viewport equivalente                                                                         |
| V03 | Card ACTIVE em Projetos mantém imagem escura sob texto escuro no desktop                                      | Falha visual concreta na captura de 1280 px; axe não certifica contraste sobre foto. Corrigir na fase aprovada, com teste visual e contraste manual |
| V04 | `globals.css` tem mais de 4 mil linhas; v2 mais de 1,3 mil, com herança cruzada                               | Migrar estilos de cada módulo ao refatorar; não apagar baseline em bloco nem empilhar terceira folha                                                |
| V05 | Rotas genéricas acumulam dados, formulário e apresentação                                                     | Extrair views por módulo; comandos e autorização permanecem compartilhados                                                                          |
| V06 | Peso usa últimas 30 medições com x igualmente espaçado, não últimos 30 dias                                   | Novo filtro deve consultar intervalo real e desenhar eixo temporal verdadeiro, sem inventar pontos                                                  |
| V07 | Refeições só mostram grupos presentes na página de 20 itens                                                   | Resumo por seis categorias precisa de leitura completa; não atribuir total da página ao dia                                                         |
| V08 | Resumo de atividades do dashboard consulta apenas o dia e ordena por ID                                       | Não chamar de “últimas atividades” de toda a conta; nova faixa exige datas e ordenação explicitamente definidas                                     |
| V09 | Tema desktop não possui alternância                                                                           | Propor Light/Dark com persistência local por navegador, aplicado no SSR; mobile permanece dark                                                      |
| V10 | Não existem recortes esportivos independentes, garrafas e thumbnails de refeições equivalentes aos protótipos | Preparar assets licenciados/aprovados antes da respectiva entrega; não recortar foto pessoal do mockup para produção                                |
| V11 | Testes funcionais/axe não verificam fidelidade do grid                                                        | Criar baseline visual específico, overlays e revisão humana; nenhuma porcentagem de semelhança foi medida nesta auditoria                           |
| V12 | `npm audit --omit=dev` nesta fase: um aviso moderado em Next                                                  | Manutenção separada proposta, sem atualizar dependências nesta auditoria; ver relatório anterior e JSON local de auditoria                          |

CI da base `develop`: [44010735461](https://github.com/pauloluccasdev/diazen/actions/runs/44010735461), sucesso. Isso é evidência histórica do commit-base: 48 aprovados/1 opcional ignorado em cada navegador, build/tipos/lint/banco e agent-browser. Nesta Fase 0 foi repetido apenas o cenário de captura/acessibilidade; não se declara nova homologação completa, Safari físico ou pixel-perfect.

## 6. Conclusão do discovery

A fidelidade depende de três frentes: composição e componentes, leituras/agregações reais e assets adequados. A primeira entrega proposta é exclusivamente Dashboard desktop, incluindo tema claro/escuro. Novos modelos e semânticas ambíguas estão explicitados na [matriz funcional](functional-gap-analysis.md), com aprovação antes de execução de backend/banco. Nenhum módulo visual está aprovado automaticamente por estes documentos.
