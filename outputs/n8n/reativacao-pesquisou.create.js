// Reativacao — pesquisou: o app avisa que quem recebeu a onda pesquisou no app,
// e este fluxo move a conversa para a etapa "pesquisou" do cenario da onda.
const fs = require('fs');
const crypto = require('crypto');
const id = () => crypto.randomUUID();
const CHATVOLT = { httpHeaderAuth: { id: 'aKYolOWzj7BEyymx', name: 'Header Auth account' } };

const DECIDE = `// PREENCHER quando o cenario existir no Chatvolt: para cada cenario de onda
// de reativacao, a etapa "pesquisou" (a 2a). Onda de cenario que nao esta aqui
// e ignorada — responde 200 para o app nao insistir.
const ETAPA_PESQUISOU = {
  // REATIVAÇÃO PESQUISA -> Pesquisa realizada
  'cmuzgcc0d0fnzr584qco2ye7c': 'cmuzgcwuy0fohr584flb4f3f4',
};

const b = $input.first().json.body || {};
const conversa = String(b.conversationId || '').trim();
const cenario = String(b.crmScenarioId || '').trim();
const etapa = ETAPA_PESQUISOU[cenario] || null;

return [{ json: {
  mover: !!(conversa && etapa),
  motivo: !conversa ? 'sem conversationId' : !etapa ? 'cenario sem etapa pesquisou' : null,
  conversationId: conversa,
  scenarioId: cenario,
  stepId: etapa,
  campanha: b.campanha || null,
  destinatarioId: b.destinatarioId || null
} }];`;

const RESULTADO = `const d = $('Decide a etapa').first().json;
const r = $input.first().json;
const ok = r.statusCode >= 200 && r.statusCode < 300;
return [{ json: {
  ok,
  movido: ok,
  conversationId: d.conversationId,
  stepId: d.stepId,
  http_chatvolt: r.statusCode,
  erro: ok ? null : JSON.stringify(r.body || '').slice(0, 300)
} }];`;

const nodes = [
  { id: id(), name: 'Pesquisou no app', type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [0, 300], webhookId: id(),
    parameters: { httpMethod: 'POST', path: 'reativacao/pesquisou', responseMode: 'responseNode', options: {} } },
  { id: id(), name: 'Decide a etapa', type: 'n8n-nodes-base.code', typeVersion: 2, position: [224, 300], parameters: { jsCode: DECIDE } },
  { id: id(), name: 'Tem etapa?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [448, 300],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ id: 'mover', leftValue: '={{ $json.mover }}', rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      },
      options: {}
    } },
  { id: id(), name: 'Move para PESQUISOU', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [672, 200], credentials: CHATVOLT,
    retryOnFail: true, maxTries: 3, waitBetweenTries: 3000,
    parameters: {
      method: 'POST', url: 'https://api.chatvolt.ai/crm/step/conversation',
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendBody: true, specifyBody: 'json',
      jsonBody: '={{ JSON.stringify({ conversationId: $json.conversationId, scenarioId: $json.scenarioId, stepId: $json.stepId }) }}',
      options: { response: { response: { fullResponse: true, neverError: true } }, timeout: 20000 }
    } },
  { id: id(), name: 'Resultado', type: 'n8n-nodes-base.code', typeVersion: 2, position: [896, 200], parameters: { jsCode: RESULTADO } },
  { id: id(), name: 'Responde ao app', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.4, position: [1120, 200],
    parameters: { respondWith: 'json', responseBody: '={{ $json }}', options: { responseCode: "={{ $json.ok ? 200 : 502 }}" } } },
  { id: id(), name: 'Ignora (sem etapa)', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.4, position: [672, 420],
    parameters: { respondWith: 'json', responseBody: '={{ { ok: true, movido: false, motivo: $json.motivo } }}', options: {} } },
  { id: id(), name: 'Nota', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [0, -200],
    parameters: { width: 760, height: 380, content:
      '## Reativação — pesquisou no app\n\n' +
      'O app chama este webhook na primeira pesquisa (com especialista) de quem recebeu uma onda de reativação nos últimos 7 dias. Corpo: `conversationId`, `crmScenarioId` (cenário da onda), `campanha`, `destinatarioId`.\n\n' +
      'Move a conversa para a etapa "pesquisou" do cenário (mapa ETAPA_PESQUISOU em "Decide a etapa"). Cenário fora do mapa é ignorado com 200.\n\n' +
      'Responde 200 só depois de mover; erro no Chatvolt volta 502 e o app tenta de novo na próxima pesquisa (o app grava `pesquisou_em` só no 2xx).\n\n' +
      '**Antes de ativar:** preencher ETAPA_PESQUISOU com o cenário novo e a etapa 2.' } }
];

const ligar = (de, para, saida = 0) => ({ [de]: { main: Array.from({ length: saida + 1 }, (_, i) => (i === saida ? [{ node: para, type: 'main', index: 0 }] : [])) } });
const connections = Object.assign({},
  ligar('Pesquisou no app', 'Decide a etapa'),
  ligar('Decide a etapa', 'Tem etapa?'),
  { 'Tem etapa?': { main: [[{ node: 'Move para PESQUISOU', type: 'main', index: 0 }], [{ node: 'Ignora (sem etapa)', type: 'main', index: 0 }]] } },
  ligar('Move para PESQUISOU', 'Resultado'),
  ligar('Resultado', 'Responde ao app')
);

fs.writeFileSync('pesquisou_create.json', JSON.stringify({
  name: 'Reativação — pesquisou no app [meDIZ]', nodes, connections,
  settings: { executionOrder: 'v1', timezone: 'America/Sao_Paulo', availableInMCP: true }
}));
fs.writeFileSync('pesquisou_codes.json', JSON.stringify({ DECIDE, RESULTADO }));
console.log('ok', nodes.length, 'nos');
