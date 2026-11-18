# Diazen 2.0 — proposta de Design System de alta fidelidade

Fase 0 · 17/11/2026 · **especificação para aprovação, ainda não implementada**. Fontes: os 13 rasters do [catálogo visual](visual-audit.md#3-catálogo-dos-13-protótipos-abertos). Não há Figma, fonte vetorial, camadas ou arquivos de fonte originais disponíveis. Medidas e tokens abaixo normalizam a leitura das imagens; não representam extração exata de uma fonte tipográfica ou de dimensões CSS ocultas.

Este documento sucede a direção visual de 0.1 para as fases futuras. Não modifica `docs/design-system.md` ou o JSON gerados do baseline. As regras de integridade e acessibilidade permanecem. O dashboard já entregue é base funcional, não baseline visual aprovado para a nova exigência.

## 1. Temas e persistência

Três contextos semânticos: **mobile dark**, **desktop light padrão** e **desktop dark opcional**, este último solicitado pelo proprietário em 17/11. Tablet adapta densidade sem copiar o desktop reduzido. Desktop dark mantém exatamente o grid, medidas e hierarquia do light; muda superfícies, texto e tratamento de assets, não o comportamento dos dados.

Proposta de controle real no menu de conta/header desktop e em Preferências: duas opções explícitas “Claro”/“Escuro”, nome acessível “Tema do desktop”. Persistir somente uma preferência de aparência neste navegador, em cookie `diazen-desktop-theme=light|dark`, SameSite=Lax, Path=/, duração sugerida de um ano e Secure em HTTPS. Não contém identidade, token ou saúde. Leitura SSR com allowlist/fallback light fornece o mesmo valor inicial ao cliente; toggle atualiza atributo e cookie. Sem `suppressHydrationWarning` para ocultar inconsistências. Não criar tabela ou endpoint para essa preferência.

Até 1023px, o mobile/tablet permanece dark; a preferência desktop é preservada e reaplicada ao voltar a >=1024px. Não introduzir opção automática/idiomas/unidades sem escopo próprio. Autenticação recebe a mesma regra de tema na sua fase; antes disso não afirmar que o tema já cobre as páginas públicas.

## 2. Tokens semânticos propostos

Na implementação aprovada, manter uma única fonte de tokens v2, por exemplo `src/styles/diazen-v2/tokens.css`, consumida por componentes e folhas de módulo. É proposta de localização, não arquivo de produção criado nesta fase. Variáveis existentes `--color-*` receberão ponte temporária, removida por módulo após migração. Breakpoints centralizados/documentados junto dos tokens; usar constantes de media query definidas na folha, sem depender de CSS custom property em `@media`.

| Token proposto          | Mobile dark   | Desktop light | Desktop dark | Uso                                                             |
| ----------------------- | ------------- | ------------- | ------------ | --------------------------------------------------------------- |
| `--dz-bg`               | #101113       | #F1F2F4       | #101113      | Canvas                                                          |
| `--dz-surface`          | #1C1D20       | #FFFFFF       | #1C1D20      | Cards                                                           |
| `--dz-surface-raised`   | #26272B       | #F7F8FA       | #26272B      | Menus/hover                                                     |
| `--dz-input`            | #151619       | #FFFFFF       | #151619      | Inputs                                                          |
| `--dz-text`             | #F6F6F6       | #151923       | #F6F6F6      | Texto principal                                                 |
| `--dz-text-muted`       | #A4A6AC       | #596477       | #A4A6AC      | Metadados; contraste AA                                         |
| `--dz-border`           | #34363B       | #DEE3EB       | #34363B      | Separadores não textuais                                        |
| `--dz-control-border`   | #747780       | #7E8795       | #747780      | Limites de controles quando necessários para identificação      |
| `--dz-primary`          | #FFC12E       | #FFC12E       | #FFC12E      | CTA/destaque                                                    |
| `--dz-on-primary`       | #151923       | #151923       | #151923      | Texto/ícone sobre amarelo                                       |
| `--dz-primary-text`     | #FFC12E       | #805600       | #FFC12E      | Link/texto âmbar com contraste                                  |
| `--dz-primary-hover`    | #FFD064       | #FFD064       | #FFD064      | Hover CTA                                                       |
| `--dz-sidebar`          | Não aplicável | #FFC12E       | #FFC12E      | Identidade da sidebar; manter texto escuro                      |
| `--dz-sidebar-active`   | Não aplicável | #FFFFFF       | #1C1D20      | Item ativo; texto claro só no ativo dark                        |
| `--dz-data-cyan`        | #08B8E4       | #08B8E4       | #08B8E4      | Preenchimento de gráficos                                       |
| `--dz-data-cyan-stroke` | #08B8E4       | #0098BD       | #08B8E4      | Traço distinguível no canvas                                    |
| `--dz-data-cyan-text`   | #55D8F4       | #006B85       | #55D8F4      | Texto de dados, não usar preenchimento claro como texto pequeno |
| `--dz-protein`          | #FF6B60       | #DD443B       | #FF6B60      | Barra/legenda de proteína em tela alimentar                     |
| `--dz-carbs`            | #21BCE4       | #0098BD       | #21BCE4      | Carboidratos                                                    |
| `--dz-fat`              | #B57AEA       | #8651B8       | #B57AEA      | Gorduras                                                        |
| `--dz-danger-text`      | #FF858D       | #B7203B       | #FF858D      | Erro/destrutivo                                                 |
| `--dz-success-text`     | #69D99A       | #176A3B       | #69D99A      | Sucesso de ação, não julgamento de corpo/comida                 |
| `--dz-focus`            | #FFC12E       | #151923       | #FFC12E      | Foco visível fora de controles amarelos                         |

Referências divergem entre barras alimentares e donut do dashboard: R01 usa proteína amarela, carboidrato ciano, gordura roxa; R03/R04 proteína coral. Proposta: manter variantes explicitamente nomeadas por visualização, com legenda textual, preservando as referências sem usar cor como identificação única. Não deixar a ordem mudar entre as legendas.

Sombras: card light `0 8px 24px rgb(21 25 35 / 6%)`, dark `0 6px 20px rgb(0 0 0 / 18%)`; floating light `0 16px 40px rgb(21 25 35 / 14%)`, dark `0 16px 40px rgb(0 0 0 / 35%)`. Borda1px, sem glow global. Highlight interno dark opcional `inset 0 1px rgb(255 255 255 / 3%)`. Degradês da fotografia, líquido e sidebar podem reproduzir os rasters; não adicionar glow/blur de apresentação à UI.

## 3. Tipografia, espaço e medidas

Fonte proposta: Inter variável já autohospedada (licença em `public/fonts/OFL-Inter.txt`), fallback system-ui. A semelhança com a fonte da referência deve ser avaliada lado a lado; a fonte exata do raster não foi identificada. Não baixar uma nova fonte para “parecer premium” sem necessidade medida.

| Papel             | Desktop tamanho/linha/peso | Mobile tamanho/linha/peso |
| ----------------- | -------------------------- | ------------------------- |
| Título de página  | 34–36 / 42 / 750–800       | 24–28 / 32 / 750          |
| Título de painel  | 19–22 / 28 / 700           | 20–22 / 28 / 700          |
| Métrica principal | 28–34 / 38 / 750           | 28–34 / 38 / 750          |
| Métrica hero      | 40–48 / 52 / 750           | 34–40 / 46 / 750          |
| Corpo             | 14–16 / 21–24 / 400        | 14–16 / 21–24 / 400       |
| Label/legenda     | 12–14 / 18–20 / 500–600    | 12–14 / 18–20 / 500–600   |

Tokens tipográficos devem resolver os valores por componente e breakpoint; intervalos acima são o envelope do sistema, não autorização para cada tela escolher arbitrariamente. Números tabulares; unidades menores no mesmo baseline, quebra proibida entre valor/unidade em KPIs curtos. Datas/textos longos podem quebrar sem cortar o controle.

Escala de espaço `4,8,12,16,20,24,32,40,48`; ícones18/20/24/28; radius10 (pequeno),14 (controles),20/22 (cards),28 (hero/dialog),999 (pílulas). Alvos>=44×44, inputs/CTAs principais48px, CTA mobile52–56px. Não inflar todos os cards com padding ou alturas de formulário.

### Layouts e pontos de controle

| Contexto                   | Proposta de estrutura                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile320–767              | Gutter16–20, vertical; header de módulo com voltar/título/calendário, sem duplicar header global. Bottom nav de cinco itens, safe-area, espaço inferior no conteúdo                                               |
| Tablet768–1023             | Dark, margens24; grids de duas colunas quando legíveis; sem sidebar sobreposta; controle de Mais e ações mantidos                                                                                                 |
| Desktop1024–1365           | Sidebar compacta~200–216; main24; cards reorganizam sem overflow; tabelas com colunas essenciais e detalhe acessível                                                                                              |
| Desktop>=1366              | Sidebar~224–228px, main28–32, gap20; header~80, faixa saudação/projeto/data~100; conteúdo ocupa largura disponível                                                                                                |
| Referência R01 em 1672×941 | Medir contra UI completa: quatro KPIs em y~211–332; peso/macros em y~352–597 com proporção~62/38; três painéis em y~616–908. Esses landmarks são alvo da fase desktop, não uma altura fixa em todas as resoluções |
| Mobile equivalente         | Normalizar interior do smartphone para390×844; validar também320×740 e430×932. Nunca usar largura total941px da prancha como viewport de telefone                                                                 |

Não criar versões de dados duplicadas por breakpoint. Compartilhar modelo de apresentação e componentes internos; compor regiões desktop/mobile de forma distinta. Não duplicar headings, IDs, forms ativos ou dados sensíveis ocultos no DOM por conveniência.

## 4. Componentes e contratos de interação

| Componente proposto                            | Contrato / estados e reutilização                                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AppShell`/`DesktopSidebar`/`MobileNavigation` | Evoluir `PanelShell`; mapas únicos de destinos, aria-current, foco, skiplink, Mais fecha por Escape/fora/foco. Consultar histórico não muda destino de gravação                                  |
| `DesktopHeader`/`ModuleHeader`                 | Busca real e conta no desktop; no mobile módulo ganha header compacto. Sino só se houver funcionalidade aprovada                                                                                 |
| `DesktopThemeControl`                          | Light/Dark conforme §1; seleção anunciada, teclado, contraste em ambos, sem mudar layout                                                                                                         |
| `CommandSearch`                                | Resultados de páginas e ações, categoria explícita, vazio, teclado/Escape; campo não promete pesquisar registros que não consulta                                                                |
| `ProjectSwitcher`                              | Lista de projetos autorizados, selecionado e status; consulta e ativação são ações diferentes; acesso à lista completa após20                                                                    |
| `DateNavigator`/`PeriodSelect`                 | Links reais/query params, anterior/próxima/Hoje/calendário; desabilitação com motivo; mantém projeto e filtros; sem escrita na navegação                                                         |
| `MetricCard`/`ProjectHero`                     | Ícone, rótulo, valor, referência e mini-gráfico. Sem métricas fictícias; imagem independente do conteúdo. Texto sobre foto usa tokens próprios com overlay, não herda automaticamente tema claro |
| `RingProgress`/`MacroBars`/`DonutChart`        | Valores e unidades explícitos, legenda/tabela acessível; nulo/parcial/zero/superação são estados distintos. Reusar ProgressRing onde adequado                                                    |
| `TimeSeriesChart`/`WeekBars`                   | Traço2–3px, pontos, fill ciano sutil no light/amarelo no mobile conforme referência; grid leve; datas reais no eixo. Tooltip por foco/toque, tabela equivalente e sem hover obrigatório          |
| `MealCategoryRow`                              | Exatamente seis categorias; vazia continua no layout com Adicionar. Desktop tabela, mobile linha com ícone/descrição; ações não aninhadas em um link gigante                                     |
| `RecordRow`/`ActivityRow`                      | Item compacto, data/hora se existente, origem, valor e menu real editar/excluir; estado readonly explícito                                                                                       |
| `RecordDialog`/`RecordSheet`                   | Mesmo formulário/regra em dialog desktop e sheet mobile; foco preso/retornado, fechar e rótulo acessíveis, impedir duplicidade pending, teclado móvel não cobre envio                            |
| `Field`/`Select`/`DateField`                   | Label persistente, unidade fora do valor, ajuda/erro por aria-describedby; decimal com vírgula normalizado no comando existente; estados focus/disabled/loading/erro                             |
| `SegmentedNavigation`                          | Tabs de rota quando navegam entre páginas; tabs ARIA apenas se alternam painéis na mesma página. Preservar URL/filtros e botão voltar                                                            |
| `RecordMenu`/`ConfirmationDialog`              | Ação destrutiva separada, identificação de escopo e irreversibilidade; nunca exclusão no simples clique do ícone                                                                                 |
| `PhotoGallery`/`PhotoCompare`                  | Imagens privadas reais, recorte consistente sem deformação; zoom/viewer e comparação com data/pose; nenhuma foto editorial como se fosse do usuário                                              |
| `EmptyState`/`LoadingState`/`ErrorState`       | Preservar dimensões aproximadas da região, mensagem curta e CTA real. Falha de consulta não vira “sem registros”; erro recuperável não apaga conteúdo conhecido                                  |
| `ActionFeedback`                               | Reusar `RecordFeedbackDialog`/ActionForm; sucesso após confirmação servidor limpa somente campos apropriados; erro preserva edição. Toast opcional não é único portador de erro                  |

### Estados para homologação

Cada componente: default, hover aplicável, pressed, focus-visible, disabled com motivo e pending. Cada módulo: sem projeto, sem registros, dado0 conhecido, parcial, falha, readonly, offline e texto longo. Desktop light/dark e mobile dark devem manter contrasteAA; medir também hover e texto sobre imagem. Não declarar conformidade só porque axe passou.

Movimento:120–180ms para borda/sombra/transform discreto; reduced-motion desliga animações. **Não animar background isoladamente ao trocar breakpoint/tema**: foreground e superfície mudam juntos, preservando correção do WebKit já existente. Não adicionar skeleton shimmer obrigatório.

## 5. Assets e fotografia

Inventário atual: Inter, ícones Lucide, `athlete-editorial.webp`, ícones de marca/PWA. Faltam recorte atlético equivalente ao hero, corredor de boas-vindas, halteres, garrafas e miniaturas editoriais alimentares. São dependências reais de fidelidade.

Antes de cada fase: definir asset, procedência/licença, proporção, focal point, variantes dark/light, tamanho WebP/AVIF e alt decorativo ou informativo. Fotografia editorial não pode usar o rosto/avatar ou corpo do protótipo como identidade da conta. Não usar fotografia corporal de exemplo no ambiente real. Reutilizar o asset atual somente quando reproduzir composição/luz/crop; se não, obter/criar e submeter asset apropriado. Esta Fase 0 não gera nem substitui imagens.

## 6. Verificação visual proposta

Comparar R01 em 1672×941 e versões1366×768/1440×900/1920×1080; mobile390×844,320×740,430×932; tablet768×1024/1024×768. Desktop dark não tem raster próprio fornecido: deve conservar geometria do light e usar a linguagem dark mobile; requer aprovação visual específica.

Usar fixtures sintéticas isoladas e coerentes, com mesmo comprimento de nome, número de linhas, metas e quantidades comparáveis. Não usar produção para gerar referência. Recortar somente a UI dos mockups; não comparar moldura/status bar com conteúdo web. Criar painel lado a lado e overlay para header, grid, tipografia, ícones, gráficos e imagens. Se necessário, script de crop somente para análise, preservando os originais.

Critério proposto: landmarks estruturais com desvio alvo<=4px na resolução equivalente, sem desalinhamento perceptível sistemático; documentar diferenças de antialiasing/fonte e adaptações funcionais. Esse alvo não é uma medida já obtida nem substitui revisão humana. Pixel diff automatizado é diagnóstico, não aprovação por uma porcentagem arbitrária. Screenshots de regressão do próprio app, gerados após aprovação, detectam mudanças futuras; não certificam fidelidade ao protótipo por si sós.

Nenhuma tela é aprovada nesta fase. Antes de avançar, apresentar capturas, diferenças restantes e adaptações de dados/escopo ao proprietário.

## Atualização de implementação — Fase 6

A fonte implementada é `src/styles/diazen-v2/tokens.css`. O contraste sobre o amarelo principal é centralizado em `--v2-on-primary: #151923`, equivalente ao token proposto `--dz-on-primary`. Evolução corporal usa esse token nos tabs ativos; o texto âmbar em superfície clara continua usando a variante semântica de contraste, sem confundir fundo de CTA com cor de links.
