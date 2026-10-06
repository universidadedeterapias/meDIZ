// Tool "Consulta e Geracao de Link de Acesso [ChatVolt]": o ramo que gerava
// link chamava /api/customer/access-link, rota removida por decisao do PO
// (o acesso so sai pelo /resend-access, para o contato do cadastro). Passa a
// reenviar o acesso, com trava de 30 min entre reenvios.
const fs = require('fs');
const w = require('./link_api.json');
const MEDIZ = { httpHeaderAuth: { id: '61Ucwwybsgb47Fph', name: 'webhook' } };
const no = (nome) => {
  const n = w.nodes.find((x) => x.name === nome);
  if (!n) throw new Error('no nao encontrado: ' + nome);
  return n;
};
function renomear(antigo, novo) {
  no(antigo).name = novo;
  if (w.connections[antigo]) {
    w.connections[novo] = w.connections[antigo];
    delete w.connections[antigo];
  }
  for (const c of Object.values(w.connections))
    for (const saida of c.main || []) for (const destino of saida || []) if (destino.node === antigo) destino.node = novo;
}

const AVALIAR = `const resp = $input.first().json;
const status = resp.statusCode;
const data = resp.body || {};

if (status !== 200) {
  return [{
    json: {
      ok: false,
      status_http: status,
      erro: (data && data.error) ? data.error : 'Falha ao consultar o cadastro no meDIZ.',
      found: false,
      ambiguous: false,
      precisa_reenviar: false,
      reenvio_recente_min: null
    }
  }];
}

const entrada = $('Normalizar Entrada').item.json;
const entrega = data.ultima_entrega;

// Trava contra reenvio em sequencia: cada reenvio e um template pago, e a
// Entrega de Acesso nao entra no limite por pessoa do portao de envio. Se o
// ultimo aviso foi um reenvio que saiu ha menos de 30 min, nao manda de novo
// — mesmo com forcar_novo_link.
const TRAVA_MIN = 30;
let reenvioRecenteMin = null;
if (entrega && entrega.tipo === 'access_resent' && entrega.status === 'sent' && entrega.enviado_em) {
  const min = Math.floor((Date.now() - new Date(entrega.enviado_em).getTime()) / 60000);
  if (min < TRAVA_MIN) reenvioRecenteMin = Math.max(min, 0);
}

// Reenvia quando a conta existe (e e uma so) e: nunca houve aviso, o ultimo
// nao saiu, ou o atendimento pediu (a pessoa disse que nao recebeu ou nao
// consegue entrar). O reenvio vai para o contato DO CADASTRO, nunca para o
// que veio na conversa.
const precisaReenviar = !!data.found && !data.ambiguous && reenvioRecenteMin === null && (
  entrada.forcar_novo_link ||
  !entrega ||
  entrega.status !== 'sent'
);

return [{
  json: {
    ok: true,
    found: !!data.found,
    ambiguous: !!data.ambiguous,
    matched_by: data.matched_by || null,
    customer: data.customer || null,
    produtos: data.produtos || [],
    plano: data.plano || null,
    ultima_entrega: entrega || null,
    vendas_pendentes: data.vendas_pendentes || [],
    precisa_reenviar: precisaReenviar,
    reenvio_recente_min: reenvioRecenteMin,
    email_busca: entrada.email,
    cpf_busca: entrada.cpf,
    whatsapp_busca: entrada.whatsapp
  }
}];`;

const COM_REENVIO = `const consulta = $('Avaliar Consulta e Decidir').item.json;
const resp = $input.first().json;
const status = resp.statusCode;
const data = (resp.body && typeof resp.body === 'object') ? resp.body : {};
const canais = data.canais || {};

let reenviado = false;
let mensagem;

if (status === 200 && data.enviado === true) {
  reenviado = true;
  const destinos = [];
  if (canais.email) destinos.push('o e-mail ' + canais.email);
  if (canais.whatsapp) destinos.push('o WhatsApp do cadastro');
  mensagem = 'Pronto! Reenviei o seu acesso para ' + (destinos.length ? destinos.join(' e ') : 'o contato do cadastro') +
    '. Pode levar alguns minutos para chegar — confira também a caixa de spam.';
} else if (status === 200) {
  // Registrado mas nao saiu: nao prometer o que nao aconteceu.
  mensagem = 'Encontrei o seu cadastro e registrei o reenvio, mas o envio não saiu agora. Vou pedir para o time conferir e te retorno.';
} else if (status === 409) {
  mensagem = 'Encontrei mais de uma conta com esse contato. Pode confirmar o e-mail ou o CPF usado na compra?';
} else {
  // Qualquer outro erro: a conta EXISTE (a consulta achou). Nunca dizer que
  // nao e cliente.
  mensagem = 'Encontrei o seu cadastro, mas não consegui reenviar o acesso agora. Vou pedir para o time conferir e te retorno.';
}

return [{
  json: {
    ok: true,
    found: consulta.found,
    nome: consulta.customer ? consulta.customer.nome : null,
    produtos: consulta.produtos,
    plano: consulta.plano,
    ultima_entrega: consulta.ultima_entrega,
    vendas_pendentes: consulta.vendas_pendentes,
    acesso_reenviado: reenviado,
    canais: reenviado ? canais : null,
    // Campos antigos, mantidos para quem ainda le: o fluxo nao gera nem
    // devolve link desde 06/10/2026.
    link_gerado: false,
    link_acesso: null,
    mensagem_sugerida: mensagem
  }
}];`;

const SEM_REENVIO = `const consulta = $input.first().json;

let mensagem;
if (!consulta.ok) {
  mensagem = 'Estou com instabilidade para consultar o cadastro agora. Tente novamente em instantes.';
} else if (consulta.ambiguous) {
  mensagem = 'Encontrei mais de uma conta com esse contato. Pode confirmar o e-mail ou o CPF usado na compra?';
} else if (!consulta.found && consulta.vendas_pendentes && consulta.vendas_pendentes.length > 0) {
  mensagem = 'Encontrei a compra, mas o produto ainda está sendo liberado no sistema — já vou verificar e te aviso assim que estiver pronto.';
} else if (!consulta.found) {
  mensagem = 'Não encontrei nenhuma conta ou compra com esse e-mail. Pode confirmar se foi esse o e-mail usado na compra?';
} else if (consulta.reenvio_recente_min !== null && consulta.reenvio_recente_min !== undefined) {
  const min = consulta.reenvio_recente_min;
  mensagem = 'Acabei de reenviar o seu acesso' + (min > 0 ? ' há ' + min + ' minuto' + (min === 1 ? '' : 's') : ' agora') +
    ', para o e-mail e o WhatsApp do cadastro. Confira a caixa de entrada e o spam — se em alguns minutos não chegar, me avise.';
} else {
  mensagem = 'Encontrei sua conta e o último aviso de acesso já saiu com sucesso — você pode entrar normalmente. Se não estiver conseguindo, me avise que eu reenvio.';
}

return [{
  json: {
    ok: consulta.ok !== false,
    found: !!consulta.found,
    ambiguous: !!consulta.ambiguous,
    nome: consulta.customer ? consulta.customer.nome : null,
    produtos: consulta.produtos || [],
    plano: consulta.plano || null,
    ultima_entrega: consulta.ultima_entrega || null,
    vendas_pendentes: consulta.vendas_pendentes || [],
    acesso_reenviado: false,
    reenvio_recente_min: consulta.reenvio_recente_min ?? null,
    canais: null,
    link_gerado: false,
    link_acesso: null,
    mensagem_sugerida: mensagem
  }
}];`;

no('Avaliar Consulta e Decidir').parameters.jsCode = AVALIAR;

const se = no('Precisa Gerar Link?');
se.parameters.conditions.conditions[0].leftValue = '={{ $json.precisa_reenviar }}';
se.parameters.conditions.conditions[0].id = 'precisa-reenviar';
renomear('Precisa Gerar Link?', 'Precisa reenviar o acesso?');

const reenviar = no('Gerar Link de Acesso');
reenviar.parameters.url = 'https://mediz.app/api/customer/resend-access';
reenviar.parameters.jsonBody = '={{ { "email": $json.email_busca, "cpf": $json.cpf_busca, "whatsapp": $json.whatsapp_busca } }}';
reenviar.parameters.options.timeout = 30000;
reenviar.credentials = MEDIZ;
renomear('Gerar Link de Acesso', 'Reenviar acesso (cadastro)');

no('Montar Resposta (com link novo)').parameters.jsCode = COM_REENVIO;
renomear('Montar Resposta (com link novo)', 'Montar Resposta (reenvio)');
no('Montar Resposta (sem link novo)').parameters.jsCode = SEM_REENVIO;
renomear('Montar Resposta (sem link novo)', 'Montar Resposta (sem reenvio)');

// Notas
const nota = (trecho) => w.nodes.find((n) => /sticky/i.test(n.type) && n.parameters.content.includes(trecho));
nota('## Entrada — tool do ChatVolt').parameters.content =
  '## Entrada — tool do ChatVolt\n\nA IA da ChatVolt chama este webhook durante o atendimento, passando o e-mail que pediu ao cliente (e opcionalmente cpf/whatsapp, se ja tiver).\n\nCorpo esperado: `{ "email": "...", "cpf": "...", "whatsapp": "...", "forcar_novo_link": true|false }`.\n\n`forcar_novo_link` e opcional. Use `true` quando o cliente ja disse explicitamente que nao recebeu ou nao consegue entrar — reenvia o acesso mesmo se o ultimo aviso consta como enviado.\n\nDesde 06/10/2026 o fluxo NAO devolve link: quando reenvia, o acesso sai pela ENTREGA DE ACESSO (portao de envio) para o e-mail e o WhatsApp DO CADASTRO — nunca para o contato que veio na conversa. A resposta diz por onde saiu (`canais`) e traz `mensagem_sugerida`.';
nota('## So consulta e decide').parameters.content =
  '## Quando reenvia\n\nA consulta usa `GET /api/customer/lookup` (so leitura). Reenvia (`POST /api/customer/resend-access`) quando:\n\n- a conta existe e e uma so, E\n- nunca houve aviso, OU o ultimo nao saiu, OU o atendimento pediu (`forcar_novo_link`), E\n- o ultimo aviso NAO foi um reenvio que saiu ha menos de 30 min (trava contra reenvio em sequencia — cada um e um template pago).\n\nErro no reenvio nunca vira "nao encontrei sua conta": a consulta ja achou o cadastro.\n\nSem conta mas com `vendas_pendentes`: a compra chegou e o produto ainda nao foi mapeado — caso para o time.';
nota('## Credencial — Bearer do meDIZ').parameters.content =
  '## Credencial — Bearer do meDIZ\n\nAs chamadas para mediz.app usam a credencial "webhook" (Header Auth, `Authorization: Bearer <WEBHOOK_SECRET_TOKEN>`). Ate 06/10/2026 o no de link usava por engano a credencial do Chatvolt.';
nota('## Cuidado: isto devolve uma credencial').parameters.content =
  '## Por que nao devolve mais link\n\nA rota `/api/customer/access-link` devolvia um link que entra sem senha na propria resposta — qualquer um que soubesse um e-mail poderia pedir o login de outra conta pela conversa. Foi removida por decisao do PO; o fluxo seguiu chamando ela e recebia 404 (10 de 58 consultas entre 24/09 e 06/10), e respondia "nao encontrei sua conta" para cliente existente.\n\nO reenvio vai sempre para o contato cadastrado, entao nao expoe credencial.';

const permitidos = ['executionOrder', 'timezone', 'saveDataErrorExecution', 'saveDataSuccessExecution', 'saveManualExecutions', 'saveExecutionProgress', 'executionTimeout', 'errorWorkflow', 'callerPolicy', 'callerIds', 'timeSavedPerExecution', 'availableInMCP'];
const settings = Object.fromEntries(Object.entries(w.settings || {}).filter(([k]) => permitidos.includes(k)));
fs.writeFileSync('link_put.json', JSON.stringify({ name: w.name, nodes: w.nodes, connections: w.connections, settings, staticData: w.staticData || null }));
fs.writeFileSync('link_codes.json', JSON.stringify({ AVALIAR, COM_REENVIO, SEM_REENVIO }));
console.log('ok', w.nodes.length, 'nos');
