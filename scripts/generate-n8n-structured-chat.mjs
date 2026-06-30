import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const [, , sourceArg, outputArg] = process.argv
if (!sourceArg || !outputArg) {
  throw new Error('Uso: node scripts/generate-n8n-structured-chat.mjs <origem.json> <saida.json>')
}

const source = JSON.parse(await readFile(resolve(sourceArg), 'utf8'))
const outputPath = resolve(outputArg)

const schemaExample = JSON.stringify(
  {
    version: '2.0',
    agent: 'body',
    status: 'completed',
    messages: [
      { type: 'text', content: 'Primeiro bloco curto e autocontido.' },
      { type: 'text', content: 'Segundo bloco da conversa.' }
    ],
    action: { type: 'none' }
  },
  null,
  2
)

const structuredInstruction = `

FORMATO TECNICO OBRIGATORIO:
- Responda exclusivamente conforme o schema JSON conectado ao Structured Output Parser.
- Use version "2.0" e o agent correspondente a esta rota.
- Divida a resposta em blocos semanticos curtos no array messages, entre 1 e 8 itens.
- Cada item deve ter type "text" e content em Markdown.
- Nao repita titulos ou contexto em todos os blocos.
- Use status "awaiting_confirmation" somente quando a resposta pedir explicitamente para o usuario continuar; caso contrario use "completed".
- Use action.type "share" apenas quando o convite para compartilhar fizer parte da conclusao; caso contrario use "none".
- Nao inclua delays, indices de exibicao nem texto fora do JSON.`

const bodyAgent = source.nodes.find((node) => node.name === 'Agente IA')
const homeAgent = source.nodes.find((node) => node.name === 'Agente IA - Minha Casa')
const respondNode = source.nodes.find((node) => node.name === 'Responde Texto')

if (!bodyAgent || !homeAgent || !respondNode) {
  throw new Error('Workflow de origem nao contem os nodes esperados')
}

for (const agent of [bodyAgent, homeAgent]) {
  agent.parameters.hasOutputParser = true
  agent.parameters.options.systemMessage = `${agent.parameters.options.systemMessage}${structuredInstruction}`
}

const parserBody = {
  parameters: { jsonSchemaExample: schemaExample.replace('"agent": "body"', '"agent": "body"') },
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  typeVersion: 1.3,
  position: [-272, -176],
  id: randomUUID(),
  name: 'Parser estruturado - Meu Corpo'
}

const parserHome = {
  parameters: { jsonSchemaExample: schemaExample.replace('"agent": "body"', '"agent": "home"') },
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  typeVersion: 1.3,
  position: [-48, 128],
  id: randomUUID(),
  name: 'Parser estruturado - Minha Casa'
}

const normalizeCode = `const source = $json.output ?? $json;
let value = source;
if (typeof value === 'string') {
  try { value = JSON.parse(value); } catch { value = null; }
}
const agent = $('Extrai Dados Texto').item.json.agent;
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

const normalizer = {
  parameters: { jsCode: normalizeCode },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [32, 32],
  id: randomUUID(),
  name: 'Normaliza resposta estruturada'
}

source.nodes.push(parserBody, parserHome, normalizer)
source.name = 'Agente IA oficial - mensagens estruturadas v2'
source.active = false

source.connections['Parser estruturado - Meu Corpo'] = {
  ai_outputParser: [[{ node: 'Agente IA', type: 'ai_outputParser', index: 0 }]]
}
source.connections['Parser estruturado - Minha Casa'] = {
  ai_outputParser: [[{ node: 'Agente IA - Minha Casa', type: 'ai_outputParser', index: 0 }]]
}

for (const nodeName of [
  'Agente IA',
  'Agente IA - Minha Casa',
  'Resposta temporÃ¡ria - Meu Pet',
  'Resposta temporária - Meu Pet'
]) {
  if (source.connections[nodeName]?.main?.[0]) {
    source.connections[nodeName].main[0] = [
      { node: normalizer.name, type: 'main', index: 0 }
    ]
  }
}
source.connections[normalizer.name] = {
  main: [[{ node: respondNode.name, type: 'main', index: 0 }]]
}

respondNode.parameters = {
  respondWith: 'json',
  responseBody: '={{ $json }}',
  options: {}
}
respondNode.position = [256, 32]

delete source.id
delete source.versionId
source.meta = { ...(source.meta ?? {}), templateCredsSetupCompleted: false }

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8')
console.log(outputPath)
