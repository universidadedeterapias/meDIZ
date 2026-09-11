import { prisma } from '@/lib/prisma'
import { grantPurchaseAccess } from '@/lib/purchases/grant-purchase'
import type { LinhaPreview } from './preview'

/**
 * Aplica de fato uma importação já revisada: cria/casa a conta, registra a
 * compra histórica, opcionalmente concede o produto, e marca todo mundo com a
 * tag do lote.
 *
 * Nunca dispara aviso — `grantPurchaseAccess` não chama `deliverAccess` em
 * lugar nenhum; quem manda mensagem, se algum dia mandar, é uma onda de
 * reativação criada depois, revisada à parte.
 */

export type AplicarImportacaoInput = {
  nomeArquivo: string
  catalogProductId: string
  concedeAcesso: boolean
  linhas: LinhaPreview[]
  criadoPor: string
}

export type AplicarImportacaoResultado = {
  importacaoId: string
  tagId: string
  totalLinhas: number
  criados: number
  casados: number
  /** Dentro de `casados`: quantas vezes a conta foi achada por CPF ou telefone
   *  (não pelo e-mail da própria linha) — é a contagem de duplicidade evitada. */
  casadosPorCpfOuTelefone: number
  ignorados: number
  erros: { indice: number; email: string | null; motivo: string }[]
}

export async function aplicarImportacao(
  input: AplicarImportacaoInput
): Promise<AplicarImportacaoResultado> {
  const produto = await prisma.catalogProduct.findUnique({
    where: { id: input.catalogProductId },
    select: { id: true, title: true }
  })
  if (!produto) {
    throw new Error('Produto do catálogo não encontrado.')
  }

  const importacao = await prisma.importacaoPlanilha.create({
    data: {
      nomeArquivo: input.nomeArquivo.slice(0, 255),
      catalogProductId: input.catalogProductId,
      concedeAcesso: input.concedeAcesso,
      totalLinhas: input.linhas.length,
      criadoPor: input.criadoPor
    }
  })

  const nomeTag = `Importação · ${new Date().toLocaleDateString('pt-BR')}`
  const tag = await prisma.tag.upsert({
    where: { nome: nomeTag },
    update: {},
    create: { nome: nomeTag, criadoPor: input.criadoPor }
  })

  let criados = 0
  let casados = 0
  let casadosPorCpfOuTelefone = 0
  let ignorados = 0
  const erros: AplicarImportacaoResultado['erros'] = []

  for (const linha of input.linhas) {
    if (!linha.incluida || !linha.email) {
      ignorados += 1
      continue
    }

    const externalTransactionId = `importacao_${importacao.id}_${linha.indice}`

    try {
      // O registro de auditoria guarda o e-mail EXATAMENTE como veio na
      // planilha, mesmo que a linha já tenha sido casada por CPF/telefone com
      // uma conta de e-mail diferente — é o que a linha realmente dizia.
      await prisma.purchaseEvent.create({
        data: {
          provider: 'importacao_planilha',
          eventType: 'importacao',
          externalTransactionId,
          externalProductId: input.catalogProductId,
          externalProductName: produto.title,
          email: linha.email,
          nome: linha.nome,
          telefone: linha.whatsapp,
          cpf: linha.cpf,
          status: 'processed',
          catalogProductId: input.catalogProductId,
          payload: {
            origem: 'importacao_planilha',
            importacaoId: importacao.id,
            linhaOriginal: linha.bruta as object
          },
          createdAt: linha.dataCompra ? new Date(linha.dataCompra) : new Date()
        }
      })

      // A revisão já pode ter descoberto, por CPF ou telefone, que esta linha
      // é de alguém que já tem conta sob OUTRO e-mail. `grantPurchaseAccess`
      // só sabe procurar por e-mail exato — passar o e-mail da linha aqui
      // não acharia essa conta e criaria uma segunda, idêntica. Por isso
      // resolve para o e-mail cadastrado de verdade sempre que
      // `userIdExistente` veio preenchido da revisão.
      let emailParaGrant = linha.email
      if (linha.userIdExistente) {
        const contaExistente = await prisma.user.findUnique({
          where: { id: linha.userIdExistente },
          select: { email: true }
        })
        if (contaExistente && contaExistente.email !== linha.email) {
          emailParaGrant = contaExistente.email
          casadosPorCpfOuTelefone += 1
        }
      }

      const resultado = await grantPurchaseAccess({
        email: emailParaGrant,
        sourceCatalogProductId: input.catalogProductId,
        externalTransactionId,
        source: 'importacao',
        nome: linha.nome,
        cpf: linha.cpf,
        // Explicito sempre: concedeAcesso=false ainda cria/casa a conta, so
        // sem entitlement nenhum — e o mesmo caminho que o livro fisico ja
        // usa para "compra sem liberar nada na tela".
        grantProductIds: input.concedeAcesso ? [input.catalogProductId] : []
      })

      if (resultado.userCreated) criados += 1
      else casados += 1

      await prisma.userTag.upsert({
        where: { tagId_userId: { tagId: tag.id, userId: resultado.userId } },
        update: {},
        create: { tagId: tag.id, userId: resultado.userId, origem: 'importacao', criadoPor: input.criadoPor }
      })
    } catch (e) {
      ignorados += 1
      erros.push({
        indice: linha.indice,
        email: linha.email,
        motivo: e instanceof Error ? e.message : 'erro desconhecido'
      })
    }
  }

  await prisma.importacaoPlanilha.update({
    where: { id: importacao.id },
    data: {
      tagId: tag.id,
      totalCriados: criados,
      totalCasados: casados,
      totalIgnorados: ignorados,
      totalAmbiguos: input.linhas.filter((l) => l.classificacao === 'ambiguo').length,
      concluidoEm: new Date()
    }
  })

  return {
    importacaoId: importacao.id,
    tagId: tag.id,
    totalLinhas: input.linhas.length,
    criados,
    casados,
    casadosPorCpfOuTelefone,
    ignorados,
    erros
  }
}
