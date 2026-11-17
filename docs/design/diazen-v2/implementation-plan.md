# Diazen 2.0 — plano de reconstrução visual e funcional

17/11/2026 · Fase 0 · **aguarda aprovação**. Base: `develop@b7d718c`. Este plano substitui a sequência anterior de sprints para trabalhos futuros. A entrega anterior permanece registrada em [sprint-1-report.md](sprint-1-report.md) e no histórico Git; não constitui homologação de alta fidelidade.

## 1. Escopo desta entrega e precedência

Autorizado agora: investigação e documentação. Não modificar produção, dependências, autenticação, API, schema ou serviços; não iniciar Dashboard desktop. Autorização genérica para refatoração futura não dispensa a aprovação entre fases, nem a apresentação prévia de propostas de backend/banco. Não fazer merge na main.

As 13 referências foram abertas, inclusive as regiões mobile/desktop dos compostos. Estão acessíveis em `references/`, sem o sufixo `(1)` da lista do pedido; o [manifesto](references/README.md) registra a correspondência. Não há arquivo inacessível conhecido. Caso apareça outra revisão das imagens, comparar hashes/arquivos antes de trocar a referência.

Documentos desta fase:

1. [Auditoria visual e técnica](visual-audit.md): stack, arquitetura, rotas, modelo existente, 13 composições e divergências verificadas.
2. [Inventário/matriz funcional](functional-gap-analysis.md): cada elemento, comportamento, evidência, dependência, backend/banco, status e complexidade; fórmulas e propostas de extensão.
3. [Design System](design-system.md): tokens semânticos, três contextos de tema, geometria, componentes, estados, assets e comparação.
4. Este plano: backlog, sequência, dependências, riscos e gates de aprovação.

Precedência: segurança/integridade e regras de negócio preservadas; referência visual governa composição; este discovery explicita incompatibilidades e propostas. As cópias baseline derivadas dos DOCX não são reescritas. Registrar nova decisão posterior em `docs/decisoes-tecnicas.md`.

## 2. Estratégia de arquitetura

Manter monólito Next/Supabase, App Router e TypeScript. Reusar Supabase SSR, `requireAccount`, `projectContext`, RLS, triggers/RPCs, ações de registros e catálogo. Não criar um segundo backend, gerenciador global de saúde, biblioteca de dashboard ou esquema paralelo.

Estrutura proposta, somente após aprovação:

- `src/styles/diazen-v2/tokens.css`: cores/temas/espaço/tipo/bordas/movimento, com ponte temporária para o baseline. Breakpoints definidos uma vez nessa camada e documentados no DS.
- `src/components/ui/`: Field, Button, Dialog/Sheet, Menu, SegmentedNavigation, Empty/Loading/Error e gráficos pequenos, aproveitando componentes existentes adequados.
- `src/components/shell/`: DesktopSidebar/Header, MobileNavigation/ModuleHeader, CommandSearch, DesktopThemeControl e ProjectSwitcher. Evoluir o PanelShell sem reescrever autorização do layout.
- `src/components/dashboard/`: view desktop, composição mobile e componentes de métrica/peso/macros/feed/comparativo/projeto.
- `src/components/<modulo>/`: views próprias de alimentação/água/atividades/evolução/fotos/projetos/perfil; não acrescentar mais ramificações visuais à página genérica.
- `src/lib/<modulo>-view.ts`: DTOs/transformações determinísticas; módulos server-only separados para consultas novas. Sem cliente administrativo nas leituras do usuário. Preservar comandos atuais e seus contratos.
- `src/app/painel/[modulo]/page.tsx`: resolver contexto, autorizar, obter dados e compor a view especializada. Manter URLs antigas, parâmetros, IDs e links; adicionar filtros novos sem invalidar os antigos.

Arquivos ilustram responsabilidades, não uma árvore obrigatória a criar inteira na Fase 1. Extrair somente o necessário em cada fase. Remover estilo legado de uma região apenas quando migrada e verificada, sem apagar `globals.css` em bloco. Evitar uma terceira camada de overrides que esconda conflitos de tema.

O mesmo modelo de dados alimenta desktop/mobile. Composições podem divergir sem duplicar consultas, forms, IDs ou dados privados escondidos. Camada visual não decide ACTIVE, unidade, autorização ou snapshot nutricional.

## 3. Backlog priorizado e dependências

| Prioridade / pacote         | IDs da matriz                       | Valor e trabalho                                                                                                   | Dependência / gate                                                                       |
| --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| P0 — evidência visual       | V01–V11                             | Medir proporções, corrigir composições, comparar UI sem molduras, registrar divergências; não aprovar só por axe   | Cada uma das 13 referências + fixtures coerentes                                         |
| P0 — fundação/desktop       | S01/S03/S06/S07, D01–D11            | Grid e header de R01, busca de páginas, conta, tema desktop claro/escuro e gráficos conectados                     | Aprovação Fase 1 + leituras A + fórmulas D07/D09/D10                                     |
| P0 — mobile                 | S02/D13 e composição R02            | Integrar seletor ao hero, data compacta, proporções de métricas, ações e bottom nav                                | Aprovação desktop; assets mobile; gate próprio                                           |
| P1 — alimentação            | F01–F09                             | Resumo/anel/macros, seis categorias completas, registro contextual, edição/exclusão/atalhos                        | Editor e snapshot existentes; agregação completa; sem novo estado de conclusão implícito |
| P1 — água                   | H01–H05                             | Resumo/garrafa, presets, lista/horas, gráfico semanal e recipientes                                                | Leitura histórica de meta; cadastro de recipientes exige proposta B aprovada             |
| P1 — treinos                | T01–T05                             | KPIs, distribuição, frequência, meta e manutenção por modalidade                                                   | Leituras semanais; origem/ausência de kcal; sem tonelagem inventada                      |
| P1 — evolução               | E01–E03                             | Peso/medidas, períodos reais, metas condicionais, comparação                                                       | Eixo temporal e modos target/range/track preservados                                     |
| P1 — fotos                  | P01–P05                             | Galeria, poses/timeline, viewer/comparação, mudanças registradas                                                   | Storage privado existente; contagens globais; sem composição por foto                    |
| P1 — projetos               | J01–J04                             | ACTIVE em destaque, cards/menus, filtros, formulários/estados                                                      | Uma única ativação; V03 contraste sobre imagem; assets editoriais                        |
| P1 — perfil                 | C01–C04                             | Perfil/subnav, metas, preferências, segurança/export/exclusão                                                      | Proposta C e ciclo de avatar; tema desktop já implementado na Fase 1                     |
| P1 — autenticação           | A01/A02                             | Boas-vindas e fluxos por rota, dark/light e feedback                                                               | Assets; política de senha/callbacks preservada                                           |
| P2 — extensões condicionais | S04/S05/D12/F06/F09/T06/E04/C02/A03 | Busca privada, notificações, hábitos, confirmações/horários, séries executadas, composição, campos pessoais/sessão | Proposta e aprovação separadas; não são pré-requisitos silenciosos do redesign           |
| Excluído automaticamente    | A04/C05                             | Google/Apple, assinatura e idiomas extras                                                                          | Só outra autorização específica pode incluí-los                                          |

Fidelidade não permite esconder uma função existente para simplificar a tela. Planos, sono, fases, check-in, contexto alimentar e conveniências continuam acessíveis em região secundária acordada; não duplicar todos esses formulários na área principal de R01.

## 4. Entregas incrementais e complexidade

Escala relativa por entrega, considerando implementação, integração, estados, responsividade e QA: P=2–3 pontos; M=5–8; G=8–13; GG=13–21. Pontos não são dias nem compromisso de prazo; reestimar após a primeira entrega e aprovação de assets/modelos. Entregas GG podem ser subdivididas sem pular o gate final. Não executar todas em uma vez.

| Fase / incremento            | Entrega                                                                                                    | Complexidade estimada           | Aceite específico / aprovação                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — atual                    | Quatro documentos, auditoria13 refs, matriz e evidências do baseline                                       | M /5–8                          | Somente docs; apresentar e aguardar                                                                                                                        |
| 1 — Dashboard desktop        | R01, shell/header/busca/conta, projeto/data, quatro KPIs, peso/macros, três painéis inferiores, light/dark | GG /13–21                       | Capturas1672/1440/1366, dados equivalentes coerentes, leituras/fórmulas aprovadas, mobile existente sem regressão. Solicitar aprovação; não iniciar Fase 2 |
| 2 — Dashboard mobile/tablet  | R02, hero/selector integrado, data, alimentação/água assimétricas, treino/peso, ações e bottom nav         | G /8–13                         | 320/390/430/768 e landscape, assets adequados, desktop intacto; gate próprio                                                                               |
| 3 — Alimentação              | R03/R04, resumo e seis categorias, busca/registro/edição/exclusão/reutilização                             | GG /13–21                       | Dados completos além20 itens, unidades e ausentes, porções0 no ajuste, fluxo mobile/desktop; sem novo estado manual não aprovado                           |
| 4 — Hidratação               | R05/R06, resumo, presets, horários/CRUD, semana e recipientes                                              | G /8–13, +M se novo cadastro    | Metas por data, total consistente e histórico preservado; aprovação do modelo B antes de implementá-lo                                                     |
| 5 — Treinos                  | R07/R08, indicadores, modalidades, histórico e manutenção                                                  | G /8–13                         | Contagens/somas/distribuição iguais entre gráfico/lista; calorias reais/parciais; não executar T06 automaticamente                                         |
| 6 — Evolução                 | R09, Peso/Medidas/Fotos, gráfico/filtro/meta e histórico                                                   | G /8–13                         | Datas reais no eixo, unicidade, edição/remoção, alvo/faixa/sem meta; composição/IMC sem inferência                                                         |
| 7 — Fotos                    | R10, poses, timeline, galeria/viewer e comparação                                                          | G–GG /13–21                     | Arquivos privados, paginação/contagens, comparação entre páginas, exclusão/limpeza, mudanças só de registros                                               |
| 8 — Projetos                 | R11, cards/menus/filtros/criação/estados/metas                                                             | G /8–13                         | Um ACTIVE em todos os estados e concorrência; encerrados readonly; contraste das imagens; exclusão autorizada preservada                                   |
| 9 — Perfil                   | R12, dados/identidade, metas/preferências/privacidade/segurança                                            | GG /13–21 com avatar/modelo     | Aprovação prévia C; RLS, upload/troca/limpeza, export/delete/backup; sem campos pessoais obrigatórios por decoração                                        |
| 10 — Autenticação            | R13, cada uma das quatro composições e nova senha                                                          | G /8–13                         | E-mail/senha 12–128, confirmação e PKCE, feedback/pending, sem enumeração/social; manter sessão e proteção                                                 |
| Separada — séries realizadas | Proposta D, execução detalhada e volume válido                                                             | GG /21+ com refinamento próprio | Modelagem/convenções, RLS, idempotência e dados de execução; não integra silenciosamente Fase 5                                                            |

As Fases 1/2 são incrementos independentes do mesmo módulo. O módulo Dashboard só recebe conclusão integral após ambas aprovadas; “desktop entregue” não significa mobile novo pronto. Demais módulos exigem as duas composições e aprovação antes do próximo. A tabela não autoriza implementar nenhuma fase agora.

## 5. Escopo concreto da próxima entrega proposta

Depois da aprovação, iniciar uma branch a partir da develop atualizada e executar somente Dashboard desktop:

1. Confirmar R01 e medidas de header/sidebar/grid na resolução1672×941. Preparar cenário sintético com projeto e registros coerentes, mais vazio/parcial/histórico.
2. Introduzir tokens e tema desktop Light/Dark, preservando mobile dark. Nenhum flash de tema na navegação/reload; nenhuma leitura da preferência afeta autorização.
3. Evoluir shell e header: busca real de páginas/ações com teclado, menu de conta; sino não aparece como botão sem função.
4. Integrar seletor de projeto e navegação de datas na faixa da saudação. Sem nome pessoal cadastrado, saudação neutra; não usar “Arnold” ou identidade de demonstração em produção.
5. Reproduzir quatro KPIs, curva de peso com resumo lateral, donut/legenda e três painéis inferiores. A faixa extra de ações rápidas da entrega anterior não ocupa uma nova linha no desktop; manter acesso por busca/controles existentes.
6. Implementar **somente as leituras novas aprovadas** na proposta A da matriz: intervalo de pesos, duas semanas de kcal e feed de eventos com contexto. Não alterar schema, RPCs ou comandos de gravação nessa opção.
7. Preservar sono/check-in/fases/planos e preferências em acessos secundários acordados. “Hábitos 4/7” não ganha números inventados; submeter substituição informativa dentro da região do projeto.
8. Comparar light em 1672×941 com R01 e revisar notebook/amplo. Desktop dark mantém geometria e recebe aprovação específica, pois não há raster desktop dark fornecido.
9. Rodar verificações, entregar screenshots e relatório de diferenças. Parar para aprovação. Não redesenhar mobile/alimentação nesta entrega.

Decisões pendentes para esse gate: semântica do comparativo em kcal, feed entre tipos com datas reais, tratamento de meta diária de treino ausente, substituição de hábitos, nome/avatar ausentes e assets. São propostas explícitas da matriz; ausência de resposta não aprova backend ou adaptações.

## 6. Critérios de aceite transversais

### Visual

- Comparar UI útil dos rasters, sem molduras/apresentação. Referência de geometria, padding, tipografia, imagens, ícones, gráficos e hierarquia, não só paleta.
- Mesma densidade de dados e textos comparáveis em fixtures; valores corrigidos para serem consistentes. Dados fictícios somente no laboratório isolado.
- Landmarks alvo com desvios<=4px na resolução equivalente, sujeitos à revisão; documentar diferenças de fonte/antialiasing. Sem certificação por uma pontuação automática única.
- Estados vazios mantêm estrutura; erros e dados parciais têm tratamento próprio. Nenhum controle de fachada.
- Claro/escuro desktop e mobile dark; foco/contraste em hover e sobre imagens; screenshots não bastam para garantir contraste.
- Aprovação visual explícita do proprietário após apresentar diferenças. Uma screenshot do próprio app não se torna referência aprovada automaticamente.

### Funcional e dados

- Leitura por proprietário/projeto, gravação continua resolvendo ACTIVE no servidor, DRAFT sem registros, encerrados readonly salvo exclusão legal já prevista.
- Consultar data/projeto e trocar tema não grava saúde nem altera projeto ativo. Preservar URLs/deep links e retorno do navegador.
- Nenhum valor desconhecido é convertido em 0, nenhuma meta/gasto/volume corporal inventado. Fórmulas e parciais rotulados.
- Forms: válido, inválido, servidor indisponível, sem resultado, pending, novo envio, cancelamento, sucesso e erro; reset só após sucesso, edição preservada no erro.
- Listas e gráficos usam conjuntos completos/autorizados com paginação, não contagem da página como total.
- Fotos e avatares privados, sem cache público, metadados removidos; exclusão/exportação/backup cobrem qualquer novo dado aprovado.
- Offline permanece leitura limitada; toda escrita bloqueada com mensagem.

### Qualidade e evidências por fase

1. Testes unitários de novas fórmulas/transforms (nulos/zero/parciais/datas/limites), sem espelhar CSS em testes artificiais.
2. Testes de banco/RLS/constraints quando modelo/comando mudar, incluindo outra conta, encerrados e concorrência relevante.
3. Playwright Chromium/WebKit com jornadas reais e consultas persistidas, axe e teclado; contagens, edição/exclusão, retorno e erros.
4. Screenshots determinísticas: dados isolados, datas/fontes fixas, animações controladas, viewports equivalentes; overlay e revisão humana. Baseline visual de regressão somente depois da aprovação.
5. `npm run format:check`, lint, build, typecheck, testes pertinentes e regressão completa antes da integração. Após mudanças visuais múltiplas, revisar hooks, acessibilidade, SSR/hidratação e bundle.
6. Ausência de exceções inesperadas no console. Não filtrar erros ou aumentar timeouts para conseguir passar; investigar trace. Evitar recargas artificiais durante jornadas do App Router.
7. Sem overflow, sem foco atrás da bottom nav/dialog, reflow/zoom 200%, scroll, safe-area e teclado virtual. Safari/iPhone físico continua verificação separada quando disponível.
8. Entrega: resumo, arquivos/componentes, comportamento preservado/novo, resultado de testes/build, capturas, diferenças pendentes, riscos e próxima fase aguardando aprovação.

## 7. Riscos, dependências e mitigação

| Risco / dependência                                 | Mitigação / bloqueio de aceite                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Só há PNGs, não tokens/fontes/camadas originais     | Medição por região, normalização e review; não alegar fonte exata ou identidade pixel a pixel já alcançada                           |
| Assets esportivos faltantes                         | Obter assets apropriados/licenciados e revisar crop/luz; não substituir por card genérico nem por corpo do usuário inventado         |
| Conflitos CSS entre temas                           | Tokens por contexto, migração por módulo, casos claros/escuros e contraste sobre imagem; preservar atomicidade da troca de tema      |
| Dado para componente inexiste                       | Manter semântica/estado informativo e propor fluxo/modelo; não preencher com mocks ou estimativas                                    |
| Novas consultas aumentam custo                      | Janela limitada, paginação completa e paralelismo; medir antes de propor RPC/index; nenhum fetch de lista de saúde no cliente global |
| Schema remoto pode diferir do versionado            | Antes de uma migração aprovada, inventário somente leitura, backup e plano incremental; sem reset/bundle em ambiente existente       |
| Alterações de perfil/avatar ampliam dado sensível   | Minimização, RLS, arquivos privados, exportação/exclusão/backup e reautenticação onde apropriado                                     |
| Persistência de tema causa flash/hydration mismatch | Estado inicial SSR por cookie allowlisted; sem leitura tardia de localStorage ou supressão de warnings                               |
| Matriz de tema/breakpoints amplia QA                | Reutilizar contratos e fixtures, baseline aprovado por tema; nunca pular desktop dark como “só troca de cor”                         |
| Aviso moderado preexistente em Next                 | Propor manutenção separada; não atualizar silenciosamente dependência durante discovery; registrar verificação e risco               |
| Testes passam mas layout diverge                    | Gate visual independente. V03 demonstra que axe pode passar com texto sobre fotografia pouco legível                                 |
| Escopo cresce por elementos ilustrativos            | Backlog por elemento, propostas B–E aprovadas antes do backend; aprovação entre fases; sem autoria implícita de prescrição           |

## 8. Evidência desta Fase 0 e limites

- Os 13 arquivos foram abertos. Auditados módulos, componentes, rotas, Server Actions, Auth, migrações001–018, APIs, estilos, assets e testes relevantes.
- Executada captura/acessibilidade Chromium, 1 cenário aprovado (19,7s), com 34 capturas locais das páginas públicas/protegidas em 390/1280px; 16 capturas representativas foram preservadas em `screenshots/discovery-baseline/`. Capturas documentam estados vazios e estrutura, não equivalência dos exemplos populados.
- CI histórica da base develop [44010735461](https://github.com/pauloluccasdev/diazen/actions/runs/44010735461): aprovada. Não se reapresenta esse resultado como teste novo de código alterado.
- `npm audit --omit=dev` repetido nesta fase: um aviso moderado em Next; nenhuma atualização executada.
- Sem migração, provisionamento, mudança de API/Auth, produção, dado pessoal ou geração de novos assets. Não houve medição pixel-diff nem aprovação visual. Safari físico e zoom nativo não homologados.

Ao apresentar estes documentos, **parar e aguardar aprovação da Fase 1 — Dashboard desktop**. A observação de desktop dark já integra o plano; não equivale a autorização para implementar agora. Fluxo Git: branch documental da develop atualizada, commit/push; main/release continuam com o proprietário.
