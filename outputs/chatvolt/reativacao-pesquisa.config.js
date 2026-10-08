// Configura o cenario REATIVACAO PESQUISA no Chatvolt: prompts das 3 etapas,
// tool nova encerrar_conversa e descricoes de liberar_acesso / sair_do_fluxo.
// Uso: node config-reativacao-pesquisa.js [--aplicar]   (sem --aplicar so mostra)
const fs = require('fs');
const K = process.env.CHATVOLT_API_KEY; if (!K) throw new Error('defina CHATVOLT_API_KEY');
const API = 'https://api.chatvolt.ai';
const AGENTE = 'cmr7uw00e03st8flyqmtj7cq4';
const ETAPA = {
  inicial: 'cmuzgciwh0fo4r5848vgcrud9',
  pesquisa: 'cmuzgcwuy0fohr584flb4f3f4',
  encerramento: 'cmuzgd42t0fokr584c7rkinu5'
};
const aplicar = process.argv.includes('--aplicar');

const PROMPT_INICIAL = `Reativação. A pessoa já é cliente do meDIZ (comprou o livro O CORPO DIZ e tem conta no app), está há um tempo sem usar e acabou de responder ao nosso aviso. Já é cliente: nunca peça e-mail, CPF ou senha. Mensagens curtas, uma ideia por vez, e toda mensagem termina com pergunta.

Objetivo desta etapa: ela entrar no app e fazer UMA pesquisa (contar um sintoma, uma dor, um incômodo do corpo ou algo que está vivendo).
1. Acolha a resposta dela e lembre, em uma frase, o que o meDIZ faz: ela conta o que está sentindo e o app mostra o que o corpo está dizendo.
2. Pergunte se ela tem algo em mente agora — uma dor, um incômodo, algo que se repete — para experimentar.
3. Quando ela aceitar, pedir o acesso ou disser que não consegue entrar: chame liberar_acesso uma vez, com o conversationId desta conversa, e cole o link devolvido. O link entra direto, sem senha. Peça para ela avisar quando entrar.
4. Entrou: oriente a fazer a pesquisa com o que ela trouxe (se não trouxe nada, sugira começar por algo simples, como uma dor de cabeça ou nas costas). Diga que quer saber o que ela achou.

Se liberar_acesso não encontrar a conta ou der erro: não invente link e nunca diga que ela não é cliente; diga que vai pedir para o time verificar o acesso dela.

MAIS TARDE / sem tempo: uma linha gentil, sem insistir, e pergunte quando fica bom.

BLOQUEAR ou não quer contato: desculpe-se em uma linha. Se reafirmar, respeite, agradeça e chame sair_do_fluxo.

Não fale de preço nem de planos nesta etapa. Nunca diga "teste", "campanha" nem que está encerrando.`;

const PROMPT_PESQUISA = `Ela acabou de fazer uma pesquisa no app meDIZ — o sistema nos avisou. Você não sabe o que ela pesquisou nem o que o app respondeu: pergunte. Mensagens curtas, e toda mensagem termina com pergunta, exceto a despedida.

Objetivo desta etapa: ouvir como foi a experiência e fechar a conversa bem.
1. Comemore em uma linha que ela entrou e pesquisou, e pergunte o que achou do que o app mostrou.
2. Acolha. Se fez sentido, peça o que mais chamou a atenção. Se não fez sentido ou ela travou, ajude: sugira pesquisar de novo contando com mais detalhe (há quanto tempo, em que situação aparece, o que estava acontecendo na vida).
3. Dúvidas sobre o app: responda de forma simples. Se pedir o acesso de novo, chame liberar_acesso com o conversationId desta conversa.
4. Quando ela já contou como foi e a conversa chegou ao fim (agradeceu, se despediu, disse que não precisa de mais nada ou parou de trazer assunto novo): despeça-se em uma linha, convidando a voltar ao app sempre que o corpo der um sinal, e no mesmo turno chame encerrar_conversa.

Preço, planos ou como continuar: não invente valores nem links de pagamento; diga que vai pedir para o time passar as condições e siga a conversa.

BLOQUEAR ou não quer contato: desculpe-se em uma linha. Se reafirmar, respeite, agradeça e chame sair_do_fluxo.

Nunca diga "teste" nem "campanha".`;

const PROMPT_ENCERRAMENTO = `Conversa encerrada. Se ela voltar a escrever, responda com naturalidade e em mensagens curtas: agradeça, tire dúvidas simples sobre o app e, se pedir o acesso, chame liberar_acesso com o conversationId desta conversa. Não retome a pesquisa nem faça ofertas.`;

const DESC_LIBERAR = 'Devolve o link de acesso ao app meDIZ da pessoa desta conversa — o link entra direto, sem senha. Envie apenas o conversationId da conversa atual; nunca peça e-mail, CPF nem nenhum dado. Use nas etapas de reativação: na Reativação OCD Digital GURU, assim que a pessoa clicar SIM, ATUALIZE (antes de responder); no cenário REATIVAÇÃO PESQUISA, quando a pessoa aceitar entrar, pedir o link ou disser que não consegue entrar. Uma chamada por pedido. Se voltar found=false ou erro, não invente link nem diga que ela não é cliente. Esta ferramenta só gera o acesso: não ativa plano nem período grátis.';

const DESC_SAIR = 'Chame SOMENTE nas etapas de reativação (Reativação OCD Digital GURU ou cenário REATIVAÇÃO PESQUISA), depois de uma única tentativa de contornar, quando a pessoa reafirmar que não quer contato, pedir para bloquear ou parar. Remove a pessoa do fluxo e marca nao_contatar. Nunca chame por frustração comum.';

const DESC_ENCERRAR = 'Chame SOMENTE na etapa Pesquisa realizada do cenário REATIVAÇÃO PESQUISA, quando a pessoa já contou como foi a pesquisa e a conversa chegou ao fim (agradeceu, se despediu ou disse que não precisa de mais nada). Nunca no meio de uma dúvida. Move a conversa para Encerramento. Chame no mesmo turno da despedida.';

async function req(metodo, caminho, corpo) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: { Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const texto = await r.text();
  let json; try { json = JSON.parse(texto); } catch { json = texto; }
  if (!r.ok) throw new Error(`${metodo} ${caminho} -> HTTP ${r.status}: ${texto.slice(0, 300)}`);
  return json;
}

(async () => {
  const lista = await req('GET', `/agents/${AGENTE}/tools`);
  const tools = Array.isArray(lista) ? lista : lista.data || lista.tools || [];
  const porNome = (n) => tools.find((t) => t.type === 'http' && t.config && t.config.name === n);
  const liberar = porNome('liberar_acesso');
  const sair = porNome('sair_do_fluxo');
  const modelo = porNome('ir_para_fechamento'); // mesmo Authorization das tools de mover etapa
  if (!liberar || !sair || !modelo) throw new Error('tool de referencia nao encontrada');
  const jaExiste = porNome('encerrar_conversa');

  const novaTool = {
    type: 'http',
    isRaw: false,
    config: {
      name: 'encerrar_conversa',
      description: DESC_ENCERRAR,
      url: 'https://api.chatvolt.ai/crm/step/move',
      method: 'POST',
      headers: modelo.config.headers,
      body: [
        { key: 'conversationId', value: '', description: 'Deve preencher com o conversationId da conversa atual com o usuário', acceptedValues: [], isUserProvided: true },
        { key: 'destStepId', value: ETAPA.encerramento }
      ],
      pathVariables: [],
      queryParameters: [],
      hasMaximumToolCalls: false
    }
  };

  const passos = [
    ['PUT /crm/step (Etapa Inicial)', () => req('PUT', '/crm/step', { id: ETAPA.inicial, name: 'Etapa Inicial', prompt: PROMPT_INICIAL })],
    ['PUT /crm/step (Pesquisa realizada)', () => req('PUT', '/crm/step', { id: ETAPA.pesquisa, name: 'Pesquisa realizada', prompt: PROMPT_PESQUISA })],
    ['PUT /crm/step (Encerramento)', () => req('PUT', '/crm/step', { id: ETAPA.encerramento, name: 'Encerramento', prompt: PROMPT_ENCERRAMENTO })],
    jaExiste
      ? ['PATCH tool encerrar_conversa', () => req('PATCH', `/agents/${AGENTE}/tools/${jaExiste.id}`, novaTool)]
      : ['POST tool encerrar_conversa', () => req('POST', `/agents/${AGENTE}/tools`, novaTool)],
    ['PATCH tool liberar_acesso', () => req('PATCH', `/agents/${AGENTE}/tools/${liberar.id}`, { type: 'http', isRaw: liberar.isRaw, config: { ...liberar.config, description: DESC_LIBERAR } })],
    ['PATCH tool sair_do_fluxo', () => req('PATCH', `/agents/${AGENTE}/tools/${sair.id}`, { type: 'http', isRaw: sair.isRaw, config: { ...sair.config, description: DESC_SAIR } })]
  ];

  for (const [nome, fn] of passos) {
    if (!aplicar) { console.log('[seco]', nome); continue; }
    await fn();
    console.log('ok  ', nome);
  }
  fs.writeFileSync('reativacao-pesquisa-textos.json', JSON.stringify({ PROMPT_INICIAL, PROMPT_PESQUISA, PROMPT_ENCERRAMENTO, DESC_LIBERAR, DESC_SAIR, DESC_ENCERRAR }, null, 2));
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
