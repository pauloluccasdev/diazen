# Fase 2 — Dashboard mobile e tablet

Branch `feat/diazen-v2-mobile-fiel`, criada da develop atualizada após integração da Fase 1. Referência R02 reaberta antes da implementação; a moldura do telefone e a barra do sistema não fazem parte da interface.

## Implementação

- O seletor de projeto torna-se o hero mobile, com nome, datas, progresso temporal e imagem editorial decorativa. Uma única instância mantém consulta funcional por GET; a consulta histórica não ativa projeto nem muda o destino de registros.
- Data anterior/próxima e calendário ficam junto de “Visão de hoje/do dia”. Header, sidebar e faixa de consulta do desktop são preservados.
- Alimentação/água usam proporções assimétricas e composição do protótipo. Calorias/macros e metas vêm das mesmas fontes reais; barras só aparecem com valores e referências completos. Volumes a partir de 1000 ml são apresentados em litros; valores menores continuam em ml.
- Treinos e peso viram faixas horizontais. Modalidade, duração e métricas conhecidas do dia ficam disponíveis; calorias ausentes não viram estimativas. Peso mostra diferença neutra para a medição anterior real do projeto, incluindo sua data no título; o gráfico temporal continua na área de evolução.
- Atalhos abrem o formulário adequado por query de apresentação `registrar=1` e âncora. Somente a interface editável do projeto ACTIVE recebe formulário; ações e validações existentes continuam determinando autorização/destino no servidor. Nenhum comando de gravação foi substituído.
- A margem global herdada pelo disclosure “Mais” foi retirada, reduzindo a altura excedente da navegação inferior. No cenário 390×844, os quatro atalhos ficam visíveis acima da barra.
- CSS mobile organizado por breakpoint; removidos 14 blocos obsoletos do antigo hero duplicado. Atleta/halteres são assets próprios otimizados, conforme [proveniência](editorial-assets.md).

## Arquivos

`components/dashboard/mobile.css`, `project-selector.tsx`, `project-timeline.tsx`, `quick-actions.tsx`; `app/painel/page.tsx`; `lib/dashboard-data.ts` (últimas duas medições autenticadas); `app/painel/[modulo]/page.tsx` e `components/manual-meal-recorder.tsx` (abertura inicial compatível); limpeza em `app/diazen-v2.css`; duas imagens editoriais em `public/images/`. Testes desktop/responsividade/atividades foram ampliados para conferir os novos caminhos e a localização atual do gráfico.

## Verificação

- Build de produção aprovado. O aviso de segurança preexistente do framework, documentado no discovery, permanece separado desta alteração visual.
- Chromium: três cenários direcionados aprovados na última execução (21,2s), incluindo navegação real, registros, consulta, Light/Dark, exportação inalterada e ausência de exceções.
- Capturas e axe nos tamanhos 320, 390, 430 e 768 px; regressão de overflow/teclado em 1024/1440 e desktop amplo no teste compartilhado. Formulários dos atalhos de água/refeição verificados abertos e visíveis.
- WebKit final: os três cenários aprovados (55,2s). A primeira CI identificou duas referências ao antigo `.dashboard-hero` no teste de registros; trocadas pelo seletor/indicador temporal visíveis, preservando toda a jornada de integridade e offline. Esse cenário completo passou localmente em 15,9s. CI completa será registrada antes da integração.
- TypeScript, ESLint e formatação executados; resultados registrados nos logs locais da fase.

## Capturas e limites

- [Mobile390](screenshots/phase-2-mobile/mobile-390.png)
- [Mobile320](screenshots/phase-2-mobile/mobile-320.png)
- [Tablet768](screenshots/phase-2-mobile/tablet-768.png)

Capturas de conta sintética no laboratório, com dados reais persistidos naquele ambiente isolado. Comparação visual realizada contra R02; adaptações refletem métricas disponíveis e metas reais. Sem notificações de fachada, avatar fictício ou status de treino presumido. Não houve homologação em aparelho físico, medição pixel a pixel ou aprovação visual do proprietário. As telas completas dos demais módulos continuam pertencendo às próximas fases.

Prévia do commit de interface `f4c8743`: deployment Vercel READY, `/api/saude` e `/entrar` retornaram 200, `/painel` sem sessão redirecionou a `/entrar` (307). Verificação apenas de leitura, sem autenticar conta do proprietário nem gravar registros reais.
