// Roda "Filtra a oferta" e "Monta a mensagem" com webhooks de exemplo do Guru.
const { FILTRA, MONTA } = require('./promo97-digital.codes.json');
const OFERTA = 'aaaaaaaa-1111-2222-3333-444444444444';
const filtra = FILTRA.replace('const OFERTAS = new Set([]);', `const OFERTAS = new Set(['${OFERTA}']);`);
const roda = (code, itens) => new Function('$input', code)({ all: () => itens.map((json) => ({ json })) });
const webhook = (o = {}) => ({ body: Object.assign({
  webhook_type: 'transaction', status: 'approved', id: 'tx-1',
  product: { marketplace_id: '1780089168', name: 'O CORPO DIZ - BR - LIVRO DIGITAL', offer: { id: OFERTA, name: 'PROMO 97' } },
  items: [{ marketplace_id: '1780089168' }],
  contact: { name: 'Maria  da Silva', email: 'Maria@X.com', phone_local_code: '55', phone_number: '11988887777' }
}, o) });
let ok = 0, falha = 0;
const caso = (n, c) => { c ? ok++ : falha++; console.log((c ? '  ok   ' : '  FALHOU ') + n); };

let r = roda(filtra, [webhook()]);
caso('oferta aprovada passa, telefone com DDI, email minusculo', r.length === 1 && r[0].json.telefone === '5511988887777' && r[0].json.email === 'maria@x.com' && r[0].json.primeiro_nome === 'Maria');
caso('outra oferta do digital nao passa', roda(filtra, [webhook({ product: { marketplace_id: '1780089168', offer: { id: 'outra' } } })]).length === 0);
caso('pendente / recusada nao passa', roda(filtra, [webhook({ status: 'waiting_payment' })]).length === 0);
caso('levou o impresso no mesmo pedido nao passa', roda(filtra, [webhook({ items: [{ marketplace_id: '1780089168' }, { marketplace_id: '1780515697' }] })]).length === 0);
caso('sem telefone nao passa', roda(filtra, [webhook({ contact: { name: 'X', email: 'x@x.com' } })]).length === 0);
caso('assinatura (webhook_type) nao passa', roda(filtra, [webhook({ webhook_type: 'subscription' })]).length === 0);
let erro = null; try { roda(FILTRA, [webhook()]) } catch (e) { erro = e.message }
caso('OFERTAS vazia falha de proposito', /preencha o id da oferta/.test(erro || ''));

const monta = new Function('$', '$workflow', '$execution', MONTA)(
  () => ({ item: { json: { transacao_id: 'tx-1', telefone: '5511988887777' } } }), { id: 'wf1' }, { id: '99' });
const p = monta.json.pedido;
caso('pedido do portao: canal zapi, chave por transacao, instancia, texto', p.canal === 'zapi' && p.chave === 'promo97:tx-1' && p.zapiInstancia.length === 32 && /impresso\?/.test(p.corpo.message) && /Quer ver uma foto\?$/.test(p.corpo.message));
caso('etapa PROMO 97 no CRM', monta.json.crm_etapa === 'cmuwjj4zn0fvoztfu6onxxqv0');
console.log('\n' + ok + '/' + (ok + falha) + ' passaram'); process.exit(falha ? 1 : 0);
