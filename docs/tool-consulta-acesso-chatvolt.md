# Tool ChatVolt — Consulta e Geração de Link de Acesso [meDIZ]

> Documento para validação. Descreve o que a tool faz, quando a IA deve chamá-la, e o que ela devolve — sem entrar em detalhes de implementação do n8n ou do backend.

## 1. Problema que resolve

Hoje o acesso ao produto é liberado automaticamente na compra, com um link mágico enviado por WhatsApp/e-mail. Em alguns casos esse link falha ou o cliente não encontra a mensagem, e chega no atendimento dizendo "comprei e não consigo entrar".

Até agora isso virava ticket manual: alguém do time precisava checar no banco se a compra existe, se o produto foi liberado, e gerar/reenviar o acesso à mão.

Esta tool dá para a IA do atendimento (ChatVolt) o mesmo poder de consulta, para responder o cliente na hora — sem esperar um humano.

## 2. Quando a IA deve usar esta tool

- Cliente diz que comprou mas não recebeu o acesso, não achou o e-mail/WhatsApp, ou o link não funcionou.
- Cliente pergunta se a compra foi confirmada, ou o que ele tem liberado na conta.
- Cliente esqueceu como entrar e pede um novo link.

**Pré-requisito:** a IA precisa primeiro obter o e-mail (ou CPF/WhatsApp) da compra com o cliente. A tool não adivinha quem está falando — ela consulta pelo dado informado.

## 3. Quando a IA NÃO deve usar

- Perguntas sobre conteúdo do produto (isso é a IA de atendimento normal, não esta tool).
- Sem ter confirmado antes, com o próprio cliente na conversa, que o e-mail/telefone informado é dele. A resposta desta tool pode incluir um link que loga direto na conta — ver seção 7.
- Repetidamente na mesma conversa "só para checar de novo" — uma consulta já traz tudo que existe hoje; chamar de novo não muda o resultado a não ser que algo tenha mudado do lado do meDIZ.

## 4. Como funciona (visão geral)

```
ChatVolt (IA)  →  chama a tool com o e-mail do cliente
                        │
                        ▼
      [1] Consulta o cadastro no meDIZ (conta, produtos, plano,
          se algum aviso de acesso já foi enviado, se há compra
          represada sem produto ainda vinculado)
                        │
                        ▼
      [2] Decide se faz sentido gerar um link de acesso novo
          (ver regra na seção 6)
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        SIM: gera o link     NÃO: só devolve
        e devolve junto      o status atual
              │                   │
              └─────────┬─────────┘
                        ▼
      A IA recebe tudo em JSON e decide o que fazer:
      mostrar o link no chat, explicar o status, ou
      escalar para um humano.
```

**Importante: esta tool nunca envia WhatsApp ou e-mail sozinha.** Ela só consulta e, quando necessário, gera um link e devolve na resposta. Quem decide se mostra o link ao cliente — e como — é a própria IA/ChatVolt.

## 5. Entrada (o que a IA envia)

```json
{
  "email": "cliente@exemplo.com",
  "cpf": "",
  "whatsapp": "",
  "forcar_novo_link": false
}
```

| Campo | Obrigatório | Descrição |
|---|---|---|
| `email` | Pelo menos um entre `email`/`cpf`/`whatsapp` | E-mail usado na compra. É o dado mais confiável — presente em 100% dos cadastros. |
| `cpf` | — | Alternativa ao e-mail. Só ~22% dos cadastros têm CPF. |
| `whatsapp` | — | Alternativa ao e-mail. Se mais de uma conta usar o mesmo número, a tool avisa que precisa de e-mail ou CPF para desempatar. |
| `forcar_novo_link` | Não (default `false`) | Marcar `true` quando o cliente já disse explicitamente que não recebeu ou não consegue entrar. Força gerar um link novo mesmo que o último aviso conste como enviado com sucesso. |

## 6. Saída (o que a IA recebe)

Formato único, igual em todos os cenários — o que muda são os valores:

```json
{
  "ok": true,
  "found": true,
  "ambiguous": false,
  "nome": "Fulana de Tal",
  "produtos": [
    { "id": "...", "titulo": "O Corpo Diz", "secao": "biblioteca", "liberado_em": "2026-08-01T12:00:00.000Z" }
  ],
  "plano": null,
  "ultima_entrega": { "status": "sent", "tipo": "new_account", "tentativas": 1, "enviado_em": "2026-08-01T12:01:00.000Z", "erro": null },
  "vendas_pendentes": [],
  "link_gerado": false,
  "link_acesso": null,
  "mensagem_sugerida": "Encontrei sua conta e o último aviso de acesso já saiu com sucesso — você pode entrar normalmente."
}
```

| Campo | Descrição |
|---|---|
| `ok` | `false` só em falha técnica (ex.: meDIZ fora do ar). Nesse caso, `mensagem_sugerida` já vem com um texto pedindo para tentar de novo. |
| `found` | Se existe conta com os dados informados. |
| `ambiguous` | Só relevante quando a busca foi por `whatsapp`: `true` quando mais de uma conta usa o mesmo número. |
| `nome` | Nome do cliente, quando encontrado. |
| `produtos` | Lista do que está liberado na conta. |
| `plano` | Assinatura ativa, se houver (`null` quando não há). |
| `ultima_entrega` | Status do último aviso de acesso que o meDIZ tentou enviar (`sent`, `pending`, `failed`) — é o dado que embasa a decisão de gerar link novo. |
| `vendas_pendentes` | Compras que chegaram no meDIZ mas ainda não foram vinculadas a um produto do catálogo — ver seção 6.2. |
| `link_gerado` | Se um link novo foi gerado nesta chamada. |
| `link_acesso` | Quando `link_gerado: true`: `{ "url": "...", "expires_at": "..." }`. O link entra direto na conta, sem senha, e vale por 7 dias. |
| `mensagem_sugerida` | Texto pronto em português, para a IA usar como base da resposta ao cliente. |

### 6.1 Regra para gerar link novo

A tool só gera (`link_gerado: true`) quando a conta existe **e**:

- nunca houve nenhum aviso de acesso registrado para ela, **ou**
- o último aviso não ficou com status `sent` (falhou ou ainda está pendente), **ou**
- a IA marcou `forcar_novo_link: true` porque o cliente relatou o problema.

Se a conta existe e o último aviso já saiu com sucesso, a tool **não gera link sozinha** — só informa que o acesso já foi entregue. Isso evita gerar (e principalmente expor) um link novo toda vez que alguém só pergunta "o que eu comprei?".

### 6.2 Compra represada (`vendas_pendentes`)

Quando não existe conta ainda, mas a compra chegou no meDIZ e está esperando ser vinculada a um produto do catálogo, a tool devolve isso em `vendas_pendentes` em vez de simplesmente "não encontrei nada". Nesse caso a `mensagem_sugerida` já orienta a IA a dizer que a compra foi recebida e está sendo processada — é um caso para o time interno resolver, não algo que um link resolveria.

### 6.3 Outros cenários

| Situação | `found` | `ambiguous` | `link_gerado` |
|---|---|---|---|
| Conta existe, último aviso falhou | `true` | `false` | `true` |
| Conta existe, último aviso já enviado com sucesso | `true` | `false` | `false` |
| Conta existe, cliente insistiu (`forcar_novo_link: true`) | `true` | `false` | `true` |
| Nenhuma conta, sem compra represada | `false` | `false` | `false` |
| Nenhuma conta, mas há compra represada | `false` | `false` | `false` (ver `vendas_pendentes`) |
| Mais de uma conta com o mesmo WhatsApp | `false` | `true` | `false` |

## 7. Atenção — o link é uma credencial

O link devolvido em `link_acesso.url` entra direto na conta, sem pedir senha (vale como redefinição de senha). Diferente do fluxo de e-mail/WhatsApp automático, aqui o link volta na própria resposta da tool — não vai só para o contato já cadastrado.

**Por isso, esta tool só deve ser habilitada em conversas onde já existe alguma confirmação de identidade** (por exemplo: atendimento pelo WhatsApp com o número batendo o cadastro). Não deve ficar disponível para qualquer pessoa digitar um e-mail à vontade e receber o link de outra conta.

## 8. Status atual

- [x] Consulta ao cadastro (produtos, plano, histórico de entrega, vendas represadas).
- [x] Geração de link novo sob demanda, sem disparo automático de mensagem.
- [ ] Endpoint do meDIZ (`/api/customer/access-link`) publicado em produção.
- [ ] Credencial configurada no n8n.
- [ ] Tool cadastrada no ChatVolt, com a restrição de identidade da seção 7 aplicada.
- [ ] Teste ponta a ponta antes de liberar para o atendimento real.
