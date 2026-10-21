# Decisões técnicas

## Confirmado — 21/10/2026

- Nome do produto: **Diazen**; empresa: **Lucx Tech**.
- Escopo inicial: MVP 0.1, conforme documentação versão 1.1 fornecida.
- **Banco de dados no Supabase**, definido pelo proprietário ao preparar este repositório.
- **Next.js** como framework da aplicação, aprovado pelo proprietário na discussão de stack.

A decisão pelo Supabase atualiza o item de banco ainda pendente na seção 9 da especificação original. Os documentos originais foram preservados sem alterações.

## Decisão — Next.js — 21/10/2026

- **Contexto:** PWA mobile-first para uso pessoal inicial, priorizando baixo custo e facilidade de manutenção; Vercel ou outra hospedagem gratuita em avaliação.
- **Decisão:** adotar Next.js como framework da aplicação.
- **Motivo:** preferência do proprietário pela alternativa que permite reunir interface React e código de servidor no mesmo projeto.
- **Impacto:** o frontend e as operações de servidor da aplicação poderão ser organizados em um único projeto Next.js, mantendo o banco no Supabase. A implementação deverá preservar autorização no servidor, integridade e leitura offline limitada, sem edição offline.
- **Requisitos relacionados:** RF-018, RF-022; RNF-002, RNF-009, RNF-011 e RNF-014.
- **Limites da aprovação:** não define versão, roteador, linguagem, bibliotecas auxiliares, autenticação, storage ou hospedagem; não autoriza provisionamento ou criação de schema nesta etapa.

## Decisão — Fundação da aplicação — 21/10/2026

- **Contexto e autorização:** após escolher Next.js, o proprietário autorizou iniciar a proposta de stack e definiu branches por funcionalidade, commits de entregas concluídas e push para PR/review próprio.
- **Implementação:** Next.js 16, React 19, TypeScript, App Router, Tailwind CSS 4 e npm com lockfile; Node.js 24 para desenvolvimento e CI. Lucide fornece ícones; fontes usam fallback local do sistema sem download externo.
- **Motivo:** manter interface e futura lógica de servidor no mesmo projeto, com verificação de tipos e deploy compatível com Vercel.
- **Impacto:** primeira entrega contém apenas fundação, prévia do dashboard e PWA com fallback público offline. Não inclui autenticação, persistência ou cache de dados pessoais. RF-018 e RF-022 atendidos apenas parcialmente; RNF-007, RNF-008, RNF-009 e RNF-014 orientam a base.
- **Direção aprovada para as próximas etapas:** Supabase Auth, Storage privado e Vercel conforme proposta anterior aceita ao iniciar. Contas, configurações, schema e deploy continuam sem provisionamento e exigem refinamento operacional.
- **Fluxo Git inicial:** substituído pela decisão de integração em `develop` abaixo.
- **Identidade:** ícone geométrico provisório para instalação; não representa aprovação final de marca.

## Decisão — Integração em develop — 21/10/2026

- **Contexto:** o proprietário definiu que criará a branch `develop` para concentrar o desenvolvimento antes do PR final.
- **Decisão:** cada funcionalidade parte da `develop` atualizada em branch própria, com commits por entrega concluída. Após validar, o agente pode fazer merge na `develop` e push, iniciando a próxima branch a partir da integração atualizada.
- **Motivo:** permitir desenvolvimento contínuo, mantendo a revisão final concentrada no PR de `develop` para `main`.
- **Impacto:** substitui o fluxo anterior de PR por funcionalidade para `main`. O PR final e o code review continuam com o proprietário; o agente não realiza merge na `main` nem force push.
- **Requisitos relacionados:** RNF-014; alteração do processo de desenvolvimento, sem mudança de escopo funcional.

## Decisão — Primeiro incremento de autenticação — 21/10/2026

- **Contexto:** continuação autorizada a partir da `develop`, já contendo a fundação aprovada.
- **Decisão:** integração SSR do Supabase Auth com cookies, renovação via proxy e validação remota com `getUser` no painel. Usar somente URL e chave publicável; sem schema próprio de credenciais ou chave privilegiada.
- **Motivo:** aproveitar a autenticação gerenciada e manter a proteção efetiva no servidor.
- **Impacto:** login, logout do navegador atual, painel privado, mensagens genéricas para falha de acesso e bloqueio offline. RF-001 parcial; RNF-001, RNF-002, RNF-009 e RNF-014. Cadastro, recuperação, SMTP e teste real de renovação de sessão ficam pendentes. Não foram provisionados serviços.
- **Verificação:** testes de navegador contra simulador HTTP local, sem dados reais. A configuração e homologação com Supabase real devem seguir o README antes do uso pessoal.

## Pendente de refinamento

- Hospedagem e divisão das responsabilidades entre Next.js e serviços do Supabase.
- Configuração de Supabase Auth, sessões, recuperação e SMTP.
- Configuração do Supabase Storage privado e processamento de imagens.
- Modelo relacional, migrações, RLS, constraints, auditoria e tratamento da exclusão de conta.
- Fonte nutricional e licença, unidades, metas e vigência temporal.
- Parâmetros de upload, desempenho, backup, restauração, retenção e custos.
- Seleção final dos requisitos de prioridade Média para o lançamento.

O campo conceitual `User.password_hash` do documento não define uma implementação de autenticação. Caso Supabase Auth seja adotado, as credenciais devem permanecer sob responsabilidade do serviço.

## Registro de novas decisões

Registrar data, contexto, decisão, motivo, impacto e requisitos afetados. Mudanças no escopo congelado exigem aprovação explícita conforme RB-11; propostas não devem ser tratadas como decisões aprovadas.

## Decisão — Cadastro e recuperação — 21/10/2026

Continuação do RF-001: confirmação e recuperação por token hash validado pelo Supabase, sem redirecionamento arbitrário. Origem definida por configuração confiável, nunca pelo Host da requisição. Novas senhas de 12–128 caracteres, confirmação local e validação no servidor. Mensagens de envio genéricas para evitar enumeração. SMTP, políticas no provedor e testes de entrega/expiração ainda dependem da homologação real. Não há login social ou armazenamento próprio de senhas.
