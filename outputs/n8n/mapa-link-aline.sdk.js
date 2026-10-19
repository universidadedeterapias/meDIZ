import { workflow, node, trigger, sticky } from '@n8n/workflow-sdk';

// MAPA — Link para a Aline (Epic 7, Story 7.8).
//
// Tool `gerar_link_mapa` do agente ALINE | WPP: no fim da pesquisa, quando a
// pessoa aceita o Mapa, a Aline manda o conversationId e o sintoma. O telefone
// NAO vem da IA: e buscado na propria conversa da ChatVolt — a IA nao tem como
// errar ou inventar o numero. Responde rapido e sempre 200: sem telefone, o
// link sai so com o sintoma (a venda ainda funciona; o pagamento acha o Mapa
// pelo codigo do checkout).

const entrada = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Tool gerar_link_mapa [ChatVolt]",
    parameters: {
      "httpMethod": "POST",
      "path": "mapa-link",
      "responseMode": "responseNode",
      "options": {}
    },
    position: [0, 0]
  },
  output: [{ body: { conversationId: "cmabc", sintoma: "dor na lombar" } }]
});

const normaliza = node({
  type: "n8n-nodes-base.code",
  version: 2,
  config: {
    name: "Normaliza",
    parameters: {
      "jsCode": "// A ChatVolt pode mandar o corpo cru como lista ([{...}]): aceita os dois.\nconst cru = $input.first().json.body || {};\nconst body = (Array.isArray(cru) ? cru[0] : cru) || {};\nconst limpo = (v) => (v === null || v === undefined ? '' : String(v)).replace(/\\s+/g, ' ').trim();\nconst conversationId = limpo(body.conversationId);\n// O sintoma vai na URL: curto, sem quebra de linha.\nconst sintoma = limpo(body.sintoma).slice(0, 200);\nreturn [{ json: { conversationId, sintoma } }];"
    },
    position: [224, 0]
  }
});

const buscaConversa = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Busca a conversa na ChatVolt",
    parameters: {
      "url": "={{ 'https://api.chatvolt.ai/conversation/' + encodeURIComponent($json.conversationId || 'sem-conversa') }}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "options": {
        "response": { "response": { "fullResponse": true, "neverError": true } },
        "timeout": 8000
      }
    },
    credentials: {
      "httpHeaderAuth": { "id": "aKYolOWzj7BEyymx", "name": "Header Auth account" }
    },
    onError: "continueRegularOutput",
    position: [448, 0]
  }
});

const montaLink = node({
  type: "n8n-nodes-base.code",
  version: 2,
  config: {
    name: "Monta o link",
    parameters: {
      "jsCode": "const pedido = $('Normaliza').first().json;\nconst resp = $input.first().json || {};\nconst conversa = (resp.statusCode === 200 && resp.body && typeof resp.body === 'object') ? resp.body : {};\nconst contatos = Array.isArray(conversa.participantsContacts) ? conversa.participantsContacts : [];\nconst contato = contatos.find((c) => c && c.phoneNumber) || {};\n\n// So digitos, com DDI: e o formato que a pagina /mapa grava e que o\n// pagamento compara (DDD + 8 ultimos digitos).\nlet telefone = String(contato.phoneNumber || '').replace(/\\D/g, '');\nif (telefone.length === 10 || telefone.length === 11) telefone = '55' + telefone;\nif (telefone.length < 12 || telefone.length > 15) telefone = '';\n\n// O sandbox do n8n nao tem URL/URLSearchParams: monta a query a mao.\nconst partes = [];\nif (pedido.sintoma) partes.push('s=' + encodeURIComponent(pedido.sintoma));\nif (telefone) partes.push('id=' + telefone);\npartes.push('utm_source=whatsapp', 'utm_medium=aline');\nconst link = 'https://mediz.app/mapa?' + partes.join('&');\n\nreturn [{ json: {\n  link,\n  tem_telefone: !!telefone,\n  instrucao: 'Envie este link em uma bolha só, sem alterar nada nele.'\n} }];"
    },
    position: [672, 0]
  }
});

const responde = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Responde a Aline",
    parameters: {
      "respondWith": "json",
      "responseBody": "={{ $json }}",
      "options": {}
    },
    position: [896, 0]
  }
});

const nota = sticky("## MAPA — Link para a Aline\n\nTool `gerar_link_mapa` do agente **ALINE | WPP**. Chamada quando a pessoa aceita o Mapa (etapa E5 do prompt).\n\nCorpo: `{ \"conversationId\": \"...\", \"sintoma\": \"...\" }`. O telefone vem da conversa na ChatVolt (`participantsContacts[].phoneNumber`), nunca da IA.\n\nResposta (sempre 200): `{ \"link\": \"https://mediz.app/mapa?s=...&id=55...\", \"tem_telefone\": true }`.\n\nO `id` (telefone) é o que liga o pagamento ao Mapa quando o checkout não devolve o código. Próximo passo (Story 7.9): gravar o lead.", { name: "Nota", position: [0, -360], width: 560, height: 320, color: 4 });

export default workflow("32y7eqtPcoVkkSg0", "MAPA — Link para a Aline [meDIZ]", { settings: {
  "executionOrder": "v1",
  "timezone": "America/Sao_Paulo",
  "availableInMCP": true
} })
  .add(entrada)
  .to(normaliza)
  .to(buscaConversa)
  .to(montaLink)
  .to(responde)
  .add(nota);
