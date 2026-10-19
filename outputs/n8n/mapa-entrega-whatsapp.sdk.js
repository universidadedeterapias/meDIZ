import { workflow, node, trigger, ifElse, sticky, expr } from '@n8n/workflow-sdk';

// MAPA — Entrega WhatsApp (Epic 7, Story 7.7).
//
// O app (src/lib/mapa/entrega.ts) chama uma vez por venda com
// { tipo: 'mapa_pronto' | 'mapa_resgate', delivery_id, nome, telefone, link, ... }.
// Responde 200 na hora e manda o aviso pela Aline, na conversa do telefone
// (POST /conversation/message/phone/<tel>), para a pessoa receber o link onde
// ela comprou. Nao passa pelo ENTREGA DE ACESSO: la vale a trava de um aviso
// por pessoa, e o Mapa nao pode tirar o aviso do livro.

const entrada = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Entrega do Mapa [app]',
    parameters: {
      httpMethod: 'POST',
      path: 'mapa-entrega',
      authentication: 'headerAuth',
      responseMode: 'responseNode',
      options: {}
    },
    position: [0, 300]
  },
  output: [{ body: { tipo: 'mapa_pronto', delivery_id: 'mapa:abc', nome: 'Marina', telefone: '5511999998888', link: 'https://mediz.app/acesso?token=x' } }]
});

const monta = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Monta a mensagem',
    parameters: {
      jsCode: `// Agente e canal da Aline. CANAL muda quando a Aline ganhar o numero dela:
// 'whatsapp' (API oficial) ou 'zapi'.
const AGENT_ID = 'cmv7wx2022izdftv7t6rt1aip';
const CANAL = 'whatsapp';

const corpo = $input.first().json.body || {};
const primeiroNome = String(corpo.nome || '').trim().split(/\\s+/)[0] || '';
const oi = primeiroNome ? primeiroNome + ', ' : '';
const link = String(corpo.link || '').trim();

let telefone = String(corpo.telefone || '').replace(/\\D/g, '');
if (telefone.length === 10 || telefone.length === 11) telefone = '55' + telefone;
if (telefone.length < 12 || telefone.length > 15) telefone = '';

let mensagem;
if (corpo.tipo === 'mapa_resgate') {
  mensagem = oi + 'recebi o teu pagamento do Mapa da Origem Emocional 💜\\n\\n'
    + 'Só falta um passo: escolher qual Mapa liberar (ou gerar o teu agora). É por aqui:\\n' + link + '\\n\\n'
    + 'Chegou aí? Qualquer coisa me chama.';
} else {
  mensagem = oi + 'o teu Mapa da Origem Emocional está pronto 💜\\n\\n'
    + 'Deixei ele liberado aqui pra você:\\n' + link + '\\n\\n'
    + 'Ele fica guardado na tua Biblioteca pra sempre. Chegou aí?';
}

return [{ json: {
  telefone,
  delivery_id: String(corpo.delivery_id || ''),
  tipo: corpo.tipo || 'mapa_pronto',
  tem_link: !!link,
  envio: { message: mensagem, agentId: AGENT_ID, channel: CANAL }
} }];`
    },
    position: [224, 300]
  }
});

const confirma = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Confirma recebimento',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ { "ok": true, "delivery_id": $json.delivery_id, "tem_telefone": !!$json.telefone } }}'),
      options: {}
    },
    position: [448, 300]
  }
});

const podeEnviar = ifElse({
  version: 2.2,
  config: {
    name: 'Tem telefone e link?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [
          { id: 'tem-telefone', leftValue: expr('{{ $json.telefone }}'), rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } },
          { id: 'tem-link', leftValue: expr('{{ $json.tem_link }}'), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }
        ],
        combinator: 'and'
      },
      options: {}
    },
    position: [672, 300]
  }
});

const envia = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Envia pela Aline',
    parameters: {
      method: 'POST',
      url: expr("{{ 'https://api.chatvolt.ai/conversation/message/phone/' + $json.telefone }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($json.envio) }}'),
      options: { response: { response: { neverError: true, fullResponse: true } }, timeout: 20000 }
    },
    onError: 'continueRegularOutput',
    position: [896, 200]
  }
});

const nota = sticky('## MAPA — Entrega WhatsApp\n\nO app chama `POST /webhook/mapa-entrega` (Bearer `MAPA_WEBHOOK_TOKEN`) quando o Mapa é pago (`mapa_pronto`) ou quando o pagamento chega sem Mapa (`mapa_resgate`). O e-mail sai do app; aqui sai o WhatsApp, pela Aline, na conversa do telefone.\n\n**Credenciais:** "meDIZ Mapa" em "Entrega do Mapa [app]"; "Chatvolt API" em "Envia pela Aline".\n\n**Quando a Aline ganhar número:** conferir `CANAL` em "Monta a mensagem" (whatsapp = API oficial, zapi = Z-API). Fora da janela de 24h a API oficial só aceita template.', { name: 'Nota', position: [0, -60], width: 640, height: 300, color: 4 });

export default workflow('mapa-entrega', 'MAPA — Entrega WhatsApp [meDIZ]', { settings: {
  executionOrder: 'v1',
  timezone: 'America/Sao_Paulo',
  availableInMCP: true
} })
  .add(entrada)
  .to(monta)
  .to(confirma)
  .to(podeEnviar.onTrue(envia))
  .add(nota);
