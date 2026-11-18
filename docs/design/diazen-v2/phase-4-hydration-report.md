# Fase 4 — Hidratação (em desenvolvimento)

Branch `feat/diazen-v2-hidratacao-fiel`, criada da develop `ddbe1a1`. Referências R05/R06 abertas antes da implementação. Esta fase ainda não está contabilizada como concluída.

## Implementação

Desktop claro/escuro com meta circular, resumo, ação de registro, gráfico de sete dias, lançamentos em ordem de horário, volumes rápidos e recipientes. Mobile usa composição vertical, anel, meta/restante, garrafa editorial e registros com horário e menu. Componentes de contexto/cabeçalho foram extraídos para `module-frame.css` e compartilhados com Alimentação; Alimentação e dashboard passaram nas regressões direcionadas Chromium e WebKit desse compartilhamento.

O gráfico distingue dias sem registros e usa a meta vigente em cada data. A ausência de consumo não vira zero. O percentual e o restante só aparecem quando os dados permitem cálculo. Não há ajuste automático de meta por treino, clima ou peso.

Recipientes pertencem à conta e copiam nome/volume para o formulário de consumo. Não são FK dos lançamentos. Alterar ou remover um recipiente não reescreve histórico. A gravação continua usando as ações existentes e o projeto ativo resolvido no servidor. Atalhos de volume preenchem o formulário e exigem confirmação; GET não grava consumo.

## Ampliação de dados aprovada

Migração `202611170019_water_containers.sql`, aplicada incrementalmente no ambiente hospedado em 17/11/2026 após verificar dependências e o histórico existente: tabela da conta com UUID, proprietário Auth/cascade, nome de até 60 caracteres (compatível com `container_label`), volume inteiro 1–5000 ml e criação. Limite de 50 por proprietário com trava transacional, identidade imutável, RLS, grants mínimos, bloqueio de conta em exclusão e auditoria. Cadastro é exportado e incluído no dump completo do banco. Nenhum lançamento anterior é modificado.

Aplicação remota verificada: RLS, CRUD autenticado, negação anônima, policy de proprietário, triggers, checks de valores e FK com cascade. SHA-256: `8698544a01e4b0628cd02c9bb930445062f674a40e12d83f34ac720722ffba8e`. O histórico remoto prévio inclui 001–012 e 016–018; a nova tabela não depende de 013–015, que não foram reaplicadas nem declaradas instaladas. Nenhum lançamento existente foi alterado. Nunca reaplicar o bundle em ambiente existente.

## Verificações já executadas

- Os 88 testes de banco/unidade passaram, incluindo cinco cenários novos: isolamento, anônimo, limites, identidade, preservação de consumo, exclusão e metas temporais.
- Ensaio PostgreSQL 17.11 por socket privado: dump/restore com recipientes sintéticos, reaplicação de exclusão e RLS aprovados. Não tocou banco remoto; Auth/Storage são adaptadores e os arquivos são locais.
- Jornada Chromium de cadastro sem projeto ativo, seleção, consumo, remoção, exportação e registros consecutivos por atalho aprovada após corrigir o feedback que desaparecia quando a linha era removida. Confirmação central permanece montada até o usuário fechar o retorno.
- Capturas e axe em 320/390/768/1366/1672, temas claro/escuro, com dados sintéticos equivalentes às referências. WebKit final aprovado em 37,1s, incluindo cadastro sem projeto ativo, dois consumos consecutivos com reset/UUID novo, edição real em menu de 320 px e checagem de exceções. Formulário aberto também passou em axe e overflow.
- Teste completo de registros aprovado após atualização para o novo menu/modal. A execução Chromium completa inicial teve 50 aprovados, um ignorado e uma falha por referência ao título antigo; após correção, os três cenários direcionados (Hidratação, exclusão de projeto e dashboard) passaram em 22,9s. O cenário de Hidratação ampliado passou novamente em Chromium (12,3s) e WebKit (37,1s).
- Os 26 cenários agent-browser passaram: registros, edição/exclusão, data retroativa, falha recuperável, fotos, offline, segunda conta, paginação, exportação e exclusão da conta. Menus nativos são exercitados com foco e Enter, sem cliques forçados.
- Build, TypeScript, ESLint e formatação locais aprovados. O aviso de dependência do framework permanece documentado em [dependency-review.md](dependency-review.md); a manutenção será feita em branch própria.

## Capturas e limites

- [Desktop claro](screenshots/phase-4-hydration/light-1672.webp)
- [Desktop escuro](screenshots/phase-4-hydration/dark-1672.webp)
- [Mobile 390](screenshots/phase-4-hydration/viewport-390.webp)
- [Mobile 320](screenshots/phase-4-hydration/viewport-320.webp)
- [Tablet 768](screenshots/phase-4-hydration/viewport-768.webp)
- [Edição em 320](screenshots/phase-4-hydration/edit-320.webp)

Comparação visual contra R05/R06, sem molduras de aparelho. O percentual mantém o arredondamento real (2500/4000 = 62,5%, exibido como 63%); não copia o 62% inconsistente do mockup. Datas, horários, ausência de dados e versões de meta vêm dos registros. Imagens são decorativas e não recipientes pessoais.

Sem homologação em aparelho físico, medição pixel a pixel ou aprovação visual do proprietário. A prévia e a CI remota ainda serão verificadas; a fase só será contabilizada como concluída após essa confirmação. Main não recebe merge automático.

O cadastro também está disponível em `/painel/agua/recipientes`, sem exigir projeto ativo. No histórico de projetos, a tela mantém registros operacionais somente leitura e oferece acesso explícito ao cadastro da conta em página separada.
