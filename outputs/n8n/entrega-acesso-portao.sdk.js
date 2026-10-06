import { workflow, node, trigger, ifElse, sticky, newCredential, expr } from '@n8n/workflow-sdk';

const webhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: "Entrega meDIZ",
    parameters: {
  "httpMethod": "POST",
  "path": "entrega-acesso",
  "responseMode": "responseNode",
  "options": {
    "ignoreBots": false
  }
},
    position: [0,272]
  },
  output: [
  {
    "body": {}
  }
]
});

const monta = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: "Monta a mensagem",
    parameters: {
  "jsCode": "const PRODUTOS_FISICOS = ['6667092', '5974989'];\nconst WABA_ID = '1312217107345989';\nconst AGENT_ID = 'cmr7uw00e03st8flyqmtj7cq4';\nconst ZAPI_INSTANCE = '3E17AF797E59E04724E20293E183E9A4';\nconst REMETENTE = 'acesso@ocorpodiz.com.br';\nconst CRM_SCENARIO_ID = 'cmtcd945j04r2n0dz3uwb90it';\nconst CRM_STEP_INDEX = 0;\nconst IDIOMA_PADRAO = 'pt';\n\n// Os nove templates aprovados na Meta. Nome + idioma e a chave la: o mesmo nome\n// em outro idioma e outro template, e nome que nao existe volta erro 500.\nconst TEMPLATES = {\n  pt: {\n    lang: 'pt_BR',\n    compra: 'confirmar_compra_pt',\n    livro_fisico: 'confir_compra_livro_fisico',\n    sem_token: 'acesso_liberado_pt'\n  },\n  es: {\n    lang: 'es_ES',\n    compra: 'confirmar_compra_es2',\n    livro_fisico: 'confir_compra_livro_fisico_es',\n    sem_token: 'acesso_liberado_es'\n  },\n  en: {\n    lang: 'en_US',\n    compra: 'confirmar_compra_en2',\n    livro_fisico: 'confir_compra_livro_fisico_en',\n    sem_token: 'acesso_liberado_en'\n  }\n};\n\nconst DDI_IDIOMA = [\n  ['351', 'pt'],\n  ['55', 'pt'],\n  ['34', 'es'],\n  ['51', 'es'],\n  ['52', 'es'],\n  ['54', 'es'],\n  ['56', 'es'],\n  ['57', 'es'],\n  ['44', 'en'],\n  ['1', 'en']\n];\n\nfunction soDigitos(v) {\n  if (v === null || v === undefined) return '';\n  return String(v).replace(/\\D/g, '');\n}\n\n// O app ja manda o telefone com DDI (montarTelefone, em src/lib/phone.ts). A regra\n// de 10/11 digitos aqui e so para o reenvio do atendimento, que manda o whatsapp\n// gravado no cadastro sem passar por essa normalizacao.\nfunction comDdi(telefone) {\n  const d = soDigitos(telefone);\n  if (!d) return '';\n  if (d.length === 10 || d.length === 11) return '55' + d;\n  return d;\n}\n\nfunction juntaNomes(nomes) {\n  if (nomes.length === 0) return 'seu produto';\n  if (nomes.length === 1) return nomes[0];\n  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];\n}\n\nfunction idiomaDoTelefone(telefoneDdi) {\n  for (const par of DDI_IDIOMA) {\n    if (telefoneDdi.indexOf(par[0]) === 0 && TEMPLATES[par[1]]) return par[1];\n  }\n  return IDIOMA_PADRAO;\n}\n\nfunction sufixoComToken(corpo) {\n  if (corpo.access_link_button_value) return String(corpo.access_link_button_value);\n  const bruto = String(corpo.access_link || '');\n  const i = bruto.indexOf('?');\n  return i === -1 ? '' : bruto.slice(i);\n}\n\nfunction caminhoDestino(corpo) {\n  if (corpo.destination_path) return String(corpo.destination_path);\n  const url = String(corpo.destination_url || '');\n  const semProtocolo = url.replace('https://', '').replace('http://', '');\n  const barra = semProtocolo.indexOf('/');\n  if (barra === -1) return '/biblioteca';\n  const caminho = semProtocolo.slice(barra).split('?')[0].split('#')[0];\n  return caminho || '/biblioteca';\n}\n\nconst saida = [];\n\nfor (const item of $input.all()) {\n  const corpo = item.json.body || item.json;\n\n  const nomeCompleto = String(corpo.nome || '').trim();\n  const primeiroNome = nomeCompleto ? nomeCompleto.split(/\\s+/)[0] : 'tudo bem';\n  const listaProdutos = Array.isArray(corpo.products_granted) ? corpo.products_granted : [];\n  const titulos = [];\n  for (const p of listaProdutos) {\n    const t = String(p && p.title ? p.title : '').trim();\n    if (t) titulos.push(t);\n  }\n  const link = corpo.access_link || corpo.destination_url || 'https://mediz.app';\n  const telefoneDdi = comDdi(corpo.telefone);\n  const kind = corpo.kind || 'new_account';\n  const jaTemConta = kind === 'products_added';\n  const idExterno = soDigitos(corpo.external_product_id);\n\n  let livroFisico;\n  if (corpo.physical_shipment === true || corpo.physical_shipment === false) {\n    livroFisico = corpo.physical_shipment;\n  } else {\n    livroFisico = PRODUTOS_FISICOS.indexOf(idExterno) !== -1;\n  }\n\n  // Livro impresso nao lista os bonus: a pessoa comprou o livro, e e o livro que\n  // vai chegar. O bonus ela encontra na biblioteca. O app manda o nome pronto em\n  // main_product_title; sem ele, cai na lista completa.\n  const nomeDoLivro = String(corpo.main_product_title || '').trim();\n  const produtos = nomeDoLivro || juntaNomes(titulos);\n\n  const idioma = idiomaDoTelefone(telefoneDdi);\n  const tpl = TEMPLATES[idioma];\n  const sufixo = sufixoComToken(corpo);\n\n  let templateName;\n  let botaoValor;\n\n  if (!sufixo) {\n    // Quem ja tem conta nao recebe token: entra com a propria senha.\n    //\n    // O botao dos nove templates tem base fixa em https://mediz.app/acesso e a\n    // Meta so concatena o que vai aqui. Entao o valor precisa ser query, nunca\n    // caminho: '/biblioteca' viraria /acesso/biblioteca, que e 404. A pagina\n    // /acesso sem token redireciona para o login levando o next.\n    templateName = tpl.sem_token;\n    botaoValor = '?next=' + encodeURIComponent(caminhoDestino(corpo));\n  } else if (livroFisico) {\n    templateName = tpl.livro_fisico;\n    botaoValor = sufixo;\n  } else {\n    templateName = tpl.compra;\n    botaoValor = sufixo;\n  }\n\n  let texto;\n  let assunto;\n  let chamada;\n\n  if (jaTemConta) {\n    assunto = 'Liberamos ' + produtos + ' no seu acesso';\n    chamada = 'Já está liberado na sua conta';\n    texto = 'Oi, ' + primeiroNome + '! Aline aqui, da Universidade de Terapias 💜\\n\\n'\n      + 'Sua compra de *' + produtos + '* foi confirmada e eu já liberei no seu acesso da meDIZ.\\n\\n'\n      + 'Você entra com o mesmo e-mail e a mesma senha de sempre. É só abrir por aqui:\\n'\n      + link + '\\n\\n'\n      + 'Se não lembrar a senha, me chama que eu te ajudo 💛';\n  } else if (livroFisico) {\n    assunto = 'Seu acesso a ' + produtos + ' está liberado';\n    chamada = 'Comece a ler antes mesmo do livro chegar';\n    texto = 'Oi, ' + primeiroNome + '! Aline aqui, da Universidade de Terapias 💜\\n\\n'\n      + 'Sua compra de *' + produtos + '* está confirmada!\\n\\n'\n      + '📦 Seu livro impresso vai ser despachado e, assim que a transportadora gerar o código de rastreio, eu volto aqui para te passar.\\n\\n'\n      + 'E você não precisa esperar o livro chegar: a versão digital já está liberada. É só abrir este link:\\n'\n      + link + '\\n\\n'\n      + 'Ele já te reconhece, você não digita senha nenhuma. Escolhe a sua na hora de entrar.\\n\\n'\n      + 'O link vale por 7 dias 💛';\n  } else {\n    assunto = 'Seu acesso a ' + produtos + ' está liberado';\n    chamada = 'Seu acesso já está liberado';\n    texto = 'Oi, ' + primeiroNome + '! Aline aqui, da Universidade de Terapias 💜\\n\\n'\n      + 'Sua compra de *' + produtos + '* está confirmada e o acesso já está liberado.\\n\\n'\n      + 'É só abrir este link:\\n' + link + '\\n\\n'\n      + 'Ele já te reconhece, você não digita senha nenhuma. Escolhe a sua ao entrar e o material já vai estar te esperando.\\n\\n'\n      + 'O link vale por 7 dias. Qualquer dúvida, é só me chamar por aqui 💛';\n  }\n\n  const corpoTemplate = {\n    to: telefoneDdi,\n    agentId: AGENT_ID,\n    templateName: templateName,\n    templateLangCode: tpl.lang,\n    text: 'Entrega de acesso — ' + produtos,\n    var_1: primeiroNome,\n    var_2: produtos,\n    buttons: [{ type: 'url', value: botaoValor, index: 0 }]\n  };\n\n  saida.push({\n    json: {\n      kind: kind,\n      email: corpo.email || '',\n      nome_completo: nomeCompleto,\n      primeiro_nome: primeiroNome,\n      produtos: produtos,\n      link: link,\n      telefone_ddi: telefoneDdi,\n      livro_fisico: livroFisico,\n      ja_tem_conta: jaTemConta,\n      rotulo_botao: jaTemConta ? 'Abrir meu acesso' : 'Entrar agora',\n      transaction_id: corpo.transaction_id || null,\n      provider: corpo.provider || null,\n      external_product_id: idExterno,\n      texto_whatsapp: texto,\n      assunto_email: assunto,\n      chamada_email: chamada,\n      idioma: idioma,\n      template_name: templateName,\n      template_lang: tpl.lang,\n      botao_valor: botaoValor,\n      corpo_template: corpoTemplate,\n      waba_id: WABA_ID,\n      agent_id: AGENT_ID,\n      zapi_instance: ZAPI_INSTANCE,\n      remetente: REMETENTE,\n      crm_scenario_id: CRM_SCENARIO_ID,\n      crm_step_index: CRM_STEP_INDEX\n    }\n  });\n}\n\nreturn saida;\n"
},
    position: [224,272]
  }
});

const confirma = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: "Confirma recebimento",
    parameters: {
  "respondWith": "json",
  "responseBody": expr("{{ { \"ok\": true, \"transaction_id\": $json.transaction_id } }}"),
  "options": {}
},
    position: [448,80]
  }
});

const temWhats = ifElse({
  version: 2.3,
  config: {
    name: "Tem WhatsApp?",
    parameters: {
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "strict",
      "version": 3
    },
    "conditions": [
      {
        "id": "tem-telefone",
        "leftValue": expr("{{ $json.telefone_ddi }}"),
        "rightValue": "",
        "operator": {
          "type": "string",
          "operation": "notEmpty",
          "singleValue": true
        }
      }
    ],
    "combinator": "and"
  },
  "options": {}
},
    position: [448,272]
  }
});

const envia = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Envia pela API oficial (template)",
    parameters: {
  "method": "POST",
  "url": "https://mediz.app/api/mensagens/enviar",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ fluxo: \"entrega_acesso\", chave: \"entrega_acesso:\" + (($(\"Entrega meDIZ\").item.json.body || {}).delivery_id || (\"sem-id:\" + $execution.id)), userId: ($(\"Entrega meDIZ\").item.json.body || {}).user_id || null, n8nWorkflowId: $workflow.id, n8nExecucaoId: $execution.id, corpo: $json.corpo_template }) }}"),
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 30000
  }
},
    credentials: { httpHeaderAuth: newCredential('meDIZ API — Webhook Bearer') },
    onError: 'continueRegularOutput',
    position: [672,176]
  }
});

const saiu = ifElse({
  version: 2.2,
  config: {
    name: "Saiu?",
    parameters: {
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "loose",
      "version": 2
    },
    "conditions": [
      {
        "id": "enviado",
        "leftValue": expr("{{ $json.status }}"),
        "rightValue": "enviado",
        "operator": {
          "type": "string",
          "operation": "equals"
        }
      },
      {
        "id": "ja-enviado",
        "leftValue": expr("{{ $json.status }}"),
        "rightValue": "ja_enviado",
        "operator": {
          "type": "string",
          "operation": "equals"
        }
      }
    ],
    "combinator": "or"
  },
  "options": {}
},
    position: [896,176]
  }
});

const move = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Move para a etapa do CRM",
    parameters: {
  "method": "POST",
  "url": "https://api.chatvolt.ai/crm/step/conversation",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": expr("{{ JSON.stringify({ conversationId: $json.conversationId || (($json.messages || [])[0] || {}).conversationId || '', scenarioId: $('Monta a mensagem').item.json.crm_scenario_id, stepIndex: $('Monta a mensagem').item.json.crm_step_index }) }}"),
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    }
  }
},
    credentials: { httpHeaderAuth: newCredential('Chatvolt API') },
    onError: 'continueRegularOutput',
    position: [1120,112]
  }
});

const email = node({
  type: 'n8n-nodes-base.emailSend',
  version: 2.1,
  config: {
    name: "Envia o acesso por e-mail",
    parameters: {
  "fromEmail": expr("{{ $json.remetente }}"),
  "toEmail": expr("{{ $json.email }}"),
  "subject": expr("{{ $json.assunto_email }}"),
  "html": expr("<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"></head><body style=\"margin:0;padding:0;background-color:#f2eefc;font-family:Arial,Helvetica,sans-serif;\"><div style=\"display:none;max-height:0;overflow:hidden;opacity:0;\">{{ $json.chamada_email }}</div><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f2eefc;padding:32px 0;\"><tr><td align=\"center\"><table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;\"><tr><td style=\"padding:32px 40px 4px 40px;\"><p style=\"margin:0;font-size:18px;color:#2d1b56;\">Oi, {{ $json.primeiro_nome }}!</p></td></tr><tr><td style=\"padding:4px 40px 0 40px;\"><h1 style=\"margin:0 0 16px 0;font-size:24px;line-height:1.3;color:#2d1b56;\">{{ $json.chamada_email }}</h1><p style=\"margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4458;\">Sua compra de <strong>{{ $json.produtos }}</strong> está confirmada.</p>{{ $json.livro_fisico && !$json.ja_tem_conta ? \"<p style='margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4458;'>Seu livro impresso será despachado e o código de rastreio chega para você pelo WhatsApp. Enquanto isso, a versão digital já está liberada.</p>\" : \"\" }}{{ $json.ja_tem_conta ? \"<p style='margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#4a4458;'>Entre com o mesmo e-mail e a mesma senha de sempre.</p>\" : \"<p style='margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#4a4458;'>O link abaixo já te reconhece, você não precisa digitar senha. Escolhe a sua ao entrar. Ele vale por 7 dias.</p>\" }}</td></tr><tr><td style=\"padding:0 40px 8px 40px;\" align=\"center\"><a href=\"{{ $json.link }}\" style=\"display:inline-block;background-color:#6a3cc8;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:999px;font-size:16px;font-weight:bold;\">{{ $json.rotulo_botao }}</a></td></tr><tr><td style=\"padding:16px 40px 8px 40px;\"><p style=\"margin:0;font-size:13px;line-height:1.6;color:#8a84a0;\">Se o botão não funcionar, copie e cole este endereço no seu navegador:<br>{{ $json.link }}</p></td></tr><tr><td style=\"padding:8px 40px 32px 40px;\"><p style=\"margin:0;font-size:13px;line-height:1.6;color:#8a84a0;\">Precisa de ajuda? É só responder este e-mail.</p></td></tr></table></td></tr></table></body></html>"),
  "options": {
    "appendAttribution": false
  }
},
    credentials: { smtp: newCredential('SMTP Hostinger') },
    onError: 'continueRegularOutput',
    position: [448,464]
  }
});

const zapi = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: "Envia pela Z-API",
    parameters: {
  "method": "POST",
  "url": expr("https://api.chatvolt.ai/zapi/{{ $json.zapi_instance }}/{{ $json.telefone_ddi }}/message"),
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "message",
        "value": expr("{{ $json.texto_whatsapp }}")
      }
    ]
  },
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    }
  }
},
    credentials: { httpHeaderAuth: newCredential('Chatvolt API') },
    onError: 'continueRegularOutput',
    disabled: true,
    position: [672,368]
  }
});

const nota1 = sticky("## Entrada única\n\nA meDIZ chama este webhook depois de registrar a venda e liberar o produto no banco.\n\nO corpo traz kind, email, telefone, products_granted, main_product_title, access_link, access_link_button_value e destination_path.\n\nO telefone já vem com DDI, montado pelo app em src/lib/phone.ts. Comprador de fora do Brasil chega com o DDI do país dele — é isso que faz o template sair no idioma certo.\n\naccess_link_button_value é o sufixo do botão (?token=...&next=...) e só vem em primeiro acesso.", { position: [-816,-112], width: 604, height: 280, color: 4 });

const nota2 = sticky("## Toda a copy mora aqui\n\nO nó de código decide o texto do WhatsApp conforme o caso: primeiro acesso, já tem conta, ou livro físico.\n\nQuem diz se tem despacho é a própria meDIZ, no campo physical_shipment. A lista PRODUTOS_FISICOS só entra em ação se esse campo não vier — é rede de segurança, não a regra.\n\nNo livro impresso a mensagem cita só o livro, nunca os bônus: a pessoa comprou um livro, e é ele que vai chegar pelos Correios. O nome vem pronto no campo main_product_title — o app escolhe pela permissionKey, porque a ordem de products_granted não é confiável.\n\nOs IDs da ChatVolt (WABA, agente, instância Z-API, cenário do CRM) estão nas constantes do topo.", { position: [-816,208], width: 300, height: 460, color: 3 });

const nota3 = sticky("## Canal: API oficial\n\nO envio vai pela API oficial da Meta. A Z-API está desativada e sem ligação de saída — fica parada como plano B.\n\nPara voltar para a Z-API: ative ela, ligue a saída dela no CRM, e desative a API oficial. Nunca as duas — o cliente receberia em duplicidade e a etapa do CRM rodaria duas vezes.\n\nNão basta desativar um nó que está ligado: nó desativado repassa a entrada para a saída, e o CRM dispararia de novo. Por isso a Z-API está sem o fio de saída.\n\n## Qual dos nove templates sai\n\nsem token (já tem conta) -> acesso_liberado_pt / _es / _en\nlivro impresso -> confir_compra_livro_fisico / _es / _en\ndemais -> confirmar_compra_pt / _es2 / _en2\n\nOs nove têm o mesmo formato: var_1 primeiro nome, var_2 produto, e um botão de URL com base fixa em https://mediz.app/acesso.\n\nA Meta só CONCATENA o valor do botão nessa base. Por isso o valor é sempre query (?token=... ou ?next=...) e nunca caminho: /biblioteca viraria /acesso/biblioteca, que é 404.\n\nO idioma vem do DDI do telefone, com fallback pt.", { position: [-496,208], width: 320, height: 640, color: 6 });

const nota4 = sticky("## Depois de enviar, a conversa anda\n\nMover a conversa para a etapa do cenário é o que faz o atendimento da ChatVolt assumir dali em diante.\n\nO conversationId é lido de forma tolerante (messages[0].conversationId ou conversationId na raiz), porque a resposta da API oficial e a da Z-API não têm o mesmo formato.\n\nSe vier vazio, o CRM só não anda: neverError e continueRegularOutput garantem que isso nunca derruba a entrega.", { position: [-816,880], width: 604, height: 232, color: 7 });

const notaPortao = sticky("## Envio pelo portao (Story 6.2, 06/10/2026)\n\nO template sai por POST mediz.app/api/mensagens/enviar com a chave entrega_acesso:<delivery_id>, e nao mais direto no Chatvolt.\n\n- O mesmo aviso tentado de novo (webhook repetido, reprocessamento no admin) tem o mesmo delivery_id: volta ja_enviado sem mandar de novo.\n- O reenvio pedido no atendimento e outro aviso, com outro delivery_id: sai normalmente.\n- So move a etapa do CRM em enviado ou ja_enviado.\n- O e-mail nao passa pelo portao (nao e mensagem paga).", { position: [672, 560], width: 640, height: 280 });

export default workflow('ATlvjuTn4lCVZRSR', 'ENTREGA DE ACESSO [meDIZ]')
  .add(webhook)
  .to(monta)
  .to(confirma)
  .add(monta)
  .to(temWhats.onTrue([envia.to(saiu.onTrue(move)), zapi]))
  .add(monta)
  .to(email)
  .add(nota1)
  .add(nota2)
  .add(nota3)
  .add(nota4)
  .add(notaPortao);
