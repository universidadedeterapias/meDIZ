import { workflow, node, trigger, switchCase, ifElse, splitInBatches, nextBatch, sticky, newCredential, expr } from '@n8n/workflow-sdk';

const gatilho = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: "A cada 10 minutos",
    parameters: {
  "rule": {
    "interval": [
      {
        "field": "minutes",
        "minutesInterval": 10
      }
    ]
  }
},
    position: [-560,416]
  }
});

const busca = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Busca o lote",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/campanhas/claim",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": {
    "limite": 15
  },
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 20000
  }
},
    credentials: { httpHeaderAuth: newCredential('meDIZ API — Webhook Bearer') },
    onError: 'continueRegularOutput',
    position: [-336,416]
  }
});

const temGente = switchCase({
  version: 3.4,
  config: {
    name: "Tem gente no lote?",
    parameters: {
  "rules": {
    "values": [
      {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "loose"
          },
          "conditions": [
            {
              "leftValue": expr("{{ $json.total }}"),
              "rightValue": 0,
              "operator": {
                "type": "number",
                "operation": "gt"
              }
            }
          ],
          "combinator": "and"
        },
        "renameOutput": true,
        "outputKey": "tem"
      },
      {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "loose"
          },
          "conditions": [
            {
              "leftValue": expr("{{ $json.total }}"),
              "rightValue": 0,
              "operator": {
                "type": "number",
                "operation": "lte"
              }
            }
          ],
          "combinator": "and"
        },
        "renameOutput": true,
        "outputKey": "vazio"
      }
    ]
  },
  "options": {}
},
    position: [-112,416]
  }
});

const montaEnvios = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: "Monta os envios",
    parameters: {
  "jsCode": "const WABA_ID = '1312217107345989';\nconst AGENT_ID = 'cmr7uw00e03st8flyqmtj7cq4';\n\n// Este no nao decide nada. O /claim ja resolveu as variaveis do template com\n// os dados de quem vai receber, e ja montou o botao — porque so o app conhece\n// o destinatario, e porque template novo nao pode exigir editar fluxo.\n//\n// it.variaveis vem como { var_1: \"Maria\", var_2: \"O CORPO DIZ\" }\n// it.botoes    vem como [{ type: \"url\", value: \"<token>\", index: 0 }] ou null\nconst lote = ($input.first().json.itens) || [];\nconst saida = [];\n\nfor (const it of lote) {\n  const corpo = Object.assign({\n    to: String(it.telefone || ''),\n    agentId: AGENT_ID,\n    templateName: it.templateName,\n    templateLangCode: it.templateLang,\n    text: 'Reativacao — ' + it.campanha\n  }, it.variaveis || {});\n\n  if (it.botoes) corpo.buttons = it.botoes;\n\n  saida.push({ json: Object.assign({}, it, { waba_id: WABA_ID, corpo_template: corpo }) });\n}\n\nreturn saida;"
},
    position: [112,304]
  }
});

const nadaAEnviar = node({
  type: 'n8n-nodes-base.noOp',
  version: 1,
  config: {
    name: "Nada a enviar agora",
    parameters: {},
    position: [112,496]
  }
});

const loop = splitInBatches({
  version: 3,
  config: {
    name: "Loop item a item",
    parameters: {
  "options": {}
},
    position: [336,304]
  }
});

const loteConcluido = node({
  type: 'n8n-nodes-base.noOp',
  version: 1,
  config: {
    name: "Lote concluído",
    parameters: {},
    position: [560,320]
  }
});

const envia = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Envia o template",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/mensagens/enviar",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ fluxo: \"reativacao\", chave: \"reativacao:\" + $json.destinatarioId, userId: $json.userId, n8nWorkflowId: $workflow.id, n8nExecucaoId: $execution.id, corpo: $json.corpo_template }) }}"),
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 40000
  }
},
    credentials: { httpHeaderAuth: newCredential('meDIZ API — Webhook Bearer') },
    onError: 'continueRegularOutput',
    position: [560,128]
  }
});

const saiu = ifElse({
  version: 2.2,
  config: {
    name: "Saiu?",
    parameters: {
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "loose",
      "version": 2
    },
    "conditions": [
      {
        "id": "enviado",
        "leftValue": expr("{{ $json.status }}"),
        "rightValue": "enviado",
        "operator": {
          "type": "string",
          "operation": "equals"
        }
      },
      {
        "id": "ja-enviado",
        "leftValue": expr("{{ $json.status }}"),
        "rightValue": "ja_enviado",
        "operator": {
          "type": "string",
          "operation": "equals"
        }
      }
    ],
    "combinator": "or"
  },
  "options": {}
},
    position: [784,128]
  }
});

const moveEtapa = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Move a etapa no CRM",
    parameters: {
  "method": "POST",
  "url": "https://api.chatvolt.ai/crm/step/conversation",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ conversationId: $json.conversationId || ((($json.messages || [])[0]) || {}).conversationId || \"\", scenarioId: $(\"Monta os envios\").item.json.crmScenarioId, stepId: $(\"Monta os envios\").item.json.crmStepId }) }}"),
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 20000
  }
},
    credentials: { httpHeaderAuth: newCredential('Chatvolt API') },
    onError: 'continueRegularOutput',
    position: [1008,32]
  }
});

const montaResultado = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: "Monta o resultado do item",
    parameters: {
  "jsCode": "// Traduz a resposta do portao (POST /api/mensagens/enviar) para o /campanhas/result.\n//\n//   enviado, ja_enviado -> ok: a pessoa recebeu (agora ou numa tentativa anterior)\n//   barrado             -> adiado: o portao segurou (fluxo desligado, teto, limite\n//                          da pessoa); volta para a fila sem gastar tentativa\n//   falhou, incerto     -> erro: gasta tentativa; o claim desiste depois de 3.\n//                          incerto nunca reenvia — o portao responde incerto de novo\n//\n// .item (nao .first()) em \"Monta os envios\": ele produz o lote inteiro de uma vez,\n// e .item segue o item pareado desta volta do loop.\nconst dest = $('Monta os envios').item.json;\nconst resp = $('Envia o template').first().json || {};\nconst status = resp.status;\nconst ok = status === 'enviado' || status === 'ja_enviado';\nconst conversationId = resp.conversationId || ((((resp.messages || [])[0]) || {}).conversationId) || null;\nconst erro = ok ? null : String(\n  status ? status + ': ' + (resp.motivo || '') : (resp.mensagem || resp.message || JSON.stringify(resp))\n).slice(0, 500);\n\nreturn [{ json: { itens: [{\n  destinatarioId: dest.destinatarioId,\n  ok: ok,\n  adiado: status === 'barrado',\n  conversationId: conversationId,\n  erro: erro\n}] } }];"
},
    position: [1232,128]
  }
});

const devolve = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Devolve o resultado do item",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/campanhas/result",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify($json) }}"),
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 20000
  }
},
    credentials: { httpHeaderAuth: newCredential('meDIZ API — Webhook Bearer') },
    onError: 'continueRegularOutput',
    position: [1456,128]
  }
});

const espera = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: "Espera 15s",
    parameters: {
  "amount": 15
},
    position: [1680,224]
  }
});

const nota = sticky("## Envio pelo portao (Story 6.2, 06/10/2026)\n\nO template sai por POST mediz.app/api/mensagens/enviar com a chave reativacao:<destinatarioId>, e nao mais direto no Chatvolt.\n\n- enviado / ja_enviado: move a etapa no CRM e devolve ok.\n- barrado (fluxo desligado, teto, limite da pessoa): devolve adiado — a pessoa volta para a fila sem gastar tentativa.\n- falhou / incerto: devolve erro; o claim tenta de novo ate 3 vezes, e incerto nunca reenvia.\n- Quem ficar preso em \"enviando\" volta para a fila em 15 min (o claim faz isso desde a Story 6.2); a chave impede reenvio.\n- Desligar o envio sem parar o fluxo: fluxos_automacao.ligado = false para 'reativacao'.", { position: [336, 560], width: 680, height: 300 });

export default workflow('Xn1lxsDI9XAiA21M', 'Reativação — envio da onda [meDIZ]')
  .add(gatilho)
  .to(busca)
  .to(temGente
    .onCase(0, montaEnvios.to(loop
      .onDone(loteConcluido)
      .onEachBatch(envia.to(saiu
        .onTrue(moveEtapa.to(montaResultado))
        .onFalse(montaResultado)))))
    .onCase(1, nadaAEnviar))
  .add(montaResultado)
  .to(devolve)
  .to(espera)
  .to(nextBatch(loop))
  .add(nota);
