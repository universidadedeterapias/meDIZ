# Rastreio do livro impresso — contrato n8n ↔ meDIZ

> Documento para validação. Descreve o que o job do n8n deve mandar, o que o meDIZ devolve, e o que o n8n escreve de volta na planilha da gráfica.

## 1. Problema que resolve

A gráfica trabalha na planilha: recebe a lista de quem comprou o livro impresso e, quando despacha, escreve o código de rastreio numa coluna. Esse código morre ali. Quem comprou não vê nada, e o atendimento só responde "e o meu livro?" abrindo a planilha na mão.

Do lado do meDIZ existe a tabela `book_shipments`, que já sabe quem comprou e está esperando. Falta o caminho de volta: alguém ler o código na planilha e gravar no despacho certo.

Esse alguém é o job do n8n. Este documento é o contrato entre ele e o endpoint.

## 2. Como as peças se encaixam

```
Hotmart  →  /api/hotmart  →  purchase_event + book_shipment (aguardando_postagem)
                          →  aviso de acesso ao n8n
                                     │
                                     ▼
                     n8n preenche a linha na planilha da gráfica
                                     │
                                     ▼
                    gráfica despacha e escreve o código de rastreio
                                     │
                                     ▼
        ┌──── job do n8n (este contrato) ─────────────────────┐
        │  lê as linhas com código e sem marca de processado  │
        │  POST /api/shipments/tracking                       │
        │  escreve o resultado de volta na planilha           │
        └─────────────────────────────────────────────────────┘
                                     │
                                     ▼
        comprador vê o status em /biblioteca, admin vê no painel
```

O meDIZ não consulta transportadora nenhuma. Quem consulta é o n8n; aqui só entra o resultado.

## 3. Pré-requisitos

**`SHIPMENT_TRACKING_SECRET` precisa existir no ambiente de produção.** O endpoint usa autenticação fechada de saída: sem a env, ele responde `503 {"error":"Webhook not configured"}` para qualquer chamada — inclusive as certas. Não está no `.env` local; confirmar se está na Vercel antes de ligar o job.

**As colunas da seção 3.1 na planilha.** Sem elas o job não tem onde escrever a resposta, e reprocessa a planilha inteira todo dia sem que ninguém saiba o que falhou.

## 3.1 Colunas da planilha

Quatro colunas novas. As de identidade a gráfica nunca preenche — quem escreve é máquina.

| Coluna | Quem escreve | Conteúdo |
|---|---|---|
| `shipment_id` | fluxo de criação da linha **e** o job | Id do despacho no meDIZ. Chave preferencial. |
| `transaction_id` | fluxo de criação da linha | O `HP…` da Hotmart. Chave reserva. |
| `mediz_status` | o job | `atualizado`, `nao_encontrado`, `ambiguo` ou `erro`. |
| `mediz_atualizado_em` | o job | Quando o job escreveu, em ISO. |

CPF, e-mail, nome e endereço já existem na planilha e continuam como estão. O CPF é a chave que faz as linhas antigas casarem.

**`shipment_id` tem dois escritores de propósito.** O fluxo que cria a linha preenche daqui para frente — ele já recebe o campo no aviso de acesso. As linhas antigas nascem sem, e é aí que entra o job: quando o casamento por CPF dá certo, a resposta traz o `shipment_id`, e o job grava na coluna. Da segunda passada em diante aquela linha para de depender de palpite e passa a casar pela chave forte. A planilha se conserta sozinha, linha a linha, sem ninguém digitar nada.

**Quais linhas o job processa.** Toda linha que tem `tracking_code` preenchido e `mediz_status` diferente de `atualizado`. Ou seja: `erro`, `nao_encontrado` e `ambiguo` voltam na próxima passada. Isso é intencional e barato — são poucas linhas — e faz o conserto chegar sozinho:

- Uma venda `failed` reprocessada faz a linha `nao_encontrado` passar a casar.
- Um `ambiguo` resolvido na mão no admin ganha o código no despacho certo; na passada seguinte a linha casa pela regra do `tracking_code`, que é exata, e vira `atualizado`.

Ninguém precisa voltar na planilha para desmarcar nada.

## 4. Entrada

`POST https://<host>/api/shipments/tracking`
`Authorization: Bearer <SHIPMENT_TRACKING_SECRET>`

Uma linha ou um lote (até **200** por chamada):

```json
{
  "shipments": [
    {
      "row": "42",
      "cpf": "12345678901",
      "tracking_code": "AA123456789BR",
      "status": "postado",
      "status_label": "Objeto postado",
      "posted_at": "2026-08-26T14:30:00Z"
    }
  ]
}
```

| Campo | Obrigatório | Para que serve |
|---|---|---|
| `row` | recomendado | Devolvido intacto no resultado. É como o n8n sabe em que linha escrever a resposta. Use o número da linha da planilha, ou qualquer id estável dela. |
| `cpf` | — | Chave de casamento das linhas antigas. Aceita com ou sem pontuação. |
| `tracking_code` | — | O código que a gráfica escreveu. É o que o meDIZ vai gravar. |
| `shipment_id` | — | Chave preferencial, quando existir na planilha. |
| `transaction_id` | — | Segunda melhor chave (o `HP…` da Hotmart). |
| `email` | — | Último recurso de casamento. |
| `status` | — | Um de `aguardando_postagem`, `postado`, `em_transito`, `entregue`, `devolvido`, `problema`. |
| `status_label` | — | Texto da transportadora. Quando `status` não vem, o meDIZ deduz o status daqui. |
| `posted_at` / `delivered_at` | — | Datas ISO. |

Se nem `status` nem `status_label` vierem, a simples chegada do código já move o despacho de `aguardando_postagem` para `postado` — porque o código só existe depois que a gráfica postou.

Também aceita um objeto solto (uma linha só) ou um array puro, sem o envelope `shipments`.

## 5. Saída

```json
{
  "ok": true,
  "processados": 3,
  "atualizados": 2,
  "nao_encontrados": 1,
  "resultados": [
    { "ok": true,  "row": "42", "shipment_id": "uuid…", "status": "postado" },
    { "ok": true,  "row": "43", "shipment_id": "uuid…", "status": "entregue" },
    { "ok": false, "row": "44", "reason_code": "ambiguo",
      "reason": "Mais de um despacho esperando código para esta pessoa — resolver no admin",
      "input": { "cpf": "12345678901" } }
  ]
}
```

`ok: true` no topo significa "o lote foi processado", não "tudo casou". O que importa por linha está em `resultados`, e cada resultado traz de volta o `row` que entrou.

## 6. O que escrever de volta na planilha

Decida pelo `reason_code`, nunca pelo texto de `reason` — o código é estável, o texto em português muda.

| Resultado | `mediz_status` | Também escreve | O que fazer |
|---|---|---|---|
| `ok: true` | `atualizado` | `shipment_id` da resposta, se a coluna estiver vazia | Nada. Linha resolvida. |
| `reason_code: "nao_encontrado"` | `nao_encontrado` | — | Venda que o meDIZ não conhece. Conferir se é anterior a 18/08. |
| `reason_code: "ambiguo"` | `ambiguo` | — | A pessoa tem mais de um livro a caminho. Alguém no admin precisa dizer qual código é de qual. |
| `reason_code: "codigo_invalido"` | `codigo_invalido` | — | A coluna do código traz outra coisa (`#N/A ()`, `CANCELADO`). Alguém precisa olhar o que aconteceu com aquele despacho. |
| `reason_code: "falha"` | `erro` | — | Achou o despacho e estourou ao gravar. Volta na próxima passada; se repetir, é bug. |

`mediz_atualizado_em` recebe a data em todos os quatro casos — inclusive nos que não casaram, que é justamente onde interessa saber há quanto tempo a linha está parada.

## 7. Como o meDIZ acha o despacho

Da chave mais confiável para a menos:

1. **`shipment_id`** — id direto. Viaja no aviso de acesso desde 20/08.
2. **`transaction_id`** — o `HP…` da venda.
3. **`tracking_code`** — casa o reenvio da mesma linha com o despacho que já recebeu aquele código.
4. **`cpf`** — resolve para o usuário e pega o despacho dele que ainda espera código.
5. **`email`** — mesma coisa, por e-mail.

As duas últimas são palpite, não casamento exato, e por isso só entram quando a pessoa tem **exatamente um** despacho esperando código. Quem comprou o livro duas vezes tem dois; escolher um no chute gravaria o rastreio no livro errado, o que é pior do que não casar. Esse é o caso que volta como `ambiguo`.

## 8. Reprocessar é seguro

O endpoint é idempotente por natureza:

- Mandar a mesma linha duas vezes acha o mesmo despacho (pelo `tracking_code`, na segunda vez) e regrava o mesmo valor.
- O status só anda para frente: `postado` chegando depois de `entregue` não apaga a entrega. `devolvido` e `problema` são exceção e sempre valem, porque são exatamente a notícia que ninguém pode perder.
- `posted_at` só é preenchido uma vez.

Ou seja: em caso de dúvida, reprocessar a planilha inteira não estraga nada.

## 9. Estado da base em 27/08/2026

| | |
|---|---|
| Despachos aguardando código | **80** |
| Com CPF válido para casar | **80** (100%) |
| CPFs que casam sozinhos | **78** |
| CPFs ambíguos | **1** (dois despachos: `HP3795148869` e `HP3750517996`) |

Os identificadores citados aqui e na seção 10 são o número da transação na Hotmart, não dado pessoal — é por ele que se acha a venda no admin. CPF e e-mail de cliente ficam fora deste documento de propósito.
| Cobertura | vendas de **18/08** em diante |

Os 28 despachos de 18 a 20/08 foram criados por backfill (`npm run backfill:book-shipments`), a partir dos `purchase_events` — a tabela `book_shipments` só passou a existir em 19/08 e essas vendas ficaram sem linha.

## 10. O que fica de fora

**Três vendas com status `failed`** (`HP4104156954C1`, `HP4182623304C1`, `HP2080736774C1`) não têm despacho e não vão casar com nada. Não é problema de rastreio: a venda estourou no cadastro e essas pessoas não têm acesso ao meDIZ. Precisam ser reprocessadas antes de qualquer conversa sobre despacho.

**Linhas da planilha anteriores a 18/08**, se existirem, não têm contraparte no meDIZ nem como `purchase_event` — o registro de vendas começa nessa data. Vão voltar como `nao_encontrado` e não há o que fazer pelo endpoint.

**Ninguém é avisado quando o código chega.** Hoje o rastreio entra no banco e só aparece se a pessoa abrir `/biblioteca`. Quem esperava o código não recebe WhatsApp nem e-mail dizendo que saiu. É a próxima peça, e é ela que fecha o buraco de "não viram no meDIZ".
