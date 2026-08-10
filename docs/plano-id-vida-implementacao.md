# Plano de Implementação — ID Vida

## Status

Draft — pronto para virar stories formais (`docs/stories/4.x.*`) pelo `@sm` e execução pelo `@dev`.

## Contexto e fontes

Este plano traduz dois documentos de arquitetura (fora do repo, PDFs da Universidade de Terapias,
junho/2026) em trabalho concreto neste código:

- **ID Pessoa** (`ID-Pessoa-meDIZ-v1.pdf`) — já implementado no `develop` como a feature **Discovery**
  (Epic 2, stories `2.1`–`2.4`). Resolve **COMO falar** com o usuário.
- **ID Vida** (`ID-Vida-meDIZ-v1.pdf`) — **não implementado**. É o complemento direto: resolve **O QUE
  lembrar** da vida do usuário (fatos permanentes e situações em andamento). Os dois blocos devem
  entrar juntos no system prompt do chat, somando um teto fixo de ~400 tokens.

Este documento assume que quem for implementar **não tem acesso aos PDFs originais** — por isso resume
a spec funcional junto com o mapeamento técnico. Onde a spec dos PDFs diverge de como o resto do
sistema foi construído aqui, este plano segue o padrão já existente no meDIZ, não o PDF ao pé da letra.

## O que já existe e deve ser reaproveitado (não recriar)

Confirmado por leitura direta do código em `develop` (não pelo PDF):

| Peça do ID Pessoa | Onde está | Reaproveitar para ID Vida como |
|---|---|---|
| Modelo de perfil compacto | `prisma/schema.prisma` → `model UserProfile` (`core`, `dynamics`, `predictive`, `compactProfile`, `profileVersion`) | Mesmo `UserProfile`, só ganha 3 colunas novas (ver Story 4.2) |
| Outbox assíncrono | `model DiscoveryEvent` (`status: pending/processing/processed/failed`, `attempts`, `availableAt`) + `POST /api/discovery/events/claim` e `/result` | Padrão de fila a copiar para o novo outbox de checkpoint (ver Story 4.1) |
| Auth de webhook do worker n8n | `src/lib/webhookAuth.ts` → `validateWebhookBearer(request, envVarName)`, bearer timing-safe | Reusar a função, com env var própria (não inventar um 3º padrão — já é a 2ª vez que essa decisão foi tomada, ver `docs/stories/2.1...md`) |
| Card admin de perfil | `src/app/api/admin/users/[id]/discovery-profile/route.ts` + `src/components/admin/UserDiscoveryProfileCard.tsx` | Espelhar para fatos (Story 4.4) |
| Prompt do agente já espera a fonte de dados | `outputs/n8n/RAG - O Corpo Diz + agentes e porteiro v3.json`, prompt "IA professor": *"Primeiro: consulte ID VIDA e ID PERSONA. Use o que já está lá."* | Confirma que o lado n8n já foi escrito assumindo que ID Vida existe — falta só a tabela e o dado por trás |

## Gap crítico descoberto (bloqueador — ler antes de tudo)

O PDF do ID Vida assume um **"Fluxo 3: Atualização"** que roda "ao fim de cada conversa" via webhook
n8n. **Esse gatilho não existe no código hoje — nem para o ID Pessoa.**

Evidência: `ChatSession.endedAt` existe no schema (`prisma/schema.prisma`) mas nunca é escrito em
lugar nenhum do app (`git grep -n "endedAt"` não retorna nenhuma atribuição). O chat é uma sessão
contínua — não há um botão "encerrar conversa" nem um evento client-side de fim de sessão. O único
outbox que existe (`DiscoveryEvent`) dispara uma única vez, no fim do onboarding — não a cada conversa.

Consequência prática: **isso também bloqueia parte do ID Pessoa** (a Camada Dinâmica do `UserProfile`
hoje só é escrita uma vez, no discovery; nunca é atualizada por conversas normais, apesar do PDF do ID
Pessoa prometer isso). Não dá pra construir o ID Vida sem resolver esse gatilho primeiro, e a solução
deve servir aos dois sistemas ao mesmo tempo — não faz sentido ter dois mecanismos de "fim de conversa"
em paralelo.

**Decisão de design (validada com o usuário em 2026-07-16): abandonar a ideia de "fim de conversa".**
Conversa de chat é um fluxo contínuo, sem fim natural — então em vez de tentar detectar um fim (que
exigiria cron de inatividade e sempre teria atraso e sessões abandonadas nunca processadas), o gatilho
vira **checkpoint incremental**, com dois disparos independentes que se complementam:

1. **A cada X mensagens** dentro da mesma sessão (contador, não tempo) — digestão contínua da conversa
   em andamento, sem esperar nada "acabar".
2. **Ao iniciar um novo chat** (`createChatSessionWithThread`) — limite natural já existente no código:
   quando o usuário começa uma sessão nova, a sessão anterior dele quase certamente não vai receber
   mais mensagens, então é o melhor sinal de "virou de página" que o sistema já emite sozinho, sem cron.

Como o gatilho (2) cobre o caso "usuário mudou de assunto/sessão", o gatilho (1) pode usar uma janela
**mais larga** do que seria necessário sozinho (ex.: a cada 12–15 mensagens em vez de 5–6) — ele só
precisa garantir que uma sessão *muito longa e contínua* (o usuário fica horas no mesmo chat) não fique
tempo demais sem checkpoint, não precisa reagir rápido a cada troca.

**Limitação aceita para v1** (documentada, não resolvida agora): uma sessão curta (abaixo do limiar de
X mensagens) que o usuário abandona sem nunca iniciar um novo chat — fecha a aba e não volta — nunca
recebe checkpoint. Não tem cron de segurança nesta v1. Aceitável porque conversas curtas abandonadas
tendem a ter pouco fato relevante para extrair; se isso se mostrar um problema real (medir via
`ConversationEvent`/`UserFact` — sessões sem nenhum checkpoint apesar de terem mensagens), uma
Story 4.5 futura pode adicionar um cron de inatividade só como rede de segurança, sem mudar o desenho
dos dois gatilhos principais.

## As duas naturezas de fato (spec funcional do ID Vida)

| | MARCOS (permanente) | AGORA (fio aberto) |
|---|---|---|
| O que é | Fatos que não mudam: perdas, família, profissão, condições duradouras | Situação em andamento, com data: perda de emprego, separação, mudança |
| Exemplo | "não conheceu o pai", "mãe com Alzheimer", "2 filhos (8 e 11)" | "perdeu o emprego (03/06, aberto)", "pensando em separação (28/05) [sensível]" |
| Expira? | Não. Só sai por comando explícito do usuário ("esquece isso") | Sim: `aberto → acompanhando → resolvido → arquivado`; 45 dias sem menção → arquivado |
| Limite no bloco injetado | Máx. 8 | Máx. 4 |
| Regra de abordagem | Contexto silencioso — nunca recitado de volta | `perguntar` (pode puxar) ou `esperar` (nunca por iniciativa própria — luto, doença grave, separação, violência) |

Princípio: **só entra no bloco `life_compact` o que muda a próxima resposta do app.** O resto fica
auditável na tabela, fora do prompt.

## Plano técnico

### Extensão do `UserProfile` (não cria tabela nova para isso)

```prisma
model UserProfile {
  // ...campos existentes (core, dynamics, predictive, compactProfile, profileVersion)...
  lifeCompact        String?   @map("life_compact")
  lastConversationAt DateTime? @map("last_conversation_at")
  lastTopic          String?   @map("last_topic")
}
```

### Tabela nova — `UserFact`

Justificativa de tabela separada (não JSONB dentro do perfil): fatos têm ciclo de vida próprio (nascem,
mudam de status, resolvem, arquivam) e precisam de trilha individual para auditoria e para o comando
"esquece isso" (exclusão pontual, LGPD). Isso é o mesmo raciocínio que já levou a `DiscoveryEvent` a
ser tabela própria em vez de virar mais um campo JSON em `UserProfile`.

```prisma
model UserFact {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  kind          String    // 'marco' | 'cotidiano' — CHECK constraint no banco, ver Dev Notes
  fact          String    @db.Text // declarado pela pessoa, max ~15 palavras, 3ª pessoa
  category      String?   // familia|trabalho|saude|relacao|evento|preferencia
  status        String    @default("aberto") // marco: 'ativo' | cotidiano: aberto|acompanhando|resolvido|arquivado
  approach      String    @default("perguntar") // perguntar|esperar
  sensitivity   String    @default("normal") // normal|alta
  confidence    Decimal?  @db.Decimal(3, 2)
  relevance     Int       @default(5) // 1-10, corte de priorização no bloco compacto
  evidence      String?   @db.Text // citação curta que sustenta o fato
  createdAt     DateTime  @default(now()) @map("created_at")
  lastMentionAt DateTime  @default(now()) @map("last_mention_at")
  resolvedAt    DateTime? @map("resolved_at")
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, kind, status, lastMentionAt(sort: Desc)])
  @@map("user_facts")
}
```

Adicionar em `model User`: `userFacts UserFact[]`.

`kind`/`status`/`approach`/`sensitivity` como `String` + `CHECK` no SQL da migration, não enum nativo
do Prisma — mesma decisão já tomada para `UserProfile.usageContext` e `DiscoveryEvent.status`
(ver Dev Notes de `docs/stories/2.1.descoberta-dados-backend.md`: evita conflito com bancos
compartilhados e mantém um padrão único no repo).

### Outbox compartilhado de checkpoint (novo, generaliza o `DiscoveryEvent`)

Em vez de criar dois outboxes paralelos (um para atualizar `core/dynamics/predictive` do ID Pessoa,
outro para extrair fatos do ID Vida), criar **um único**, já que o próprio PDF do ID Vida propõe isso
("mesmo webhook, dois braços"). Note que `eventType` não é mais "ended" — é "checkpoint", e ganhou um
campo `trigger` para o worker (e a telemetria) saberem qual dos dois gatilhos disparou:

```prisma
model ConversationEvent {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  sessionId     String    @map("session_id")
  eventType     String    @default("conversation.checkpoint.v1") @map("event_type")
  trigger       String    // 'message_count' | 'new_session'
  schemaVersion Int       @default(1) @map("schema_version")
  payload       Json      // threadId + range de mensagens novas desde o último checkpoint
  status        String    @default("pending")
  attempts      Int       @default(0)
  lastError     String?   @map("last_error")
  availableAt   DateTime  @default(now()) @map("available_at")
  processedAt   DateTime? @map("processed_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([availableAt, status])
  @@map("conversation_events")
}
```

Estrutura e regras de índice/lock (`FOR UPDATE SKIP LOCKED`, retry com backoff exponencial até 60min,
processing preso por >10min volta a pending) devem copiar exatamente o que já está em
`src/app/api/discovery/events/claim/route.ts` e `.../result/route.ts` — é o mesmo problema resolvido
duas vezes, não precisa de solução nova.

### Contadores novos em `ChatSession` (para o gatilho por contagem de mensagens)

Hoje não existe nenhum contador de mensagens por sessão (`saveChatMessage` em `src/lib/chatMessages.ts`
só faz `prisma.chatMessage.create`, sem tocar em nenhum agregado) — sem isso, saber "quantas mensagens
novas desde o último checkpoint" exigiria um `COUNT(*)` a cada mensagem enviada, o que não escala.
Adicionar dois campos em `ChatSession`:

```prisma
model ChatSession {
  // ...campos existentes...
  messageCount              Int @default(0) @map("message_count")
  lastCheckpointMessageCount Int @default(0) @map("last_checkpoint_message_count")
}
```

`messageCount` incrementa em `saveChatMessage` (`prisma.chatSession.update({ data: { messageCount:
{ increment: 1 } } })`, na mesma call que já cria o `ChatMessage` — dá pra fazer em uma transação
curta). O gatilho por contagem dispara quando `messageCount - lastCheckpointMessageCount >= X`; ao
enfileirar o `ConversationEvent`, já grava `lastCheckpointMessageCount = messageCount` no mesmo
`update`, para não disparar duas vezes para a mesma janela.

## Divisão em stories (para o `@sm` formalizar em `docs/stories/4.x.*`)

### Story 4.1 — Gatilhos de checkpoint (outbox compartilhado)

**Bloqueador de tudo o resto.** Escopo:
- Model `ConversationEvent` (com campo `trigger`) + migration.
- Campos `messageCount`/`lastCheckpointMessageCount` em `ChatSession` + migration.
- **Gatilho 1 (contagem de mensagens)**: em `saveChatMessage` (`src/lib/chatMessages.ts`), após
  incrementar `messageCount`, checar se `messageCount - lastCheckpointMessageCount >= X` (X
  configurável por env var, sugestão inicial 12–15 — ver justificativa na seção "Gap crítico"). Se
  sim, enfileira `ConversationEvent` (`trigger: 'message_count'`) e atualiza
  `lastCheckpointMessageCount` na mesma transação.
- **Gatilho 2 (nova sessão)**: em `createChatSessionWithThread` (`src/lib/chatService.ts`), antes de
  criar a sessão nova, busca a sessão mais recente do usuário com `messageCount >
  lastCheckpointMessageCount` (ou seja, com conteúdo não extraído) e enfileira `ConversationEvent`
  (`trigger: 'new_session'`) para ela.
- `POST /api/conversation-events/claim` e `/result`, copiando literalmente o padrão de
  `src/app/api/discovery/events/{claim,result}/route.ts`, autenticado com `validateWebhookBearer`
  (decidir: reusar `DISCOVERY_WEBHOOK_TOKEN` ou criar `CONVERSATION_WEBHOOK_TOKEN` — ver Dev Notes).
- **Fora de escopo desta story**: qualquer extração de conteúdo (fatos ou perfil) — só os dois
  mecanismos de disparo + enfileirar. Isso é dado ao worker nas Stories 4.2/4.3 e ao braço do ID
  Pessoa separadamente. Também fora de escopo: cron de inatividade para sessões abandonadas (ver
  limitação aceita na seção "Gap crítico" — vira Story 4.5 só se os dados mostrarem que é necessário).

### Story 4.2 — Modelo de dados e endpoints de `user_facts`

- `UserFact` model + migration (`kind`/`status`/`approach`/`sensitivity` com CHECK constraint).
- 3 colunas novas em `UserProfile`: `lifeCompact`, `lastConversationAt`, `lastTopic` + migration
  aditiva (seguir o padrão de migration manual usado em `20260618120000_add_user_profiles_and_discovery_outbox`,
  já que este projeto não usa shadow database — ver Dev Notes de `docs/stories/2.1...md`).
- Endpoint para o worker consultar fatos ativos do usuário antes de decidir merge (equivalente ao
  `currentProfile` que `events/claim` já devolve para o `UserProfile` — estender para incluir
  `userFacts` na mesma resposta do claim do outbox de conversa).
- Endpoint de resultado do merge (equivalente a `events/result`), que faz upsert em `user_facts` +
  atualiza `UserProfile.lifeCompact/lastConversationAt/lastTopic` numa transação.
- Comando **"esquecer isso"**: endpoint autenticado por sessão de usuário (não bearer de worker) que
  faz **delete real** (não soft-delete) de um `UserFact` específico, e dispara regeneração imediata do
  `lifeCompact`. "Esquecer de mim" (perfil inteiro) já está coberto pelo `onDelete: Cascade` existente.

### Story 4.3 — Prompts e worker n8n de extração/merge

Não é código deste repo (roda no n8n), mas faz parte do plano porque é o que efetivamente produz o
`lifeCompact`. Documentar e implementar no workflow n8n (fora deste repo, mas versionar o export em
`outputs/n8n/` como já é feito com os outros workflows):

- **Extrator de fatos** (chamada LLM, modelo econômico): recebe transcript + lista de fatos já
  conhecidos do usuário, devolve JSON com `marcos_novos`, `cotidianos_novos`, `atualizacoes`
  (mudança de status / promoção cotidiano→marco), `esquecer`. Regra chave: só registra o que a
  pessoa **declarou**, nunca infere ou diagnostica; confiança mínima 0.6 para gravar.
- **Motor de merge** (nó Function do n8n): marco entra com confiança ≥0.8 e nunca expira; cotidiano
  entra com confiança ≥0.6, decai para `arquivado` após 45 dias sem menção; luto/doença
  grave/separação/violência força `sensitivity: alta` + `approach: esperar`.
- **Condensador**: gera o bloco `[VIDA - Nome]` a partir dos fatos ativos, teto de 200 tokens (alvo
  180), corta primeiro os fios de menor relevância, nunca corta a data da última conversa nem fios com
  follow-up pendente.
- Este braço roda em paralelo ao braço existente do ID Pessoa no mesmo webhook de checkpoint
  (que ainda precisa ser criado — é a própria Story 4.1 que dá a esse braço onde rodar). Como o
  checkpoint agora pode disparar no meio de uma conversa longa (gatilho por contagem), o extrator
  recebe só a fatia de mensagens novas desde o último checkpoint (`payload` do `ConversationEvent`),
  não a conversa inteira — mais barato e evita reprocessar fato já extraído.

### Story 4.4 — Injeção no chat, retomada, LGPD e admin

- No workflow n8n do chat recorrente (`outputs/n8n/RAG - O Corpo Diz + agentes e porteiro v3.json`),
  o node que hoje faz `Execute a SQL query` / `Consultar Mediz` precisa também buscar `lifeCompact` +
  `lastConversationAt` + `lastTopic` de `user_profiles` e injetar no system prompt — isso fecha o loop
  que hoje só existe como texto solto ("consulte ID VIDA e ID PERSONA") sem dado real por trás.
- Regras de retomada: se `lastConversationAt` > 7 dias, reconhecer o intervalo; retomar no máximo 1
  fio `perguntar` por conversa; fio `esperar`/sensível nunca é puxado por iniciativa própria.
- Consentimento: reusar o mesmo `consentedAt` já gravado no fluxo de Discovery (`UserProfile`) — não
  criar um segundo consentimento. Confirmar com o time de produto que o texto do consentimento já
  cobre "lembrar fatos da conversa" e não só "personalizar o tom".
- Admin: espelhar `UserDiscoveryProfileCard.tsx` → novo card exibindo `lifeCompact` + lista de
  `UserFact` ativos do usuário (rota `GET /api/admin/users/[id]/life-profile`, mesmo padrão de
  `requireAdmin()` usado em `discovery-profile/route.ts`).

## Dev Notes gerais (para quem for implementar)

- **Banco compartilhado**: como descoberto na Story 2.1, o Postgres do meDIZ é compartilhado com o
  projeto legado `indevmediz`. Antes de rodar qualquer `prisma migrate dev`, checar
  `prisma migrate status` — pode já existir tabela com o mesmo nome criada por outro processo. Não
  assumir shadow database; migrations aditivas devem ser escritas/aplicadas manualmente
  (`migrate deploy`), como já é o padrão neste repo.
- **Não usar enum nativo do Prisma** para `kind`/`status`/`approach`/`sensitivity` — `String` + CHECK
  constraint no SQL, consistente com o resto do `UserProfile`/`DiscoveryEvent`.
- **Reusar `validateWebhookBearer`** (`src/lib/webhookAuth.ts`) para toda autenticação de worker —
  já foi generalizado para aceitar nome de env var custom, não criar um 3º/4º padrão de bearer auth.
- **Teto de tokens é regra de produto, não só de custo**: `lifeCompact` nunca deve passar de ~200
  tokens; isso precisa ser validado no condensador (n8n), não só documentado.
- Antes de começar a Story 4.1, validar com `@architect` o valor de X no gatilho por contagem de
  mensagens (12–15 é só uma sugestão inicial, calibrar com tamanho médio de conversa real) e se o
  mesmo outbox (`ConversationEvent`) deve também disparar a atualização contínua do ID Pessoa
  (`core`/`dynamics`/`predictive`) — que hoje também não acontece fora do discovery inicial, apesar de
  estar na spec original do ID Pessoa. Faz sentido que sim: é o mesmo evento, os dois braços (Story
  4.3) só leem o outbox compartilhado.

## LGPD (inegociável, herdado do ID Pessoa)

- Fatos de vida são dado sensível (mesma classificação do PDF do ID Pessoa para dados emocionais).
  Cobertos pelo mesmo `consentedAt` do Discovery — não duplicar consentimento.
- "Esquece isso" → delete real do `UserFact` específico (não soft-delete).
- "Esquecer de mim" → cascade já garantido pelo schema (`onDelete: Cascade` em `UserFact.user`).
- `user_facts` nunca sai do Postgres para ferramentas de marketing/segmentação.

## KPIs sugeridos (a instrumentar; sem baseline ainda)

| Métrica | Meta |
|---|---|
| Taxa de resposta à retomada ("como ficou aquilo?") | >60% engajam no fio retomado |
| Conversas com 2ª sessão em 7 dias | +20% vs. baseline sem retomada |
| Retenção D30 | +25% vs. baseline |
| Custo de token extra por usuário ativo/mês (ID Pessoa + ID Vida somados) | < R$0,25 |

## Ordem recomendada de execução

```
4.1 (gatilho de fim-de-conversa)  ──▶  4.2 (schema + endpoints user_facts)  ──▶  4.3 (worker n8n)  ──▶  4.4 (injeção + LGPD + admin)
```

4.1 é o único bloqueador rígido. 4.2 pode ser desenhado em paralelo a 4.1 (schema não depende do
outbox), mas não pode ser testado ponta-a-ponta sem ele.
