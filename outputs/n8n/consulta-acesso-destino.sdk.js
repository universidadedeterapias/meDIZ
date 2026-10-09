import { workflow, node, trigger, ifElse, sticky } from '@n8n/workflow-sdk';

const wh1 = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Consulta Acesso [ChatVolt]",
    parameters: {
  "httpMethod": "POST",
  "path": "consulta-acesso",
  "responseMode": "responseNode",
  "options": {
    "ignoreBots": false
  }
},
    webhookId: "e33a18f6-08d2-446e-bc93-5547b45886c4",
    position: [
  -640,
  0
]
  },
  output: [{ body: {} }]
});

const normalizar = node({
  type: "n8n-nodes-base.code",
  version: 2,
  config: {
    name: "Normalizar Entrada",
    parameters: {
  "jsCode": "const body = $input.first().json.body || {};\n\nfunction limpo(v) {\n  if (v === null || v === undefined) return '';\n  return String(v).trim();\n}\n\nconst email = limpo(body.email).toLowerCase();\nconst cpf = limpo(body.cpf);\nconst whatsapp = limpo(body.whatsapp);\nconst forcarNovoLink = body.forcar_novo_link === true || body.forcar_novo_link === 'true';\n\nif (!email && !cpf && !whatsapp) {\n  throw new Error('Informe email, cpf ou whatsapp para consultar o acesso.');\n}\n\nreturn [{\n  json: {\n    email: email,\n    cpf: cpf,\n    whatsapp: whatsapp,\n    forcar_novo_link: forcarNovoLink\n  }\n}];"
},
    position: [
  -416,
  0
]
  }
});

const lookup = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Consultar Cliente (lookup)",
    parameters: {
  "url": "https://mediz.app/api/customer/lookup",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendQuery": true,
  "queryParameters": {
    "parameters": [
      {
        "name": "email",
        "value": "={{ $json.email }}"
      },
      {
        "name": "cpf",
        "value": "={{ $json.cpf }}"
      },
      {
        "name": "whatsapp",
        "value": "={{ $json.whatsapp }}"
      }
    ]
  },
  "options": {
    "response": {
      "response": {
        "fullResponse": true,
        "neverError": true
      }
    }
  }
},
    credentials: {
  "httpHeaderAuth": {
    "id": "61Ucwwybsgb47Fph",
    "name": "webhook"
  }
},
    position: [
  -192,
  0
]
  }
});

const avaliar = node({
  type: "n8n-nodes-base.code",
  version: 2,
  config: {
    name: "Avaliar Consulta e Decidir",
    parameters: {
  "jsCode": "const resp = $input.first().json;\nconst status = resp.statusCode;\nconst data = resp.body || {};\n\nif (status !== 200) {\n  return [{\n    json: {\n      ok: false,\n      status_http: status,\n      erro: (data && data.error) ? data.error : 'Falha ao consultar o cadastro no meDIZ.',\n      found: false,\n      ambiguous: false,\n      precisa_reenviar: false,\n      reenvio_recente_min: null\n    }\n  }];\n}\n\nconst entrada = $('Normalizar Entrada').item.json;\nconst entrega = data.ultima_entrega;\n\n// Trava contra reenvio em sequencia: cada reenvio e um template pago, e a\n// Entrega de Acesso nao entra no limite por pessoa do portao de envio. Se o\n// ultimo aviso foi um reenvio que saiu ha menos de 30 min, nao manda de novo\n// — mesmo com forcar_novo_link.\nconst TRAVA_MIN = 30;\nlet reenvioRecenteMin = null;\nif (entrega && entrega.tipo === 'access_resent' && entrega.status === 'sent' && entrega.enviado_em) {\n  const min = Math.floor((Date.now() - new Date(entrega.enviado_em).getTime()) / 60000);\n  if (min < TRAVA_MIN) reenvioRecenteMin = Math.max(min, 0);\n}\n\n// Reenvia quando a conta existe (e e uma so) e: nunca houve aviso, o ultimo\n// nao saiu, ou o atendimento pediu (a pessoa disse que nao recebeu ou nao\n// consegue entrar). O reenvio vai para o contato DO CADASTRO, nunca para o\n// que veio na conversa.\nconst precisaReenviar = !!data.found && !data.ambiguous && reenvioRecenteMin === null && (\n  entrada.forcar_novo_link ||\n  !entrega ||\n  entrega.status !== 'sent'\n);\n\nreturn [{\n  json: {\n    ok: true,\n    found: !!data.found,\n    ambiguous: !!data.ambiguous,\n    matched_by: data.matched_by || null,\n    customer: data.customer || null,\n    produtos: data.produtos || [],\n    plano: data.plano || null,\n    ultima_entrega: entrega || null,\n    vendas_pendentes: data.vendas_pendentes || [],\n    precisa_reenviar: precisaReenviar,\n    reenvio_recente_min: reenvioRecenteMin,\n    email_busca: entrada.email,\n    cpf_busca: entrada.cpf,\n    whatsapp_busca: entrada.whatsapp\n  }\n}];"
},
    position: [
  32,
  0
]
  }
});

const precisa = ifElse({
  type: "n8n-nodes-base.if",
  version: 2.3,
  config: {
    name: "Precisa reenviar o acesso?",
    parameters: {
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "strict",
      "version": 3
    },
    "conditions": [
      {
        "id": "precisa-reenviar",
        "leftValue": "={{ $json.precisa_reenviar }}",
        "rightValue": true,
        "operator": {
          "type": "boolean",
          "operation": "equals"
        }
      }
    ],
    "combinator": "and"
  },
  "options": {}
},
    position: [
  256,
  0
]
  }
});

const reenviar = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Reenviar acesso (cadastro)",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/customer/resend-access",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ { \"email\": $json.email_busca, \"cpf\": $json.cpf_busca, \"whatsapp\": $json.whatsapp_busca } }}",
  "options": {
    "response": {
      "response": {
        "fullResponse": true,
        "neverError": true
      }
    },
    "timeout": 30000
  }
},
    credentials: {
  "httpHeaderAuth": {
    "id": "61Ucwwybsgb47Fph",
    "name": "webhook"
  }
},
    position: [
  480,
  -128
]
  }
});

const montaReenvio = node({
  type: "n8n-nodes-base.code",
  version: 2,
  config: {
    name: "Montar Resposta (reenvio)",
    parameters: {
  "jsCode": "const consulta = $('Avaliar Consulta e Decidir').item.json;\nconst resp = $input.first().json;\nconst status = resp.statusCode;\nconst data = (resp.body && typeof resp.body === 'object') ? resp.body : {};\nconst canais = data.canais || {};\n\nlet reenviado = false;\nlet mensagem;\n\nif (status === 200 && data.enviado === true) {\n  reenviado = true;\n  const destinos = [];\n  if (canais.email) destinos.push('o e-mail ' + canais.email);\n  if (canais.whatsapp) destinos.push('o WhatsApp do cadastro');\n  mensagem = 'Pronto! Reenviei o seu acesso para ' + (destinos.length ? destinos.join(' e ') : 'o contato do cadastro') +\n    '. Pode levar alguns minutos para chegar — confira também a caixa de spam.';\n} else if (status === 200) {\n  // Registrado mas nao saiu: nao prometer o que nao aconteceu.\n  mensagem = 'Encontrei o seu cadastro e registrei o reenvio, mas o envio não saiu agora. Vou pedir para o time conferir e te retorno.';\n} else if (status === 409) {\n  mensagem = 'Encontrei mais de uma conta com esse contato. Pode confirmar o e-mail ou o CPF usado na compra?';\n} else {\n  // Qualquer outro erro: a conta EXISTE (a consulta achou). Nunca dizer que\n  // nao e cliente.\n  mensagem = 'Encontrei o seu cadastro, mas não consegui reenviar o acesso agora. Vou pedir para o time conferir e te retorno.';\n}\n\nreturn [{\n  json: {\n    ok: true,\n    found: consulta.found,\n    nome: consulta.customer ? consulta.customer.nome : null,\n    produtos: consulta.produtos,\n    plano: consulta.plano,\n    ultima_entrega: consulta.ultima_entrega,\n    vendas_pendentes: consulta.vendas_pendentes,\n    acesso_reenviado: reenviado,\n    canais: reenviado ? canais : null,\n    // Campos antigos, mantidos para quem ainda le: o fluxo nao gera nem\n    // devolve link desde 06/10/2026.\n    link_gerado: false,\n    link_acesso: null,\n    mensagem_sugerida: mensagem\n  }\n}];"
},
    position: [
  704,
  -128
]
  }
});

const responder = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Responder ChatVolt",
    parameters: {
  "respondWith": "json",
  "responseBody": "={{ $json }}",
  "options": {}
},
    position: [
  928,
  0
]
  }
});

const montaSem = node({
  type: "n8n-nodes-base.code",
  version: 2,
  config: {
    name: "Montar Resposta (sem reenvio)",
    parameters: {
  "jsCode": "const consulta = $input.first().json;\n\nlet mensagem;\nif (!consulta.ok) {\n  mensagem = 'Estou com instabilidade para consultar o cadastro agora. Tente novamente em instantes.';\n} else if (consulta.ambiguous) {\n  mensagem = 'Encontrei mais de uma conta com esse contato. Pode confirmar o e-mail ou o CPF usado na compra?';\n} else if (!consulta.found && consulta.vendas_pendentes && consulta.vendas_pendentes.length > 0) {\n  mensagem = 'Encontrei a compra, mas o produto ainda está sendo liberado no sistema — já vou verificar e te aviso assim que estiver pronto.';\n} else if (!consulta.found) {\n  mensagem = 'Não encontrei nenhuma conta ou compra com esse e-mail. Pode confirmar se foi esse o e-mail usado na compra?';\n} else if (consulta.reenvio_recente_min !== null && consulta.reenvio_recente_min !== undefined) {\n  const min = consulta.reenvio_recente_min;\n  mensagem = 'Acabei de reenviar o seu acesso' + (min > 0 ? ' há ' + min + ' minuto' + (min === 1 ? '' : 's') : ' agora') +\n    ', para o e-mail e o WhatsApp do cadastro. Confira a caixa de entrada e o spam — se em alguns minutos não chegar, me avise.';\n} else {\n  mensagem = 'Encontrei sua conta e o último aviso de acesso já saiu com sucesso — você pode entrar normalmente. Se não estiver conseguindo, me avise que eu reenvio.';\n}\n\nreturn [{\n  json: {\n    ok: consulta.ok !== false,\n    found: !!consulta.found,\n    ambiguous: !!consulta.ambiguous,\n    nome: consulta.customer ? consulta.customer.nome : null,\n    produtos: consulta.produtos || [],\n    plano: consulta.plano || null,\n    ultima_entrega: consulta.ultima_entrega || null,\n    vendas_pendentes: consulta.vendas_pendentes || [],\n    acesso_reenviado: false,\n    reenvio_recente_min: consulta.reenvio_recente_min ?? null,\n    canais: null,\n    link_gerado: false,\n    link_acesso: null,\n    mensagem_sugerida: mensagem\n  }\n}];"
},
    position: [
  480,
  128
]
  }
});

const wh2 = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Liberando acesso pelo id da conversa",
    parameters: {
  "httpMethod": "POST",
  "path": "get-access-by-conversation-id",
  "responseMode": "responseNode",
  "options": {}
},
    webhookId: "9f8091db-4bf0-4920-84b4-0a2b7bd813af",
    position: [
  -640,
  -368
]
  },
  output: [{ body: {} }]
});

const consultando = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Consultando usuario",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/campanhas/access-link",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ { \"conversationId\": $json.body.conversationId, \"destino\": $json.body.destino || \"\" } }}",
  "options": {}
},
    retryOnFail: true,
    credentials: {
  "httpHeaderAuth": {
    "id": "61Ucwwybsgb47Fph",
    "name": "webhook"
  }
},
    position: [
  -416,
  -368
]
  }
});

const retornando = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Retornando URL",
    parameters: {
  "respondWith": "allIncomingItems",
  "options": {}
},
    position: [
  -192,
  -368
]
  }
});

const nota1 = sticky("## Entrada — tool do ChatVolt\n\nA IA da ChatVolt chama este webhook durante o atendimento, passando o e-mail que pediu ao cliente (e opcionalmente cpf/whatsapp, se ja tiver).\n\nCorpo esperado: `{ \"email\": \"...\", \"cpf\": \"...\", \"whatsapp\": \"...\", \"forcar_novo_link\": true|false }`.\n\n`forcar_novo_link` e opcional. Use `true` quando o cliente ja disse explicitamente que nao recebeu ou nao consegue entrar — reenvia o acesso mesmo se o ultimo aviso consta como enviado.\n\nDesde 06/10/2026 o fluxo NAO devolve link: quando reenvia, o acesso sai pela ENTREGA DE ACESSO (portao de envio) para o e-mail e o WhatsApp DO CADASTRO — nunca para o contato que veio na conversa. A resposta diz por onde saiu (`canais`) e traz `mensagem_sugerida`.", { name: "Sticky Note fae9ae2d", position: [
  -2064,
  -256
], width: 480, height: 392, color: 4 });

const nota2 = sticky("## Quando reenvia\n\nA consulta usa `GET /api/customer/lookup` (so leitura). Reenvia (`POST /api/customer/resend-access`) quando:\n\n- a conta existe e e uma so, E\n- nunca houve aviso, OU o ultimo nao saiu, OU o atendimento pediu (`forcar_novo_link`), E\n- o ultimo aviso NAO foi um reenvio que saiu ha menos de 30 min (trava contra reenvio em sequencia — cada um e um template pago).\n\nErro no reenvio nunca vira \"nao encontrei sua conta\": a consulta ja achou o cadastro.\n\nSem conta mas com `vendas_pendentes`: a compra chegou e o produto ainda nao foi mapeado — caso para o time.", { name: "Sticky Note bf154062", position: [
  -2064,
  -704
], width: 480, height: 432, color: 3 });

const nota3 = sticky("## Credencial — Bearer do meDIZ\n\nAs chamadas para mediz.app usam a credencial \"webhook\" (Header Auth, `Authorization: Bearer <WEBHOOK_SECRET_TOKEN>`). Ate 06/10/2026 o no de link usava por engano a credencial do Chatvolt.", { name: "Sticky Note d999178d", position: [
  -1568,
  -576
], width: 300, height: 308, color: 6 });

const nota4 = sticky("## Por que nao devolve mais link\n\nA rota `/api/customer/access-link` devolvia um link que entra sem senha na propria resposta — qualquer um que soubesse um e-mail poderia pedir o login de outra conta pela conversa. Foi removida por decisao do PO; o fluxo seguiu chamando ela e recebia 404 (10 de 58 consultas entre 24/09 e 06/10), e respondia \"nao encontrei sua conta\" para cliente existente.\n\nO reenvio vai sempre para o contato cadastrado, entao nao expoe credencial.", { name: "Sticky Note 0ad1d0fd", position: [
  -1568,
  -256
], width: 320, height: 372, color: 7 });

export default workflow("oSdKbHbwQCQea2bt", "Consulta e Geração de Link de Acesso [ChatVolt]", { settings: {
  "executionOrder": "v1",
  "availableInMCP": true,
  "binaryMode": "separate",
  "callerPolicy": "workflowsFromSameOwner"
} })
  .add(wh1)
  .to(normalizar)
  .to(lookup)
  .to(avaliar)
  .to(precisa.onTrue(reenviar.to(montaReenvio.to(responder))).onFalse(montaSem.to(responder)))
  .add(wh2)
  .to(consultando)
  .to(retornando)
  .add(nota1)
  .add(nota2)
  .add(nota3)
  .add(nota4);
