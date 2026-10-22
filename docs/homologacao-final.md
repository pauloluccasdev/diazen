# Homologação final do MVP

Esta lista reúne decisões e verificações de encerramento. Itens pendentes não são considerados aprovados pela passagem da CI. O proprietário realiza o review e o PR de `develop` para `main` ao concluir esta etapa.

## Layout e uso

Prévia protegida: <https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app>. Entrar primeiro com a conta Vercel autorizada e depois com a conta Diazen. Usar dados fictícios até concluir a homologação.

Capturas locais reproduzíveis:

```bash
CAPTURE_REVIEW=1 npx playwright test tests/accessibility.spec.ts --project=chromium
```

Requer build prévio. A configuração do teste utiliza Auth/Storage simulados e PostgreSQL embarcado, sem conexão ao Supabase remoto. Capturas em `artifacts/visual-review/chromium/` cobrem abertura, login, cadastro, recuperação, privacidade, termos, dashboard, projetos, água, peso, medidas, atividades, alimentação, fotos e perfil em 390 e 1280 px. Mostram os estados iniciais dos módulos com um projeto ativo fictício; não documentam todos os estados preenchidos, erros ou fotos reais. Os arquivos ficam ignorados pelo Git.

- [ ] Proprietário aprova composição, legibilidade, identidade e navegação das telas reais.
- [ ] Instalar e abrir a PWA no celular disponível; registrar sistema e navegador.
- [ ] Consultar dashboard online, perder conexão e verificar leitura limitada, aviso e bloqueio de escrita; restaurar conexão e encerrar sessão.
- [ ] Conferir zoom 200%, teclado e leitor de tela nas telas essenciais.
- [ ] Registrar duração de navegação e gravação em rede comum e dispositivo móvel; investigar operações usuais acima da meta proposta de aproximadamente 2 segundos.

## Conta, dados e operação

- [x] Recuperação pelo e-mail padrão recebida e senha redefinida, confirmadas pelo proprietário em 22/10/2026.
- [ ] Confirmar cadastro pelo e-mail padrão no mesmo navegador da solicitação; a recuperação acima não comprova esse fluxo.
- [x] Ensaio nativo isolado de banco e arquivos locais com dados sintéticos, RLS e reaplicação de exclusões: `npm run test:restore`, executado em 22/10/2026.
- [ ] Validar recuperação de Auth e arquivos pela API do Storage hospedados em ambiente isolado, conforme [operação](operacao.md). O ensaio nativo usa adaptadores e não fecha este item.
- [ ] Aprovar frequência, armazenamento cifrado externo e retenção dos backups, incluindo cópia independente e atualizada do ledger de exclusões.
- [ ] Confirmar responsável, contato, finalidade, retenção e textos de privacidade/termos adequados ao uso pessoal escolhido.
- [ ] Fechar a revisão de backlog do RF-009 (conveniências alimentares), registrando inclusão ou adiamento por decisão do proprietário.

## Publicação após review

- [ ] Proprietário realiza o PR/review de `develop` para `main`.
- [ ] Configurar variáveis de produção, origem e callbacks para o domínio aprovado, seguindo [publicação](publicacao.md).
- [ ] Verificar saúde, login, sessão e arquivos privados no domínio de produção antes de iniciar os registros pessoais.

Não registrar senhas, códigos de e-mail, credenciais, fotos ou informações de saúde nas evidências de aprovação.
