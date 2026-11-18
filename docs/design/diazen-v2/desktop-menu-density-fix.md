# Refinamento desktop após o primeiro deploy

18/11/2026 — correção solicitada após revisão em notebook. Escopo: RF018 (dashboard), RNF007/RNF008 (responsividade/acessibilidade); destino de registros e autorização preservados.

O seletor de projeto no dashboard expandia no fluxo da grade, aumentando a primeira linha e deslocando os cards. Agora abre um painel flutuante no desktop, com altura limitada, Escape retornando foco, fechamento por clique fora e por saída de foco, como o menu da conta. A consulta mantém o formulário GET, projeto/data e aviso de que não altera o ACTIVE. O mobile mantém sua composição existente.

A sidebar recebeu espaçamentos menores e variante para alturas até 740 px. Cabe em 1280×636 e 1280×768 sem rolagem própria; não escondemos links nem bloqueamos a rolagem necessária em alturas extremas/zoom. Item ativo e hover no tema escuro usam superfície grafite e texto branco, conforme o token já proposto no Design System v2. O modo claro mantém destaque branco.

Na faixa de notebook (1024–1439 px), título do dashboard tem 24 px, saudação 13 px, métricas 18 px e mensagens sem registros 14 px. Rótulos da sidebar têm 14 px. A verificação de geometria também garante separação entre calorias e anel, evitando a sobreposição observada durante a inspeção.

## Verificação

Build de produção aprovado. Chromium: duas jornadas aprovadas, cobrindo desktop claro/escuro, mobile/tablet, teclado, dados persistidos e as novas verificações de notebook. Teste de regressão em `tests/desktop-dashboard.spec.ts`: sidebar sem overflow nas duas alturas, cores do item ativo, tamanho do título, valor/anel sem interseção, abertura sem alterar a posição dos cards, painel dentro da viewport, Escape/foco e clique fora. WebKit: duas jornadas aprovadas, incluindo os novos cenários e a navegação responsiva. TypeScript, lint e formatação aprovados.

Capturas inspecionadas em `screenshots/fix-desktop-menu/`, com dados sintéticos isolados. Sem alteração de banco, API, autenticação ou cálculos.
