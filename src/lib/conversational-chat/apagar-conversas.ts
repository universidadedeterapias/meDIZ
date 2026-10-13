import type { ChatKind, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isHistoryChatKind } from '@/lib/conversational-chat/config'

/**
 * O usuario apaga as proprias conversas e pesquisas.
 *
 * Apagar e apagar o conteudo: as mensagens, a memoria do agente no n8n
 * (`n8n_chat_histories`, chaveada pelo threadId), o resumo levado num
 * encaminhamento, o checkpoint ainda nao processado e a resposta guardada em
 * cache a partir desta conversa. Nada do que a pessoa escreveu sobra.
 *
 * A linha da sessao fica, sem texto e com `deletedAt`. Nao e zelo: a cota diaria
 * do plano gratuito conta sessoes criadas hoje — apagar a linha devolveria a
 * pesquisa a quem apagou. As metricas de uso contam pelo mesmo lugar.
 *
 * O sintoma salvo numa pasta continua (a pasta e outra coisa que a pessoa
 * organizou), mas perde o link para a conversa que deixou de existir.
 *
 * Fatos ja extraidos para o ID Vida nao sao tocados: sao perfil, nao historico.
 */

export type PedidoDeExclusao =
  | { tipo: 'uma'; threadId: string }
  | { tipo: 'todas'; chatKinds: ChatKind[] }

/**
 * Le o pedido da query string.
 *
 * `?threadId=...` apaga uma conversa; `?todas=1&chatKind=SEARCH,SYMPTOM_SEARCH`
 * apaga todas as desses tipos. "Todas" sem tipo nao existe de proposito: um
 * botao do historico de pesquisa nao pode levar junto as conversas do PROF.
 */
export function lerPedidoDeExclusao(
  params: URLSearchParams
): PedidoDeExclusao | { erro: string } {
  const threadId = params.get('threadId')?.trim()
  if (threadId) return { tipo: 'uma', threadId }

  if (params.get('todas') !== '1') return { erro: 'threadId obrigatório' }

  const kinds = (params.get('chatKind') ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  if (kinds.length === 0) return { erro: 'chatKind obrigatório' }
  if (!kinds.every(isHistoryChatKind)) return { erro: 'chatKind inválido' }

  return { tipo: 'todas', chatKinds: [...new Set(kinds)] as ChatKind[] }
}

export async function apagarConversas(
  userId: string,
  pedido: PedidoDeExclusao
): Promise<{ apagadas: number }> {
  const where: Prisma.ChatSessionWhereInput = {
    userId,
    deletedAt: null,
    ...(pedido.tipo === 'uma'
      ? { threadId: pedido.threadId }
      : { chatKind: { in: pedido.chatKinds } })
  }

  return prisma.$transaction(async (tx) => {
    const sessoes = await tx.chatSession.findMany({
      where,
      select: { id: true, threadId: true }
    })
    if (sessoes.length === 0) return { apagadas: 0 }

    const ids = sessoes.map((s) => s.id)
    const threadIds = sessoes
      .map((s) => s.threadId)
      .filter((t): t is string => !!t)

    await tx.chatMessage.deleteMany({ where: { chatSessionId: { in: ids } } })
    await tx.chatHandoff.deleteMany({ where: { sourceSessionId: { in: ids } } })
    await tx.conversationEvent.deleteMany({ where: { sessionId: { in: ids } } })

    if (threadIds.length > 0) {
      await tx.n8n_chat_histories.deleteMany({
        where: { session_id: { in: threadIds } }
      })
      await tx.chatAnswerCache.deleteMany({
        where: { sourceThreadId: { in: threadIds } }
      })
      await tx.savedSymptom.updateMany({
        where: { threadId: { in: threadIds }, folder: { userId } },
        data: { threadId: null }
      })
    }

    await tx.chatSession.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        routingIntentSummary: null,
        messageCount: 0,
        lastCheckpointMessageCount: 0,
        isFavorite: false
      }
    })

    return { apagadas: sessoes.length }
  }, { timeout: 30_000 })
}
