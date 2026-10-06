// PROMO 97 | DIGITAL: compra da oferta do livro digital no Guru -> espera ->
// oferta do impresso por Z-API (pelo portao) -> conversa na etapa PROMO 97.
const fs = require('fs');
const crypto = require('crypto');
const id = () => crypto.randomUUID();
const MEDIZ = { httpHeaderAuth: { id: '61Ucwwybsgb47Fph', name: 'webhook' } };
const CHATVOLT = { httpHeaderAuth: { id: 'aKYolOWzj7BEyymx', name: 'Header Auth account' } };
const POSTGRES = { postgres: { id: 'ET12tYS9kFgpON2i', name: 'Postgres account' } };

const FILTRA = `// PREENCHER antes de ativar: o id da oferta PROMO 97 no Guru, como chega no
// webhook em product.offer.id (UUID). Sem isso o fluxo falha de proposito —
// melhor um alerta do vigia do que mandar oferta para comprador errado.
const OFERTAS = new Set([
  'a2b39273-393b-40d0-819f-c68455b5fbcb' // OFERTA RELAMPAGO R$97 + APP MEDIZ (livro digital, R$ 97,00)
]);

// Quem levou o livro impresso na mesma compra (order bump) nao recebe a oferta.
const LIVRO_FISICO = new Set(['1780515697', 'a1efe6c8-b98d-4d9e-9e22-4cab1e780424']);

function soDigitos(v) {
  return v === null || v === undefined ? '' : String(v).replace(/\\D/g, '');
}
// Mesmo criterio do Normaliza Guru da Recuperacao: phone_local_code traz o DDI
// e o DDD vem dentro de phone_number.
function montaTelefone(partes) {
  let n = '';
  for (const parte of partes) {
    const d = soDigitos(parte);
    if (!d) continue;
    if (!n) { n = d; continue; }
    if (d.indexOf(n) === 0) { n = d; continue; }
    if (n.indexOf(d) === 0) continue;
    n = n + d;
  }
  if (n.length === 10 || n.length === 11) n = '55' + n;
  return n.length >= 12 ? n : '';
}

if (OFERTAS.size === 0) {
  throw new Error('PROMO 97: preencha o id da oferta (OFERTAS) no no "Filtra a oferta" antes de ativar.');
}

const saida = [];
for (const item of $input.all()) {
  const corpo = item.json.body || item.json;
  if (String(corpo.webhook_type || 'transaction') !== 'transaction') continue;
  if (String(corpo.status || '').toLowerCase() !== 'approved') continue;

  const produto = corpo.product || {};
  const oferta = String((produto.offer || {}).id || '');
  if (!OFERTAS.has(oferta)) continue;

  const ids = [produto.marketplace_id, produto.internal_id, produto.id];
  for (const it of (Array.isArray(corpo.items) ? corpo.items : [])) ids.push(it.marketplace_id, it.internal_id, it.id);
  if (ids.some((x) => x && LIVRO_FISICO.has(String(x)))) continue;

  const contato = corpo.contact || {};
  const telefone = montaTelefone([contato.phone_country_code, contato.phone_local_code, contato.phone_number]);
  const transacao = String(corpo.id || '');
  if (!telefone || !transacao) continue;

  const nome = String(contato.name || '').trim();
  saida.push({ json: {
    transacao_id: transacao,
    oferta_id: oferta,
    email: String(contato.email || '').trim().toLowerCase(),
    nome: nome,
    primeiro_nome: nome ? nome.split(/\\s+/)[0] : '',
    telefone: telefone
  } });
}
return saida;`;

const MONTA = `// CONFIRMAR antes de ativar: a instancia da Z-API do numero deste fluxo.
// 3E17AF79... e a que a Entrega de Acesso usa como plano B, ligada ao agente
// "Z - API" no Chatvolt.
const ZAPI_INSTANCIA = '3E17AF797E59E04724E20293E183E9A4';

// Cenario "meDIZ! | PLANO ESSENCIA", etapa "PROMO 97 | DIGITAL". O prompt da
// etapa ja conhece esta mensagem e conduz a venda (foto, duvidas, link).
const CRM_CENARIO = 'cmebta2sh03un13fjg8ukf82j';
const CRM_ETAPA = 'cmuwjj4zn0fvoztfu6onxxqv0';

const MENSAGEM = 'Você gostaria de ter o livro *O CORPO DIZ* impresso?\\n\\n' +
  'Muitas pessoas pensam em imprimir o pdf...\\n' +
  'Por isso, quero lhe oferecer a oportunidade de *receber a versão impressa em casa* com acabamento premium. ' +
  'O livro está no formato A4, com páginas internas coloridas e o melhor, para você que acaba de adquirir o digital, tem um *desconto especial*.\\n' +
  'Quer ver uma foto?';

const c = $('Filtra a oferta').item.json;
// Modo "um item por vez": devolve um objeto, nao uma lista.
return { json: {
  pedido: {
    fluxo: 'promo97_digital',
    chave: 'promo97:' + c.transacao_id,
    canal: 'zapi',
    zapiInstancia: ZAPI_INSTANCIA,
    n8nWorkflowId: $workflow.id,
    n8nExecucaoId: $execution.id,
    corpo: { to: c.telefone, message: MENSAGEM }
  },
  crm_cenario: CRM_CENARIO,
  crm_etapa: CRM_ETAPA
} };`;

const nodes = [
  { id: id(), name: 'Compra Guru (PROMO 97)', type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [0, 300], webhookId: id(),
    parameters: { httpMethod: 'POST', path: 'promo97/guru', options: {} } },
  { id: id(), name: 'Filtra a oferta', type: 'n8n-nodes-base.code', typeVersion: 2, position: [224, 300], parameters: { jsCode: FILTRA } },
  { id: id(), name: 'Espera 15 min', type: 'n8n-nodes-base.wait', typeVersion: 1.1, position: [448, 300], webhookId: id(),
    parameters: { amount: 15, unit: 'minutes' } },
  { id: id(), name: 'Comprou o impresso?', type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [672, 300], credentials: POSTGRES,
    alwaysOutputData: true,
    parameters: {
      operation: 'executeQuery',
      // O livro impresso gera despacho no app (book_shipments) na hora da
      // compra — e o sinal confiavel, porque a venda do Guru chega ao app pela
      // Stone sem nome de produto.
      query: "SELECT count(*)::int AS despachos\n  FROM book_shipments\n WHERE $1 <> ''\n   AND lower(email) = lower($1)\n   AND created_at > now() - interval '2 days';",
      options: { queryReplacement: "={{ [$('Filtra a oferta').item.json.email] }}" }
    } },
  { id: id(), name: 'Ainda não tem o impresso?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [896, 300],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ id: 'sem-despacho', leftValue: '={{ Number($json.despachos || 0) }}', rightValue: 0, operator: { type: 'number', operation: 'equals' } }],
        combinator: 'and'
      },
      options: {}
    } },
  { id: id(), name: 'Monta a mensagem', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1120, 200], parameters: { mode: 'runOnceForEachItem', jsCode: MONTA.replace("const c = $('Filtra a oferta').item.json;", "const c = $('Filtra a oferta').item.json;") } },
  { id: id(), name: 'Envia pelo portão (Z-API)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [1344, 200], credentials: MEDIZ,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST', url: 'https://mediz.app/api/mensagens/enviar',
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.pedido) }}',
      options: { response: { response: { neverError: true } }, timeout: 30000 }
    } },
  { id: id(), name: 'Saiu?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [1568, 200],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [
          { id: 'enviado', leftValue: '={{ $json.status }}', rightValue: 'enviado', operator: { type: 'string', operation: 'equals' } },
          { id: 'ja-enviado', leftValue: '={{ $json.status }}', rightValue: 'ja_enviado', operator: { type: 'string', operation: 'equals' } }
        ],
        combinator: 'or'
      },
      options: {}
    } },
  { id: id(), name: 'Move para a etapa PROMO 97', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [1792, 100], credentials: CHATVOLT,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST', url: 'https://api.chatvolt.ai/crm/step/conversation',
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendBody: true, specifyBody: 'json',
      jsonBody: "={{ JSON.stringify({ conversationId: $json.conversationId || '', scenarioId: $('Monta a mensagem').item.json.crm_cenario, stepId: $('Monta a mensagem').item.json.crm_etapa }) }}",
      options: { response: { response: { neverError: true } }, timeout: 20000 }
    } },
  { id: id(), name: 'Nota', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [0, -220],
    parameters: { width: 760, height: 460, content:
      '## PROMO 97 | DIGITAL — up sell do livro impresso\n\n' +
      'Quem compra a oferta do livro digital a preço simbólico no Guru recebe, 15 min depois, a oferta do impresso pelo número da Z-API. A conversa vai para a etapa PROMO 97 | DIGITAL (cenário meDIZ! | PLANO ESSÊNCIA), cujo prompt conduz a venda: foto, dúvidas, link de pagamento.\n\n' +
      '- Só `approved` da(s) oferta(s) em OFERTAS ("Filtra a oferta"). Quem levou o impresso na mesma compra, ou comprou nos 15 min, não recebe.\n' +
      '- Envio pelo portão (canal zapi), chave promo97:<transação>: o Guru reenvia webhook e a pessoa recebe uma vez só. Aparece no painel /admin/automacoes e nos alertas.\n' +
      '- Desligar o envio sem parar o fluxo: fluxos_automacao.ligado = false para promo97_digital.\n\n' +
      '**Antes de ativar:** preencher OFERTAS, confirmar ZAPI_INSTANCIA ("Monta a mensagem") e cadastrar no Guru o webhook POST /webhook/promo97/guru para a oferta.' } }
];

const conn = (de, para, saida = 0) => ({ [de]: { main: Array.from({ length: saida + 1 }, (_, i) => (i === saida ? [{ node: para, type: 'main', index: 0 }] : [])) } });
const connections = Object.assign({},
  conn('Compra Guru (PROMO 97)', 'Filtra a oferta'),
  conn('Filtra a oferta', 'Espera 15 min'),
  conn('Espera 15 min', 'Comprou o impresso?'),
  conn('Comprou o impresso?', 'Ainda não tem o impresso?'),
  conn('Ainda não tem o impresso?', 'Monta a mensagem'),
  conn('Monta a mensagem', 'Envia pelo portão (Z-API)'),
  conn('Envia pelo portão (Z-API)', 'Saiu?'),
  conn('Saiu?', 'Move para a etapa PROMO 97')
);

const wf = { name: 'PROMO 97 | DIGITAL — up sell do impresso [meDIZ]', nodes, connections, settings: { executionOrder: 'v1', timezone: 'America/Sao_Paulo', availableInMCP: true } };
fs.writeFileSync('promo97_create.json', JSON.stringify(wf));
fs.writeFileSync('promo97_codes.json', JSON.stringify({ FILTRA, MONTA }));
console.log('ok', nodes.length, 'nos');
