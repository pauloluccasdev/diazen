# Revisão de dependências — 17/11/2026

Durante a Fase 4, `npm audit --json` atualizou o inventário: 16 nós de dependências reportados (7 moderados, 9 altos, nenhum crítico). Isso não equivale a 16 falhas independentes; vários nós herdam o mesmo aviso transitivo. Artefato local: `artifacts/diazen-v2-current-audit.json`. Nenhuma dependência foi alterada por esta inspeção.

Os avisos do Next abrangem a versão instalada 16.4.2. O fornecedor identifica 16.4.5 como correção para [uso combinado de use cache/unstable_cache](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) e [metadados de streams em cache aninhado](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8). A busca no código/configuração não encontrou `use cache`, `unstable_cache` ou `cacheComponents`; isso delimita os caminhos inspecionados, sem substituir a atualização.

Há também avisos transitivos de globbing na cadeia de lint. Não executar `npm audit fix --force`: a sugestão automática inclui downgrade de eslint-config-next para 14.2.35 e não constitui plano de compatibilidade. A atualização do banco de avisos de picomatch consultada não anuncia versão corrigida; não inventar correção ou alterar major transitiva sem verificar os consumidores.

Plano da manutenção incremental, executado em branch própria após a integração da Hidratação: confirmar versões publicadas, aplicar correção compatível do framework/configuração, avaliar transitivos com `npm explain`, repetir auditoria/build/tipos/lint/testes completos e documentar quaisquer avisos sem correção disponível. Não trocar a stack, desativar auditoria ou declarar risco resolvido com base apenas em build aprovado. Main permanece sem merge automático.

## Manutenção executada em branch própria

`fix/diazen-v2-dependencias`, criada da develop `0ed58fb`. Next.js e eslint-config-next atualizados juntos para **16.4.5**, com versões exatas e lockfile. `typescript-eslint` transitivo atualizado dentro da faixa suportada para **8.73.0**; o mantenedor passou a depender de minimatch `^11.0.1`, resolvido como **11.0.9**. Não houve override de major nem downgrade de configuração.

Auditoria posterior: **zero avisos em dependências de produção** (`npm audit --omit=dev --json`). A auditoria completa ainda aponta **14 nós altos da cadeia de desenvolvimento**, todos relacionados ao aviso de picomatch; isso não representa 14 vulnerabilidades independentes. A versão mais recente publicada consultada continua 4.0.7, abrangida pelo aviso. Não declarar auditoria completa zerada. Não foi encontrado caminho de produção que receba padrões glob fornecidos por usuário; as ferramentas de lint usam padrões do repositório. Reavaliar quando houver correção suportada pelo mantenedor.

A regressão WebKit identificou também um pré-carregamento interrompido ao navegar rapidamente entre datas do dashboard. O trace confirmou requisições de `/painel/agua` com `next-router-prefetch: 1` e respostas 200. Links e formulários GET do dashboard/calendário/seletor agora carregam páginas privadas somente quando abertos/submetidos, estendendo o padrão já usado na navegação principal. A checagem estrita de exceções foi mantida; os três cenários WebKit direcionados passaram em 1,3 min.

Build aprovado na primeira execução com a versão corrigida. Tipos, lint e formatação aprovados. A regressão Chromium final terminou com 51 aprovados, um cenário opcional ignorado e código de saída 0 (2,2 min). Os três cenários WebKit direcionados terminaram com código 0. CI remota ainda pendente. A primeira suíte WebKit completa teve 50 aprovados, um ignorado e a falha de pré-carregamento acima; não foi omitida nem filtrada. Main permanece sem merge automático.
