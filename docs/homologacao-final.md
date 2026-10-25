# Homologação final do MVP

**Homologação funcional e visual aprovada pelo proprietário em 25/10/2026.** Declaração: “homologuei tudo.. está tudo funcionando. Qualquer bug vamos ajustando com o tempo”. O aceite permite encerrar a homologação de uso da versão atual e tratar problemas posteriores como manutenção. É uma confirmação do proprietário; não acrescenta medições, modelos de aparelho ou evidências técnicas que não foram fornecidas.

Esta lista reúne decisões e verificações de encerramento. Itens pendentes não são considerados aprovados pela passagem da CI. O proprietário realiza o review e o PR de `develop` para `main` ao concluir esta etapa.

## Layout e uso

Prévia pública: <https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app>. Não exige conta Vercel; o painel exige login Diazen. Homologação de uso aprovada pelo proprietário em 25/10/2026.

Capturas locais reproduzíveis:

```bash
CAPTURE_REVIEW=1 npx playwright test tests/accessibility.spec.ts --project=chromium
```

Requer build prévio. A configuração do teste utiliza Auth/Storage simulados e PostgreSQL embarcado, sem conexão ao Supabase remoto. Capturas em `artifacts/visual-review/chromium/` cobrem abertura, login, cadastro, recuperação, privacidade, termos, dashboard, projetos, água, peso, medidas, atividades, alimentação, biblioteca de alimentos/receitas, fotos e perfil em 390 e 1280 px. Mostram os estados iniciais dos módulos com um projeto ativo fictício; não documentam todos os estados preenchidos, erros ou fotos reais. Os arquivos ficam ignorados pelo Git.

- [x] Aprovação visual confirmada pelo proprietário em 25/10/2026, encerrando a revisão reaberta em 22/10/2026.
- [x] Uso da PWA aceito na homologação global do proprietário em 25/10/2026; sistema/navegador não informados.
- [x] Comportamento online/offline incluído no aceite global do proprietário em 25/10/2026; sem novo relatório individual de execução.
- [x] Usabilidade e acessibilidade incluídas no aceite global do proprietário em 25/10/2026; os detalhes de cada verificação manual não foram informados.
- [x] Desempenho percebido aceito pelo proprietário em 25/10/2026; nenhuma nova medição numérica fornecida.

## Conta, dados e operação

- [x] Recuperação pelo e-mail padrão recebida e senha redefinida, confirmadas pelo proprietário em 22/10/2026.
- [x] Fluxo de cadastro incluído na homologação global confirmada pelo proprietário em 25/10/2026.
- [x] Ensaio nativo isolado de banco e arquivos locais com dados sintéticos, RLS e reaplicação de exclusões: `npm run test:restore`, executado em 22/10/2026.
- [x] Ensaio controlado com Auth, PostgREST e Storage reais do Supabase local em 22/10/2026: `npm run test:restore:services`; login restaurado, arquivos por API/checksums, RLS e exclusão reaplicada. Não foi executada restauração de outro projeto hospedado; limites em [operação](operacao.md).
- [x] Destino local indicado pelo proprietário; comandos de snapshot/ledger cifrados e verificador implementados, com cópias reais e teste de imagens do Storage em 22/10/2026.
- [ ] Definir frequência e retenção dos backups locais; escolha de execução manual ou diária solicitada ao proprietário.
- [x] Textos e uso pessoal incluídos no aceite global do proprietário em 25/10/2026. O aceite não constitui parecer jurídico nem define novos prazos de retenção.
- [x] RF-009 incluído por decisão do proprietário em 22/10/2026: alimentos salvos, receitas, favoritos, recentes e cópia confirmada de refeições.

## Publicação após review

- [ ] Proprietário realiza o PR/review de `develop` para `main`.
- [ ] Configurar variáveis de produção, origem e callbacks para o domínio aprovado, seguindo [publicação](publicacao.md).
- [ ] Verificar saúde, login, sessão e arquivos privados no domínio de produção antes de iniciar os registros pessoais.

Não registrar senhas, códigos de e-mail, credenciais, fotos ou informações de saúde nas evidências de aprovação.

## Auditoria automatizada de requisitos

Em 22/10/2026, a bateria com `agent-browser` passou em 26 grupos no laboratório isolado, com dados fictícios. Foram verificadas 16 telas com axe e seis larguras por tela. O roteiro reproduz falha de leitura e confirma a recuperação com os registros preservados; isso corrigiu o botão “Tentar novamente”, que antes reapresentava o erro sem uma nova leitura do servidor. Logs estruturados foram acrescentados sem copiar dados sensíveis.

Executar novamente: `npm run build` e `npm run test:agent-browser`. Resultados e capturas ficam em `artifacts/agent-browser/`; cobertura e limites na [matriz de requisitos](matriz-requisitos.md). Essa evidência não marca automaticamente como concluídos os itens manuais e operacionais acima.
