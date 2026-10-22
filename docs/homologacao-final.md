# Homologação final do MVP

Esta lista reúne decisões e verificações de encerramento. Itens pendentes não são considerados aprovados pela passagem da CI. O proprietário realiza o review e o PR de `develop` para `main` ao concluir esta etapa.

## Layout e uso

Prévia pública: <https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app>. Não exige conta Vercel; o painel exige login Diazen. Usar dados fictícios até concluir a homologação.

Capturas locais reproduzíveis:

```bash
CAPTURE_REVIEW=1 npx playwright test tests/accessibility.spec.ts --project=chromium
```

Requer build prévio. A configuração do teste utiliza Auth/Storage simulados e PostgreSQL embarcado, sem conexão ao Supabase remoto. Capturas em `artifacts/visual-review/chromium/` cobrem abertura, login, cadastro, recuperação, privacidade, termos, dashboard, projetos, água, peso, medidas, atividades, alimentação, biblioteca de alimentos/receitas, fotos e perfil em 390 e 1280 px. Mostram os estados iniciais dos módulos com um projeto ativo fictício; não documentam todos os estados preenchidos, erros ou fotos reais. Os arquivos ficam ignorados pelo Git.

- [ ] Aprovação visual reaberta pelo proprietário em 22/10/2026 por divergências com o protótipo. Revisão geral e limites em [revisão visual](revisao-visual.md); validar novamente as telas publicadas.
- [ ] Instalar e abrir a PWA no celular disponível; registrar sistema e navegador.
- [ ] Consultar dashboard online, perder conexão e verificar leitura limitada, aviso e bloqueio de escrita; restaurar conexão e encerrar sessão.
- [ ] Conferir zoom 200%, teclado e leitor de tela nas telas essenciais.
- [ ] Registrar duração de navegação e gravação em rede comum e dispositivo móvel; investigar operações usuais acima da meta proposta de aproximadamente 2 segundos.

## Conta, dados e operação

- [x] Recuperação pelo e-mail padrão recebida e senha redefinida, confirmadas pelo proprietário em 22/10/2026.
- [ ] Confirmar cadastro pelo e-mail padrão no mesmo navegador da solicitação; a recuperação acima não comprova esse fluxo.
- [x] Ensaio nativo isolado de banco e arquivos locais com dados sintéticos, RLS e reaplicação de exclusões: `npm run test:restore`, executado em 22/10/2026.
- [x] Ensaio controlado com Auth, PostgREST e Storage reais do Supabase local em 22/10/2026: `npm run test:restore:services`; login restaurado, arquivos por API/checksums, RLS e exclusão reaplicada. Não foi executada restauração de outro projeto hospedado; limites em [operação](operacao.md).
- [x] Destino local indicado pelo proprietário; comandos de snapshot/ledger cifrados e verificador implementados, com cópias reais e teste de imagens do Storage em 22/10/2026.
- [ ] Definir frequência e retenção dos backups locais; escolha de execução manual ou diária solicitada ao proprietário.
- [ ] Confirmar responsável, contato, finalidade, retenção e textos de privacidade/termos adequados ao uso pessoal escolhido.
- [x] RF-009 incluído por decisão do proprietário em 22/10/2026: alimentos salvos, receitas, favoritos, recentes e cópia confirmada de refeições.

## Publicação após review

- [ ] Proprietário realiza o PR/review de `develop` para `main`.
- [ ] Configurar variáveis de produção, origem e callbacks para o domínio aprovado, seguindo [publicação](publicacao.md).
- [ ] Verificar saúde, login, sessão e arquivos privados no domínio de produção antes de iniciar os registros pessoais.

Não registrar senhas, códigos de e-mail, credenciais, fotos ou informações de saúde nas evidências de aprovação.

## Auditoria automatizada de requisitos

Em 22/10/2026, a bateria com `agent-browser` passou em 26 grupos no laboratório isolado, com dados fictícios. Foram verificadas 16 telas com axe e seis larguras por tela. O roteiro reproduz falha de leitura e confirma a recuperação com os registros preservados; isso corrigiu o botão “Tentar novamente”, que antes reapresentava o erro sem uma nova leitura do servidor. Logs estruturados foram acrescentados sem copiar dados sensíveis.

Executar novamente: `npm run build` e `npm run test:agent-browser`. Resultados e capturas ficam em `artifacts/agent-browser/`; cobertura e limites na [matriz de requisitos](matriz-requisitos.md). Essa evidência não marca automaticamente como concluídos os itens manuais e operacionais acima.
