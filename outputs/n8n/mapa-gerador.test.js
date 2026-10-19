// Roda os nos de codigo do "MAPA — Gerador" com respostas falsas da OpenAI.
//   node outputs/n8n/mapa-gerador.create.js outputs/n8n && node outputs/n8n/mapa-gerador.test.js
const path = require('path');
const { PREPARA, MONTA_NUCLEO, MONTA_PARTES, JUNTA } = require(path.join(__dirname, 'mapa_gerador_codes.json'));
const EXEMPLO = require('./mapa-gerador.exemplo.json');

let ok = 0, falha = 0;
const caso = (n, c) => { c ? ok++ : falha++; console.log((c ? '  ok   ' : '  FALHOU ') + n); };

// Simula $input e $('No') do n8n.
function roda(code, entrada, nos = {}) {
  const itens = (lista) => lista.map((json) => ({ json }));
  const $input = { all: () => itens(entrada), first: () => ({ json: entrada[0] }) };
  const $ = (nome) => ({ all: () => itens(nos[nome] || []), first: () => ({ json: (nos[nome] || [])[0] }) });
  return new Function('$input', '$', code)($input, $).map((i) => i.json);
}
const openai = (obj) => ({ choices: [{ message: { content: JSON.stringify(obj) } }] });

const pedido = { body: { mapa_id: 'm1', callback_url: 'https://mediz.app/api/mapa/resultado', entrada: EXEMPLO.entrada } };
const prep = roda(PREPARA, [pedido]);
caso('prepara le o corpo do webhook', prep[0].mapa_id === 'm1' && prep[0].entrada.nome === 'Rafael');
let erro = null; try { roda(PREPARA, [{ body: { mapa_id: 'm1' } }]) } catch (e) { erro = e.message }
caso('pedido sem callback falha', /callback_url/.test(erro || ''));

const RELATORIO = '**Sistema Endócrino**\n**Conflito Emocional Subjacente**\nPâncreas: conflito de resistência diante do que é doce demais ou amargo demais na vida. '.repeat(3);
const nucleoReq = roda(MONTA_NUCLEO, [{ data: RELATORIO }], { Prepara: prep });
const msgNucleo = nucleoReq[0].requisicao.messages[1].content;
caso('nucleo leva a pesquisa do meDIZ e as idades da pessoa', /resistência/.test(msgNucleo) && /aos 10/.test(msgNucleo));
caso('nucleo pede JSON', nucleoReq[0].requisicao.response_format.type === 'json_object');
const semBase = roda(MONTA_NUCLEO, [{}], { Prepara: prep });
caso('sem pesquisa, avisa o modelo', /não respondeu/.test(semBase[0].contexto));
const erroPesquisa = roda(MONTA_NUCLEO, [{ data: 'Error in workflow' }], { Prepara: prep });
caso('resposta curta da pesquisa (erro) nao vira base', /não respondeu/.test(erroPesquisa[0].contexto));

const nucleo = { orgao: 'o pâncreas', sintoma_titulo: 'Diabetes tipo 1', lateral: null, grave: true };
const partes = roda(MONTA_PARTES, [openai(nucleo)], { 'Monta núcleo': nucleoReq });
caso('duas partes, A e B', partes.length === 2 && partes[0].parte === 'A' && partes[1].parte === 'B');
caso('cada parte leva o nucleo e o exemplo da sua metade',
  /NÚCLEO/.test(partes[0].requisicao.messages[1].content) && /linha_do_tempo/.test(partes[0].requisicao.messages[1].content) && /corpo_pede/.test(partes[1].requisicao.messages[1].content));
const nucleoQuebrado = roda(MONTA_PARTES, [{ error: { message: 'rate limit' } }], { 'Monta núcleo': nucleoReq });
caso('nucleo com erro da OpenAI vira falha', nucleoQuebrado.length === 1 && /rate limit/.test(nucleoQuebrado[0].falha));

const C = EXEMPLO.conteudo;
const A = { capa: { ...C.capa, sintoma_titulo: 'outro' }, carta: C.carta, reconhecimento: C.reconhecimento, linguagem_popular: C.linguagem_popular,
  sentido_biologico: { ...C.sentido_biologico, orgao: 'o fígado' }, conflito: C.conflito, linha_do_tempo: C.linha_do_tempo, fase: C.fase, repeticao: C.repeticao };
const B = { programa_familiar: C.programa_familiar, crencas: C.crencas, corpo_pede: C.corpo_pede, primeiros_passos: C.primeiros_passos,
  releitura: C.releitura, citacao_final: C.citacao_final, frase_forte: C.frase_forte };
const junta = roda(JUNTA, [openai(A), openai(B)], { 'Monta partes': partes });
const conteudo = junta[0].corpo.conteudo;
caso('junta as metades com versao 1 e callback', conteudo.versao === 1 && conteudo.crencas && conteudo.conflito && junta[0].callback_url.endsWith('/resultado'));
caso('nucleo manda no orgao e no titulo', conteudo.sentido_biologico.orgao === 'o pâncreas' && conteudo.capa.sintoma_titulo === 'Diabetes tipo 1');
caso('todas as secoes do schema presentes', Object.keys(C).every((k) => k in conteudo) && Object.keys(conteudo).length === Object.keys(C).length);
const Bvazia = { ...B, programa_familiar: { ...C.programa_familiar, arvore: { pai: ' faleceu ', mae: '', avo_paterno: '  ', bisavo: 'x' } } };
const arv = roda(JUNTA, [openai(A), openai(Bvazia)], { 'Monta partes': partes })[0].corpo.conteudo.programa_familiar.arvore;
caso('arvore fica so com nos preenchidos e conhecidos', JSON.stringify(arv) === JSON.stringify({ pai: 'faleceu' }));
const Alonga = { ...A, linha_do_tempo: { ...C.linha_do_tempo, marcos: C.linha_do_tempo.marcos.map((m, i) => i ? m : { ...m, rotulo: 'ENTRE A INFÂNCIA E O PRESENTE — O QUE SÓ VOCÊ SABE' }) } };
const rot = roda(JUNTA, [openai(Alonga), openai(B)], { 'Monta partes': partes })[0].corpo.conteudo.linha_do_tempo.marcos[0].rotulo;
caso('texto acima do limite e cortado na palavra, com reticencias', rot.length <= 40 && rot.endsWith('…') && !/s…$/.test(rot));
const parteRuim = roda(JUNTA, [openai(A), { choices: [{ message: { content: 'nao e json' } }] }], { 'Monta partes': partes });
caso('parte sem JSON vira erro para o app', parteRuim[0].corpo.erro && /Parte B/.test(parteRuim[0].corpo.erro) && parteRuim[0].corpo.mapa_id === 'm1');
const falhaNucleo = roda(JUNTA, [nucleoQuebrado[0]], { 'Monta partes': nucleoQuebrado });
caso('falha do nucleo chega ao app como erro', /rate limit/.test(falhaNucleo[0].corpo.erro || ''));

console.log('\n' + ok + '/' + (ok + falha) + ' passaram'); process.exit(falha ? 1 : 0);
