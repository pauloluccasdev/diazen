# Orientações para agentes de IA

## Leitura antes de desenvolver

1. Leia `README.md` e `docs/decisoes-tecnicas.md`.
2. Leia integralmente `docs/requisitos.md` e `docs/design-system.md`.
3. Consulte `design/Diazen_Design_Tokens_MVP_0_1_v1_1.json` para valores visuais e `docs/referencias/` para composição e acabamento.
4. Em caso de dúvida sobre extração, consulte os DOCX em `docs/originais/`.

## Decisões e precedência

- Produto: Diazen, da Lucx Tech. “Projeto 30 Trincado” é exemplo de projeto do usuário, não o nome do aplicativo.
- Banco: Supabase, conforme decisão do proprietário posterior aos documentos. Base em Next.js, TypeScript, App Router e Tailwind; Supabase Auth, Storage privado e Vercel são a direção aprovada, com configuração ainda pendente. Consulte `docs/decisoes-tecnicas.md`.
- Não escolha stack, instale frameworks, crie schema definitivo ou provisione serviços sem que a tarefa autorize essa etapa.
- Requisitos funcionais delimitam escopo; Design System e tokens orientam implementação visual; o showcase é ilustrativo.
- As cópias Markdown são geradas dos DOCX. Atualize a fonte documental antes de regenerá-las; registre decisões posteriores em `docs/decisoes-tecnicas.md`.
- Divergências entre documentos e tokens devem ser apontadas e resolvidas explicitamente, sem inventar requisitos.

## Invariantes do MVP

- Apenas um projeto ACTIVE por usuário. Gravações resolvem o projeto ativo no servidor; selecionar histórico não muda o destino dos registros.
- DRAFT não recebe registros operacionais; COMPLETED e ARCHIVED são somente leitura, ressalvados procedimentos legais de privacidade/exclusão.
- Dados ausentes são diferentes de zero. Não inventar composição nutricional ou inferir aderência.
- Peso é único por usuário/data; medidas são únicas por tipo/usuário/data.
- Hidratação é soma dos lançamentos e usa a meta vigente na data.
- Fotos são privadas e otimizadas, com remoção de metadados sensíveis.
- Autorizar acesso no servidor e isolar dados por proprietário, inclusive storage.
- Offline permite somente leitura limitada ao cache; bloquear escrita e informar o estado.
- Navegação principal por dashboard. Login social, barra inferior fixa, IA, Strava e prescrição de dietas/treinos não são requisitos do MVP.

## Ao implementar

- Relacione alterações aos RF/RNF/RB pertinentes e respeite o controle de mudanças do escopo.
- Versione migrações quando a modelagem for aprovada; jamais exponha chaves secretas, credenciais ou dados pessoais no Git.
- Para Supabase, planeje políticas RLS e constraints no refinamento técnico, sem confiar apenas em filtros da interface. Não replique senhas de autenticação em tabelas da aplicação.
- Valide comportamento, autorização, integridade e acessibilidade conforme a mudança. Documente como executar e verificar quando existir código.

## Fluxo Git

- A `develop` é a base de integração. Antes de iniciar cada funcionalidade, atualizar a `develop` e criar `feat/<nome>` ou branch com prefixo adequado a partir dela.
- Fazer commits por funcionalidade concluída, executar as verificações pertinentes e enviar a branch ao remoto.
- O agente está autorizado a realizar merge das branches concluídas na `develop`, validar a integração e fazer push da `develop`. Não sobrescrever alterações remotas nem usar force push.
- Iniciar a próxima branch a partir da `develop` atualizada.
- O proprietário realiza o PR final de `develop` para `main` e o code review ao término do desenvolvimento. Não realizar merge na `main`.
