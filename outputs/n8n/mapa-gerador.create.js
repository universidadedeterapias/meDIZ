// MAPA — Gerador [meDIZ] (Epic 7, Story 7.2).
//
// O app (src/lib/mapa/geracao.ts) chama o webhook com { mapa_id, callback_url,
// entrada }, o fluxo responde 202 na hora e trabalha em segundo plano:
//
//   pesquisa do meDIZ (chat-texto) -> NUCLEO (fixa orgao e conflito) -> PARTE A + PARTE B
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

// A base do Mapa e a pesquisa do meDIZ (modo pesquisa do app, webhook chat-texto):
// o mesmo relatorio, apoiado no O Corpo Diz, que a pessoa veria pesquisando o
// sintoma. O Mapa personaliza esse relatorio com o quiz.
const MONTA_NUCLEO = `${CONSTANTES}
const pedido = $('Prepara').first().json;
const r = $input.first().json || {};
const relatorio = String((typeof r.data === 'string' && r.data) || r.output || r.resposta || '').trim();
const contexto = relatorio.length > 200
  ? 'PESQUISA DO meDIZ SOBRE ESTE SINTOMA (relatório do método, apoiado em O Corpo Diz). É a base da leitura: siga o órgão, o conflito, as experiências comuns, os padrões, o transgeracional, a lateralidade, as fases e a chave terapêutica que ele traz, e transforme em Mapa pessoal. Não copie o relatório nem cite que ele existe.\\n\\n' + relatorio.slice(0, 9000)
  : 'A pesquisa do meDIZ não respondeu para este sintoma: use o conhecimento do método com cautela redobrada.';
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
// Limites de tamanho do schema do app (src/lib/mapa/conteudo.ts). O modelo as
// vezes passa um pouco (ex.: rotulo da linha do tempo com 50 caracteres) e o app
// recusaria o Mapa inteiro: aqui o texto e cortado na ultima palavra, com "…".
const LIMITES = {
  capa: { sintoma_titulo: 60, desde: 60 }, carta: { paragrafos: [600] },
  reconhecimento: { afirmacoes: [300], fechamento: 240 }, linguagem_popular: { frases: [80] },
  sentido_biologico: { orgao: 40, paragrafos: [700], frase_sintese: 300 },
  conflito: { raiz: 600, cenarios: [300], leitura_pessoal: 500, pergunta_chave: 300 },
  linha_do_tempo: { marcos: [{ rotulo: 40, texto: 400 }], pergunta: 300 },
  fase: { sinais_luta: 240, sinais_reparacao: 240, leitura: 500 },
  repeticao: { lateralidade: 400, texto: 600, pergunta: 240 },
  programa_familiar: { texto: 600, instrucao: 300, pergunta: 240 },
  crencas: { itens: [120] }, corpo_pede: { pedidos: [300] },
  primeiros_passos: { passos: [{ titulo: 60, texto: 300 }] },
  releitura: { pergunta_30: 200, pergunta_90: 200 }, citacao_final: 400, frase_forte: 300
};
function corta(s, max) {
  const t = s.trim();
  if (t.length <= max) return t;
  const parte = t.slice(0, max - 1);
  const espaco = parte.lastIndexOf(' ');
  return (espaco > max * 0.6 ? parte.slice(0, espaco) : parte).replace(/[\\s,;:.—-]+$/, '') + '…';
}
function ajusta(valor, limite) {
  if (typeof limite === 'number') return typeof valor === 'string' ? corta(valor, limite) : valor;
  if (Array.isArray(limite)) return Array.isArray(valor) ? valor.map((v) => ajusta(v, limite[0])) : valor;
  if (valor && typeof valor === 'object') {
    for (const k of Object.keys(limite)) if (k in valor) valor[k] = ajusta(valor[k], limite[k]);
  }
  return valor;
}
ajusta(conteudo, LIMITES);

// Arvore: o modelo as vezes manda "" nos nos sobre os quais a pessoa nao contou
// nada. O app so aceita anotacao de verdade: fica so o que tem texto.
if (conteudo.programa_familiar) {
  const NOS = ['avo_paterno', 'avo_paterna', 'avo_materno', 'avo_materna', 'pai', 'mae', 'tios', 'irmaos'];
  const bruta = conteudo.programa_familiar.arvore || {};
  const arvore = {};
  for (const no of NOS) {
    const v = typeof bruta[no] === 'string' ? bruta[no].trim() : '';
    if (v) arvore[no] = v.slice(0, 80);
  }
  conteudo.programa_familiar.arvore = arvore;
}
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
  // Sem credencial: o chat-texto e o mesmo webhook aberto que o app chama. Resposta
  // do cache (Postgres) em segundos; sintoma novo, o agente gera e grava (~30 s).
  { id: id(), name: 'Pesquisa do sintoma (meDIZ)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [448, 300],
    alwaysOutputData: true, onError: 'continueRegularOutput',
    parameters: {
      method: 'POST', url: 'https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-texto',
      sendBody: true, specifyBody: 'json',
      // Aspas simples quebram a consulta de cache do chat-texto (SQL montado com o texto).
      jsonBody: "={{ JSON.stringify({ threadId: 'mapa:' + $json.mapa_id, sintoma: String($json.entrada.sintoma).replace(/'/g, '’'), sintomaOriginal: $json.entrada.sintoma, language: 'pt-BR' }) }}",
      options: { response: { response: { responseFormat: 'text', neverError: true } }, timeout: 90000 }
    } },
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
      'O app chama `POST /webhook/mapa-gerar` com `{ mapa_id, callback_url, entrada }` e recebe 202 na hora. A base é a pesquisa do meDIZ (`chat-texto`, a mesma do modo pesquisa do app); este fluxo personaliza com o quiz, gera as 14 seções e devolve em `callback_url` (`/api/mapa/resultado`).\n\n' +
      '- **Núcleo** fixa órgão, conflito e título; **Parte A** (seções 1–9) e **Parte B** (10–14 + frase_forte) saem em paralelo a partir dele.\n' +
      '- O app valida tudo (src/lib/mapa/conteudo.ts). Resposta 422 do callback = o modelo errou um campo: o Mapa fica em erro e a pessoa tenta de novo.\n' +
      '- Prompts e exemplo: outputs/n8n/mapa-gerador.prompts.js e .exemplo.json. Mudou? Rode mapa-gerador.create.js e reimporte.\n\n' +
      '**Antes de ativar:** criar a credencial Header Auth "meDIZ Mapa" (Authorization: Bearer <MAPA_WEBHOOK_TOKEN>) e ligá-la em "Pedido do app" e "Devolve ao app"; ligar OpenAI nos 2 nós OpenAI. Paulo aprovar 10 Mapas de teste.' } }
];

const conn = (de, para) => ({ [de]: { main: [[{ node: para, type: 'main', index: 0 }]] } });
const connections = Object.assign({},
  conn('Pedido do app', 'Prepara'),
  conn('Prepara', 'Pesquisa do sintoma (meDIZ)'),
  conn('Pesquisa do sintoma (meDIZ)', 'Monta núcleo'),
  conn('Monta núcleo', 'OpenAI — núcleo'),
  conn('OpenAI — núcleo', 'Monta partes'),
  conn('Monta partes', 'OpenAI — partes A e B'),
  conn('OpenAI — partes A e B', 'Junta'),
  conn('Junta', 'Devolve ao app')
);

const wf = { name: 'MAPA — Gerador [meDIZ]', nodes, connections, settings: { executionOrder: 'v1', timezone: 'America/Sao_Paulo', availableInMCP: true } };
const destino = process.argv[2] || process.cwd();
fs.writeFileSync(path.join(destino, 'mapa_gerador_create.json'), JSON.stringify(wf));
fs.writeFileSync(path.join(destino, 'mapa_gerador_codes.json'), JSON.stringify({ PREPARA, MONTA_NUCLEO, MONTA_PARTES, JUNTA }));
console.log('ok', nodes.length, 'nos');
