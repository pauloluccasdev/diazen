# Fase 9 — Perfil e configurações

Implementação e validação local em 18/11/2026. Migração remota aplicada e verificada; integração e CI ainda pendentes.

## Implementação atual

Composição baseada em R12: identidade e destinos no mobile; coluna de navegação e painéis no desktop, com tema claro/escuro. Nome de exibição opcional, avatar privado, referências reais do projeto e preferências existentes. Segurança, exportação, exclusão reautenticada e logout reutilizam os fluxos anteriores. Nenhum telefone, nascimento, provedor social ou serviço de notificações foi acrescentado.

Migração aditiva 020 aplicada conforme a ampliação aprovada. Nome e avatar são atualizados independentemente; remoção compara a versão confirmada. Fila administrativa trata substituições e respostas incertas sem apagar a imagem atual. Exportação, backup e limpeza de conta incluem o novo namespace privado.

## Arquivos e componentes

- `src/components/profile/`: diretório responsivo, avatar e fallback, editor/confirmador de imagem, formulário de nome, aparência, repetição de leitura e formulário de exclusão reutilizado.
- `src/components/shell/theme-context.tsx`, PanelShell, layout e menu de conta: identidade real no cabeçalho e tema compartilhado. Tokens e estilos v2 preservam os dois modos desktop e o mobile escuro.
- Página/ações de perfil, `src/lib/profile-data.ts` e `profile-values.ts`: leitura autorizada, validação e referências opcionais do projeto/plano.
- `src/app/api/perfil/avatar/route.ts`, helpers de imagem e privacidade: upload limitado, otimização, leitura privada, confirmação por versão e limpeza durável. Preparação de imagem do PhotoUploader extraída sem alterar seus limites ou saída padrão.
- Migração 020, exportação JSON, scripts de backup e purge: ciclo completo das novas informações privadas.
- Testes de perfil/avatar, fixture PostgreSQL/Storage, restauração nativa e navegação dos testes anteriores: segurança, integridade, responsividade, acessibilidade e regressão.

## Funcionalidades preservadas

Supabase Auth, isolamento por proprietário, bucket privado existente, preferências de visibilidade, alteração de senha, logout e exclusão com reautenticação. Avatar é informação da conta; não modifica a associação de alimentos, água, atividades, medidas ou fotografias aos projetos. Nenhuma composição nutricional, meta automática ou informação corporal é inferida.

## Evidência local já obtida

- 132 testes de banco aprovados, incluindo isolamento, grants, caminhos gerados, fila e ciclo de exclusão.
- Ensaio nativo PostgreSQL 17 aprovado: dump/restauração, dois perfis, verificação do arquivo de avatar, reaplicação da exclusão e concorrência em duas conexões. Ambiente sintético em socket Unix; não equivale à restauração do Storage hospedado.
- Build de produção aprovado após os ajustes de apresentação. Lint, formatação e TypeScript aprovados.
- Jornada de perfil e API aprovadas no Chromium: nome opcional, upload/reset, confirmação/cancelamento de remoção, exportação e cinco larguras sem overflow ou violações de acessibilidade naquela execução.
- Safari: API, senha, exclusão de conta e acompanhamento diário aprovados. Jornada visual também aprovada após corrigir a persistência de cores no painel e no seletor de tema ao alternar breakpoints. Os valores permanecem centralizados em tokens; as verificações de contraste continuam integrais.
- Safari: referências configuradas verificadas contra dados sintéticos reais do PostgreSQL (peso atual/meta, água e frequência), rejeição de nome com mais de 80 caracteres preservando preenchimento e recuperação após falha de leitura aprovadas. Bloqueio de escrita offline e preservação do preenchimento também aprovados.
- Suíte integral WebKit: 59 aprovados e uma amostra privada local ignorada, 6,9 minutos. Agent-browser: 26 jornadas aprovadas, ambiente local isolado.
- Suíte integral Chromium: 59 aprovados e uma amostra privada local ignorada, 2,8 minutos. Uma execução anterior recebeu término externo antes de concluir e não foi contada como aprovação; seus resultados parciais foram preservados separadamente.

Capturas locais: `artifacts/diazen-v2/profile-fiel/`. Somente dados sintéticos de contas isoladas de QA.

Capturas versionadas em `screenshots/phase-9/`: desktop claro/escuro, mobile 390 e tablet 768. Imagens WebKit reduzidas à largura CSS para revisão, sem molduras externas. R12 reaberta e comparada com as capturas.

Backup remoto pré-migração gerado em 18/11/2026 às 19:29 UTC: criptografado e verificado novamente em execução independente; nenhuma escrita remota durante o backup. Caminhos, hashes e verificações ficam somente nos artefatos locais privados. Preflight remoto confirmou ausência das novas tabelas/versão e bucket privado, sem leitura de registros pessoais.

## Gates pendentes

Publicar a branch, aguardar CI e integrar na develop. Main continua sob responsabilidade do proprietário. Próxima fase: Autenticação, em branch própria a partir da develop integrada.

## Aplicação remota

Migração `202611180020` aplicada incrementalmente após os gates locais e backup, hash SHA-256 `7032f2457ac1561752b3a067f252b5a86099a8fa4a27063629290c5438b57deb`. Vinte verificações de metadados aprovadas: RLS, grants mínimos, caminhos gerados, fila administrativa privada, policy de leitura do avatar, triggers e cascades. Nenhum registro existente foi modificado; não houve leitura de registros pessoais para verificar a aplicação. O histórico anterior foi preservado, inclusive as versões antigas ausentes do ledger.

## Verificação hospedada e correção do relógio

Depois da primeira CI aprovada (`83a97a6`, execução 44383547391), o ensaio no Supabase real encontrou diferença de aproximadamente três segundos entre o relógio da aplicação e o banco: o filtro local podia adiar a limpeza recém-enfileirada. As contas sintéticas foram purgadas mesmo no ensaio que falhou. A proposta de correção foi registrada no plano antes das alterações.

Migração aditiva `202611180021`, SHA-256 `d0ec0a0ee9c76a2424fe527d262fb4ade7a8f584d27ec724c9028729d5d740d6`: disponibilidade de uploads e leitura de trabalhos vencidos agora usam o PostgreSQL. RPC de leitura somente para `service_role`; RLS e bucket privado preservados. Sete verificações remotas de metadados aprovadas; nenhum registro existente foi alterado. Novo backup criptografado, verificação independente e restauração nativa aprovados antes da aplicação.

Após a correção: 136 testes de banco aprovados, build/lint/formatação/TypeScript aprovados e quatro cenários direcionados aprovados em cada navegador. Novo ensaio com duas contas sintéticas no Auth/PostgreSQL/Storage reais aprovou leitura privada, negação entre proprietários/anônimo, proteção contra confirmação antiga, limpeza física do arquivo e exclusão completa das contas de QA. Nenhuma informação da conta do proprietário foi consultada.

Preview: health 200, avatar sem sessão 401; a origem da branch inicialmente retornou 403. Corrigida somente `NEXT_PUBLIC_SITE_URL` dessa branch de preview e reconstruído o deployment; POST da origem correta passou a retornar 401 por ausência de sessão, como esperado. Produção e sua proteção não foram alteradas. Commit da correção ainda depende de nova CI antes da integração.
