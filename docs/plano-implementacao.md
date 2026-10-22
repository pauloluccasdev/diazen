# Plano de implementação do MVP 0.1

Execução autorizada pelo proprietário em 21/10/2026: continuar o desenvolvimento até concluir, em branches de funcionalidade a partir de `develop`, com validação, commits, merge e push. `main` permanece reservada ao PR final do proprietário.

## Incrementos

- [x] Fundação Next.js, interface inicial e manifesto PWA.
- [x] Login, logout e painel protegido (integração real pendente de ambiente).
- [x] Cadastro, confirmação de e-mail e recuperação de senha (homologação de e-mail pendente).
- [x] Refinamento técnico e migrações com autorização, integridade e auditoria (revisão/aplicação remota pendentes).
- [ ] Onboarding, projetos, metas, estados e histórico.
- [ ] Hidratação, peso, medidas e atividades.
- [ ] Diário alimentar manual e composição informada, com ausência distinta de zero.
- [ ] Fotos privadas, otimização, galeria e comparação.
- [ ] Dashboard integrado, leitura offline limitada e privacidade da conta.
- [ ] Testes integrados, acessibilidade, documentação operacional e auditoria de conclusão.

## Condições para declarar conclusão

Fluxos F-01 a F-07 persistidos; RF de prioridade Alta atendidos; autorização e constraints testadas no banco; PWA e fotos verificadas; backup, restauração e exclusão de conta documentados. A entrega de código não substitui a homologação em Supabase, e-mail e hospedagem reais, nem a revisão legal ou visual pelo proprietário.

## Dependências externas observadas

Ainda não há configuração de Supabase real no workspace nem ferramentas conectadas ao serviço. Docker não está disponível nesta distribuição WSL. Prosseguir com implementação e testes locais sem provisionar serviços; manter pendências reais explícitas.
