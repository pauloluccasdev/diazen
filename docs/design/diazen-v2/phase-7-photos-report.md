# Fase 7 — Fotos de evolução

Branch `feat/diazen-v2-fotos-evolucao`, criada da develop `48af335`. Referência R10 aberta antes da implementação. Em validação final; ainda não contabilizada como concluída.

## Implementação

`PhotoDiary` apresenta Galeria, Comparar e Linha do tempo na rota existente `/painel/fotos`. Desktop claro/escuro: duas informações de contexto, posições à esquerda, quatro fotografias por página, comparação e medidas nas datas. Mobile: cabeçalho compacto, último registro, quatro posições, datas recentes e atalho de inclusão. As molduras e os fundos de apresentação do mockup não fazem parte da interface.

As fotografias são privadas e reais do usuário autenticado. Estados vazios apresentam ausência explícita. Imagens editoriais aparecem como conteúdo fotográfico apenas na conta sintética isolada dos testes; nenhuma fotografia demonstrativa é inserida em produção. A galeria preserva a fotografia inteira com `object-fit: contain` sobre superfície neutra; não recorta o corpo para preencher o quadro.

Visualizador nativo modal com carregamento, ampliação, rolagem, Escape, retorno do foco, abertura do arquivo privado e tentativa novamente após falha. Menus individuais oferecem seleção para comparação e exclusão confirmada. Envio conserva otimização, limites, remoção de metadados e API existentes; sucesso apresenta modal e reseta o formulário, erro preserva a seleção.

## Dados e integridade

- Metadados autorizados paginados, separados das chaves de armazenamento. Contagens consideram todo o intervalo até a data consultada, não somente a página visível. Arquivos e datas são contados separadamente.
- Galeria pagina quatro fotografias para reproduzir R10; linha do tempo pagina doze datas. A paginação anterior de doze arquivos era apresentação, não regra de negócio. Seleções de comparação permanecem entre páginas.
- Sugestão inicial compara primeira/última fotografia da mesma posição. Seleção explícita pode comparar posições distintas, com aviso. As datas e posições aparecem junto às fotografias.
- Peso e cintura consultam exclusivamente registros nas duas datas selecionadas e no mesmo projeto. Ausência não vira zero, interpolação ou medição aproximada. Diferença é segundo valor menos primeiro; não é qualificada como melhora automática. Nenhuma composição corporal é inferida de imagens.
- Dia do projeto significa distância cronológica desde o início, não dias com registros ou aderência.
- Filtros, calendário e navegação preservam projeto e seleções. Consultar projeto encerrado ou rascunho não habilita gravações. Projeto ativo continua resolvido no servidor para envio.
- API privada, RLS, armazenamento, exportação e exclusão existentes preservados. Nenhuma migração, dependência ou contrato público novo.

## Componentes

Novos `components/photos/`, `photo-data.ts` e `photo-metrics.ts`. Reuso de ModuleContext, ModuleHeading, DateNavigator, PhotoUploader, ActionDisclosure e RecordFeedbackDialog. O calendário compartilhado aceita parâmetros adicionais de consulta; demais módulos mantêm seus parâmetros anteriores. Navegação mobile agrupa Fotos em Evolução; sidebar desktop mantém Fotos como destino próprio. Tokens `--v2-media-bg`/`--v2-media-text` centralizam o campo fotográfico neutro nos dois temas.

## Verificação

- 104 testes de banco/unidade aprovados: incluem metadados acima de mil arquivos, datas/posições, seleção da mesma posição, ausência versus zero e consulta exata de medidas.
- O adaptador REST isolado passou a suportar o operador PostgREST `in`, com parâmetros SQL e testes de RLS entre duas contas, valores com vírgulas/aspas e entradas que não podem ampliar a consulta. A API de produção já suportava esse operador.
- Build, TypeScript, ESLint e formatação finais aprovados.
- Chromium completo: 55 aprovados, um cenário opcional ignorado. Jornada inclui envio real, privacidade do arquivo, comparação, paginação, filtros, ampliação, recuperação de erro 503 e exclusão.
- WebKit: quatro jornadas Fotos/Evolução passaram na primeira validação; duas jornadas finais Fotos aprovadas em 52,3 s após ajustar centralização e desativar leitura antecipada do retorno privado. Asserções de ausência de erros permaneceram ativas.
- Capturas e axe em desktop claro/escuro, notebook, 320/390/768/1672, comparação, erro recuperável e rascunho vazio. Dados exclusivamente sintéticos. Inspeção visual realizada nas capturas reais; sem homologação em aparelho físico ou aprovação visual do proprietário.

- Metadados do Supabase real verificados somente por leitura: bucket `body-photos` privado, limite/tipo WebP, RLS e políticas proprietárias nas três tabelas e política privada do storage. Nenhum registro pessoal, objeto de foto ou conta foi consultado; nenhuma mudança remota foi executada.

## Capturas

- [Desktop claro](screenshots/phase-7-photos/light-1672.webp)
- [Desktop escuro](screenshots/phase-7-photos/dark-1672.webp)
- [Notebook](screenshots/phase-7-photos/light-1366.webp)
- [Mobile 390](screenshots/phase-7-photos/viewport-390.webp)
- [Mobile 320](screenshots/phase-7-photos/viewport-320.webp)
- [Tablet](screenshots/phase-7-photos/viewport-768.webp)
- [Comparação](screenshots/phase-7-photos/comparison-1672.webp)
- [Visualizador](screenshots/phase-7-photos/viewer-1672.webp)
- [Falha recuperável](screenshots/phase-7-photos/viewer-error-1672.webp)
- [Rascunho vazio](screenshots/phase-7-photos/empty-draft-390.webp)

As 26 jornadas agent-browser finais passaram: envio privado, comparação e seleção entre páginas, confirmação de exclusão, isolamento, exportação e exclusão da conta. O roteiro usa URLs relativas ou absolutas do mesmo host e seleciona os campos de comparação dentro do formulário correto, sem confundi-los com os campos ocultos do calendário. Mantém foco e ativação reais pelo teclado, sem force-click, aumento de timeout ou remoção das asserções.

CI completa pendente de envio desta entrega. A fase ainda não foi contabilizada como concluída.
