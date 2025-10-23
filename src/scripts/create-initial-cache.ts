// Script para criar cache inicial de sintomas
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// Sintomas fixos como fallback
const SINTOMAS_FIXOS = [
  { sintoma: 'Dor de cabeça', quantidade: 1 },
  { sintoma: 'Dor nas costas', quantidade: 1 },
  { sintoma: 'Ansiedade', quantidade: 1 },
  { sintoma: 'Cansaço', quantidade: 1 },
  { sintoma: 'Insônia', quantidade: 1 },
  { sintoma: 'Enxaqueca', quantidade: 1 },
  { sintoma: 'Rinite', quantidade: 1 },
  { sintoma: 'Dor no joelho', quantidade: 1 },
  { sintoma: 'Estresse', quantidade: 1 },
  { sintoma: 'Pressão alta', quantidade: 1 }
]

function createInitialCache() {
  console.log('🚀 Criando cache inicial de sintomas...')
  
  const dataAtual = new Date().toISOString()
  
  // Cache de sintomas
  const cacheData = {
    sintomas: SINTOMAS_FIXOS,
    totalProcessados: 0,
    ultimaAtualizacao: dataAtual,
    periodo: 'Sintomas fixos (inicial)',
    isFallback: true
  }
  
  // Log inicial
  const logEntry = {
    data: dataAtual,
    sucesso: true,
    sintomasProcessados: 0,
    totalSessoes: 0,
    duracaoMs: 0,
    observacao: 'Cache inicial criado'
  }
  
  try {
    // Cria diretórios se não existem
    const cacheDir = join(process.cwd(), 'cache')
    const logsDir = join(process.cwd(), 'logs')
    
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true })
      console.log('📁 Diretório cache criado')
    }
    
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true })
      console.log('📁 Diretório logs criado')
    }
    
    // Salva cache
    const cacheFile = join(cacheDir, 'sintomas-populares.json')
    writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2))
    console.log('💾 Cache de sintomas criado')
    
    // Salva log
    const logsFile = join(logsDir, 'sintomas-job-logs.json')
    writeFileSync(logsFile, JSON.stringify([logEntry], null, 2))
    console.log('📝 Log inicial criado')
    
    console.log('✅ Cache inicial criado com sucesso!')
    console.log('🎉 Agora as métricas de sintomas devem funcionar!')
    
  } catch (error) {
    console.error('❌ Erro ao criar cache inicial:', error)
    process.exit(1)
  }
}

createInitialCache()
