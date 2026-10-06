import { workflow, node, trigger, ifElse, splitInBatches, nextBatch, sticky, newCredential, expr } from '@n8n/workflow-sdk';

const n1 = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2,
  config: {
    name: "Compra Hotmart",
    parameters: {
  "httpMethod": "POST",
  "path": "55edf516-0a7b-44e6-ae38-fa393829808b",
  "options": {}
},
    position: [-16,16]
  },
  output: [{ body: {} }]
});

const n2 = node({
  type: 'n8n-nodes-base.executionData',
  version: 1,
  config: {
    name: "Anota produto na execucao",
    parameters: {
  "dataToSave": {
    "values": [
      {
        "key": "product_id",
        "value": expr("{{ $json.body.data.product.id }}")
      },
      {
        "key": "name",
        "value": expr("{{ $json.body.data.product.name }}")
      }
    ]
  }
},
    position: [208,-80]
  }
});

const n3 = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: "E livro impresso?",
    parameters: {
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "loose",
      "version": 3
    },
    "conditions": [
      {
        "id": "produto-fisico",
        "leftValue": expr("{{ [\"6667092\", \"5974989\"].includes(String($json.body.data.product.id)) }}"),
        "rightValue": "",
        "operator": {
          "type": "boolean",
          "operation": "true",
          "singleValue": true
        }
      }
    ],
    "combinator": "and"
  },
  "looseTypeValidation": true,
  "options": {}
},
    position: [208,112]
  }
});

const n4 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: "Prepara a linha da grafica",
    parameters: {
  "jsCode": "const saida = [];\n\nfor (const item of $input.all()) {\n  const corpo = item.json.body || {};\n  const dados = corpo.data || {};\n  const comprador = dados.buyer || {};\n  const endereco = comprador.address || {};\n  const compra = dados.purchase || {};\n  const produto = dados.product || {};\n\n  const ddd = String(comprador.checkout_phone_code || '').replace(/\\D/g, '');\n  const fone = String(comprador.checkout_phone || '').replace(/\\D/g, '');\n  const telefone = fone.length >= 10 ? fone : ddd + fone;\n\n  const nomeCompleto = comprador.name\n    || ((comprador.first_name || '') + ' ' + (comprador.last_name || '')).trim();\n\n  let dataVenda = '';\n  const aprovado = compra.approved_date || corpo.creation_date;\n  if (aprovado) {\n    const bruto = Number(aprovado);\n    const ms = String(aprovado).length === 10 ? bruto * 1000 : bruto;\n    dataVenda = new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });\n  }\n\n  let preco = '';\n  if (compra.original_offer_price && compra.original_offer_price.value !== undefined) {\n    preco = compra.original_offer_price.value;\n  } else if (compra.price && compra.price.value !== undefined) {\n    preco = compra.price.value;\n  }\n\n  saida.push({\n    json: {\n      'PRIMEIRO NOME': comprador.first_name || '',\n      'SOBRENOME': comprador.last_name || '',\n      'NOME COMPLETO': nomeCompleto,\n      'CPF': comprador.document || '',\n      'TELEFONE': telefone,\n      'CEP': endereco.zipcode || '',\n      'ENDEREÇO': endereco.address || '',\n      'NÚMERO': endereco.number || '',\n      'COMPLEMENTO': endereco.complement || '',\n      'BAIRRO': endereco.neighborhood || '',\n      'CIDADE': endereco.city || '',\n      'ESTADO': endereco.state || '',\n      'PAÍS': (compra.checkout_country && compra.checkout_country.name) || '',\n      'NOME DO PRODUTO': produto.name || '',\n      'PREÇO': preco,\n      'DATA DA VENDA': dataVenda,\n      'TRANSACTION_ID': String(compra.transaction ?? corpo.id ?? '')\n    }\n  });\n}\n\nreturn saida;\n"
},
    position: [432,112]
  }
});

const n5 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Grava na planilha da grafica",
    parameters: {
  "operation": "append",
  "documentId": {
    "__rl": true,
    "mode": "url",
    "value": "https://docs.google.com/spreadsheets/d/1EQ89NLm35IBQcmE2yyQnSy2t7sZkJ7y6PHqUzeFFTEs/edit?usp=sharing"
  },
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": "gid=0",
    "cachedResultName": "Página1"
  },
  "columns": {
    "mappingMode": "autoMapInputData",
    "value": {},
    "matchingColumns": [],
    "schema": [
      {
        "id": "PRIMEIRO NOME",
        "displayName": "PRIMEIRO NOME",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "SOBRENOME",
        "displayName": "SOBRENOME",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "NOME COMPLETO",
        "displayName": "NOME COMPLETO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CPF",
        "displayName": "CPF",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "TELEFONE",
        "displayName": "TELEFONE",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CEP",
        "displayName": "CEP",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "ENDEREÇO",
        "displayName": "ENDEREÇO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "NÚMERO",
        "displayName": "NÚMERO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "COMPLEMENTO",
        "displayName": "COMPLEMENTO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CIDADE",
        "displayName": "CIDADE",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "ESTADO",
        "displayName": "ESTADO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "BAIRRO",
        "displayName": "BAIRRO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "NOME DO PRODUTO",
        "displayName": "NOME DO PRODUTO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "PREÇO",
        "displayName": "PREÇO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "DATA DA VENDA",
        "displayName": "DATA DA VENDA",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "PAÍS",
        "displayName": "PAÍS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CÓDIGO RASTREIO",
        "displayName": "CÓDIGO RASTREIO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CLIENTE INFORMADO",
        "displayName": "CLIENTE INFORMADO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MENSAGEM 2 DIAS",
        "displayName": "MENSAGEM 2 DIAS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MENSAGEM 6 DIAS",
        "displayName": "MENSAGEM 6 DIAS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MENSAGEM 7 DIAS",
        "displayName": "MENSAGEM 7 DIAS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      }
    ],
    "attemptToConvertTypes": false,
    "convertFieldsToString": false
  },
  "options": {
    "handlingExtraData": "ignoreIt"
  }
},
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
    position: [656,112]
  }
});

const n6 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Le a planilha",
    parameters: {
  "documentId": {
    "__rl": true,
    "mode": "url",
    "value": "https://docs.google.com/spreadsheets/d/1EQ89NLm35IBQcmE2yyQnSy2t7sZkJ7y6PHqUzeFFTEs/edit?usp=sharing"
  },
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": "gid=0",
    "cachedResultName": "Página1"
  },
  "options": {}
},
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
    position: [208,416]
  }
});

const n7 = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: "Tem rastreio e falta avisar",
    parameters: {
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "loose",
      "version": 3
    },
    "conditions": [
      {
        "id": "tem-codigo",
        "leftValue": expr("{{ $json['CÓDIGO RASTREIO'] }}"),
        "rightValue": "",
        "operator": {
          "type": "string",
          "operation": "notEmpty",
          "singleValue": true
        }
      },
      {
        "id": "nao-avisado",
        "leftValue": expr("{{ $json['MENSAGEM 2 DIAS'] }}"),
        "rightValue": "",
        "operator": {
          "type": "string",
          "operation": "empty",
          "singleValue": true
        }
      },
      {
        "id": "b69cebb7-5735-45e1-9412-70f2adb709e3",
        "leftValue": expr("{{ DateTime.fromFormat(String($json['DATA DA VENDA']).slice(0, 10), 'dd/MM/yyyy') >= DateTime.fromISO('2026-08-23') }}"),
        "rightValue": "",
        "operator": {
          "type": "boolean",
          "operation": "true",
          "singleValue": true
        }
      }
    ],
    "combinator": "and"
  },
  "looseTypeValidation": true,
  "options": {}
},
    position: [432,416]
  }
});

const n8 = splitInBatches({
  version: 3,
  config: {
    name: "Um cliente por vez",
    parameters: {
  "options": {}
},
    position: [656,416]
  }
});

const n9 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: "Monta o aviso de rastreio",
    parameters: {
  "jsCode": "const WABA_ID = '1312217107345989';\nconst AGENT_ID = 'cmr7uw00e03st8flyqmtj7cq4';\nconst LANG = 'pt_BR';\nconst TEMPLATE = 'envio_codigo_rastreio_livro_fisico';\n\nconst TRANSPORTADORAS = {\n  CORREIOS: {\n    nome: 'os Correios',\n    link: (codigo) =>\n      'https://rastreamento.correios.com.br/app/index.php?objeto=' + codigo\n  },\n  LOGGI: {\n    nome: 'a Loggi',\n    // app.loggi.com, e nao www: e o subdominio que abre ja rastreando o codigo.\n    link: (codigo) => 'https://app.loggi.com/rastreador/' + codigo\n  }\n};\n\nfunction detectaTransportadora(codigo) {\n  const c = String(codigo || '').trim().toUpperCase();\n  if (/^[A-Z]{2}[0-9]{9}BR$/.test(c)) return 'CORREIOS';\n  if (/^LG[0-9]+$/.test(c)) return 'LOGGI';\n  return '';\n}\n\n// A planilha nao tem coluna DDD: o intake grava TELEFONE ja com o DDD junto.\nfunction comDdi(telefone) {\n  const d = String(telefone || '').replace(/\\D/g, '');\n  if (!d) return '';\n  if (d.length === 10 || d.length === 11) return '55' + d;\n  return d;\n}\n\nfunction dataDaVenda(valor) {\n  const m = String(valor || '').match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})/);\n  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00-03:00`) : null;\n}\n\nconst saida = [];\n\nfor (const item of $input.all()) {\n  const linha = item.json;\n\n  const codigo = String(linha['CÓDIGO RASTREIO'] || '').trim();\n  const transportadora = detectaTransportadora(codigo);\n  const telefone = comDdi(linha['TELEFONE']);\n  if (!transportadora || !telefone) continue;\n\n  const dados = TRANSPORTADORAS[transportadora];\n  const primeiroNome = String(linha['PRIMEIRO NOME'] || '').trim() || 'tudo bem';\n  const link = dados.link(codigo);\n\n  const corpoTemplate = {\n    to: telefone,\n    agentId: AGENT_ID,\n    templateName: TEMPLATE,\n    templateLangCode: LANG,\n    text: 'Código de rastreio — ' + codigo,\n    var_1: primeiroNome,\n    var_2: dados.nome,\n    var_3: codigo,\n    var_4: link\n  };\n\n  saida.push({\n    json: {\n      row_number: linha.row_number,\n      codigo_rastreio: codigo,\n      transportadora: transportadora,\n      transportadora_nome: dados.nome,\n      link_rastreio: link,\n      telefone_ddi: telefone,\n      primeiro_nome: primeiroNome,\n      template_name: TEMPLATE,\n      corpo_template: corpoTemplate,\n      waba_id: WABA_ID,\n      agent_id: AGENT_ID\n    }\n  });\n}\n\nreturn saida;\n"
},
    position: [880,336]
  }
});

const n10 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Envia o rastreio",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/mensagens/enviar",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ fluxo: \"rastreio_livro\", chave: \"rastreio_livro:\" + $json.codigo_rastreio + \":\" + $json.telefone_ddi, n8nWorkflowId: $workflow.id, n8nExecucaoId: $execution.id, corpo: $json.corpo_template }) }}"),
  "options": {
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
    position: [1104,336]
  }
});

const n11 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Marca como avisado",
    parameters: {
  "operation": "update",
  "documentId": {
    "__rl": true,
    "mode": "url",
    "value": "https://docs.google.com/spreadsheets/d/1EQ89NLm35IBQcmE2yyQnSy2t7sZkJ7y6PHqUzeFFTEs/edit?usp=sharing"
  },
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": "gid=0",
    "cachedResultName": "Página1"
  },
  "columns": {
    "mappingMode": "defineBelow",
    "value": {
      "row_number": expr("{{ $('Monta o aviso de rastreio').item.json.row_number }}"),
      "MENSAGEM 2 DIAS": expr("{{ $now.setZone(\"America/Sao_Paulo\").toFormat(\"dd/MM/yyyy HH:mm:ss\") }}")
    },
    "matchingColumns": [
      "row_number"
    ],
    "schema": [
      {
        "id": "PRIMEIRO NOME",
        "displayName": "PRIMEIRO NOME",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "SOBRENOME",
        "displayName": "SOBRENOME",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "NOME COMPLETO",
        "displayName": "NOME COMPLETO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CPF",
        "displayName": "CPF",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "TELEFONE",
        "displayName": "TELEFONE",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CEP",
        "displayName": "CEP",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "ENDEREÇO",
        "displayName": "ENDEREÇO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "NÚMERO",
        "displayName": "NÚMERO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "COMPLEMENTO",
        "displayName": "COMPLEMENTO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CIDADE",
        "displayName": "CIDADE",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "ESTADO",
        "displayName": "ESTADO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "BAIRRO",
        "displayName": "BAIRRO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "NOME DO PRODUTO",
        "displayName": "NOME DO PRODUTO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "PREÇO",
        "displayName": "PREÇO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "DATA DA VENDA",
        "displayName": "DATA DA VENDA",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "PAÍS",
        "displayName": "PAÍS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CÓDIGO RASTREIO",
        "displayName": "CÓDIGO RASTREIO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CLIENTE INFORMADO",
        "displayName": "CLIENTE INFORMADO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MENSAGEM 2 DIAS",
        "displayName": "MENSAGEM 2 DIAS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true
      },
      {
        "id": "MENSAGEM 6 DIAS",
        "displayName": "MENSAGEM 6 DIAS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MENSAGEM 7 DIAS",
        "displayName": "MENSAGEM 7 DIAS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "SHIPMENT_ID",
        "displayName": "SHIPMENT_ID",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "TRANSACTION_ID",
        "displayName": "TRANSACTION_ID",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MEDIZ_STATUS",
        "displayName": "MEDIZ_STATUS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MEDIZ_ATUALIZADO_EM",
        "displayName": "MEDIZ_ATUALIZADO_EM",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "row_number",
        "displayName": "row_number",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "number",
        "canBeUsedToMatch": true,
        "readOnly": true,
        "removed": true
      }
    ],
    "attemptToConvertTypes": false,
    "convertFieldsToString": false
  },
  "options": {}
},
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
    onError: 'continueRegularOutput',
    position: [1328,336]
  }
});

const n12 = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: "Espera entre envios",
    parameters: {
  "amount": 30
},
    position: [1552,416]
  }
});

const n13 = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: "Consulta de rastreio",
    parameters: {
  "httpMethod": "POST",
  "path": "8c881b85-e268-4586-a474-2dda7e8cef20",
  "responseMode": "responseNode",
  "options": {}
},
    position: [-16,640]
  },
  output: [{ body: {} }]
});

const n14 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Consulta o meDIZ",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/shipments/consulta",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ email: ($json.body || $json).email || null, cpf: ($json.body || $json).cpf || null, whatsapp: ($json.body || $json).whatsapp || ($json.body || $json).telefone || null }) }}"),
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
    position: [208,640]
  }
});

const n15 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: "Monta a resposta",
    parameters: {
  "jsCode": "// Traduz a resposta do meDIZ para o que a tool da ChatVolt le hoje.\n//\n// O meDIZ devolve o contrato das tools de atendimento (`status` + `dados` +\n// `mensagem`), e a `mensagem` de la e para log, nao para o cliente. O texto do\n// WhatsApp mora aqui, junto do canal — mesma divisao do ENTREGA DE ACESSO.\n//\n// `encontrado` e `mensagem_envio` continuam saindo porque a ferramenta cadastrada\n// nos dois agentes le esses dois campos. `status` e `dados` vao por cima: quando\n// a descricao da tool passar a ler o contrato novo, nada aqui precisa mudar.\n\nconst resposta = $input.first().json || {};\nconst status = resposta.status || 'erro';\nconst dados = resposta.dados || {};\nconst despachos = Array.isArray(dados.despachos) ? dados.despachos : [];\n\nfunction saida(mensagem_envio, encontrado) {\n  return [{\n    json: {\n      status: status,\n      encontrado: encontrado,\n      dados: resposta.dados || null,\n      mensagem: resposta.mensagem || '',\n      mensagem_envio: mensagem_envio\n    }\n  }];\n}\n\nif (status === 'erro') {\n  // Falha tecnica nunca vira \"voce nao comprou\".\n  return saida(\n    'Não consegui consultar o rastreio agora. Me chama de novo em alguns minutos que eu tento outra vez.',\n    false\n  );\n}\n\nif (status === 'nao_encontrado') {\n  return saida(\n    'Não achei nenhum pedido do livro impresso com esses dados. Pode ter sido comprado com outro e-mail ou com o CPF de outra pessoa — quer conferir comigo?',\n    false\n  );\n}\n\nif (status === 'em_separacao') {\n  return saida(\n    'Achei seu pedido de *O CORPO DIZ*! 📦\\n\\nEle ainda está em separação — assim que a transportadora gerar o código de rastreio, eu volto aqui para te passar.',\n    true\n  );\n}\n\n// A partir daqui e `ok`: existe pelo menos um despacho com codigo.\nconst postados = despachos.filter(function (d) { return d.codigo_rastreio; });\nconst d = postados[0];\n\nlet texto;\n\nif (d.situacao === 'entregue') {\n  texto = 'Pelo rastreio, seu livro *O CORPO DIZ* já foi entregue! 📬\\n\\n'\n    + 'Código: *' + d.codigo_rastreio + '*';\n} else if (d.situacao === 'devolvido' || d.situacao === 'problema') {\n  // Nao inventa explicacao: diz o que a transportadora disse e leva para gente.\n  texto = 'O rastreio do seu livro *O CORPO DIZ* está com uma pendência na entrega.\\n\\n'\n    + 'Código: *' + d.codigo_rastreio + '*'\n    + (d.ultimo_status ? '\\nÚltima informação: ' + d.ultimo_status : '')\n    + '\\n\\nVou te ajudar a resolver isso agora.';\n} else {\n  const comQuem = d.transportadora_nome && d.transportadora_nome !== 'Transportadora não identificada'\n    ? ' já está com ' + (d.transportadora === 'correios' ? 'os Correios' : 'a ' + d.transportadora_nome)\n    : ' já foi despachado';\n\n  texto = 'Seu livro *O CORPO DIZ*' + comQuem + '! 📦\\n\\n'\n    + 'Código de rastreamento:\\n*' + d.codigo_rastreio + '*';\n}\n\nif (d.link_rastreio) {\n  texto += '\\n\\nAcompanhe a entrega por aqui:\\n' + d.link_rastreio;\n}\n\nif (postados.length > 1) {\n  texto += '\\n\\nVocê tem ' + postados.length + ' envios — me diz se quiser o código dos outros.';\n}\n\nreturn saida(texto, true);\n"
},
    position: [432,640]
  }
});

const n16 = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: "Responde com o rastreio",
    parameters: {
  "options": {}
},
    position: [656,640]
  }
});

const n17 = node({
  type: 'n8n-nodes-base.executionData',
  version: 1,
  config: {
    name: "Anota produto na execucao1",
    parameters: {
  "dataToSave": {
    "values": [
      {
        "key": "product_id",
        "value": expr("{{ $json.body.items[0].id }}")
      },
      {
        "key": "name",
        "value": expr("{{ $json.body.items[0].name }}")
      }
    ]
  }
},
    position: [208,-496]
  }
});

const n18 = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: "E livro impresso?1",
    parameters: {
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "loose",
      "version": 3
    },
    "conditions": [
      {
        "id": "produto-fisico",
        "leftValue": expr("{{ [\"a1efe6c8-b98d-4d9e-9e22-4cab1e780424\", \"1780515697\"].includes(String($json.body.items[0].id)||$json.body.items[0].internal_id) && $json.body.dates.confirmed_at != null}}"),
        "rightValue": "",
        "operator": {
          "type": "boolean",
          "operation": "true",
          "singleValue": true
        }
      }
    ],
    "combinator": "and"
  },
  "looseTypeValidation": true,
  "options": {}
},
    position: [208,-304]
  }
});

const n19 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: "Prepara a linha da grafica1",
    parameters: {
  "jsCode": "const saida = [];\n\nfor (const item of $input.all()) {\n  const corpo = item.json.body || {};\n\n  const contato = corpo.contact || {};\n  const produto = corpo.product || {};\n  const pagamento = corpo.payment || {};\n  const datas = corpo.dates || {};\n\n  // =========================\n  // TELEFONE\n  // =========================\n  // const codigoPais = String(contato.phone_local_code || '').replace(/\\D/g, '');\n  const numero = String(contato.phone_number || '').replace(/\\D/g, '');\n\n  let telefone = numero;\n\n  // Se phone_number não tiver o código do país,\n  // adiciona o código informado em phone_local_code.\n  // if (numero && codigoPais && !numero.startsWith(codigoPais)) {\n  //   telefone = codigoPais + numero;\n  // }\n\n  // =========================\n  // NOME\n  // =========================\n  const nomeCompleto = contato.name || '';\n\n  const partesNome = nomeCompleto.trim().split(/\\s+/);\n\n  const primeiroNome = partesNome[0] || '';\n\n  const sobrenome = partesNome.length > 1\n    ? partesNome.slice(1).join(' ')\n    : '';\n\n  // =========================\n  // DATA DA VENDA\n  // =========================\n  let dataVenda = '';\n\n  const dataReferencia =\n    datas.confirmed_at ||\n    datas.ordered_at ||\n    datas.created_at;\n\n  if (dataReferencia) {\n    const data = new Date(dataReferencia);\n\n    if (!isNaN(data.getTime())) {\n      dataVenda = data.toLocaleString('pt-BR', {\n        timeZone: 'America/Sao_Paulo'\n      });\n    }\n  }\n\n  // =========================\n  // PREÇO\n  // =========================\n  let preco = '';\n\n  if (pagamento.total !== undefined && pagamento.total !== null) {\n    preco = pagamento.total;\n  } else if (produto.total_value !== undefined && produto.total_value !== null) {\n    preco = produto.total_value;\n  } else if (produto.unit_value !== undefined && produto.unit_value !== null) {\n    preco = produto.unit_value;\n  }\n\n  // =========================\n  // TRANSACTION ID\n  // =========================\n  const transactionId =\n    pagamento.marketplace_id ||\n    pagamento.id ||\n    corpo.id ||\n    '';\n\n  // =========================\n  // SAÍDA\n  // =========================\n  saida.push({\n    json: {\n      'PRIMEIRO NOME': primeiroNome,\n      'SOBRENOME': sobrenome,\n      'NOME COMPLETO': nomeCompleto,\n\n      'CPF': contato.doc || '',\n\n      'TELEFONE': telefone,\n\n      'CEP': contato.address_zip_code || '',\n      'ENDEREÇO': contato.address || '',\n      'NÚMERO': contato.address_number || '',\n      'COMPLEMENTO': contato.address_comp || '',\n      'BAIRRO': contato.address_district || '',\n      'CIDADE': contato.address_city || '',\n      'ESTADO': contato.address_state || '',\n      'PAÍS': contato.address_country || '',\n\n      'NOME DO PRODUTO': produto.name || '',\n\n      'PREÇO': preco,\n\n      'DATA DA VENDA': dataVenda,\n\n      'TRANSACTION_ID': String(transactionId),\n\n      // Campos extras, caso queira usar depois:\n      'EMAIL': contato.email || '',\n      'STATUS': corpo.status || '',\n      'FORMA DE PAGAMENTO': pagamento.method || '',\n      'PARCELAS': pagamento.installments?.qty || '',\n      'VALOR BRUTO': pagamento.gross ?? '',\n      'VALOR LÍQUIDO': pagamento.net ?? '',\n      'ID DO PEDIDO': corpo.id || '',\n      'ID DO PRODUTO': produto.id || '',\n      'NOME DA OFERTA': produto.offer?.name || ''\n    }\n  });\n}\n\nreturn saida;"
},
    position: [432,-304]
  }
});

const n20 = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Grava na planilha da grafica1",
    parameters: {
  "operation": "append",
  "documentId": {
    "__rl": true,
    "mode": "url",
    "value": "https://docs.google.com/spreadsheets/d/1EQ89NLm35IBQcmE2yyQnSy2t7sZkJ7y6PHqUzeFFTEs/edit?usp=sharing"
  },
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": "gid=0",
    "cachedResultName": "Página1"
  },
  "columns": {
    "mappingMode": "autoMapInputData",
    "value": {},
    "matchingColumns": [],
    "schema": [
      {
        "id": "PRIMEIRO NOME",
        "displayName": "PRIMEIRO NOME",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "SOBRENOME",
        "displayName": "SOBRENOME",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "NOME COMPLETO",
        "displayName": "NOME COMPLETO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CPF",
        "displayName": "CPF",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "TELEFONE",
        "displayName": "TELEFONE",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CEP",
        "displayName": "CEP",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "ENDEREÇO",
        "displayName": "ENDEREÇO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "NÚMERO",
        "displayName": "NÚMERO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "COMPLEMENTO",
        "displayName": "COMPLEMENTO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CIDADE",
        "displayName": "CIDADE",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "ESTADO",
        "displayName": "ESTADO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "BAIRRO",
        "displayName": "BAIRRO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "NOME DO PRODUTO",
        "displayName": "NOME DO PRODUTO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "PREÇO",
        "displayName": "PREÇO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "DATA DA VENDA",
        "displayName": "DATA DA VENDA",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "PAÍS",
        "displayName": "PAÍS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CÓDIGO RASTREIO",
        "displayName": "CÓDIGO RASTREIO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "CLIENTE INFORMADO",
        "displayName": "CLIENTE INFORMADO",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MENSAGEM 2 DIAS",
        "displayName": "MENSAGEM 2 DIAS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MENSAGEM 6 DIAS",
        "displayName": "MENSAGEM 6 DIAS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      },
      {
        "id": "MENSAGEM 7 DIAS",
        "displayName": "MENSAGEM 7 DIAS",
        "required": false,
        "defaultMatch": false,
        "display": true,
        "type": "string",
        "canBeUsedToMatch": true,
        "removed": false
      }
    ],
    "attemptToConvertTypes": false,
    "convertFieldsToString": false
  },
  "options": {
    "handlingExtraData": "ignoreIt"
  }
},
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
    position: [656,-304]
  }
});

const n21 = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: "Compra Guru",
    parameters: {
  "httpMethod": "POST",
  "path": "845dc395-790b-4474-92b7-b928ac8453b4",
  "options": {}
},
    position: [-16,-400]
  },
  output: [{ body: {} }]
});

const n22 = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: "Todo dia as 9h e as 15h",
    parameters: {
  "rule": {
    "interval": [
      {
        "field": "cronExpression",
        "expression": "0 0 9,15 * * *"
      }
    ]
  }
},
    position: [-16,416]
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
    position: [1328, 432]
  }
});


const nota1 = sticky("## 1. A compra vira uma linha na planilha\n\nA Hotmart avisa, o filtro deixa passar só o livro impresso, e a linha vai para a planilha que a gráfica enxerga.\n\nO nó de código já devolve os campos com o nome exato das colunas, por isso a gravação é automática — não há mapeamento manual para desalinhar quando alguém mexer na planilha.\n\nEste fluxo NÃO manda mensagem. Quem fala com o cliente é o ENTREGA DE ACESSO [meDIZ].", { position: [-624,-464], width: 472, height: 260, color: 4 });

const nota2 = sticky("## 2. A gráfica preenche o rastreio, a gente avisa\n\nTodo dia às 15h lê a planilha e pega quem tem CÓDIGO RASTREIO preenchido e ainda não foi avisado.\n\nNão espera mais 2 dias: se o código existe, a encomenda saiu, e segurar a informação só atrasa o cliente.\n\nQuem tem código de transportadora não reconhecida é pulado de propósito — continua aparecendo todo dia até alguém olhar, em vez de sumir em silêncio.\n\nA coluna MENSAGEM 2 DIAS guarda o carimbo de quando avisamos. O nome é herança; o que ela significa é \"já avisado\".", { position: [-624,-32], width: 488, height: 216, color: 3 });

const nota3 = sticky("## 3. O atendimento pergunta pelo livro\n\nOs agentes da ChatVolt chamam este webhook; ele pergunta ao meDIZ e traduz a\nresposta para o texto do WhatsApp.\n\nA consulta NAO le mais a planilha. A planilha continua sendo a interface da\ngrafica, mas parou de ser a fonte da resposta ao cliente — e com isso sairam dois\ndefeitos que vinham dela:\n\n- so aceitava CPF, porque e a unica identificacao que ela guarda. Agora vai\n  email, cpf ou whatsapp, e o meDIZ junta o que cada um achar;\n- \"postado\" era deduzido de existir texto numa celula, e #N/A ou CANCELADO\n  viravam codigo de rastreio.\n\nQuatro respostas possiveis, e elas nao podem colapsar numa so:\n\nok             -> achou e ja tem codigo\nem_separacao   -> achou, a grafica ainda nao postou\nnao_encontrado -> nao existe despacho com esses dados\nerro           -> a consulta falhou (meDIZ fora do ar, chamada sem dado)\n\nO texto do cliente mora no no de codigo, junto do canal. O meDIZ devolve fato:\nstatus, situacao, codigo, transportadora e datas.\n\nCredencial: a mesma do SHIPMENT_TRACKING_SECRET que o workflow\n\"Alimenta Base — Rastreio Livro Fisico\" usa para POST /api/shipments/tracking.", { position: [-544,288], width: 400, height: 620, color: 6 });

const notaPortao = sticky("## Aviso de rastreio pelo portao (Story 6.2, 06/10/2026)\n\nO template sai por POST mediz.app/api/mensagens/enviar com a chave rastreio_livro:<codigo>:<telefone>.\n\n- So marca MENSAGEM 2 DIAS na planilha em enviado ou ja_enviado. Antes marcava mesmo quando o Chatvolt falhava, e a pessoa nunca mais recebia.\n- ja_enviado: o aviso ja tinha saido (a marcacao na planilha falhou numa rodada anterior). Marca agora, sem mandar de novo.\n- barrado / falhou: nao marca. A linha volta na proxima rodada (9h ou 15h).", { position: [880, 560], width: 620, height: 260 });

export default workflow('zKjrdJpq5gwhilX4', "LIVRO FISICO — planilha e rastreio")
  .add(n1)
  .add(n1)
  .to(n2)
  .add(n1)
  .to(n3)
  .add(n3)
  .to(n4)
  .add(n4)
  .to(n5)
  .add(n6)
  .to(n7)
  .add(n7)
  .to(n8)
  .add(n9)
  .to(n10)
  .add(n13)
  .to(n14)
  .add(n14)
  .to(n15)
  .add(n15)
  .to(n16)
  .add(n18)
  .to(n19)
  .add(n19)
  .to(n20)
  .add(n21)
  .to(n18)
  .add(n21)
  .to(n17)
  .add(n22)
  .to(n6)
  .add(n6)
  .to(n7)
  .to(n8.onEachBatch(n9.to(n10.to(saiu.onTrue(n11.to(n12)).onFalse(n12)))))
  .add(n12)
  .to(nextBatch(n8))
  .add(n13)
  .add(n21)
  .add(n22)
  .add(nota1)
  .add(nota2)
  .add(nota3)
  .add(notaPortao);
