// Despertadores pelo portao (Story 6.2), editando o JSON pela API publica do
// n8n — preserva as credenciais por id.
const fs = require('fs');
const crypto = require('crypto');
const w = require('./desp_api.json');
const MEDIZ = { httpHeaderAuth: { id: '61Ucwwybsgb47Fph', name: 'webhook' } };
const no = (nome) => {
  const n = w.nodes.find((x) => x.name === nome);
  if (!n) throw new Error('no nao encontrado: ' + nome);
  return n;
};

// O corpo do Chatvolt que cada no ja montava vira `corpo` do portao.
function embrulha(jsonBody, sistema, resolve) {
  const m = jsonBody.match(/^=\{\{ JSON\.stringify\((\{[\s\S]*\})\) \}\}$/);
  if (!m) throw new Error('jsonBody inesperado em ' + sistema);
  return (
    `={{ JSON.stringify({ fluxo: "despertadores", chave: "despertadores:" + $("${resolve}").item.json.userId + ":${sistema}:" + $("${resolve}").item.json.toque, ` +
    `userId: $("${resolve}").item.json.userId, n8nWorkflowId: $workflow.id, n8nExecucaoId: $execution.id, corpo: ${m[1]} }) }}`
  );
}

const saiuParams = {
  conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
    conditions: [
      { id: 'enviado', leftValue: '={{ $json.status }}', rightValue: 'enviado', operator: { type: 'string', operation: 'equals' } },
      { id: 'ja-enviado', leftValue: '={{ $json.status }}', rightValue: 'ja_enviado', operator: { type: 'string', operation: 'equals' } }
    ],
    combinator: 'or'
  },
  options: {}
};

for (const [sistema, rotulo] of [['acesso', 'acesso'], ['pesquisa', 'pesquisa']]) {
  const resolve = `Resolve template (${rotulo})`;
  const envia = no(`Envia template (${rotulo})`);
  const registra = no(`Registra o toque (${rotulo})`);

  envia.parameters.url = 'https://mediz.app/api/mensagens/enviar';
  envia.parameters.jsonBody = embrulha(envia.parameters.jsonBody, sistema, resolve);
  envia.parameters.options.timeout = 30000;
  envia.credentials = MEDIZ;

  // Em ja_enviado o conversationId vem na raiz da resposta do portao.
  registra.parameters.jsonBody = registra.parameters.jsonBody.replace(
    'conversationId: ((($json.messages || [])[0]) || {}).conversationId || null',
    'conversationId: $json.conversationId || ((($json.messages || [])[0]) || {}).conversationId || null'
  );
  if (!registra.parameters.jsonBody.includes('$json.conversationId ||')) throw new Error('registra ' + rotulo);

  // "Saiu?" entre o envio e o registro; o registro anda para a direita.
  const saiuNome = `Saiu? (${rotulo})`;
  w.nodes.push({
    id: crypto.randomUUID(),
    name: saiuNome,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [registra.position[0], registra.position[1]],
    parameters: saiuParams
  });
  registra.position = [registra.position[0] + 224, registra.position[1]];
  w.connections[envia.name] = { main: [[{ node: saiuNome, type: 'main', index: 0 }]] };
  w.connections[saiuNome] = { main: [[{ node: registra.name, type: 'main', index: 0 }], []] };
}

w.nodes.push({
  id: crypto.randomUUID(),
  name: 'Nota — portao de envio',
  type: 'n8n-nodes-base.stickyNote',
  typeVersion: 1,
  position: [no('A cada 30 minutos').position[0], no('A cada 30 minutos').position[1] + 360],
  parameters: {
    width: 620,
    height: 240,
    content:
      '## Portao de envio (Story 6.2, 06/10/2026)\n\nOs templates saem por POST mediz.app/api/mensagens/enviar com a chave despertadores:<userId>:<sistema>:<toque>.\n\n- So registra o toque em enviado ou ja_enviado. ja_enviado: o toque ja tinha saido e o registro falhou antes — registra agora, sem reenviar.\n- barrado (fluxo desligado, teto, limite da pessoa) e falhou nao registram: a pessoa volta na proxima rodada.\n- Desligar o envio sem parar o fluxo: fluxos_automacao.ligado = false para despertadores.'
  }
});

const permitidos = ['executionOrder', 'timezone', 'saveDataErrorExecution', 'saveDataSuccessExecution', 'saveManualExecutions', 'saveExecutionProgress', 'executionTimeout', 'errorWorkflow', 'callerPolicy', 'callerIds', 'timeSavedPerExecution', 'availableInMCP'];
const settings = Object.fromEntries(Object.entries(w.settings || {}).filter(([k]) => permitidos.includes(k)));
fs.writeFileSync('desp_put.json', JSON.stringify({ name: w.name, nodes: w.nodes, connections: w.connections, settings, staticData: w.staticData || null }));
console.log('ok', w.nodes.length, 'nos');
console.log('envio acesso:', no('Envia template (acesso)').parameters.jsonBody.slice(0, 260));
