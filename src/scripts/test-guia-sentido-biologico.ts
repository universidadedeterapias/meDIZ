/**
 * Guia Sentido Biologico avulso no Guru: reconhecido pelos dois IDs, e nunca
 * confundido com o livro (que levaria a esteira de e-mails do livro).
 *
 *   npx tsx src/scripts/test-guia-sentido-biologico.ts
 */
import { isBookExternalId, isGuideProduct } from '@/lib/purchases/book-purchase'

let falhas = 0
function caso(nome: string, obtido: boolean, esperado: boolean) {
  const ok = obtido === esperado
  if (!ok) falhas++
  console.log(`  ${ok ? 'ok    ' : 'FALHOU'} ${nome}`)
}

console.log('\nGuia Sentido Biologico\n')
caso('UUID do Guru e guia', isGuideProduct('stone', 'a2b3a2a5-e85c-4133-be75-cab6d0f935df'), true)
caso('codigo do Guru e guia', isGuideProduct('stone', ' 1788924076 '), true)
caso('guia nao e livro', isBookExternalId('stone', '1788924076'), false)
caso('livro digital nao e guia', isGuideProduct('stone', 'a1e5eea6-e1e1-4b0c-9feb-8e98cfba1d51'), false)
caso('audioterapia sentido biologico nao e guia', isGuideProduct('stone', 'a1f9cfa3-3bcf-41e6-a540-09c29dd831a9'), false)
caso('mesmo id pela hotmart nao e guia', isGuideProduct('hotmart', '1788924076'), false)
caso('sem id nao e guia', isGuideProduct('stone', null), false)

console.log(falhas ? `\n${falhas} falha(s)` : '\ntodos passaram')
process.exit(falhas ? 1 : 0)
