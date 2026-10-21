# Diazen

Aplicativo da Lucx Tech para diário, check-in, controle nutricional e evolução física.

**Status:** preparação do MVP 0.1. O framework da aplicação será **Next.js**, com banco de dados no **Supabase**. Base em TypeScript, App Router e Tailwind CSS. O repositório contém a fundação da aplicação e a documentação de referência.

## Antes de desenvolver

Leia [AGENTS.md](AGENTS.md), os [requisitos](docs/requisitos.md), o [Design System](docs/design-system.md) e as [decisões técnicas](docs/decisoes-tecnicas.md). Consulte também os [tokens de design](design/Diazen_Design_Tokens_MVP_0_1_v1_1.json) e a [referência visual](docs/referencias/Showcase%20da%20interface%20do%20Diazen%20em%20modo%20escuro.png).

## Documentação

- `docs/originais/`: os dois DOCX originais, versão 1.1, preservados.
- `docs/requisitos.md` e `docs/design-system.md`: cópias textuais com tabelas para consulta e busca pela IA.
- `docs/referencias/`: showcase fornecido; referência estética, sem ampliar o escopo aprovado.
- `design/`: JSON original dos tokens de design.
- `docs/decisoes-tecnicas.md`: decisões confirmadas e questões ainda abertas.

Para atualizar as cópias Markdown após alterar os DOCX, execute `python3 scripts/extrair_documentacao.py`. O script usa apenas a biblioteca padrão do Python. Imagens incorporadas e diagramação continuam disponíveis nos documentos originais.

## Escopo de referência

PWA mobile-first com autenticação, projetos e metas, diário alimentar manual, hidratação, atividades físicas, peso, medidas, fotografias privadas e dashboard. O MVP não inclui importação por IA, Strava, login social ou relatórios avançados.

## Executar localmente

Use Node.js 24 (arquivo `.nvmrc`) e npm:

```bash
npm ci
npm run dev
```

Abra http://localhost:3000. Nenhuma variável de ambiente é necessária nesta etapa.

## Verificar

```bash
npm run lint
npm run build
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Os testes de navegador iniciam o servidor de produção na porta 3000; deixe-a livre. No Linux/CI, use `npx playwright install --with-deps chromium` quando necessário. A CI executa lint, build, tipagem e os testes de navegador.

## Estado da implementação

- Fundação Next.js com TypeScript, App Router, Tailwind e tokens do Diazen.
- Prévia responsiva do dashboard, sem dados fictícios ou persistência.
- Manifesto e ícones PWA; service worker habilitado somente em produção.
- Offline: aviso de indisponibilidade e cache exclusivo de uma página pública de fallback. Cache de dados pessoais ainda não foi implementado. O fallback permanece legível sem CSS/JavaScript previamente carregado.
- Conta, projetos, registros, integração Supabase e otimização de fotos ainda não estão implementados. Não há schema SQL nem infraestrutura provisionada.

Para verificar a PWA, execute `npm run build` e `npm start`, acesse localhost e confira Manifest e Service Workers nas ferramentas do navegador. Após o worker estar ativo, recarregue a página e simule offline. A instalação depende do navegador; em hospedagem, requer HTTPS.

## Fluxo de desenvolvimento

A `develop` concentra a integração. Cada funcionalidade deve partir da `develop` atualizada em branch `feat/<nome>` (ou `fix/`, `docs/`, conforme a mudança). Faça commits por entrega concluída, valide e envie a branch ao remoto. O agente está autorizado a realizar merge das entregas na `develop`, validar a integração e fazer push. A próxima branch parte dessa `develop` atualizada. O proprietário realiza o PR final de `develop` para `main` e o code review; o agente não realiza merge na `main`.

## Dependências

O lockfile fixa as versões instaladas. `npm audit --omit=dev` não apontou vulnerabilidades na fundação. A auditoria completa apontou um aviso de severidade alta em `braces <=3.0.3`, propagado pela cadeia do ESLint do Next.js (cinco entradas no relatório), sem versão corrigida disponível na instalação. Acompanhar a atualização; não aplicar downgrade automático do framework com `npm audit fix --force`.
