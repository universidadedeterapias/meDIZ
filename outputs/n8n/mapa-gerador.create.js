// MAPA — Gerador [meDIZ] (Epic 7, Story 7.2).
//
// O app (src/lib/mapa/geracao.ts) chama o webhook com { mapa_id, callback_url,
// entrada }, o fluxo responde 202 na hora e trabalha em segundo plano:
//
//   busca no O Corpo Diz -> NUCLEO (fixa orgao e conflito) -> PARTE A + PARTE B
//   em paralelo -> junta -> POST callback_url { mapa_id, conteudo | erro }
//
// O app valida o conteudo contra o schema (src/lib/mapa/conteudo.ts) e recusa
// o que nao bater, entao este fluxo so precisa montar o JSON e avisar quando
// desistiu. Gera `mapa_gerador_create.json` (importar no n8n) e
// `mapa_gerador_codes.json` (usado pelo mapa-gerador.test.js).
//
//   node outputs/n8n/mapa-gerador.create.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SISTEMA, NUCLEO, PARTE_A, PARTE_B } = require('./mapa-gerador.prompts.js');
const EXEMPLO = require('./mapa-gerador.exemplo.json');

const id = () => crypto.randomUUID();
const OPENAI = { openAiApi: { id: 'uytZDG8ilslSjmcH', name: 'OpenAi account' } };
const SUPABASE = { supabaseApi: { id: 'ajUgfUltDy1MnUdF', name: 'Supabase account' } };
// Criar no n8n antes de ativar: Header Auth, nome "Authorization", valor
// "Bearer <MAPA_WEBHOOK_TOKEN do app>". Vale para os dois lados (entrada e callback).
const MAPA_AUTH = { httpHeaderAuth: { id: 'PREENCHER', name: 'meDIZ Mapa' } };

// Exemplo dividido nas duas metades: mostra ao modelo tom e tamanho de cada campo.
const C = EXEMPLO.conteudo;
const EXEMPLO_A = {
  capa: C.capa, carta: C.carta, reconhecimento: C.reconhecimento,
  linguagem_popular: C.linguagem_popular, sentido_biologico: C.sentido_biologico,
  conflito: C.conflito, linha_do_tempo: C.linha_do_tempo, fase: C.fase, repeticao: C.repeticao
};
const EXEMPLO_B = {
  programa_familiar: C.programa_familiar, crencas: C.crencas, corpo_pede: C.corpo_pede,
  primeiros_passos: C.primeiros_passos, releitura: C.releitura,
  citacao_final: C.citacao_final, frase_forte: C.frase_forte
};

const CONSTANTES = `const MODELO = 'gpt-4.1-mini';
const SISTEMA = ${JSON.stringify(SISTEMA)};
const NUCLEO = ${JSON.stringify(NUCLEO)};
const PARTE_A = ${JSON.stringify(PARTE_A)};
const PARTE_B = ${JSON.stringify(PARTE_B)};
const EXEMPLO_ENTRADA = ${JSON.stringify(EXEMPLO.entrada)};
const EXEMPLO_A = ${JSON.stringify(EXEMPLO_A)};
const EXEMPLO_B = ${JSON.stringify(EXEMPLO_B)};

function descreveEntrada(e) {
  const linhas = ['Nome: ' + e.nome, 'Sintoma (como a pessoa escreveu): ' + e.sintoma];
  if (e.tempo) linhas.push('Há quanto tempo: ' + e.tempo);
  const momentos = Array.isArray(e.momentos) ? e.momentos.filter((m) => m && m.momento) : [];
  if (momentos.length) {
    linhas.push('Momentos que marcaram a vida:');
    for (const m of momentos) linhas.push('- ' + m.momento + (m.idade ? ' (aos ' + m.idade + ')' : ''));
  }
  if (e.familia) linhas.push('Acontecimento com o pai ou a mãe: ' + e.familia);
  if (e.para_outra_pessoa) linhas.push('para_outra_pessoa: true · relacao: ' + (e.relacao || 'não informada'));
  return linhas.join('\\n');
}

function requisicao(mensagens, maxTokens) {
  return {
    model: MODELO,
    temperature: 0.8,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: SISTEMA }].concat(mensagens)
  };
}`;

// Recebe o pedido do app e confere o minimo. Sem mapa_id/callback nao ha a quem
// responder: falha aqui e aparece nas execucoes com erro.
const PREPARA = `const corpo = $input.first().json.body || $input.first().json;
const entrada = corpo.entrada || {};
if (!corpo.mapa_id || !corpo.callback_url) throw new Error('Pedido sem mapa_id ou callback_url');
if (!entrada.nome || !entrada.sintoma) throw new Error('Pedido sem nome ou sintoma');
return [{ json: { mapa_id: String(corpo.mapa_id), callback_url: String(corpo.callback_url), entrada } }];`;

// Junta os trechos da base e monta a chamada do nucleo.
const MONTA_NUCLEO = `${CONSTANTES}
const pedido = $('Prepara').first().json;
const trechos = [];
for (const item of $input.all()) {
  const doc = item.json.document || item.json;
  const texto = doc && (doc.pageContent || doc.text || doc.content);
  if (texto) trechos.push(String(texto).slice(0, 1800));
}
const contexto = trechos.length
  ? 'TRECHOS DE O CORPO DIZ SOBRE ESTE SINTOMA (base da leitura; não cite a fonte):\\n\\n' + trechos.slice(0, 6).join('\\n---\\n')
  : 'Não há trechos da base para este sintoma: use o conhecimento do método com cautela redobrada.';
return [{ json: {
  ...pedido,
  contexto,
  requisicao: requisicao([
    { role: 'user', content: contexto + '\\n\\nPESSOA\\n' + descreveEntrada(pedido.entrada) + '\\n\\n' + NUCLEO }
  ], 700)
} }];`;

// Le o nucleo e monta as duas metades, cada uma com o exemplo da sua parte.
const MONTA_PARTES = `${CONSTANTES}
const base = $('Monta núcleo').first().json;
const resposta = $input.first().json;
let nucleo = null;
try {
  nucleo = JSON.parse(resposta.choices[0].message.content);
} catch (e) {
  return [{ json: { ...base, falha: 'Núcleo sem JSON válido: ' + (resposta.error && resposta.error.message || e.message) } }];
}
const comum = base.contexto + '\\n\\nPESSOA\\n' + descreveEntrada(base.entrada) + '\\n\\nNÚCLEO\\n' + JSON.stringify(nucleo);
const exemplo = (parte) => 'EXEMPLO APROVADO (outra pessoa: ' + descreveEntrada(EXEMPLO_ENTRADA).replace(/\\n/g, ' · ') + ') — siga o tom e o tamanho, nunca o conteúdo:\\n' + JSON.stringify(parte);
return [
  { json: { ...base, nucleo, parte: 'A', requisicao: requisicao([{ role: 'user', content: comum + '\\n\\n' + exemplo(EXEMPLO_A) + '\\n\\n' + PARTE_A }], 3500) } },
  { json: { ...base, nucleo, parte: 'B', requisicao: requisicao([{ role: 'user', content: comum + '\\n\\n' + exemplo(EXEMPLO_B) + '\\n\\n' + PARTE_B }], 2500) } }
];`;

// Junta as metades no formato do app. Qualquer falha vira { erro }: o app marca
// o Mapa como erro e a pagina oferece tentar de novo.
const JUNTA = `const pedidos = $('Monta partes').all().map((i) => i.json);
const respostas = $input.all().map((i) => i.json);
const base = pedidos[0] || $('Monta núcleo').first().json;

function corpoComErro(motivo) {
  return [{ json: { callback_url: base.callback_url, corpo: { mapa_id: base.mapa_id, erro: String(motivo).slice(0, 380) } } }];
}

if (pedidos.length === 1 && pedidos[0].falha) return corpoComErro(pedidos[0].falha);
if (respostas.length !== pedidos.length) return corpoComErro('Resposta faltando de uma das partes');

const partes = {};
for (let i = 0; i < pedidos.length; i++) {
  const r = respostas[i];
  try {
    partes[pedidos[i].parte] = JSON.parse(r.choices[0].message.content);
  } catch (e) {
    return corpoComErro('Parte ' + pedidos[i].parte + ' sem JSON válido: ' + (r.error && r.error.message || e.message));
  }
}
if (!partes.A || !partes.B) return corpoComErro('Partes incompletas');

const conteudo = Object.assign({ versao: 1 }, partes.A, partes.B);
// O nucleo manda no orgao e no titulo: as duas metades nao podem divergir.
if (base.nucleo || pedidos[0].nucleo) {
  const n = pedidos[0].nucleo;
  if (conteudo.sentido_biologico && n.orgao) conteudo.sentido_biologico.orgao = n.orgao;
  if (conteudo.capa && n.sintoma_titulo) conteudo.capa.sintoma_titulo = String(n.sintoma_titulo).slice(0, 60);
}
if (conteudo.programa_familiar && !conteudo.programa_familiar.arvore) conteudo.programa_familiar.arvore = {};
return [{ json: { callback_url: base.callback_url, corpo: { mapa_id: base.mapa_id, conteudo } } }];`;

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const chamaOpenAi = (nome, pos) => ({
  id: id(), name: nome, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: pos, credentials: OPENAI,
  onError: 'continueRegularOutput',
  parameters: {
    method: 'POST', url: OPENAI_URL,
    authentication: 'predefinedCredentialType', nodeCredentialType: 'openAiApi',
    sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.requisicao) }}',
    options: { response: { response: { neverError: true } }, timeout: 90000 }
  }
});

const nodes = [
  { id: id(), name: 'Pedido do app', type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [0, 300], webhookId: id(),
    credentials: MAPA_AUTH,
    parameters: { httpMethod: 'POST', path: 'mapa-gerar', authentication: 'headerAuth', responseCode: 202, options: {} } },
  { id: id(), name: 'Prepara', type: 'n8n-nodes-base.code', typeVersion: 2, position: [224, 300], parameters: { jsCode: PREPARA } },
  { id: id(), name: 'Busca no O Corpo Diz', type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', typeVersion: 1.3, position: [448, 300],
    credentials: SUPABASE, alwaysOutputData: true, onError: 'continueRegularOutput',
    parameters: {
      mode: 'load',
      tableName: { __rl: true, value: 'GuiaCompleto', mode: 'list', cachedResultName: 'GuiaCompleto' },
      prompt: '={{ $json.entrada.sintoma }}',
      topK: 6,
      options: {}
    } },
  { id: id(), name: 'Embeddings OpenAI', type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', typeVersion: 1.2, position: [448, 520],
    credentials: OPENAI, parameters: { model: 'text-embedding-3-small', options: {} } },
  { id: id(), name: 'Monta núcleo', type: 'n8n-nodes-base.code', typeVersion: 2, position: [672, 300], parameters: { jsCode: MONTA_NUCLEO } },
  chamaOpenAi('OpenAI — núcleo', [896, 300]),
  { id: id(), name: 'Monta partes', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1120, 300], parameters: { jsCode: MONTA_PARTES } },
  // Dois itens (A e B): o HTTP Request dispara os dois ao mesmo tempo.
  chamaOpenAi('OpenAI — partes A e B', [1344, 300]),
  { id: id(), name: 'Junta', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1568, 300], parameters: { jsCode: JUNTA } },
  { id: id(), name: 'Devolve ao app', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [1792, 300], credentials: MAPA_AUTH,
    parameters: {
      method: 'POST', url: '={{ $json.callback_url }}',
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.corpo) }}',
      options: { response: { response: { neverError: true } }, timeout: 30000 }
    } },
  { id: id(), name: 'Nota', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [0, -260],
    parameters: { width: 820, height: 500, content:
      '## MAPA — Gerador (Mapa da Origem Emocional)\n\n' +
      'O app chama `POST /webhook/mapa-gerar` com `{ mapa_id, callback_url, entrada }` e recebe 202 na hora. Este fluxo gera as 14 seções e devolve em `callback_url` (`/api/mapa/resultado`).\n\n' +
      '- **Núcleo** fixa órgão, conflito e título; **Parte A** (seções 1–9) e **Parte B** (10–14 + frase_forte) saem em paralelo a partir dele.\n' +
      '- O app valida tudo (src/lib/mapa/conteudo.ts). Resposta 422 do callback = o modelo errou um campo: o Mapa fica em erro e a pessoa tenta de novo.\n' +
      '- Prompts e exemplo: outputs/n8n/mapa-gerador.prompts.js e .exemplo.json. Mudou? Rode mapa-gerador.create.js e reimporte.\n\n' +
      '**Antes de ativar:** criar a credencial Header Auth "meDIZ Mapa" (Authorization: Bearer <MAPA_WEBHOOK_TOKEN>) e ligá-la em "Pedido do app" e "Devolve ao app"; confirmar a tabela da base (GuiaCompleto); Paulo aprovar 10 Mapas de teste.' } }
];

const conn = (de, para) => ({ [de]: { main: [[{ node: para, type: 'main', index: 0 }]] } });
const connections = Object.assign({},
  conn('Pedido do app', 'Prepara'),
  conn('Prepara', 'Busca no O Corpo Diz'),
  conn('Busca no O Corpo Diz', 'Monta núcleo'),
  conn('Monta núcleo', 'OpenAI — núcleo'),
  conn('OpenAI — núcleo', 'Monta partes'),
  conn('Monta partes', 'OpenAI — partes A e B'),
  conn('OpenAI — partes A e B', 'Junta'),
  conn('Junta', 'Devolve ao app'),
  { 'Embeddings OpenAI': { ai_embedding: [[{ node: 'Busca no O Corpo Diz', type: 'ai_embedding', index: 0 }]] } }
);

const wf = { name: 'MAPA — Gerador [meDIZ]', nodes, connections, settings: { executionOrder: 'v1', timezone: 'America/Sao_Paulo', availableInMCP: true } };
const destino = process.argv[2] || process.cwd();
fs.writeFileSync(path.join(destino, 'mapa_gerador_create.json'), JSON.stringify(wf));
fs.writeFileSync(path.join(destino, 'mapa_gerador_codes.json'), JSON.stringify({ PREPARA, MONTA_NUCLEO, MONTA_PARTES, JUNTA }));
console.log('ok', nodes.length, 'nos');
