# Diazen 2.0 — plano de implementação

## Autorização e limites

Solicitação do proprietário de 16/11/2026: redesign incremental do aplicativo existente, somente Sprint 1 nesta entrega. Mobile Dark Premium e desktop Light Premium; bottom navigation e sidebar agora expressamente aprovadas, substituindo a restrição visual do baseline 0.1. Regras funcionais, backend, banco, API, autenticação, autorização e cálculos permanecem preservados. Não iniciar Sprint 2 sem aprovação.

A develop estava defasada em relação à main homologada do PR14. Foi integrada a main preservando integralmente sua árvore de arquivos, antes da branch `feat/diazen-v2-sprint-1`. Sem alteração de configuração remota, migração ou serviços.

## Auditoria

Stack real: Next.js 16.4 / App Router, React 19.3, TypeScript 6, Tailwind 4, CSS existente, Inter local e Lucide. Supabase Auth/PostgreSQL/Storage privado; Vercel; PWA offline apenas leitura. Playwright Chromium/WebKit, axe, PGlite e auditoria agent-browser existentes. Não adicionar biblioteca UI/gráficos.

Rotas: `/painel` dashboard; `/painel/alimentacao`, `/painel/alimentos`, `/painel/plano` e `/painel/planos` alimentação e planos; `/painel/agua`; `/painel/atividades`; `/painel/peso`, `/painel/medidas`; `/painel/fotos`; `/painel/projetos`, `/painel/fases`; `/painel/acompanhamento`, `/painel/sono`; `/painel/perfil`; autenticação pública em `/entrar`, `/cadastro`, `/recuperar-senha`, `/nova-senha`.

O layout raiz contém marca/main/footer públicos e o layout protegido verifica a conta e monta sincronização Garmin. O dashboard já usa `projectContext`, `project_summary`, plano alimentar vigente, preferências, fases/check-in, atividades paginadas e últimas 30 medições. Componentes reaproveitáveis: ProgressRing, WeightChart, CalorieBalance, DayOverview, SleepCard, LogoutButton, ActionForm e diálogos nativos. Preservar queries, handlers e snapshots.

Problemas atuais: navegação de três links sem shell desktop; um único tema/layout em todos os tamanhos; indicadores/alimentação duplicados em blocos extensos; baixa prioridade do projeto e ações rápidas; CSS acumulado com cores literais. Solução: camada v2 explícita e tokens semânticos, componentes de shell e apresentação do dashboard. Módulos não têm seus fluxos/layouts redesenhados nesta sprint.

## Referências e decisões visuais

Imagens originais fornecidas em Downloads foram copiadas para `references/`. Sprint 1 usa **Painel fitness Diazen em modo escuro-1.png** (mobile) e **Dashboard de Progresso Diazen.png** (desktop), abertas e inspecionadas. Demais imagens permanecem como referência das sprints futuras, a inspecionar antes de implementar cada módulo.

Mobile: marca e assinatura, conta, hero do projeto com fotografia escura, visão do dia, alimentação/água em duas colunas, atividades/peso horizontais, ações rápidas e navegação inferior de cinco destinos. Desktop: sidebar amarela, header discreto, projeto/data, quatro métricas, gráfico amplo de peso, painel alimentar e registros recentes. Tablet adapta a navegação sem sobreposição.

Tokens iniciais: fundo #101113, superfícies #1C1D20/#26272B, texto #F6F6F6/#A4A6AC e âmbar #FFC12E. Desktop: #F1F2F4/#FFF, texto #151923/#657084, ciano #08B8E4. Usar tom mais escuro do âmbar/ciano em textos no fundo claro para contraste AA. Espaços 4/8/12/16/20/24/32; raio 12/16/20/24; controles >=44 px; Inter existente; sombras leves. Sem novos gradientes/glow, exceto overlay necessário para leitura sobre a fotografia já existente. Não extrair pessoas/fotos dos mockups para a produção.

Diferenças funcionais obrigatórias: sem busca global/notificações de fachada, avatar fictício, hábitos/aderência fictícios, meta diária de sessões inferida da meta semanal ou comparação semanal sem dados disponíveis. Progresso do projeto significa tempo decorrido, com rótulo explícito. Peso sem cor moral para subida/descida; nenhum índice corporal calculado. Metas e comparações apenas quando configuradas/completas. O seletor consulta projeto, nunca altera ACTIVE. Preferências de ocultar indicadores continuam server-side, inclusive resumo offline. Consultar histórico não muda o destino de escrita.

## Estrutura proposta — Sprint 1

- `panel-shell`: navegação responsiva, marca, conta e conteúdos existentes; sidebar desktop, bottom nav mobile e menu Mais acessível com demais destinos.
- `dashboard/project-selector`: formulário GET de consulta, lista já autorizada, status e vigência; sem ação de ativação.
- `dashboard/quick-actions`: destinos existentes, texto de consulta em histórico fechado.
- Apresentação do dashboard: hero, métricas, gráfico de peso, resumo alimentar, registros de atividades e progresso temporal; componentes existentes de acompanhamento e sono preservados.
- `diazen-v2.css`: tokens e estilos centralizados, importados depois do baseline e limitados ao painel. Módulos recebem somente shell/base sem redesign de seus formulários/listas. Auth público permanece no tema atual até Sprint 9.

## Riscos e mitigação

RLS/ACTIVE: não mover decisões de autorização ao cliente. Ausência vs zero/parcial: manter avisos e não inventar denominadores. Consultas históricas: preservar query params e status legível. Privacidade: não replicar saúde em estado global/cache nem carregar fotos privadas no shell; avatar é ícone. CSS: isolar seletores v2 e verificar contraste dos módulos após tema compartilhado. Navegação fixa: safe-area, espaço inferior e foco/scroll sem conteúdo encoberto. Hidratação React: controles cliente prontos antes de edição e links reais com teclado. Performance: uma fonte e imagem já existentes, sem runtime chart/UI novo. Testes antigos de composição podem precisar acompanhar o novo layout, preservando as assertivas de dados/autorização.

## Sprints e critérios de aceite

| Sprint                | Escopo e aceite específico                                                                                                                                                       | Dependência                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1 (autorizada)        | Shell/mobile/tablet/desktop, projeto/data e dashboard fiel aos dois protótipos; somente dados existentes; navegação, vazios, erro, preferências, histórico e offline preservados | Auditoria/tokens                                   |
| 2 (aguarda aprovação) | Alimentação, seis categorias fixas, alimentos/busca/edição/exclusão; snapshots e porções/nulos preservados, sem exigir fotos                                                     | Base v2 e inspeção dos dois protótipos alimentares |
| 3                     | Hidratação, recipientes, rápido, meta e histórico; soma e vigência temporal preservadas                                                                                          | Base v2 e protótipos de água                       |
| 4                     | Treinos/modalidades, manual, detalhes e manutenção; sem planejador avançado ou gasto inventado                                                                                   | Base v2 e protótipos de treinos                    |
| 5                     | Peso/medidas/gráficos e manutenção, metas opcionais; sem composição corporal inferida                                                                                            | Base v2 e referência evolução                      |
| 6                     | Fotos privadas, posições, galeria, comparação/exclusão; storage e autorização preservados                                                                                        | Base v2 e referência fotos                         |
| 7                     | Projetos por estado/criar/editar/encerrar; um ACTIVE e histórico somente leitura                                                                                                 | Base v2 e referência projetos                      |
| 8                     | Conta, preferências, exportação, exclusão e logout; sem planos pagos/notificações avançadas                                                                                      | Base v2 e referência perfil                        |
| 9                     | Boas-vindas/login/cadastro/recuperação e estados, somente e-mail/senha                                                                                                           | Base v2 e referência auth                          |

Cada sprint exige build, tipos, lint/formatação, testes relevantes de comportamento/autorização, axe/teclado/contraste, ausência de erros inesperados e overflow. Inspecionar screenshots em 320, 390, 768, 1024 e 1440 px (adicionalmente zoom 200% e landscape); dados sintéticos somente em laboratório isolado. Screenshots em `artifacts/diazen-v2/`, sem dados pessoais. Não declarar equivalência pixel a pixel: registrar diferenças necessárias e submeter a revisão visual do proprietário. Entrega: resumo, arquivos/componentes, funcionalidades preservadas, testes/build, screenshots, pendências/riscos e próxima sprint recomendada.

Rastreabilidade: RF003/004/005/018/022; RNF002/003/004/007/008/009/011/012/014/015/016; RB01–04/06–10. Esta extensão visual foi autorizada pelo proprietário (RB11), sem nova modelagem.

## Achado operacional durante a Sprint 1

`npm audit --omit=dev` apontou um aviso moderado preexistente em Next.js 16.4.2 (GHSA-mfr8-8qww-v76h, combinação de `use cache`/`unstable_cache` com root params). Não foram encontrados esses usos no código atual. O CLI apresenta um bloqueio inicial de recomendação; a repetição do mesmo build conclui. Atualização de dependência não foi incluída no redesign e deve ser tratada em manutenção separada. Não é evidência de exploração nem de ausência geral de risco.
