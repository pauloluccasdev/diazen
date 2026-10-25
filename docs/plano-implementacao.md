# Plano de implementação do MVP 0.1

Execução autorizada pelo proprietário em 21/10/2026: continuar o desenvolvimento até concluir, em branches de funcionalidade a partir de `develop`, com validação, commits, merge e push. `main` permanece reservada ao PR final do proprietário.

## Incrementos

- [x] Fundação Next.js, interface inicial e manifesto PWA.
- [x] Login, logout e painel protegido (login e renovação validados também no Supabase real).
- [x] Cadastro, confirmação de e-mail e recuperação de senha implementados; proprietário confirmou recebimento e troca de senha pelo e-mail padrão em 22/10/2026. Confirmação de cadastro ainda requer evidência própria.
- [x] Refinamento técnico e migrações com autorização, integridade e auditoria (001 a 008 após reset autorizado; 009 aplicada incrementalmente, sem novo reset).
- [x] Onboarding, projetos, metas, estados e histórico, com teste integrado à persistência local.
- [x] Hidratação, peso, medidas e atividades.
- [x] Diário alimentar manual e composição informada, com ausência distinta de zero.
- [x] RF-009 incluído pelo proprietário na revisão final: alimentos salvos, receitas, recentes, favoritos e cópia confirmada; homologação PostgREST real com contas sintéticas.
- [x] Fotos privadas, otimização, galeria e comparação (Storage real validado com contas sintéticas).
- [x] Dashboard integrado, leitura offline limitada e privacidade da conta (configuração operacional real pendente).
- [x] Testes integrados locais, acessibilidade automática e documentação operacional.
- [x] Fluxos essenciais, isolamento e concorrência no Supabase real; prévia HTTPS e CI Chromium/WebKit aprovados.
- [x] Etapa final técnica: restauração isolada com serviços reais do Supabase local, Auth, arquivos pela API do Storage, RLS e reaplicação de exclusão.
- [ ] Etapa final do proprietário: revisão de layout, instalação/uso no celular e aprovação operacional. Restauração e layout foram explicitamente reservados para o final em 22/10/2026; o ensaio foi concluído nesta etapa.

## Condições para declarar conclusão

Fluxos F-01 a F-07 persistidos; RF de prioridade Alta atendidos; autorização e constraints testadas no banco; PWA e fotos verificadas; backup, restauração e exclusão de conta documentados. A entrega de código não substitui a homologação em Supabase, e-mail e hospedagem reais, nem a revisão legal ou visual pelo proprietário.

## Dependências externas observadas

O Supabase anteriormente usado pelo Planna foi reutilizado e resetado por autorização do proprietário; configuração local, migrações e fluxos essenciais foram verificados no serviço real. Consulte [a evidência de homologação](homologacao-supabase.md). Recuperação por e-mail padrão confirmada pelo proprietário; prévia hospedada disponível. Confirmação de cadastro, dispositivos físicos e aprovação final continuam pendentes. O ensaio de restauração com os serviços reais do Supabase local passou em runtime nativo, sem Docker, conforme `docs/operacao.md`. Não tratar a revisão de layout e a restauração como bloqueios intermediários: executá-las na etapa final acordada.
