# Revisão visual do protótipo — 22/10/2026

O proprietário reabriu a aprovação visual e pediu revisão geral das telas do protótipo. A aprovação anterior não vale como aceite desta revisão. Referência: `docs/referencias/Showcase da interface do Diazen em modo escuro.png`, Design System 1.1 e tokens JSON. RF-001/002/004/005/006/010/012/014/015/017/018/022; RNF-007/008/014.

## Comparação e ajustes

| Referência | Divergência encontrada | Ajuste |
| --- | --- | --- |
| Abertura | Landing page extensa e ilustração geométrica | Composição fotográfica, marca, lista compacta de áreas e ações de entrada/cadastro; primeiros passos mantidos abaixo |
| Login/cadastro | Painel elevado e hierarquia diferente | Marca editorial, subtítulo, abas de entrada/cadastro, formulário sem caixa externa e Inter local |
| Projetos | Criação ocupava toda a primeira tela, antes dos projetos existentes | Lista e estado em primeiro plano, ativo com fotografia, criação abaixo; ordem do DOM e do teclado coincidem |
| Dashboard | Filtros grandes e cartões sem a hierarquia da referência | Filtros expansíveis, projeto com fotografia, resumo nutricional, ícones semânticos e métricas compactas |
| Alimentação e adição | Cartões e controles pouco diferenciados | Calendário selecionado, totais por nutriente em superfícies internas e registros compactos; formulários permanecem manuais e abrem pela ação de adicionar/registrar, sem ocupar a tela inicial |
| Atividades | Apenas seletor textual | Seleção por cartões com ícones, estado pressionado e seletor equivalente acessível |
| Evolução | Gráfico sem escala/datas e ausência de navegação contextual | Abas Peso/Medidas/Fotos, escala de peso, datas reais, pontos identificados e preenchimento discreto |
| Hidratação | Total com barra simples | Indicador circular com total/meta temporal, estado sem registros e histórico antes do formulário |
| Perfil | Apenas exportação/exclusão | Identidade da conta e lista de configurações com ícones, mantendo exportação e confirmação de exclusão |
| Galeria, biblioteca e telas auxiliares | Acabamento inconsistente entre painéis/controles | Mesma tipografia local, espaçamento, superfícies, bordas, estados de foco e ações compartilhados |

O showcase é uma imagem conceitual de 12 telas, sem fontes ou imagens separadas. Esta revisão aproxima composição e acabamento; não declara igualdade pixel a pixel nem substitui aprovação do proprietário. Cores, dimensões mínimas e raios seguem os tokens numéricos quando a perspectiva/compressão da imagem não permite medição confiável.

São diferenças funcionais deliberadas da baseline: não incluir login social, barra inferior fixa, hábitos/sono, composição corporal/IMC, notificações nem exercícios com séries/cargas. As telas ilustrativas de hábitos e detalhes de treino não se tornam funcionalidades nesta revisão. Dados ausentes e subtotais continuam identificados; não inventar metas calóricas, percentuais de aderência ou fotografias dos alimentos.

## Ativos

- `public/fonts/inter-latin-variable.woff2`: Inter variável, subconjunto Latin com português, hospedada localmente, 48.256 bytes. Distribuição Fontsource (`https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2`), licença OFL em `public/fonts/OFL-Inter.txt`, obtida do repositório Google Fonts. Sem requisições de fonte a terceiros pelo aplicativo.
- `public/images/athlete-editorial.webp`: fotografia decorativa original gerada pela ferramenta integrada `image_gen`, inspecionada e convertida para WebP com Sharp (qualidade 78). Arquivo local de aproximadamente 64 KB; não representa usuário ou registro corporal. As fotos pessoais continuam privadas e não são usadas no hero.

Prompt final usado na ferramenta integrada:

> Use case: photorealistic-natural. Asset type: decorative background photograph for Diazen personal fitness PWA opening screen and project card. Create an original cinematic athletic editorial photo, vertical 2:3. One adult male athlete in black sleeveless training shirt, seated resting after exercise, head looking down, natural realistic musculature, three quarter view. Athlete occupies right half, with left half very dark empty graphite gym background usable for white UI text. Warm subtle amber rim lighting from upper right, black graphite palette, restrained natural skin texture, dramatic but realistic, no orange glow everywhere. Crop from head to waist with some lower body, dark environment. No text, no logos, no watermarks, no UI. This is a background asset, not an app mockup.

## Verificação e novo aceite

Executar `npm run build` e `CAPTURE_REVIEW=1 npx playwright test --project=chromium --workers=2` para gerar capturas das 16 telas em 390/1280 px, verificar axe e seis larguras. Arquivos em `artifacts/visual-review/chromium/`, sem dados pessoais. O teste de registros abre os formulários pela ação visível, captura também cinco módulos preenchidos e verifica seleção por cartões, sincronização com o seletor de modalidades e expansão dos filtros do dashboard. A CI verifica Chromium e WebKit.

A aprovação visual está pendente novamente. Conferir na prévia pública da develop, com conta Diazen; atualização visual não autoriza merge na main nem publicação em produção.

Na bateria com volume, a rolagem suave do roteiro disputava o foco do controle após a paginação. O roteiro agora resolve o alvo hidratado novamente, usa rolagem instantânea e confirma foco real antes de enviar Enter. O cenário isolado com os volumes completos passou após esse ajuste, sem alterar as ações da aplicação. A checagem de foco, os 25 lançamentos/13 fotos/21 rascunhos e as verificações de isolamento permanecem obrigatórios.
