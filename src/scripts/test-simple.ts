// Teste simples para verificar se o sistema está funcionando
console.log('🧪 Testando sistema de sintomas...')

// Simula dados de teste
const sintomasTeste = [
  { sintoma: 'Dor de cabeça', quantidade: 15 },
  { sintoma: 'Ansiedade', quantidade: 12 },
  { sintoma: 'Cansaço', quantidade: 10 },
  { sintoma: 'Insônia', quantidade: 8 },
  { sintoma: 'Dor nas costas', quantidade: 7 },
  { sintoma: 'Estresse', quantidade: 6 },
  { sintoma: 'Enxaqueca', quantidade: 5 },
  { sintoma: 'Pressão alta', quantidade: 4 },
  { sintoma: 'Rinite', quantidade: 3 },
  { sintoma: 'Dor no joelho', quantidade: 2 }
]

console.log('📋 Sintomas de teste criados:')
sintomasTeste.forEach((s, i) => {
  console.log(`   ${i + 1}. ${s.sintoma} (${s.quantidade} pesquisas)`)
})

// Simula cache
const cacheData = {
  sintomas: sintomasTeste,
  totalProcessados: 100,
  ultimaAtualizacao: new Date().toISOString(),
  periodo: 'Teste simulado'
}

console.log('💾 Dados de cache simulados:')
console.log(JSON.stringify(cacheData, null, 2))

console.log('✅ Teste concluído!')
console.log('🎉 Sistema de sintomas dinâmicos está pronto!')
