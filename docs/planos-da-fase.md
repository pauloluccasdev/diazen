# Planos da fase — próximo incremento

Continuação autorizada em 11/11/2026 após Qualidade/validate aprovado no PR 13. Por autorização explícita do proprietário, o agente mesclou somente esse PR na main em 6584394, atualizou a main local por fast-forward e criou feat/planos-da-fase. Isso não autoriza automaticamente o merge de futuros PRs.

## Entrega incremental

- Central Meus planos, associada ao projeto e opcionalmente à fase, com versões e início de vigência.
- Alimentação: reutilizar editor/versionamento existentes, permitir criar manualmente sem PDF e associar a fase.
- Hidratação: faixa diária em ml, distribuição por horário, alternativas por contexto e orientações fornecidas pelo usuário/profissional. Escolher um valor e confirmar para atualizar a meta vigente a partir de hoje; nunca deduzir pelo peso ou pelo treino. Não redefinir metas anteriores ou inferir eletrólitos.
- Musculação: fichas nomeadas A–D ou livres, exercícios, séries planejadas, faixa de repetições, descanso e observações. Dias da semana opcionais. Consultar o que foi planejado para hoje e registrar execução básica (duração/esforço opcional), criando uma atividade ou vinculando uma existente escolhida explicitamente. Sem duplicação de atividade ao repetir a confirmação.
- Referência visual privada: anexar imagem otimizada com metadados removidos e vinculá-la a uma versão revisada. Sem OCR/IA, transcrição automática ou cópia das imagens pessoais como fixture. PDFs com texto mantêm o importador existente; retenção de PDF original não entra neste incremento.
- Histórico de versões imutável, leitura em projetos encerrados, exportação e exclusão. Notas, imagens e planos não entram no resumo offline. Offline bloqueia gravações.

## Próximas fatias

Séries efetivamente realizadas e comparação por exercício, volume semanal, agenda por ocorrência e adaptações com histórico, revisões semanais/mensais e conquistas permanecem no roadmap. Esta entrega constrói os cadastros e vínculos necessários; não interpreta mais volume como melhor desempenho nem prescreve progressão.

## Aceite e verificação

Somente proprietário; gravações operacionais no ACTIVE; datas na vigência; versões não alteram consumo ou atividades anteriores; zero conhecido e ausência distintos. Anexos privados, otimizados e fora da galeria corporal, com limpeza durável, backup e exclusão. Testes sintéticos em banco e navegador devem cobrir dados inválidos, versões futuras, encerramento, vínculo de atividade existente e repetição de solicitação. Validar leitura móvel/teclado e não usar dados reais como testes.

## Relação com os requisitos

Extensão aprovada do discovery, relacionada a RF003–009 (projeto/diário e alimentação), RF012–020 (registros e consulta), RF022 (privacidade) e RNF002–004, 007–014 e 016. Mantém RB de projeto ACTIVE único, destino resolvido no servidor, dados ausentes distintos de zero e histórico fechado somente leitura. Cadastros estruturados de fichas e referências hidratacionais ampliam o baseline por autorização explícita; não introduzem prescrição ou integrações novas.

## Operação e limites

A migração 018 deve ser aplicada incrementalmente após 017 e backup cifrado verificado. Imagens usam o bucket privado existente com metadados próprios e fila `plan_asset_cleanup`, fora da galeria corporal. `npm run privacy:purge` processa tentativas pendentes; um upload confirmado após resposta perdida é preservado. A fila não depende da permanência do usuário em Auth. Backup inclui os bytes; exportação JSON inclui metadados, versões e vínculos, sem bytes das imagens.

A consulta mostra as últimas 20 versões e 50 imagens; o detalhe explícito de uma versão continua acessível. O formulário de execução lista até 50 atividades da data consultada. Não há agendamento por ocorrência, inferência de execução ou interpretação clínica de RPE. A vigência da fase é congelada na versão: mudanças posteriores exigem nova versão. O vínculo pode ser removido sem apagar a atividade.

## Verificação desta entrega

Build, TypeScript, ESLint e formatação aprovados. Banco: 78 testes aprovados; após o ajuste explícito de privilégios, os seis cenários da nova migração foram repetidos e aprovados. Regressão Chromium: 47 aprovados e um cenário opcional de amostras privadas ignorado. A regressão alimentar posterior aprovou sete cenários; o novo cenário ampliado identificou perda de feedback ao remover um vínculo, corrigida mantendo o diálogo fora do elemento removido. O cenário completo novo foi repetido e aprovado, incluindo cadastro alimentar manual com fase/imagem, exclusão do vínculo preservando a atividade e acessibilidade/overflow a 320 px. WebKit e auditoria integral são executados também no CI.

Migração 018 aplicada ao Supabase configurado em 11/11/2026 (00:47 UTC de 12/11), após snapshot cifrado e verificado. RLS, bloqueio anônimo, fila administrativa e políticas de Storage conferidos; sem reset, transcrição de imagens ou criação de registros pessoais. Em outras instalações, aplicar incrementalmente após 017. Backups e relatórios operacionais permanecem privados fora do Git.
