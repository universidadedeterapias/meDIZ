/**
 * Leitura do pedido de exclusao de conversas (src/lib/conversational-chat/apagar-conversas.ts).
 * Sem banco: so a parte que decide o que apagar.
 *
 *   npx tsx src/scripts/test-apagar-conversas.ts
 */
import { lerPedidoDeExclusao } from '@/lib/conversational-chat/apagar-conversas'

let falhas = 0
function caso(nome: string, query: string, esperado: unknown) {
  const obtido = lerPedidoDeExclusao(new URLSearchParams(query))
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(`  ${ok ? 'ok    ' : 'FALHOU'} ${nome}${ok ? '' : `\n         veio ${JSON.stringify(obtido)}`}`)
}

console.log('\nPedido de exclusao\n')
caso('uma conversa pelo threadId', 'threadId=%20abc%20', { tipo: 'uma', threadId: 'abc' })
caso('threadId vence o todas', 'threadId=abc&todas=1&chatKind=SEARCH', { tipo: 'uma', threadId: 'abc' })
caso('todas de pesquisa e chat', 'todas=1&chatKind=SEARCH,SYMPTOM_SEARCH', { tipo: 'todas', chatKinds: ['SEARCH', 'SYMPTOM_SEARCH'] })
caso('tipo repetido conta uma vez', 'todas=1&chatKind=PROF,PROF', { tipo: 'todas', chatKinds: ['PROF'] })
caso('todas sem tipo e recusado', 'todas=1', { erro: 'chatKind obrigatório' })
caso('tipo desconhecido e recusado', 'todas=1&chatKind=SEARCH,TUDO', { erro: 'chatKind inválido' })
caso('sem nada e recusado', '', { erro: 'threadId obrigatório' })

console.log(falhas ? `\n${falhas} falha(s)` : '\ntodos passaram')
process.exit(falhas ? 1 : 0)
