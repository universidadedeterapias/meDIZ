import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const [, , sourceArg, outputArg] = process.argv
if (!sourceArg || !outputArg) {
  throw new Error(
    'Uso: node scripts/generate-n8n-concierge-chat.mjs <origem.json> <saida.json>'
  )
}

const source = JSON.parse(await readFile(resolve(sourceArg), 'utf8'))
const outputPath = resolve(outputArg)

const extract = source.nodes.find((node) => node.name === 'Extrai Dados Texto')
const currentRouter = source.nodes.find(
  (node) => node.name === 'Roteador por agente'
)
const model = source.nodes.find((node) => node.name === 'OpenAI Model')
const memory = source.nodes.find((node) => node.name === 'Memória')
const normalizer = source.nodes.find(
  (node) => node.name === 'Normaliza resposta estruturada'
)

if (!extract || !currentRouter || !model || !memory || !normalizer) {
  throw new Error('Workflow de origem nao contem os nodes esperados')
}

const agentAssignment = extract.parameters.assignments.assignments.find(
  (assignment) => assignment.name === 'agent'
)
agentAssignment.value =
  "={{ ['concierge', 'body', 'home', 'pet'].includes(($json.body.agent || 'concierge').toLowerCase()) ? ($json.body.agent || 'concierge').toLowerCase() : 'concierge' }}"
extract.parameters.assignments.assignments.push({
  id: randomUUID(),
  name: 'routingState',
  value: '={{ $json.body.routingState || {} }}',
  type: 'object'
})
extract.parameters.assignments.assignments.push({
  id: randomUUID(),
  name: 'conciergeEntryPoint',
  value: "={{ $json.body.conciergeEntryPoint || 'free' }}",
  type: 'string'
})

currentRouter.name = 'Entrada direta ou porteiro'
currentRouter.position = [-496, 16]
currentRouter.parameters.rules.values.push({
  conditions: {
    options: {
      caseSensitive: false,
      leftValue: '',
      typeValidation: 'strict',
      version: 2
    },
    conditions: [
      {
        id: randomUUID(),
        leftValue: '={{ $json.agent }}',
        rightValue: 'concierge',
        operator: { type: 'string', operation: 'equals' }
      }
    ],
    combinator: 'and'
  },
  renameOutput: true,
  outputKey: 'concierge'
})

const concierge = {
  parameters: {
    promptType: 'define',
    text: `={{ 'ENTRADA: ' + $('Extrai Dados Texto').item.json.conciergeEntryPoint + '\\nMENSAGEM ATUAL: ' + $('Extrai Dados Texto').item.json.message + '\\nESTADO CONTROLADO PELO APP: ' + JSON.stringify($('Extrai Dados Texto').item.json.routingState || {}) }}`,
    options: {
      systemMessage: `Voce e o Porteiro do app meDIZ!, um interprete acolhedor de intencao. Voce nunca encaminha por conta propria: conversa, interpreta, pede confirmacao e devolve estado estruturado para o app decidir.

DESTINOS:
- medizpesquisa: corpo humano, dor, sintoma, doenca ou pesquisa informativa sobre o que a pessoa sente.
- minha_casa: ambiente, lar, objetos, energia ou acontecimentos da casa.
- meu_pet: animal, comportamento ou sintomas do pet.
- meatende: processo pessoal, sentimentos, ansiedade, relacionamento, autoconhecimento ou experiencia guiada [RE]Sentir.
- simulador: terapeuta querendo praticar atendendo um cliente simulado.
- professor: terapeuta querendo orientacao, aprendizado, feedback ou revisar um atendimento realizado.
- indefinido: ainda nao ha informacao suficiente.

REGRAS DE CONVERSA:
- Responda sempre no mesmo idioma da mensagem atual.
- Nao emita saudacao.
- Uma pergunta por vez, frases curtas, tom humano e sem jargao.
- Valide brevemente o sentimento antes de perguntar.
- Nao conduza terapia, nao ensine e nao responda ao tema; apenas esclareca e confirme o destino.
- Descubra primeiro se a pessoa busca ajuda para si ou se e terapeuta querendo treinar/aprender.
- Nunca encaminhe sem confirmacao positiva do usuario.
- Ao identificar um destino, use status awaiting_confirmation, requiresConfirmation=true e shouldRoute=false; pergunte se pode leva-lo ao destino.
- Somente depois de uma confirmacao positiva use status ready_to_route, requiresConfirmation=false e shouldRoute=true.
- Se a confirmacao for negativa, volte a collecting e faca uma pergunta-chave.
- Apos no maximo 3 perguntas sem definicao, use needs_selection, destino indefinido e apresente resumidamente as seis areas para a pessoa escolher. Nao faca uma quarta pergunta.
- O campo clarificationCount deve preservar ou incrementar o questionCount recebido do app, nunca excedendo 3.

GATILHOS ESPECIAIS:
- "estou com dor": primeiro pergunte mais sobre a dor; depois sugira medizpesquisa e confirme.
- "quero pesquisar": primeiro pergunte o tema; depois classifique e confirme.
- "preciso conversar": primeiro pergunte sobre o que; processo pessoal vai para meatende, revisao de atendimento para professor e pratica para simulador.

CONTRATO:
- Retorne exclusivamente um objeto JSON valido, sem bloco Markdown ou texto externo.
- A raiz deve conter version "3.0", agent "concierge", messages e routing.
- Cada item de messages deve conter type "text" e content.
- routing deve conter status, intentSummary, suggestedDestination, confidence, requiresConfirmation, shouldRoute, clarificationCount, detectedLanguage e handoffMessage.
- intentSummary resume o pedido real.
- handoffMessage deve conter contexto suficiente para o agente de destino continuar sem repetir perguntas.
- confidence varia de 0 a 1.
- Nunca marque shouldRoute=true sem confirmacao positiva explicita.`
    },
    hasOutputParser: true
  },
  type: '@n8n/n8n-nodes-langchain.agent',
  typeVersion: 2.2,
  position: [-272, 352],
  id: randomUUID(),
  name: 'Agente Porteiro'
}

const conciergeParser = {
  parameters: {
    jsonSchemaExample: JSON.stringify(
      {
        version: '3.0',
        agent: 'concierge',
        messages: [
          { type: 'text', content: 'Posso te levar para o Meu Corpo?' }
        ],
        routing: {
          status: 'awaiting_confirmation',
          intentSummary: 'Entender uma dor nas costas',
          suggestedDestination: 'medizpesquisa',
          confidence: 0.94,
          requiresConfirmation: true,
          shouldRoute: false,
          clarificationCount: 1,
          detectedLanguage: 'pt-BR',
          handoffMessage: 'A pessoa quer compreender uma dor nas costas.'
        }
      },
      null,
      2
    )
  },
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  typeVersion: 1.3,
  position: [-184, 544],
  id: randomUUID(),
  name: 'Parser - Rota do Porteiro'
}

const conciergeNormalizer = {
  parameters: {
    jsCode: `const source = $json.output ?? $json;
let value = source;
if (typeof value === 'string') {
  const cleaned = value.trim()
    .replace(/^\x60\x60\x60(?:json)?\\s*/i, '')
    .replace(/\\s*\x60\x60\x60$/, '')
    .trim();
  try {
    value = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    try { value = start >= 0 && end > start ? JSON.parse(cleaned.slice(start, end + 1)) : null; }
    catch { value = null; }
  }
}
if (value?.version !== '3.0' || value?.agent !== 'concierge' || !Array.isArray(value?.messages) || !value?.routing) {
  throw new Error('O porteiro retornou um contrato invalido.');
}
return [{ json: value }];`
  },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [-48, 352],
  id: randomUUID(),
  name: 'Normaliza resposta do porteiro'
}

const directResolver = {
  parameters: {
    jsCode: `return items.map((item) => ({
  json: { ...item.json, resolvedAgent: item.json.agent }
}));`
  },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [-272, -176],
  id: randomUUID(),
  name: 'Define agente direto'
}

const specialistRouter = JSON.parse(JSON.stringify(currentRouter))
specialistRouter.id = randomUUID()
specialistRouter.name = 'Roteador especialista'
specialistRouter.position = [176, 16]
specialistRouter.parameters.rules.values = specialistRouter.parameters.rules.values
  .slice(0, 3)
  .map((rule) => ({
    ...rule,
    conditions: {
      ...rule.conditions,
      conditions: rule.conditions.conditions.map((condition) => ({
        ...condition,
        id: randomUUID(),
        leftValue: '={{ $json.resolvedAgent }}'
      }))
    }
  }))

source.nodes.push(
  concierge,
  conciergeParser,
  conciergeNormalizer,
  directResolver,
  specialistRouter
)

delete source.connections['Roteador por agente']
source.connections['Extrai Dados Texto'] = {
  main: [[{ node: currentRouter.name, type: 'main', index: 0 }]]
}
source.connections[currentRouter.name] = {
  main: [
    [{ node: directResolver.name, type: 'main', index: 0 }],
    [{ node: directResolver.name, type: 'main', index: 0 }],
    [{ node: directResolver.name, type: 'main', index: 0 }],
    [{ node: concierge.name, type: 'main', index: 0 }]
  ]
}
source.connections[concierge.name] = {
  main: [[{ node: conciergeNormalizer.name, type: 'main', index: 0 }]]
}
source.connections[conciergeParser.name] = {
  ai_outputParser: [[{ node: concierge.name, type: 'ai_outputParser', index: 0 }]]
}
source.connections[conciergeNormalizer.name] = {
  main: [[{ node: 'Responde Texto', type: 'main', index: 0 }]]
}
source.connections[directResolver.name] = {
  main: [[{ node: specialistRouter.name, type: 'main', index: 0 }]]
}
source.connections[specialistRouter.name] = {
  main: [
    [{ node: 'Agente IA', type: 'main', index: 0 }],
    [{ node: 'Agente IA - Minha Casa', type: 'main', index: 0 }],
    [{ node: 'Resposta temporária - Meu Pet', type: 'main', index: 0 }]
  ]
}

source.connections[model.name].ai_languageModel[0].push({
  node: concierge.name,
  type: 'ai_languageModel',
  index: 0
})

memory.parameters.sessionKey =
  "={{ $('Extrai Dados Texto').item.json.threadId + ':' + $('Extrai Dados Texto').item.json.agent }}"

source.connections[memory.name].ai_memory[0].push({
  node: concierge.name,
  type: 'ai_memory',
  index: 0
})

normalizer.parameters.jsCode = `const source = $json.output ?? $json;
let value = source;
if (typeof value === 'string') {
  try { value = JSON.parse(value); } catch { value = null; }
}
const agent = $('Roteador especialista').item.json.resolvedAgent;
if (value && value.version === '2.0' && Array.isArray(value.messages) && value.messages.length) {
  return [{ json: { ...value, agent } }];
}
const legacy = typeof source === 'string'
  ? source.trim()
  : (source?.content || source?.message || 'Nao foi possivel gerar uma resposta.');
return [{ json: {
  version: '2.0',
  agent,
  status: 'completed',
  messages: [{ type: 'text', content: legacy }],
  action: { type: 'none' }
} }];`

source.name = 'Agente IA oficial - porteiro e roteador v3'
source.active = false
delete source.id
delete source.versionId
source.meta = { ...(source.meta ?? {}), templateCredsSetupCompleted: false }

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8')
console.log(outputPath)
