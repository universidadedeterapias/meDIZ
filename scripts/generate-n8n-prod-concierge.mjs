import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const [, , sourceArg, templateArg, outputArg] = process.argv
if (!sourceArg || !templateArg || !outputArg) {
  throw new Error(
    'Uso: node scripts/generate-n8n-prod-concierge.mjs <producao.json> <template-v3.json> <saida.json>'
  )
}

const source = JSON.parse(await readFile(resolve(sourceArg), 'utf8'))
const template = JSON.parse(await readFile(resolve(templateArg), 'utf8'))
const outputPath = resolve(outputArg)

const get = (workflow, name) => workflow.nodes.find((node) => node.name === name)
const webhook = get(source, 'IA mediz')
const extract = get(source, 'Extrai Dados Texto')
const bodyAgent = get(source, 'Agente IA')
const model = get(source, 'OpenAI Model')
const memory = get(source, 'Memória')
const respond = get(source, 'Responde Texto')
const templateHome = get(template, 'Agente IA - Minha Casa')
const templatePorter = get(template, 'Agente Porteiro')
const templatePorterParser = get(template, 'Parser - Rota do Porteiro')
const templatePorterNormalizer = get(
  template,
  'Normaliza resposta do porteiro'
)

if (
  !webhook ||
  !extract ||
  !bodyAgent ||
  !model ||
  !memory ||
  !respond ||
  !templateHome ||
  !templatePorter ||
  !templatePorterParser ||
  !templatePorterNormalizer
) {
  throw new Error('Workflow de producao ou template nao contem os nodes esperados')
}

const cloneNode = (node, name, position) => ({
  ...JSON.parse(JSON.stringify(node)),
  id: randomUUID(),
  name,
  position
})

extract.parameters = {
  assignments: {
    assignments: [
      {
        id: randomUUID(),
        name: 'message',
        value: "={{ $json.body.message || $json.body.sintoma || '' }}",
        type: 'string'
      },
      {
        id: randomUUID(),
        name: 'threadId',
        value: '={{ $json.body.threadId || $json.body.sessionId || $execution.id }}',
        type: 'string'
      },
      {
        id: randomUUID(),
        name: 'agent',
        value:
          "={{ ['concierge', 'body', 'home', 'pet'].includes(($json.body.agent || 'concierge').toLowerCase()) ? ($json.body.agent || 'concierge').toLowerCase() : 'concierge' }}",
        type: 'string'
      },
      {
        id: randomUUID(),
        name: 'language',
        value: "={{ $json.body.language || $json.body.locale || 'pt-BR' }}",
        type: 'string'
      },
      {
        id: randomUUID(),
        name: 'routingState',
        value: '={{ $json.body.routingState || {} }}',
        type: 'object'
      },
      {
        id: randomUUID(),
        name: 'conciergeEntryPoint',
        value: "={{ $json.body.conciergeEntryPoint || 'free' }}",
        type: 'string'
      }
    ]
  },
  options: {}
}
extract.position = [-2240, 688]

const structuredInstruction = `

FORMATO TECNICO OBRIGATORIO:
- Responda exclusivamente conforme o schema JSON conectado ao Structured Output Parser.
- Use version "2.0" e o agent correspondente a esta rota.
- Divida naturalmente a resposta entre 1 e 8 mensagens curtas no array messages.
- Cada item deve ter type "text" e content em Markdown.
- Use status "awaiting_confirmation" apenas quando pedir para continuar.
- Nao inclua texto fora do JSON.`

bodyAgent.parameters.text = "={{ $('Extrai Dados Texto').item.json.message }}"
if (!bodyAgent.parameters.options.systemMessage.includes('FORMATO TECNICO OBRIGATORIO')) {
  bodyAgent.parameters.options.systemMessage += structuredInstruction
}
bodyAgent.parameters.hasOutputParser = true
bodyAgent.position = [-1216, 464]

const homeAgent = cloneNode(templateHome, 'Agente IA - Minha Casa', [-1216, 688])
homeAgent.parameters.text = "={{ $('Extrai Dados Texto').item.json.message }}"

const petResponse = {
  parameters: {
    assignments: {
      assignments: [
        {
          id: randomUUID(),
          name: 'output',
          value:
            'O agente **meDIZ! Meu Pet** está sendo preparado. Por enquanto, escolha Meu Corpo ou Minha Casa para continuar.',
          type: 'string'
        }
      ]
    },
    options: {}
  },
  type: 'n8n-nodes-base.set',
  typeVersion: 3.4,
  position: [-1216, 912],
  id: randomUUID(),
  name: 'Resposta temporária - Meu Pet'
}

const porter = cloneNode(templatePorter, 'Agente Porteiro', [-1536, 1120])
const porterParser = cloneNode(
  templatePorterParser,
  'Parser - Rota do Porteiro',
  [-1408, 1312]
)
const porterNormalizer = cloneNode(
  templatePorterNormalizer,
  'Normaliza resposta do porteiro',
  [-1216, 1120]
)

const schemaExample = (agent) =>
  JSON.stringify(
    {
      version: '2.0',
      agent,
      status: 'completed',
      messages: [{ type: 'text', content: 'Resposta em formato de conversa.' }],
      action: { type: 'none' }
    },
    null,
    2
  )

const bodyParser = {
  parameters: { jsonSchemaExample: schemaExample('body') },
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  typeVersion: 1.3,
  position: [-1088, 304],
  id: randomUUID(),
  name: 'Parser estruturado - Meu Corpo'
}
const homeParser = {
  ...bodyParser,
  parameters: { jsonSchemaExample: schemaExample('home') },
  position: [-928, 816],
  id: randomUUID(),
  name: 'Parser estruturado - Minha Casa'
}

const entryRouter = {
  parameters: {
    rules: {
      values: ['body', 'home', 'pet', 'concierge'].map((agent) => ({
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
              rightValue: agent,
              operator: { type: 'string', operation: 'equals' }
            }
          ],
          combinator: 'and'
        },
        renameOutput: true,
        outputKey: agent
      }))
    },
    options: {}
  },
  type: 'n8n-nodes-base.switch',
  typeVersion: 3.2,
  position: [-1984, 688],
  id: randomUUID(),
  name: 'Entrada direta ou porteiro'
}

const directResolver = {
  parameters: {
    jsCode: `return items.map((item) => ({
  json: { ...item.json, resolvedAgent: item.json.agent }
}));`
  },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [-1760, 576],
  id: randomUUID(),
  name: 'Define agente direto'
}

const specialistRouter = JSON.parse(JSON.stringify(entryRouter))
specialistRouter.id = randomUUID()
specialistRouter.name = 'Roteador especialista'
specialistRouter.position = [-1504, 688]
specialistRouter.parameters.rules.values = specialistRouter.parameters.rules.values
  .slice(0, 3)
  .map((rule) => {
    rule.conditions.conditions[0].id = randomUUID()
    rule.conditions.conditions[0].leftValue = '={{ $json.resolvedAgent }}'
    return rule
  })

const normalizer = {
  parameters: {
    jsCode: `const source = $json.output ?? $json;
let value = source;
if (typeof value === 'string') {
  try { value = JSON.parse(value); } catch { value = null; }
}
const agent = $('Roteador especialista').item.json.resolvedAgent;
if (value?.version === '2.0' && Array.isArray(value.messages) && value.messages.length) {
  return [{ json: { ...value, agent } }];
}
const legacy = typeof source === 'string'
  ? source.trim()
  : (source?.content || source?.message || 'Nao foi possivel gerar uma resposta.');
return [{ json: {
  version: '2.0', agent, status: 'completed',
  messages: [{ type: 'text', content: legacy }], action: { type: 'none' }
} }];`
  },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [-960, 688],
  id: randomUUID(),
  name: 'Normaliza resposta estruturada'
}

source.nodes.push(
  homeAgent,
  petResponse,
  porter,
  porterParser,
  porterNormalizer,
  bodyParser,
  homeParser,
  entryRouter,
  directResolver,
  specialistRouter,
  normalizer
)

source.connections[webhook.name] = {
  main: [[{ node: extract.name, type: 'main', index: 0 }]]
}
source.connections[extract.name] = {
  main: [[{ node: entryRouter.name, type: 'main', index: 0 }]]
}
source.connections[entryRouter.name] = {
  main: [
    [{ node: directResolver.name, type: 'main', index: 0 }],
    [{ node: directResolver.name, type: 'main', index: 0 }],
    [{ node: directResolver.name, type: 'main', index: 0 }],
    [{ node: porter.name, type: 'main', index: 0 }]
  ]
}
source.connections[directResolver.name] = {
  main: [[{ node: specialistRouter.name, type: 'main', index: 0 }]]
}
source.connections[specialistRouter.name] = {
  main: [
    [{ node: bodyAgent.name, type: 'main', index: 0 }],
    [{ node: homeAgent.name, type: 'main', index: 0 }],
    [{ node: petResponse.name, type: 'main', index: 0 }]
  ]
}
source.connections[bodyAgent.name] = {
  main: [[{ node: normalizer.name, type: 'main', index: 0 }]]
}
source.connections[homeAgent.name] = {
  main: [[{ node: normalizer.name, type: 'main', index: 0 }]]
}
source.connections[petResponse.name] = {
  main: [[{ node: normalizer.name, type: 'main', index: 0 }]]
}
source.connections[normalizer.name] = {
  main: [[{ node: respond.name, type: 'main', index: 0 }]]
}
source.connections[porter.name] = {
  main: [[{ node: porterNormalizer.name, type: 'main', index: 0 }]]
}
source.connections[porterNormalizer.name] = {
  main: [[{ node: respond.name, type: 'main', index: 0 }]]
}
source.connections[bodyParser.name] = {
  ai_outputParser: [[{ node: bodyAgent.name, type: 'ai_outputParser', index: 0 }]]
}
source.connections[homeParser.name] = {
  ai_outputParser: [[{ node: homeAgent.name, type: 'ai_outputParser', index: 0 }]]
}
source.connections[porterParser.name] = {
  ai_outputParser: [[{ node: porter.name, type: 'ai_outputParser', index: 0 }]]
}
source.connections[model.name] = {
  ai_languageModel: [
    [
      { node: bodyAgent.name, type: 'ai_languageModel', index: 0 },
      { node: homeAgent.name, type: 'ai_languageModel', index: 0 },
      { node: porter.name, type: 'ai_languageModel', index: 0 }
    ]
  ]
}
memory.parameters.sessionKey =
  "={{ $('Extrai Dados Texto').item.json.threadId + ':' + $('Extrai Dados Texto').item.json.agent }}"
source.connections[memory.name] = {
  ai_memory: [
    [
      { node: bodyAgent.name, type: 'ai_memory', index: 0 },
      { node: homeAgent.name, type: 'ai_memory', index: 0 },
      { node: porter.name, type: 'ai_memory', index: 0 }
    ]
  ]
}
respond.parameters = {
  respondWith: 'json',
  responseBody: '={{ $json }}',
  options: {}
}

source.name = 'RAG — O Corpo Diz + agentes e porteiro v3'
source.active = false
delete source.id
delete source.versionId
source.meta = { ...(source.meta ?? {}), templateCredsSetupCompleted: false }

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8')
console.log(outputPath)
