// Recuperacao de Vendas v2 pelo portao (Story 6.2), editando o JSON do
// workflow pela API publica do n8n — preserva as credenciais por id.
const fs = require('fs');
const w = require('./recup_api.json');
const MEDIZ = { httpHeaderAuth: { id: '61Ucwwybsgb47Fph', name: 'webhook' } };
const no = (nome) => {
  const n = w.nodes.find((x) => x.name === nome);
  if (!n) throw new Error('no nao encontrado: ' + nome);
  return n;
};

// 1. Envia pelo portao. Mantem fullResponse (o Switch le statusCode e body) e o
// espacamento de 10s entre envios.
const envia = no('Envia o template');
envia.parameters.url = 'https://mediz.app/api/mensagens/enviar';
envia.parameters.jsonBody =
  '={{ JSON.stringify({ fluxo: "recuperacao", chave: "recuperacao:" + $json.lead_id + ":" + $json.passo, n8nWorkflowId: $workflow.id, n8nExecucaoId: $execution.id, corpo: $json.corpo_template }) }}';
envia.parameters.options.timeout = 30000;
envia.credentials = MEDIZ;

// 2. "Deu certo?" passa a ler o status do portao.
//    enviado / ja_enviado            -> segue (CRM, toque, variaveis)
//    recusa definitiva               -> Marca a recusa (lead sai da fila)
//    barrado, falha passageira       -> nenhuma saida: o claim_em expira em
//                                       15 min e a proxima rodada tenta de novo
const deu = no('Deu certo?');
const opts = { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 3 };
deu.parameters.rules.values = [
  {
    conditions: {
      options: opts,
      conditions: [
        { id: 'enviado', leftValue: '={{ ($json.body || {}).status }}', rightValue: 'enviado', operator: { type: 'string', operation: 'equals' } },
        { id: 'ja-enviado', leftValue: '={{ ($json.body || {}).status }}', rightValue: 'ja_enviado', operator: { type: 'string', operation: 'equals' } }
      ],
      combinator: 'or'
    },
    renameOutput: true,
    outputKey: 'enviado'
  },
  {
    conditions: {
      options: opts,
      conditions: [
        {
          id: 'recusa-definitiva',
          // incerto: pode ter saido, e o portao nunca reenvia — manter o lead
          // na fila so geraria rodadas inuteis. falhou com 4xx do Chatvolt:
          // numero ou template invalido. 400 do portao: pedido invalido
          // (telefone sem DDI). Nenhum desses melhora tentando de novo.
          leftValue:
            '={{ (($json.body || {}).status === "incerto") || ((($json.body || {}).status === "falhou") && Number(($json.body || {}).httpStatusChatvolt) >= 400 && Number(($json.body || {}).httpStatusChatvolt) < 500) || $json.statusCode === 400 }}',
          rightValue: '',
          operator: { type: 'boolean', operation: 'true', singleValue: true }
        }
      ],
      combinator: 'and'
    },
    renameOutput: true,
    outputKey: 'recusado'
  }
];

// 3. Registra o toque: em ja_enviado o conversationId vem na raiz do corpo.
const toque = no('Registra o toque');
toque.parameters.options.queryReplacement =
  '={{ [ $("Monta o disparo").item.json.lead_id, $("Monta o disparo").item.json.passo, (((($("Envia o template").item.json.body || {}).messages || [])[0] || {}).conversationId || ($("Envia o template").item.json.body || {}).conversationId || "") ] }}';

// 4. Marca a recusa: o motivo passa a ser o do portao.
const recusa = no('Marca a recusa');
recusa.parameters.options.queryReplacement =
  '={{ [ $("Monta o disparo").item.json.lead_id, ("HTTP " + $json.statusCode + " — " + (($json.body || {}).status || "") + ": " + (($json.body || {}).motivo || ($json.body || {}).mensagem || JSON.stringify($json.body || {}))).slice(0, 240) ] }}';

// 5. Nota.
const nota = w.nodes.find((n) => /stickyNote/.test(n.type));
nota.parameters.content +=
  '\n\n## Portao de envio (Story 6.2, 06/10/2026)\nO template sai por POST mediz.app/api/mensagens/enviar com a chave recuperacao:<lead_id>:<passo>. enviado/ja_enviado seguem; incerto, 4xx do Chatvolt e pedido invalido marcam a recusa; barrado e falha passageira nao fazem nada e o lead volta em 15 min. Desligar o envio sem parar o fluxo: fluxos_automacao.ligado = false para recuperacao.';
nota.parameters.height = (nota.parameters.height || 400) + 140;

const permitidos = ['executionOrder', 'timezone', 'saveDataErrorExecution', 'saveDataSuccessExecution', 'saveManualExecutions', 'saveExecutionProgress', 'executionTimeout', 'errorWorkflow', 'callerPolicy', 'callerIds', 'timeSavedPerExecution', 'availableInMCP'];
const settings = Object.fromEntries(Object.entries(w.settings || {}).filter(([k]) => permitidos.includes(k)));
fs.writeFileSync('recup_put.json', JSON.stringify({ name: w.name, nodes: w.nodes, connections: w.connections, settings, staticData: w.staticData || null }));
console.log('ok', w.nodes.length, 'nos; settings', JSON.stringify(settings));
