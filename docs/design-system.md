# Design System — Diazen

> Cópia de consulta gerada de [DOCX original](originais/Diazen_Design_System_MVP_0_1_v1_1.docx). O original é a fonte documental; esta extração preserva texto e tabelas, sem reproduzir a diagramação ou imagens incorporadas.

DIAZEN

DESIGN SYSTEM  •  VERSÃO 1.1  •  MVP 0.1

Direção visual: Dark Premium / Athletic Editorial

Documento de implementação para produto, UX/UI e frontend. 21 de outubro de 2026.

Status: baseline visual derivada das duas referências de Dribbble e do protótipo atualizado do Diazen (12 telas). Os tokens numéricos são especificações iniciais para validação em interface real.

1. Princípios de design

Dark mode de alto acabamento: superfícies em camadas, bordas sutis e sombras difusas; evitar preto chapado em todos os elementos.

Hierarquia editorial: números de métricas grandes, títulos curtos, textos de apoio discretos e bastante respiro.

Âmbar como destaque funcional: ações primárias, seleções e progresso; não usar como cor para todo o conteúdo.

Fotografia com tratamento natural, recortes fortes e gradientes de proteção de texto, inspirada nas referências sem copiá-las.

Mobile-first e acessível: interação por toque, legibilidade e feedback de estado acima de decoração.

Navegação centrada no dashboard, conforme decisão funcional 63; a barra inferior mostrada no mockup é apenas exploratória e não faz parte do escopo aprovado.

2. Tokens de cores

| Token | Valor | Aplicação |
| --- | --- | --- |
| --color-bg | #0C0E12 | Fundo principal |
| --color-surface | #191C22 | Cards e painéis |
| --color-surface-raised | #252A32 | Controles elevados / hover |
| --color-surface-sunken | #13161B | Inputs e áreas internas |
| --color-border | #30343B | Bordas padrão, 1 px |
| --color-border-strong | #414751 | Foco neutro / separadores fortes |
| --color-text | #F5F6F8 | Texto principal |
| --color-text-muted | #A0A6B1 | Texto secundário |
| --color-text-subtle | #777E8A | Metadados |
| --color-accent | #FF9F24 | CTA e progresso |
| --color-accent-hover | #FFB14A | Hover de CTA |
| --color-accent-pressed | #E8890E | Pressed de CTA |
| --color-accent-soft | #302514 | Fundo de ícones destacados |
| --color-success | #4FD18B | Estado positivo |
| --color-warning | #F5B942 | Atenção |
| --color-danger | #FF646D | Erro e exclusão |

Regra: estados de sucesso, erro e alerta nunca devem depender apenas da cor; usar texto e/ou ícone. Validar contraste WCAG AA no frontend.

3. Tipografia

| Token | Fonte / peso | Tamanho / linha |
| --- | --- | --- |
| display | Inter ou Manrope / 800 | 36 / 42 px |
| heading-xl | Inter ou Manrope / 750 | 28 / 34 px |
| heading-lg | Inter ou Manrope / 700 | 22 / 28 px |
| heading-md | Inter ou Manrope / 650 | 18 / 24 px |
| body | Inter / 400 | 14 / 21 px |
| body-strong | Inter / 600 | 14 / 21 px |
| caption | Inter / 450 | 12 / 17 px |
| micro-label | Inter / 650, tracking .08em | 10 / 14 px |
| metric | Inter / 750, tabular numbers | 26–34 / 32–40 px |

Preferir fontes locais/autohospedadas quando apropriado; definir fallback system-ui. Não depender de fontes da imagem de referência.

4. Espaçamento, grid e dimensões

| Token | Valor | Uso |
| --- | --- | --- |
| space-1/2/3 | 4 / 8 / 12 px | Ícones, microespaços |
| space-4/5/6 | 16 / 20 / 24 px | Padding de componentes e cards |
| space-8/10 | 32 / 40 px | Separação de seções |
| radius-sm/md | 10 / 14 px | Chips, campos |
| radius-lg/xl | 18 / 22 px | Cards e painéis |
| radius-2xl | 28 px | Hero cards e modais |
| radius-pill | 999 px | Badges e botões pílula |
| control-height | 48 px mínimo | Inputs e botões principais |
| tap-target | 44 × 44 px mínimo | Áreas clicáveis |
| mobile-gutter | 16 px | Margens laterais até 430 px |
| content-max | 1120 px | Limite para desktop |

Grid mobile: 2 colunas para métricas, 1 coluna para formulários e listas. Em telas estreitas, métricas podem passar para 1 coluna quando necessário.

5. Bordas, sombras e elevação

| Token | CSS | Aplicação |
| --- | --- | --- |
| border-default | 1px solid #30343B | Cards, inputs, divisórias |
| border-focus | 2px solid #FF9F24 | Foco visível de teclado |
| shadow-card | 0 8px 24px rgba(0,0,0,.22), 0 2px 6px rgba(0,0,0,.12) | Cards de métricas |
| shadow-floating | 0 16px 40px rgba(0,0,0,.38), 0 4px 12px rgba(0,0,0,.18) | Menus, modais, sheets |
| shadow-accent | 0 6px 18px rgba(255,159,36,.16) | CTA destacado, uso pontual |
| inset-highlight | inset 0 1px 0 rgba(255,255,255,.035) | Profundidade discreta |

Sombras são discretas em dark mode: o contraste entre superfícies e bordas faz a maior parte do trabalho. Evitar glow contínuo em todos os cartões.

6. Componentes essenciais

| Componente | Especificação visual e de interação |
| --- | --- |
| Card padrão | Surface #191C22; border 1px; radius 22px; padding 16–20px; shadow-card; título, métrica e metadado. |
| Hero do projeto | Imagem opcional com overlay em gradiente; título; estado; progresso; sem texto sobre área de baixo contraste. |
| Botão primário | Accent #FF9F24; texto #101114; altura 48px; radius 14px; 600–700; loading/disabled/focus. |
| Botão secundário | Surface-raised, border-default; texto principal; feedback hover e pressed. |
| Input | Surface-sunken; border-default; radius 14px; altura 48px; label acima; erro textual abaixo. |
| Chip de filtro | Pill; estado ativo âmbar; inativo surface-raised; seleção acessível. |
| Badge de status | Cor semântica + rótulo; não usar apenas cor. |
| Indicador circular | Progresso numérico + unidade e meta; aria-label; sem animação obrigatória. |
| Barra de progresso | Trilho #30343B, preenchimento âmbar; mostrar número e contexto textual. |
| Lista de registros | Itens em cards compactos com ícone/thumbnail, título, hora, detalhe e ação contextual. |
| Galeria de fotos | Grade responsiva; thumbnails privadas; categorias Frente/Costas/Lateral/Outras. |
| Modal / bottom sheet | Surface-raised, radius 22–28px; shadow-floating; fechar, foco e retorno acessíveis. |
| Empty state | Ícone simples, texto informativo, CTA; distinguir sem dados de valor zero. |
| Toast / feedback | Texto curto e ícone; não ocultar erros importantes exclusivamente em toast. |

7. Padrões de tela — MVP 0.1

| Tela | Elementos obrigatórios |
| --- | --- |
| Abertura / login | Identidade com imagem atlética opcional; e-mail/senha; recuperação; sem Google login no MVP. |
| Dashboard | Saudação; projeto ativo e seletor; cards alimentação/água/treinos/peso; ações rápidas; navegação centralizada. |
| Alimentação | Seletor de data; totais quando disponíveis; refeições fixas; adicionar/editar registro; não exigir IA. |
| Hidratação | Total diário, meta, barra ou anel; histórico por recipiente; CTA adicionar consumo. |
| Atividades | Histórico por modalidade; data/duração; distância e detalhes opcionais; CTA manual. |
| Evolução corporal | Peso, medidas e gráficos simples; não introduzir IMC como obrigação não aprovada. |
| Fotografias | Galeria privada por pose; comparação lado a lado; upload otimizado. |
| Projetos | Projeto ativo destacado; concluídos/arquivados somente leitura; rascunhos configuráveis. |
| Perfil e ajustes | Conta, preferências, privacidade, logout; não sugerir recursos ainda não implementados. |

8. Estados, movimento e acessibilidade

Todo controle interativo terá estados default, hover (quando aplicável), pressed, focus-visible, disabled, loading e error.

Transições curtas de 120–220 ms; respeitar prefers-reduced-motion. Evitar efeitos 3D ou rotação de telas na aplicação real.

Área de toque mínima 44 × 44 px; indicadores não dependerão de gesto de deslizar.

Contraste mínimo AA para texto e componentes relevantes; medir na implementação, inclusive sobre fotografias.

Formulários terão labels persistentes, mensagens de validação e unidades explícitas (kg, cm, ml, kcal).

Componentes deverão suportar textos longos em português, zoom de até 200% e navegação por teclado.

9. Regras de consistência com o discovery

Navegação principal por cartões no dashboard (decisão 63), não por barra inferior fixa.

Autenticação por e-mail e senha; login social ilustrado no protótipo não será implementado na 0.1.

Projetos concluídos e arquivados são somente leitura; cadastro de dados sempre no projeto ativo.

A versão 0.1 utiliza registros manuais; IA, Strava e relatórios avançados não bloqueiam o lançamento.

Fotografias devem ser privadas e otimizadas; não armazenar EXIF de localização.

Números, nomes, datas, calorias e métricas presentes no protótipo são fictícios; não são regras de negócio.

10. Critérios de aceite visual

Todas as telas compartilham tokens de cor, borda, raio, sombra, tipografia e espaçamento.

Componentes apresentam estados de interação e erros de forma consistente.

Layout testado em 320, 375, 390, 430, 768 e 1280 px sem overflow horizontal.

Dashboard mantém prioridade visual do projeto ativo e das quatro áreas principais.

Contraste e acessibilidade verificados em código, não inferidos a partir do mockup.

Design aprovado por revisão visual de telas reais antes da finalização do MVP.

11. Referência visual aprovada

Protótipo conceitual com dez telas gerado a partir das duas referências compartilhadas. O protótipo orienta acabamento, composição e atmosfera, mas detalhes divergentes do discovery são meramente ilustrativos.

Fontes de inspiração fornecidas pelo usuário: Dribbble “Food Recipe Apps – Dark Mode” e “Coffee Shop Mobile Apps – Dark Mode”. Não reproduzir layouts ou ativos de terceiros literalmente.

10. Identidade e nomenclatura do produto

Diazen é o nome do aplicativo desenvolvido pela Lucx Tech. “Projeto 30 Trincado” é um exemplo de projeto criado pelo usuário dentro do Diazen; nunca deve substituir a marca do aplicativo em telas de autenticação, cabeçalhos globais ou metadados.

Assinatura verbal proposta: “Sua rotina. Sua evolução.” O logotipo tipográfico “diazen.” com ênfase âmbar na terminação é uma direção conceitual e requer validação final de identidade e direitos de marca.

O protótipo visual atualizado contém 12 telas e é referência estética, não autorização para ampliar o escopo do MVP. Recursos ilustrativos como login social, hábitos/sono detalhados e exercícios com séries não fazem parte do MVP 0.1 sem aprovação específica.
