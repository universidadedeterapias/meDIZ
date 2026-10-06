import { workflow, node, trigger, ifElse, sticky, newCredential, expr } from '@n8n/workflow-sdk';

const gatilho = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: "A cada 30 minutos",
    parameters: {
  "rule": {
    "interval": [
      {
        "field": "minutes",
        "minutesInterval": 30
      }
    ]
  }
},
    position: [240,464]
  }
});

const busca = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Busca candidatos do fim do trial",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/journey-events/trial-fim",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ limite: 200 }) }}"),
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    }
  }
},
    credentials: { httpHeaderAuth: newCredential('meDIZ API — Webhook Bearer') },
    onError: 'continueRegularOutput',
    position: [544,464]
  }
});

const separa6 = node({
  type: 'n8n-nodes-base.splitOut',
  version: 1,
  config: {
    name: "Separa dia 6",
    parameters: {
  "fieldToSplitOut": "dia6.candidatos",
  "options": {}
},
    position: [848,272]
  }
});

const resolve6 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: "Resolve template (dia 6)",
    parameters: {
  "mode": "runOnceForEachItem",
  "jsCode": "const item = $input.item;\nitem.json.templateName = 'dia6_alteracao_plano';\nitem.json.templateLangCode = 'pt_BR';\nitem.json.text = 'Ola, ' + item.json.primeiroNome + '! Aqui e a Aline, da editora do livro O CORPO DIZ.\\n\\nSobre o seu acesso ao aplicativo meDIZ!\\n\\nEstou preparando a alteracao do seu plano, programada para amanha:\\nPlano Profissional completo -> Plano Essencia\\n\\nObservacao encontrada no seu perfil: consta 1 recurso ativo ainda nao utilizado, incluido na alteracao de amanha.\\n\\nComo devo proceder?';\nitem.json.botoes = [\n  { type: 'quick_reply', value: 'QUAL RECURSO?', index: 0 },\n  { type: 'quick_reply', value: 'PODE APLICAR', index: 1 },\n  { type: 'quick_reply', value: 'RESPONDER DEPOIS', index: 2 }\n];\nreturn item;"
},
    position: [1040,272]
  }
});

const whats6 = node({
  type: 'n8n-nodes-base.filter',
  version: 2.2,
  config: {
    name: "Tem WhatsApp? (dia 6)",
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
        "id": "tem-whatsapp",
        "leftValue": expr("{{ $json.whatsapp }}"),
        "rightValue": "",
        "operator": {
          "type": "string",
          "operation": "notEmpty",
          "singleValue": true
        }
      }
    ],
    "combinator": "and"
  },
  "options": {}
},
    position: [1248,272]
  }
});

const envia6 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Envia template (dia 6)",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/mensagens/enviar",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ fluxo: \"trial_fim\", chave: \"trial_fim:\" + $json.userId + \":1\", userId: $json.userId, n8nWorkflowId: $workflow.id, n8nExecucaoId: $execution.id, corpo: { to: $json.whatsapp, agentId: \"cmr7uw00e03st8flyqmtj7cq4\", templateName: $json.templateName, templateLangCode: $json.templateLangCode, text: $json.text, var_1: $json.primeiroNome, buttons: $json.botoes } }) }}"),
  "options": {
    "batching": {
      "batch": {
        "batchSize": 1,
        "batchInterval": 5000
      }
    },
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 30000
  }
},
    credentials: { httpHeaderAuth: newCredential('meDIZ API — Webhook Bearer') },
    onError: 'continueRegularOutput',
    position: [1456,272]
  }
});

const saiu6 = ifElse({
  version: 2.2,
  config: {
    name: "Saiu? (dia 6)",
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
    position: [1664,272]
  }
});

const registra6 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Registra o toque (dia 6)",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/journey-events/despertadores/toques",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ userId: $(\"Resolve template (dia 6)\").item.json.userId, sistema: \"trial_fim\", toque: 1, conversationId: $json.conversationId || ((($json.messages || [])[0]) || {}).conversationId || null, template: $(\"Resolve template (dia 6)\").item.json.templateName }) }}"),
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    }
  }
},
    credentials: { httpHeaderAuth: newCredential('meDIZ API — Webhook Bearer') },
    onError: 'continueRegularOutput',
    position: [1872,272]
  }
});

const separa8 = node({
  type: 'n8n-nodes-base.splitOut',
  version: 1,
  config: {
    name: "Separa dia 8",
    parameters: {
  "fieldToSplitOut": "dia8.candidatos",
  "options": {}
},
    position: [848,672]
  }
});

const resolve8 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: "Resolve template (dia 8)",
    parameters: {
  "mode": "runOnceForEachItem",
  "jsCode": "const item = $input.item;\nitem.json.templateName = 'dia8_plano_essencia';\nitem.json.templateLangCode = 'pt_BR';\nitem.json.text = 'Oi ' + item.json.primeiroNome + '! Sobre o seu acesso ao aplicativo meDIZ!\\n\\nA alteracao programada foi concluida.\\n\\nAo acessar o app meDIZ agora, voce ja esta no Plano Essencia.\\n\\nTudo o que voce adquiriu continua disponivel no app - o livro, os bonus e as suas pesquisas.\\n\\nSe tiver alguma duvida, e so me chamar por aqui.';\nitem.json.botoes = [\n  { type: 'quick_reply', value: 'Tenho uma duvida', index: 0 }\n];\nreturn item;"
},
    position: [1040,672]
  }
});

const whats8 = node({
  type: 'n8n-nodes-base.filter',
  version: 2.2,
  config: {
    name: "Tem WhatsApp? (dia 8)",
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
        "id": "tem-whatsapp",
        "leftValue": expr("{{ $json.whatsapp }}"),
        "rightValue": "",
        "operator": {
          "type": "string",
          "operation": "notEmpty",
          "singleValue": true
        }
      }
    ],
    "combinator": "and"
  },
  "options": {}
},
    position: [1248,672]
  }
});

const envia8 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Envia template (dia 8)",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/mensagens/enviar",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ fluxo: \"trial_fim\", chave: \"trial_fim:\" + $json.userId + \":2\", userId: $json.userId, n8nWorkflowId: $workflow.id, n8nExecucaoId: $execution.id, corpo: { to: $json.whatsapp, agentId: \"cmr7uw00e03st8flyqmtj7cq4\", templateName: $json.templateName, templateLangCode: $json.templateLangCode, text: $json.text, var_1: $json.primeiroNome, buttons: $json.botoes } }) }}"),
  "options": {
    "batching": {
      "batch": {
        "batchSize": 1,
        "batchInterval": 5000
      }
    },
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 30000
  }
},
    credentials: { httpHeaderAuth: newCredential('meDIZ API — Webhook Bearer') },
    onError: 'continueRegularOutput',
    position: [1456,672]
  }
});

const saiu8 = ifElse({
  version: 2.2,
  config: {
    name: "Saiu? (dia 8)",
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
    position: [1664,672]
  }
});

const registra8 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Registra o toque (dia 8)",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/journey-events/despertadores/toques",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ userId: $(\"Resolve template (dia 8)\").item.json.userId, sistema: \"trial_fim\", toque: 2, conversationId: $json.conversationId || ((($json.messages || [])[0]) || {}).conversationId || null, template: $(\"Resolve template (dia 8)\").item.json.templateName }) }}"),
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    }
  }
},
    credentials: { httpHeaderAuth: newCredential('meDIZ API — Webhook Bearer') },
    onError: 'continueRegularOutput',
    position: [1872,672]
  }
});

const nota = sticky("## Envio pelo portao (Story 6.2, 06/10/2026)\n\nO template nao vai mais direto ao Chatvolt: sai por POST mediz.app/api/mensagens/enviar com a chave trial_fim:<userId>:<toque>.\n\n- Chave repetida volta ja_enviado sem enviar. Foi a falta disso que mandou mais de mil templates repetidos em 05/10.\n- O toque so e registrado em enviado ou ja_enviado. Se o registro falhar depois de um envio, a proxima rodada recebe ja_enviado e registra, sem mandar de novo.\n- barrado (fluxo desligado, teto, limite da pessoa) e falhou nao registram: a pessoa volta na proxima rodada e o portao decide de novo.\n- Desligar o envio: fluxos_automacao.ligado = false para 'trial_fim'. O fluxo continua rodando e tudo volta barrado.", { position: [1248, 860], width: 640, height: 300 });

export default workflow('vTURhr3n6CydCslx', 'Fim do Trial — templates [meDIZ]')
  .add(gatilho)
  .to(busca)
  .to(separa6.to(resolve6.to(whats6.to(envia6.to(saiu6.onTrue(registra6))))))
  .add(busca)
  .to(separa8.to(resolve8.to(whats8.to(envia8.to(saiu8.onTrue(registra8))))))
  .add(nota);
