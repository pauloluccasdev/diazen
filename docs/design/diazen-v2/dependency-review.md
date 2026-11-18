# Revisão de dependências — 17/11/2026

Durante a Fase 4, `npm audit --json` atualizou o inventário: 16 nós de dependências reportados (7 moderados, 9 altos, nenhum crítico). Isso não equivale a 16 falhas independentes; vários nós herdam o mesmo aviso transitivo. Artefato local: `artifacts/diazen-v2-current-audit.json`. Nenhuma dependência foi alterada por esta inspeção.

Os avisos do Next abrangem a versão instalada 16.4.2. O fornecedor identifica 16.4.5 como correção para [uso combinado de use cache/unstable_cache](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) e [metadados de streams em cache aninhado](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8). A busca no código/configuração não encontrou `use cache`, `unstable_cache` ou `cacheComponents`; isso delimita os caminhos inspecionados, sem substituir a atualização.

Há também avisos transitivos de globbing na cadeia de lint. Não executar `npm audit fix --force`: a sugestão automática inclui downgrade de eslint-config-next para 14.2.35 e não constitui plano de compatibilidade. A atualização do banco de avisos de picomatch consultada não anuncia versão corrigida; não inventar correção ou alterar major transitiva sem verificar os consumidores.

Manutenção incremental a executar em branch própria após a integração da Hidratação: confirmar versões publicadas, aplicar correção compatível do framework/configuração, avaliar transitivos com `npm explain`, repetir auditoria/build/tipos/lint/testes completos e documentar quaisquer avisos sem correção disponível. Não trocar a stack, desativar auditoria ou declarar risco resolvido com base apenas em build aprovado. Main permanece sem merge automático.
