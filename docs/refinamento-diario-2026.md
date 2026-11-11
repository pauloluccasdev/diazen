# Acompanhamento diário — primeiro incremento

Aprovado pelo proprietário em 11/11/2026 após discovery de 10/11. Extensão controlada do MVP; os DOCX e suas cópias geradas preservam a baseline. Reutiliza Next.js/Supabase e Dark Premium. Branch de funcionalidade a partir da main homologada; revisão/PR final pelo proprietário, sem merge automático na main.

## Escopo e aceite

- RD-01: fases não sobrepostas, com nome, início/fim, objetivo e próximo marco opcional. Nenhuma fase ou meta pessoal é criada automaticamente. Escrita somente no ACTIVE; histórico encerrado somente leitura. Configuração inicial sugerida é Consistência e Base, 10/11–31/12/2026, sujeita à vigência real do projeto.
- RD-02: dashboard destaca data, fase, registros e ações rápidas. Treino planejado não é exibido sem planejamento cadastrado (agenda pertence ao próximo incremento). Falhas no sono não derrubam o restante do painel.
- RD-03: check-in diário parcialmente preenchível: horas de sono manuais, qualidade percebida, fadiga, dores musculares e disposição (0–4 com rótulos), o que funcionou, dificuldade e adaptação para amanhã. Ausência não significa zero. Sem diagnóstico, escore agregado, exigência retroativa ou inferência de prontidão. Consulta por data e edição somente no ACTIVE.
- RD-04: eventos alimentares opcionais com contexto rotina/social/perda de controle percebida, categoria opcional, fome/saciedade 0–10 opcionais, gatilhos e observação. Registro independente de alimentos/calorias. Sem culpa, compensação, restrição ou recomendação automática. Permite excluir eventos próprios no ACTIVE.
- RD-05: preferências da conta ocultam peso, calorias e acesso às fotos no dashboard, inclusive resumos offline, textos, comparações e calorias de atividades. Não apagam dados nem bloqueiam consulta deliberada aos módulos. Preferências não são mecanismo de autorização. Requer limpeza/invalidação do resumo offline anterior.
- RD-06: mudanças de unidade invalidam referências nutricionais incompatíveis; resposta online atrasada não troca a unidade de um alimento modificado. Valores manuais continuam possíveis e nunca há conversão implícita de unidade/ml/g. Versões alimentares têm início de vigência explícito; as antigas conservam como referência a data de criação. Sem alterar snapshots alimentares existentes.

RF relacionados: 003–009, 012–020, 022; RNF 002–004, 007–014, 016. RLS, guardas de ACTIVE, FK composta por proprietário, constraints e RPCs transacionais complementam a UI. Novas tabelas integram exportação, backup e exclusão. Logs não recebem textos comportamentais. Cache offline não recebe check-ins, fases nem contexto alimentar.

## Fora deste incremento

Prescrição, IA/OCR, anexos de planos, fichas/séries, agenda de treino, revisão semanal/mensal, conquistas, novas integrações e alterações automáticas de metas. Imagens fornecidas não são transcritas ou persistidas como teste.

## Verificação

Migrações incrementais em PGlite: proprietário, constraints, sobreposição/concorrência serializada, ACTIVE, histórico, datas, ausência/zero, exportação e cascata. Playwright Chromium/WebKit: preferências e offline, formulário parcial, contexto alimentar independente, fases e marco, unidade após consulta, planos futuros e histórico. Axe/teclado/mobile. Testes usam dados sintéticos; nenhuma atividade ou refeição real é corrigida sem instrução específica.

## Preparação e evidência da entrega

Em 11/11/2026 foram executados backup cifrado/verificado e aplicação individual das migrações 016/017 no Supabase configurado. Conferidos RLS das quatro novas tabelas, bloqueio de anônimo, RPC autenticada e preenchimento da vigência antiga pela data de criação. Nenhuma fase, check-in, preferência ou contexto pessoal foi criado por ferramenta. Documentos de planos e registros de consumo existentes não foram reescritos. As migrações aplicadas são imutáveis; correções posteriores usam nova migração.

Verificações locais: 70 testes de banco aprovados; 46 cenários Chromium aprovados e uma amostra privada opcional ausente. Build, lint, formatação e TypeScript verificados. Captura sintética do novo bloco em `artifacts/daily-overview-320.png`. WebKit depende da CI, pois as bibliotecas de sistema não estão presentes no ambiente local. A primeira fase sugerida só é salva após confirmação no formulário, dentro da vigência do projeto.
