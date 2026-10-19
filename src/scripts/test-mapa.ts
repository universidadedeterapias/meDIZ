/**
 * Teste do Mapa da Origem Emocional (Epic 7), sem banco e sem n8n.
 *
 *   npm run test:mapa
 *
 * Cobre o que decide dinheiro e bloqueio: o schema aceita o Mapa aprovado e
 * recusa saida quebrada do gerador; o token sobrevive ida e volta pelo payload
 * do pagamento; o telefone do checkout casa com o do link da Aline.
 */
import { validarConteudoMapa, conteudoMapaSchema } from '../lib/mapa/conteudo'
import { EXEMPLO_CONTEUDO } from '../lib/mapa/exemplo'
import {
  chaveTelefone,
  ehTokenPublico,
  extrairTokensDoPayload,
  gerarTokenPublico,
  normalizarTelefoneLink
} from '../lib/mapa/identidade'
import { entradaMapaSchema } from '../lib/mapa/entrada'
import { isMapaProduct } from '../lib/mapa/produto'

let falhas = 0
function confere(nome: string, condicao: boolean, detalhe?: unknown) {
  if (condicao) {
    console.log(`  ok  ${nome}`)
  } else {
    falhas++
    console.error(`  FALHOU  ${nome}`, detalhe ?? '')
  }
}

console.log('schema do conteudo')
{
  const r = validarConteudoMapa(EXEMPLO_CONTEUDO)
  confere('aceita o Mapa de exemplo aprovado', r.ok, r.ok === false ? r.erro : '')

  const semCenario = structuredClone(EXEMPLO_CONTEUDO)
  semCenario.conflito.cenarios = semCenario.conflito.cenarios.slice(0, 2)
  const r2 = validarConteudoMapa(semCenario)
  confere(
    'recusa conflito com 2 cenarios (sao 3)',
    r2.ok === false && r2.erro.includes('conflito.cenarios')
  )

  const noInventado = structuredClone(EXEMPLO_CONTEUDO) as unknown as {
    programa_familiar: { arvore: Record<string, string> }
  }
  noInventado.programa_familiar.arvore.bisavo = 'x'
  confere('recusa no de arvore fora da lista', validarConteudoMapa(noInventado).ok === false)

  const versaoErrada = { ...EXEMPLO_CONTEUDO, versao: 2 }
  confere('recusa versao de schema desconhecida', validarConteudoMapa(versaoErrada).ok === false)

  confere('recusa texto vazio', validarConteudoMapa({
    ...EXEMPLO_CONTEUDO,
    frase_forte: '   '
  }).ok === false)

  confere('erro de raiz legivel', validarConteudoMapa(null).ok === false)
  confere('schema exportado e zod', typeof conteudoMapaSchema.safeParse === 'function')
}

console.log('token publico')
{
  const tokens = Array.from({ length: 200 }, gerarTokenPublico)
  confere('formato mo + 24 [a-z0-9]', tokens.every(ehTokenPublico))
  confere('sem repeticao em 200', new Set(tokens).size === 200)

  const t = tokens[0]
  const payload = {
    data: {
      id: 'ch_X9PrQwycbu4zvQoe',
      metadata: { src: t },
      customer: { email: 'a@b.com' }
    }
  }
  confere('acha o token em metadata', extrairTokensDoPayload(payload)[0] === t)

  const naUrl = { data: { checkout_url: `https://go.ocorpodiz.com.br/pay/mapa-p1-1490?src=${t}&x=1` } }
  confere('acha o token dentro de URL', extrairTokensDoPayload(naUrl)[0] === t)

  const maiusculo = { utm_content: t.toUpperCase() }
  confere('acha o token mesmo em maiusculas', extrairTokensDoPayload(maiusculo)[0] === t)

  const colado = { x: `${t}a` }
  confere('ignora token colado em mais caracteres', extrairTokensDoPayload(colado).length === 0)

  confere('payload sem token', extrairTokensDoPayload({ data: { id: 'momento-qualquer' } }).length === 0)
}

console.log('telefone')
{
  const link = normalizarTelefoneLink('5511987654321')
  confere('link da Aline normaliza', link === '5511987654321')
  confere('lixo no link vira null', normalizarTelefoneLink('abc') === null)

  const chave = chaveTelefone('5511987654321')
  confere('com DDI e com 9', chave === '1187654321')
  confere('sem DDI casa', chaveTelefone('11987654321') === chave)
  confere('sem o 9 casa', chaveTelefone('551187654321') === chave)
  confere('formatado casa', chaveTelefone('+55 (11) 98765-4321') === chave)
  confere('outro DDD nao casa', chaveTelefone('5521987654321') !== chave)
  confere('curto demais e null', chaveTelefone('98765') === null)
}

console.log('entrada do quiz')
{
  const minimo = entradaMapaSchema.safeParse({ nome: 'Ana', sintoma: 'dor na lombar' })
  confere('so nome e sintoma bastam', minimo.success)

  const vazio = entradaMapaSchema.safeParse({ nome: 'A', sintoma: '' })
  confere('nome de 1 letra e sintoma vazio recusam', !vazio.success)

  const momentos = entradaMapaSchema.safeParse({
    nome: 'Ana',
    sintoma: 'enxaqueca',
    momentos: [
      { momento: 'Separação dos pais', idade: '7' },
      { momento: '', idade: '' },
      { momento: 'Mudança de cidade', idade: '' }
    ]
  })
  confere(
    'momentos vazios caem fora, idade vazia vira null',
    momentos.success &&
      momentos.data.momentos.length === 2 &&
      momentos.data.momentos[1].idade === null
  )
}

console.log('produto')
{
  confere('reconhece o produto Guru do Mapa', isMapaProduct('stone', 'a2fa67c6-1258-4c54-94d2-de367ea1f721'))
  confere('nao confunde com o guia', !isMapaProduct('stone', 'a2b3a2a5-e85c-4133-be75-cab6d0f935df'))
  confere('so pela Stone', !isMapaProduct('hotmart', 'a2fa67c6-1258-4c54-94d2-de367ea1f721'))
}

if (falhas > 0) {
  console.error(`\n${falhas} falha(s)`)
  process.exit(1)
}
console.log('\ntudo certo')
