# Plano de Implementação — Mapa da Origem Emocional

## Status

Em implementação (16/10/2026) — F2 do app pronta na branch `feat/mapa-origem-emocional` (stories 7.1, 7.3–7.6); 7.2 preparada para importar no n8n; 7.0 e 7.7 pendentes. Ver `docs/stories/7.*`.

Originalmente: Draft (16/10/2026) — pronto para virar stories formais (`docs/stories/7.x.*`) pelo `@sm` e execução pelo `@dev`.

**Escopo deste plano: app meDIZ + n8n.** Configuração do ChatVolt (agente Aline, HTTP Tool, tags,
aprovação de templates), admin da Guru (ofertas, cashback), Meta Ads, copy, vídeos e conteúdo
orgânico ficam fora — aparecem só como **dependências externas** (seção 7).

## Fontes

Fora do repo, em `Downloads/projeto mapa` (o implementador provavelmente não terá acesso — o essencial
está resumido aqui):

| Fonte | O que vale dela |
|---|---|
| `5_PLANO_IMPLANTACAO_TIME.md` (14/10) | funil, esteira de ofertas, fases do time |
| `6_DOC_DEV_CONSTRUCAO.md` (14/10) | arquitetura e fluxos n8n — **parcialmente superado**, ver "Divergências" |
| `7_CONCEPCAO_MAPA_DA_ORIGEM_EMOCIONAL.md` (16/10) | as 14 seções do Mapa, o que não entra, o que o gerador produz |
| `mapa-paginas-html/mapa-paginas-html/{1_gerar,2_pronto_bloqueado,3_pos_pagamento}.html` | protótipos atuais das 3 telas (os demais HTMLs da pasta são versões antigas) |
| Artifact https://claude.ai/artifact/Kb5JyJBjrbAvt6vztbt7WE | **exemplo de Mapa final preenchido** (Rafael, diabetes tipo 1) — referência de layout e de saída do gerador |
| Print do checkout Guru (14/10) | Guru cobra via Pagar.me/Stone (pedido `ch_…`); Pix expira em 3 dias |

## O produto em uma frase

A Aline (ChatVolt) faz uma pesquisa gratuita de sintoma no WhatsApp e manda um link para `/mapa`.
Ali a pessoa responde um quiz de 5 passos, o meDIZ gera o Mapa (14 seções), mostra bloqueado, e
"BAIXAR MEU MAPA" leva ao checkout Guru de R$ 14,90. Pago: conta criada sem atrito, Mapa aberto na
tela, por e-mail e para sempre na Biblioteca; a página pós-pagamento oferece o 2º Mapa (R$ 9,90) e a
assinatura com cashback (R$ 25). Depois, templates pós-compra e sequência fria via n8n.

## Divergências entre os documentos — decisão adotada

| Tema | Doc antigo dizia | Adotado (fonte mais nova) |
|---|---|---|
| Formulário antes do pagamento | doc 6: "zero formulário, sem campo de nome" | **Quiz de 5 passos** (nome, sintoma, há quanto tempo, 3 momentos + idade, acontecimento com pai/mãe). Só nome e sintoma são obrigatórios. O exemplo do Mapa depende desses dados (linha do tempo, árvore). |
| Conteúdo do Mapa | doc 5: "o relatório que o meDIZ já gera, zero conteúdo novo" | **Gerador novo de 14 seções** (doc 7 + exemplo). O relatório de 5 blocos do `chat-texto` não serve. |
| Formato | "PDF" | **Página web mobile** renderizada a partir de JSON; PDF é secundário (botão discreto). |
| Cor | doc 7 `#585bef` × protótipos `#6366f1` | Telas de venda `#6366f1` (design system do app); o documento do Mapa `#585bef` + Lora (como no exemplo). |
| Quem cria a conta no pós-pagamento | doc 6: n8n `pos-pagamento` faz `POST /users` | **App**, pelo `/api/stone/webhook` → `grantPurchaseAccess` (o caminho de sempre, sem liberar produto). Não abrir um 3º caminho de criação de conta. **Não** passa pelo `deliverAccess`: ele grava `accessMessageAt` (um aviso por pessoa, para sempre) e o comprador perderia o aviso do livro e cairia nos Despertadores. Entrega própria do Mapa; n8n só envia mensagens. |
| Gatilho de pagamento | "webhook Guru → n8n" | A venda Guru chega ao app como cobrança Stone em `/api/stone/webhook` (já existe). |

## O que já existe e será reaproveitado

| Necessidade | Onde está | Uso |
|---|---|---|
| Recebimento de pagamento Guru | `src/app/api/stone/webhook/route.ts`, `src/lib/stone/parse-webhook.ts`, `purchase_events` | Reconhecer as ofertas do Mapa e disparar o desbloqueio |
| Mapear oferta → produto | `catalog_product_external_ids`, `resolveCatalogProductByStoneId` | Cadastrar as 5 ofertas do Mapa (+ futuras) num produto de catálogo "Mapa da Origem Emocional" |
| Criar/reaproveitar conta + link mágico | `grantPurchaseAccess` + `createAccessLink`, `/acesso` | Conta do comprador e link que abre a tela de entrega já logado (sem `deliverAccess`, ver Divergências) |
| Auth de webhook n8n → app | `src/lib/webhookAuth.ts` (`validateWebhookBearer`) | Callback do gerador com env var própria `MAPA_WEBHOOK_TOKEN` |
| Fila/worker n8n | padrão `DiscoveryEvent` (claim/result) | Referência; aqui o gatilho é **push** (latência < 1 min), não cron |
| Rate limit | `src/lib/rateLimiter.ts` | Endpoint público de geração |
| E-mail | `src/lib/email/mailer.ts` + `templates/` | "Seu Mapa está pronto" |
| Envio WhatsApp | n8n → ChatVolt, pelo portão de envio (`src/lib/mensagens/portao.ts`, stories 6.1/6.2) | Todos os templates |
| Eventos de jornada | `src/app/api/journey-events` | Funil da página |
| Exclusão de réguas | `STONE_GUIDE_IDS`/`isBookPurchase` em `book-purchase.ts`, Despertadores | Comprador do Mapa **não** pode cair em onboarding do livro, trial ou Despertadores (mesma lição do Guia, 15/10) |

## Decisões de arquitetura

1. **Modelo próprio `MapaOrigem`** (tabela `mapas_origem`), não `SavedSymptom`: `id`, `publicToken`
   (opaco, vai na URL), `telefone` (do `?id=`), `nome`, `sintoma`, `tempo`, `momentos` (Json),
   `familia`, `paraOutraPessoa` (bool) + `relacao`, `status` (`gerando|pronto|erro`), `pago` (bool),
   `conteudo` (Json, 14 seções), `fraseForte`, `schemaVersion`, `userId?`, `paidAt?`,
   `transactionId?`, `oferta?`, `origem/utm`, `ipHash`, timestamps. Migration **aditiva**, aplicada
   em prod antes do deploy (não há staging).
2. **Gerador: a IA preenche um JSON, o template é fixo.** Um schema versionado por seção
   (afirmações para marcar, frases populares, sentido biológico + frase-síntese, 3 cenários,
   marcos da linha do tempo, fase, repetição, árvore, crenças, pedidos do corpo, 3 passos,
   `fraseForte`). Partes fixas (carta, caminho [RE]Sentir, releitura, rodapé) ficam no template.
   O mesmo JSON alimenta a tela, o PDF e o template de audioterapia.
3. **Geração assíncrona por push**: app cria `MapaOrigem(status=gerando)` → chama webhook n8n
   `mapa-gerar` → n8n gera (2 chamadas LLM em paralelo: Partes I–II e III–IV) com o RAG do
   O Corpo Diz → valida o JSON → `POST /api/mapa/[id]/resultado` (bearer). A página faz polling
   do status a cada 2 s; a animação de 4 etapas do protótipo acompanha o progresso. Timeout 90 s →
   botão "tentar de novo".
4. **Bloqueio é do servidor, não do CSS.** Antes do pagamento a API devolve só a capa (nome,
   sintoma, nº de páginas). O borrado da tela 2 é placeholder, nunca o conteúdo real.
5. **Vínculo pagamento ↔ Mapa** — depende do spike 7.0, em ordem de preferência:
   (a) parâmetro no link da Guru (`?src=<publicToken>`) que volta no payload Stone;
   (b) telefone do checkout = `telefone` do Mapa;
   (c) **crédito**: pagamento sem vínculo vira "1 Mapa a resgatar" na conta — o e-mail leva a uma
   tela que mostra o Mapa pendente do mesmo dispositivo (cookie com `publicToken`) ou permite
   gerar de novo. Garante que nenhum pagante fica sem Mapa.
6. **Entrega primária é assíncrona** (Pix pode ser pago horas depois): e-mail + WhatsApp com link
   mágico para `/mapa/[token]/pronto`. O redirect de "obrigado" da Guru é bônus, não requisito.
7. **Permanência**: Mapa pago nunca é apagado — sem cascade de usuário, fora da story 6.7
   (apagar conversas), fora de limpezas e de troca/cancelamento de plano.
8. **Guardrails de conteúdo** no prompt e na validação: o que o doc 7 diz que não entra
   (diagnóstico, previsão de cura, parar medicação, técnica executável, citar fontes) + aviso
   reforçado para condições graves (autoimunes, câncer, gestação, psiquiátricas), como já faz o
   exemplo ("não substitui teu médico nem tua insulina").
9. **Abuso/custo**: rate limit por IP (ex.: 3 gerações/h) e por telefone (5/dia); reaproveita
   Mapa do mesmo telefone + sintoma nas últimas 24 h; medir custo por geração desde o dia 1.

## Stories (Epic 7)

| # | Story | Lado | Depende de | Fase |
|---|---|---|---|---|
| 7.0 | **Spike: vínculo pagamento ↔ Mapa.** Compra teste de R$ 14,90 com `?src=` no link; inspecionar o payload em `purchase_events`; confirmar se volta param, telefone e redirect pós-pago. Cadastrar as ofertas no catálogo. Saída: decisão 5(a/b/c). | app | Guru (oferta ativa) | F2 |
| 7.1 | **Modelo e API do Mapa.** `MapaOrigem` + migration; `POST /api/mapa` (cria e dispara geração, rate limit), `GET /api/mapa/[token]` (capa se não pago, completo se pago e dono), `POST /api/mapa/[id]/resultado` (bearer, valida schema). | app | — | F2 |
| 7.2 | **Workflow n8n "Mapa — Gerador".** Schema JSON v1, prompt a partir do doc 7 + exemplo, RAG O Corpo Diz, 2 chamadas paralelas, validação, `fraseForte`, callback, tratamento de erro. Criado **inativo**. Critério: Paulo aprova 10 sintomas variados (incluindo 2 graves e 1 "para outra pessoa"). | n8n | 7.1 | F2 |
| 7.3 | **Componente `MapaDocumento`.** Renderiza o JSON no layout do exemplo (capa, 4 partes, checklists, linha do tempo, árvore, releitura), `#585bef` + Lora, dark mode, CSS de impressão para "Baixar PDF". | app | schema da 7.2 | F2 |
| 7.4 | **Página pública `/mapa`.** Quiz de 5 passos (protótipo `1_gerar`), lê `?s=` e `?id=`, geração com polling, tela bloqueada (`2_pronto_bloqueado`), botão para checkout com parâmetros conforme 7.0, cookie com `publicToken`, eventos de funil. Sem login, sem menu. | app | 7.1, 7.3 | F2 |
| 7.5 | **Desbloqueio no pagamento.** No `/api/stone/webhook`: reconhece oferta do Mapa → `grantPurchaseAccess` (sem `deliverAccess`) → vincula Mapa ao usuário e marca pago (ou cria crédito) → e-mail "seu Mapa está pronto". Idempotente. Exclui o Mapa de livro/trial/Despertadores. | app | 7.0, 7.1 | F2 |
| 7.6 | **Tela de entrega + Biblioteca "Meus Mapas".** `/mapa/[token]/pronto` (logada via link mágico): bloco Entrega + Mapa aberto + Baixar PDF / Ver na Biblioteca; tela de resgate do crédito; seção "Meus Mapas" na Biblioteca. | app | 7.3, 7.5 | F2 |
| 7.7 | **Entrega pelo WhatsApp.** Workflow n8n próprio "MAPA — Entrega WhatsApp" pelo portão de envio (link mágico para a tela de entrega); fora do `ENTREGA DE ACESSO`, que tem a trava de um aviso por pessoa. | n8n | 7.5 | F2 |
| 7.8 | **Link único para a Aline.** Webhook n8n `gerar-link-mapa` (telefone + sintoma → `{link}` em < 2 s) para a HTTP Tool do ChatVolt. | n8n | 7.4 | F3 |
| 7.9 | **Registro de leads.** n8n `registrar-lead` (upsert por telefone na planilha "Leads WPP Gratuito") + atualização de status pelo app (link aberto, gerado, pago). | n8n + app | 7.8 | F3 |
| 7.10 | **Página longa pós-pagamento.** Blocos 3–8 do protótipo `3_pos_pagamento`: história, 5 cartões com vídeo (placeholders até os vídeos chegarem), "pensa comigo", Caminho 1 (2º Mapa) e Caminho 2 (cashback), rodapé, Pixel da Meta. | app | 7.6 | F4 |
| 7.11 | **2º Mapa para outra pessoa.** Nome + sintoma da outra pessoa → gera em 3ª pessoa (variante no gerador) → checkout `mapa-p2-990` → desbloqueia na mesma conta. | app + n8n | 7.10 | F4 |
| 7.12 | **Pós-compra no WhatsApp.** n8n: compartilhar a Aline (+1 h, todo pagante), audioterapia com `fraseForte` (+40 min, só Mapa), livro (+1 dia); cancela se virar assinante. Tudo pelo portão de envio. | n8n | 7.5 | F4 |
| 7.13 | **Sequência fria.** Cron sobre leads sem pagamento ≥ 24 h: D1 livro → D8 Mapa R$ 9,90 → D15 R$ 19,90; para no pagamento/opt-out. Nunca audioterapia para quem não comprou. | n8n | 7.9 | F5 |
| 7.14 | **Upgrade após 3 dias de uso.** Detector diário no app (≥ 1 pesquisa em 3 dias seguidos, plano mensal, flag única) + tela no app + template. | app + n8n | assinatura do fluxo | F5 |

**F2 (7.0–7.7) é a venda mínima** — critério de pronto: uma compra real de ponta a ponta (link →
quiz → Mapa gerado → Pix → Mapa aberto no e-mail, no WhatsApp e na Biblioteca). Vende com o link
fixo da Guru antes do rastreio (F3) existir.

Paralelizável: 7.2 (n8n) e 7.3 (front) andam juntas assim que o schema JSON estiver fechado — fechar
o schema é a primeira tarefa da 7.2.

## Dependências externas (fora do escopo, mas bloqueiam)

| Item | Responsável | Bloqueia |
|---|---|---|
| Oferta ativa e configuração do parâmetro de rastreio na Guru | Admin Guru | 7.0, 7.5 |
| Oferta "assinatura mensal CASHBACK" (1ª cobrança R$ 25) | Admin Guru | 7.10 |
| HTTP Tool `gerar_link_mapa`, tags e agente da Aline | Admin ChatVolt | uso da 7.8 |
| Templates de WhatsApp aprovados (entrega, compartilhar, audioterapia, livro, fria) | Admin ChatVolt + copy | 7.7, 7.12, 7.13 |
| Aprovação do conteúdo do gerador | Prof. Paulo | ativar 7.2 |
| 5 vídeos de 15–20 s, ID do Pixel da Meta | Videomaker / tráfego | finalizar 7.10 |

## Ainda não decidido

- Oferta de resgate "1º mês R$ 1" (ao recusar o cashback): na tela ou por template no dia seguinte.
- Quem recebe a nota fiscal da Guru e como ela chega à pessoa.
- Planilha × banco para leads: o plano segue o doc 6 (planilha), mas o funil da página já fica no
  banco (`MapaOrigem` + journey events).
- Custo por geração aceitável (definir teto após medir na 7.2).

## Riscos

| Risco | Mitigação |
|---|---|
| Geração de 14 seções passar de 1 min | 2 chamadas LLM em paralelo; progresso real na tela; medir p95 na 7.2 |
| Pagamento não se ligar ao Mapa | spike 7.0 antes de codar a 7.5; fallback de crédito |
| Endpoint público virar custo aberto | rate limit, reaproveitamento por telefone + sintoma, métrica de custo |
| Conteúdo afirmar causa ou orientar tratamento | guardrails no prompt + validação + aprovação do Paulo em casos graves |
| Comprador do Mapa cair nas réguas do livro/trial | exclusão explícita na 7.5 + teste |
| Pix pago com a página fechada | entrega por e-mail/WhatsApp com link mágico (decisão 6) |
