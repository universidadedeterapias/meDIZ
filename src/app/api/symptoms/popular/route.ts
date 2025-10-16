// API pública para buscar sintomas populares (chamada pelo frontend)
import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Sintomas fixos como fallback
const SINTOMAS_FALLBACK = [
  { sintoma: 'Dor nas costas', quantidade: 1 },
  { sintoma: 'Pressão alta', quantidade: 1 },
  { sintoma: 'Cansaço', quantidade: 1 },
  { sintoma: 'Enxaqueca', quantidade: 1 },
  { sintoma: 'Insônia', quantidade: 1 },
  { sintoma: 'Ansiedade', quantidade: 1 },
  { sintoma: 'Rinite', quantidade: 1 },
  { sintoma: 'Dor no joelho', quantidade: 1 },
  { sintoma: 'Estresse', quantidade: 1 },
  { sintoma: 'Dor de cabeça', quantidade: 1 }
]

export async function GET() {
  try {
    // Tenta ler do cache
    const cacheFile = join(process.cwd(), 'cache', 'sintomas-populares.json')
    
    if (existsSync(cacheFile)) {
      const cacheData = JSON.parse(readFileSync(cacheFile, 'utf-8'))
      
      // Verifica se o cache não está muito antigo (máximo 8 dias)
      const ultimaAtualizacao = new Date(cacheData.ultimaAtualizacao)
      const agora = new Date()
      const diasDesdeAtualizacao = (agora.getTime() - ultimaAtualizacao.getTime()) / (1000 * 60 * 60 * 24)
      
      if (diasDesdeAtualizacao <= 8) {
        console.log(`📊 Retornando sintomas do cache (${diasDesdeAtualizacao.toFixed(1)} dias atrás)`)
        return NextResponse.json({
          success: true,
          sintomas: cacheData.sintomas,
          ultimaAtualizacao: cacheData.ultimaAtualizacao,
          totalProcessados: cacheData.totalProcessados,
          fromCache: true
        })
      }
    }

    // Se não há cache válido, retorna sintomas fixos
    console.log('⚠️ Cache não encontrado ou expirado, retornando sintomas fixos')
    return NextResponse.json({
      success: true,
      sintomas: SINTOMAS_FALLBACK,
      ultimaAtualizacao: new Date().toISOString(),
      totalProcessados: 0,
      fromCache: false,
      fallback: true
    })

  } catch (error) {
    console.error('❌ Erro ao buscar sintomas:', error)
    
    // Em caso de erro, retorna sintomas fixos
    return NextResponse.json({
      success: true,
      sintomas: SINTOMAS_FALLBACK,
      ultimaAtualizacao: new Date().toISOString(),
      totalProcessados: 0,
      fromCache: false,
      fallback: true,
      error: 'Erro interno'
    })
  }
}

