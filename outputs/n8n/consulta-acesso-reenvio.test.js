// Roda os tres Code nodes com entradas de exemplo, simulando $input e $().
const { AVALIAR, COM_REENVIO, SEM_REENVIO } = require('./consulta-acesso-reenvio.codes.json');
const run = (code, input, refs = {}) => new Function('$input', '$', code)(
  { first: () => ({ json: input }) },
  (nome) => ({ item: { json: refs[nome] } })
)[0].json;
const entrada = (forcar = false) => ({ email: 'ana@x.com', cpf: '', whatsapp: '', forcar_novo_link: forcar });
const minAtras = (m) => new Date(Date.now() - m * 60000).toISOString();
const lookup = (ultima, extra = {}) => ({ statusCode: 200, body: { found: true, ambiguous: false, customer: { nome: 'Ana' }, ultima_entrega: ultima, ...extra } });
let ok = 0, falha = 0;
const caso = (nome, cond) => { cond ? ok++ : falha++; console.log((cond ? '  ok   ' : '  FALHOU ') + nome); };

let a = run(AVALIAR, lookup(null), { 'Normalizar Entrada': entrada() });
caso('sem aviso nenhum: reenvia', a.precisa_reenviar === true);
a = run(AVALIAR, lookup({ tipo: 'new_account', status: 'sent', enviado_em: minAtras(600) }), { 'Normalizar Entrada': entrada() });
caso('aviso saiu e nao pediu: nao reenvia', a.precisa_reenviar === false && a.reenvio_recente_min === null);
a = run(AVALIAR, lookup({ tipo: 'new_account', status: 'sent', enviado_em: minAtras(600) }), { 'Normalizar Entrada': entrada(true) });
caso('aviso saiu mas pediu (forcar): reenvia', a.precisa_reenviar === true);
a = run(AVALIAR, lookup({ tipo: 'access_resent', status: 'sent', enviado_em: minAtras(7) }), { 'Normalizar Entrada': entrada(true) });
caso('reenvio ha 7 min, mesmo com forcar: trava', a.precisa_reenviar === false && a.reenvio_recente_min === 7);
a = run(AVALIAR, lookup({ tipo: 'access_resent', status: 'sent', enviado_em: minAtras(45) }), { 'Normalizar Entrada': entrada(true) });
caso('reenvio ha 45 min com forcar: reenvia', a.precisa_reenviar === true);
a = run(AVALIAR, lookup(null, { ambiguous: true }), { 'Normalizar Entrada': entrada(true) });
caso('conta ambigua: nao reenvia', a.precisa_reenviar === false);
a = run(AVALIAR, { statusCode: 503, body: {} }, { 'Normalizar Entrada': entrada() });
caso('lookup fora: ok=false', a.ok === false && a.precisa_reenviar === false);

const consulta = { found: true, customer: { nome: 'Ana' }, produtos: [], plano: null, ultima_entrega: null, vendas_pendentes: [] };
let r = run(COM_REENVIO, { statusCode: 200, body: { status: 'ok', enviado: true, canais: { email: 'a***@x.com', whatsapp: '55119****7777' } } }, { 'Avaliar Consulta e Decidir': consulta });
caso('reenviou: mensagem cita e-mail e WhatsApp', r.acesso_reenviado && /a\*\*\*@x\.com e o WhatsApp do cadastro/.test(r.mensagem_sugerida) && r.link_acesso === null);
r = run(COM_REENVIO, { statusCode: 200, body: { status: 'erro', enviado: false } }, { 'Avaliar Consulta e Decidir': consulta });
caso('registrou e nao saiu: nao promete', !r.acesso_reenviado && /não saiu agora/.test(r.mensagem_sugerida));
r = run(COM_REENVIO, { statusCode: 404, body: '<!DOCTYPE html>...' }, { 'Avaliar Consulta e Decidir': consulta });
caso('404 nunca vira "nao encontrei sua conta"', !/Não encontrei/.test(r.mensagem_sugerida) && /Encontrei o seu cadastro/.test(r.mensagem_sugerida));
r = run(COM_REENVIO, { statusCode: 500, body: {} }, { 'Avaliar Consulta e Decidir': consulta });
caso('500: cadastro existe, avisa o time', /Encontrei o seu cadastro/.test(r.mensagem_sugerida));

let s = run(SEM_REENVIO, { ok: true, found: true, reenvio_recente_min: 7 });
caso('trava: diz que acabou de reenviar ha 7 minutos', /há 7 minutos/.test(s.mensagem_sugerida));
s = run(SEM_REENVIO, { ok: true, found: true, reenvio_recente_min: null });
caso('ja saiu: pode entrar, e oferece reenvio', /pode entrar normalmente/.test(s.mensagem_sugerida));
s = run(SEM_REENVIO, { ok: true, found: false, vendas_pendentes: [] });
caso('sem conta: pede para confirmar e-mail', /Não encontrei/.test(s.mensagem_sugerida));
console.log(`\n${ok}/${ok + falha} passaram`);
process.exit(falha ? 1 : 0);
