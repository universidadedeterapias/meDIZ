import type { CatalogPermissionKey } from '@prisma/client'
import type { LanguageCode } from '@/i18n/config'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { fetchOriginalPdfBytes } from '@/lib/library/fetch-pdf-bytes'
import { logPdfDownload } from '@/lib/library/pdf-download-limits'
import {
  applyPdfWatermark,
  formatCpfForDisplay,
  resolveDisplayName
} from '@/lib/library/watermark-pdf'
import { isCacheFresh, writeCacheAtomically } from '@/lib/library/pdf-download-cache'
import {
  assertPdfSourceSize,
  withPdfGenerationSlot
} from '@/lib/library/pdf-download-concurrency'

/**
 * Preparo da copia licenciada, separado do momento de baixar.
 *
 * Marcar 180 paginas leva ~11s mesmo com o PDF ja otimizado — o custo do pdf-lib
 * vem do numero de paginas e objetos, nao do tamanho do arquivo. Fazer isso
 * DENTRO do request de download significa 11 segundos sem um byte trafegando, e e
 * ai que o navegador do celular e as proxies desistem.
 *
 * Aqui o preparo comeca quando a pessoa clica, e o download so acontece quando o
 * arquivo ja existe em cache. Assim o request de download vira uma transferencia
 * comum: comeca na hora, mostra progresso, e o proprio navegador retoma se a rede
 * cair.
 */

export type PedidoDeGeracao = {
  userId: string
  cacheKey: string
  productId: string
  permissionKey: CatalogPermissionKey
  mediaFileName: string | null
  downloadTitle: string
  locale: LanguageCode
  clientIp?: string | null
  userAgent?: string | null
}

export type EstadoDoPreparo = 'pronto' | 'preparando' | 'ausente' | 'falhou'

type EmAndamento = {
  promessa: Promise<void>
  iniciadoEm: number
  erro?: string
}

/**
 * Um preparo por chave de cache, neste processo.
 *
 * Sem isso, dois cliques (ou duas abas) na mesma copia disparam duas geracoes do
 * mesmo arquivo — e cada uma segura um slot do semaforo e ~300 MB de RSS. O mapa
 * e por processo, o que basta: a replica e unica, e mesmo com varias o pior caso
 * volta a ser o de hoje, nunca pior.
 */
const emAndamento = new Map<string, EmAndamento>()

/** Preparo que passa disso esta travado, e segurar a chave impede a proxima tentativa. */
const LIMITE_DE_PREPARO_MS = 5 * 60 * 1000

/** Ha uma geracao viva para esta chave — nem concluida, nem falhada, nem travada. */
function emPreparo(cacheKey: string): boolean {
  const atual = emAndamento.get(cacheKey)
  if (!atual || atual.erro) return false
  return Date.now() - atual.iniciadoEm < LIMITE_DE_PREPARO_MS
}

export async function geraCopiaLicenciada(pedido: PedidoDeGeracao): Promise<void> {
  const dbUser = await prisma.user.findUnique({
    where: { id: pedido.userId },
    select: { fullName: true, name: true, email: true, cpf: true }
  })
  if (!dbUser) throw new Error('USER_NOT_FOUND')

  const bytes = await withPdfGenerationSlot(async () => {
    const originalBytes = await fetchOriginalPdfBytes(
      pedido.permissionKey,
      pedido.mediaFileName,
      pedido.locale
    )
    assertPdfSourceSize(originalBytes.length)

    const startedAt = Date.now()
    const rssBefore = process.memoryUsage().rss
    const result = await applyPdfWatermark(
      originalBytes,
      {
        fullName: resolveDisplayName(dbUser.fullName, dbUser.name, dbUser.email),
        email: dbUser.email,
        cpf: formatCpfForDisplay(dbUser.cpf)
      },
      pedido.downloadTitle
    )
    logger.info(
      `watermark ${pedido.productId} · ${Math.round(originalBytes.length / 1024 / 1024)}MB · ` +
        `${Date.now() - startedAt}ms · rss ${Math.round(rssBefore / 1024 / 1024)}->` +
        `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      '[library/download]'
    )
    return result
  })

  await writeCacheAtomically(pedido.cacheKey, bytes)

  await logPdfDownload({
    userId: pedido.userId,
    productId: pedido.productId,
    fileLabel: pedido.downloadTitle,
    clientIp: pedido.clientIp,
    userAgent: pedido.userAgent
  })
}

/**
 * Comeca (ou reaproveita) o preparo sem esperar por ele.
 *
 * Devolve o estado imediato, para quem chamou saber se ja da para baixar.
 */
export async function iniciaPreparo(
  pedido: PedidoDeGeracao
): Promise<EstadoDoPreparo> {
  // A checagem do mapa vem ANTES do primeiro await de proposito. `isCacheFresh`
  // toca o disco, e dois cliques que chegam juntos parariam os dois nesse await,
  // veriam o mapa vazio e comecariam duas geracoes do mesmo arquivo — cada uma
  // segurando um slot do semaforo e ~300 MB.
  if (emPreparo(pedido.cacheKey)) return 'preparando'

  if (await isCacheFresh(pedido.cacheKey)) return 'pronto'

  // Refaz a checagem depois do await: outro pedido pode ter comecado enquanto o
  // disco respondia. Daqui ate o `set` so roda codigo sincrono, entao a janela
  // fecha.
  if (emPreparo(pedido.cacheKey)) return 'preparando'

  // Tentativa que falhou nao fica travando a proxima: quem clica de novo esta
  // pedindo justamente para tentar outra vez.
  emAndamento.delete(pedido.cacheKey)

  const registro: EmAndamento = {
    iniciadoEm: Date.now(),
    promessa: Promise.resolve()
  }

  registro.promessa = geraCopiaLicenciada(pedido)
    .then(() => {
      // Some do mapa no sucesso: daqui pra frente quem responde e o cache, e uma
      // entrada parada aqui so atrapalharia a proxima geracao depois do TTL.
      emAndamento.delete(pedido.cacheKey)
    })
    .catch((error: unknown) => {
      const motivo = error instanceof Error ? error.message : 'FALHA_DESCONHECIDA'
      // O erro fica guardado para a consulta de estado poder dize-lo. Some na
      // proxima tentativa, que e o clique seguinte da pessoa.
      registro.erro = motivo
      logger.error(
        `Falha ao preparar a copia licenciada de ${pedido.productId}`,
        error instanceof Error ? error : undefined,
        '[library/download]'
      )
    })

  emAndamento.set(pedido.cacheKey, registro)
  return 'preparando'
}

/** Estado atual, sem comecar nada. */
export async function consultaPreparo(
  cacheKey: string
): Promise<{ estado: EstadoDoPreparo; erro?: string }> {
  if (await isCacheFresh(cacheKey)) return { estado: 'pronto' }

  const atual = emAndamento.get(cacheKey)
  if (!atual) return { estado: 'ausente' }
  if (atual.erro) return { estado: 'falhou', erro: atual.erro }
  if (Date.now() - atual.iniciadoEm >= LIMITE_DE_PREPARO_MS) {
    return { estado: 'falhou', erro: 'PREPARO_EXPIROU' }
  }
  return { estado: 'preparando' }
}

/**
 * Espera o arquivo ficar pronto, gerando se preciso.
 *
 * E o caminho de excecao: a rota de download usa isto quando o cache sumiu entre
 * o preparo e o clique (limpeza por TTL, reinicio do container). Sem ele o
 * usuario receberia erro por um arquivo que ele acabou de ver como pronto.
 */
export async function garantePreparo(pedido: PedidoDeGeracao): Promise<void> {
  if (await isCacheFresh(pedido.cacheKey)) return

  const atual = emAndamento.get(pedido.cacheKey)
  if (atual && emPreparo(pedido.cacheKey)) {
    // Ja tem alguem marcando este mesmo arquivo: esperar e mais barato que
    // gerar de novo, e o `promessa` nunca rejeita (o catch dela guarda o erro).
    await atual.promessa
    if (await isCacheFresh(pedido.cacheKey)) return
  }

  await geraCopiaLicenciada(pedido)
}
