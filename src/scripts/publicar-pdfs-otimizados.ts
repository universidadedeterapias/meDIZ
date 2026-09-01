#!/usr/bin/env tsx
/**
 * Publica os PDFs reprocessados no lugar dos originais.
 *
 * Os livros foram exportados pagina a pagina, sem deduplicar recurso nenhum: "O
 * CORPO DIZ" tinha 4.331 imagens e 1.467 arquivos de fonte em 180 paginas, quase
 * todas as imagens em compressao lossless. 147 MB. Reprocessados pelo Ghostscript
 * — deduplicando e recomprimindo, SEM reamostrar — viram 21 MB, com o texto
 * intacto e diferenca media de 0,08 de 255 por pixel.
 *
 * O arquivo antigo NAO e sobrescrito. Sobe com chave nova e o produto passa a
 * apontar para ela; o objeto anterior fica no bucket, e a volta e trocar o campo
 * de novo. Sobrescrever a mesma chave tiraria a rede de seguranca e ainda
 * arriscaria servir copia velha pelo cache da Cloudflare no dominio `pub-*.r2.dev`.
 *
 * IMPORTANTE: a chave do cache local de download nao inclui o arquivo de origem.
 * Quem ja baixou no mes continua recebendo a copia pesada ate o TTL de 48h, a
 * menos que o deploy com `watermarkVersion: 'v2'` (pdf-download-cache.ts) suba
 * junto. Publique e faca o deploy na mesma janela.
 *
 * Uso:
 *   npx tsx src/scripts/publicar-pdfs-otimizados.ts --dir=<pasta>
 *   npx tsx src/scripts/publicar-pdfs-otimizados.ts --dir=<pasta> --aplicar
 *
 * Sem `--aplicar` o script so mostra o que faria.
 */
import { config } from 'dotenv'
import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

config({ path: '.env' })
config({ path: '.env.local', override: true })

import { PrismaClient } from '@prisma/client'
import { buildR2PublicUrl, getR2Bucket, isR2Configured, r2 } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } }
})

/**
 * O casamento e pelo arquivo que o produto aponta HOJE, e nao pelo titulo: titulo
 * muda no admin sem ninguem avisar, e trocar o PDF do produto errado e o tipo de
 * engano que so aparece quando um cliente reclama.
 */
const PLANO = [
  { origemAtual: '1781228611477-58zo05eo.pdf', arquivo: 'pt-otimizado.pdf', rotulo: 'O CORPO DIZ (pt)' },
  { origemAtual: 'EL-CUERPO-HABLA.pdf', arquivo: 'es-otimizado.pdf', rotulo: 'EL CUERPO HABLA (es)' },
  { origemAtual: '1781228642632-kgyvk830.pdf', arquivo: 'sb-otimizado.pdf', rotulo: 'SENTIDO BIOLOGICO' }
]

function arg(nome: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return hit ? hit.slice(nome.length + 3) : null
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`

async function main() {
  const dir = arg('dir')
  const aplicar = process.argv.includes('--aplicar')

  if (!dir) {
    console.error('Informe --dir=<pasta com os PDFs otimizados>')
    process.exit(1)
  }
  if (!isR2Configured()) {
    console.error('R2 nao configurado no .env')
    process.exit(1)
  }

  const produtos = await prisma.catalogProduct.findMany({
    where: { mediaFileName: { not: null } },
    select: { id: true, title: true, permissionKey: true, mediaFileName: true }
  })

  const trabalho: {
    id: string
    rotulo: string
    urlAtual: string
    caminho: string
    bytes: number
    antes: number
  }[] = []

  for (const item of PLANO) {
    const produto = produtos.find((p) => p.mediaFileName?.endsWith(item.origemAtual))
    if (!produto) {
      console.error(`✗ ${item.rotulo}: nenhum produto aponta para ${item.origemAtual}`)
      process.exit(1)
    }

    const caminho = join(dir, item.arquivo)
    if (!existsSync(caminho)) {
      console.error(`✗ ${item.rotulo}: nao achei ${caminho}`)
      process.exit(1)
    }

    // Um PDF valido comeca com %PDF-. Barato, e pega o caso de arquivo truncado
    // pela metade — que subiria sem erro e so quebraria na mao do cliente.
    const cabecalho = readFileSync(caminho).subarray(0, 5).toString('latin1')
    if (cabecalho !== '%PDF-') {
      console.error(`✗ ${item.rotulo}: ${caminho} nao parece um PDF`)
      process.exit(1)
    }

    const bytes = statSync(caminho).size
    const resp = await fetch(produto.mediaFileName!, { method: 'HEAD' })
    const antes = Number(resp.headers.get('content-length') ?? 0)

    trabalho.push({
      id: produto.id,
      rotulo: `${item.rotulo} — ${produto.title}`,
      urlAtual: produto.mediaFileName!,
      caminho,
      bytes,
      antes
    })
  }

  console.log(
    `${trabalho.length} produto(s)${aplicar ? '' : ' — simulacao, nada sera gravado'}\n`
  )
  for (const t of trabalho) {
    const queda = t.antes ? ` (−${Math.round((1 - t.bytes / t.antes) * 100)}%)` : ''
    console.log(`· ${t.rotulo}`)
    console.log(`    de   ${mb(t.antes).padStart(9)}  ${t.urlAtual}`)
    console.log(`    para ${mb(t.bytes).padStart(9)}  ${t.caminho}${queda}`)
  }

  if (!aplicar) {
    console.log('\nSimulacao. Rode com --aplicar para publicar.')
    return
  }

  console.log('\nPublicando...\n')
  const rollback: string[] = []

  for (const t of trabalho) {
    const corpo = readFileSync(t.caminho)
    // Nome estavel na chave nova, so para o objeto ser reconhecivel no bucket.
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.pdf`

    await r2.send(
      new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: key,
        Body: corpo,
        ContentType: 'application/pdf'
      })
    )

    const urlNova = buildR2PublicUrl(key)

    // Confere que o objeto novo esta de pe ANTES de apontar o produto para ele.
    // Trocar o campo primeiro deixaria a biblioteca apontando para um 404 se o
    // upload tivesse falhado pela metade.
    const conferencia = await fetch(urlNova, { method: 'HEAD' })
    const tamanhoRemoto = Number(conferencia.headers.get('content-length') ?? 0)
    if (!conferencia.ok || tamanhoRemoto !== corpo.length) {
      console.error(
        `✗ ${t.rotulo}: upload nao confere (${conferencia.status}, ${tamanhoRemoto} de ${corpo.length} bytes)`
      )
      console.error('  O produto NAO foi alterado.')
      process.exit(1)
    }

    await prisma.catalogProduct.update({
      where: { id: t.id },
      data: { mediaFileName: urlNova }
    })

    rollback.push(
      `UPDATE "catalog_products" SET "media_file_name" = '${t.urlAtual}' WHERE "id" = '${t.id}';`
    )
    console.log(`✓ ${t.rotulo}`)
    console.log(`    ${urlNova}  ${mb(corpo.length)}`)
  }

  console.log('\nPublicado. Para voltar atras, os arquivos antigos continuam no bucket:')
  for (const linha of rollback) console.log(`  ${linha}`)
  console.log(
    '\nFaca o deploy com watermarkVersion v2 na mesma janela, senao quem ja baixou'
  )
  console.log('neste mes continua recebendo a copia pesada por ate 48h.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
