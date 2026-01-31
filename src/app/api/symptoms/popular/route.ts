// API pública para buscar sintomas populares (chamada pelo frontend)
import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getCache, setCache } from '@/lib/cache'

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

interface SintomasCache {
  sintomas: Array<{ sintoma: string; quantidade: number }>
  ultimaAtualizacao: string
  totalProcessados: number
  periodo?: string
}

export async function GET() {
  try {
    // 1. Tentar obter do cache Redis primeiro (mais rápido)
    const redisCache = await getCache<SintomasCache>('sintomas-populares', {
      ttl: 691200, // 8 dias em segundos
      prefix: 'symptoms'
    })

    if (redisCache) {
      console.log('📊 Retornando sintomas do cache Redis')
      return NextResponse.json({
        success: true,
        sintomas: redisCache.sintomas,
        ultimaAtualizacao: redisCache.ultimaAtualizacao,
        totalProcessados: redisCache.totalProcessados,
        fromCache: true,
        cacheType: 'redis'
      })
    }

    // 2. Fallback: tentar ler do arquivo (compatibilidade)
    const cacheFile = join(process.cwd(), 'cache', 'sintomas-populares.json')
    
    if (existsSync(cacheFile)) {
      const cacheData = JSON.parse(readFileSync(cacheFile, 'utf-8')) as SintomasCache
      
      // Verifica se o cache não está muito antigo (máximo 8 dias)
      const ultimaAtualizacao = new Date(cacheData.ultimaAtualizacao)
      const agora = new Date()
      const diasDesdeAtualizacao = (agora.getTime() - ultimaAtualizacao.getTime()) / (1000 * 60 * 60 * 24)
      
      if (diasDesdeAtualizacao <= 8) {
        console.log(`📊 Retornando sintomas do cache arquivo (${diasDesdeAtualizacao.toFixed(1)} dias atrás)`)
        
        // Armazenar no Redis para próximas requisições
        setCache('sintomas-populares', cacheData, {
          ttl: 691200 - Math.floor(diasDesdeAtualizacao * 86400), // TTL restante
          prefix: 'symptoms'
        }).catch(err => {
          console.warn('⚠️ Erro ao armazenar no Redis (não crítico):', err)
        })
        
        return NextResponse.json({
          success: true,
          sintomas: cacheData.sintomas,
          ultimaAtualizacao: cacheData.ultimaAtualizacao,
          totalProcessados: cacheData.totalProcessados,
          fromCache: true,
          cacheType: 'file'
        })
      }
    }

    // 3. Se não há cache válido, retorna sintomas fixos
    console.log('⚠️ Cache não encontrado ou expirado, retornando sintomas fixos')
    const fallbackData: SintomasCache = {
      sintomas: SINTOMAS_FALLBACK,
      ultimaAtualizacao: new Date().toISOString(),
      totalProcessados: 0
    }
    
    // Armazenar fallback no Redis por 1 hora (para evitar muitas requisições)
    setCache('sintomas-populares', fallbackData, {
      ttl: 3600, // 1 hora
      prefix: 'symptoms'
    }).catch(() => {
      // Ignorar erros silenciosamente
    })
    
    return NextResponse.json({
      success: true,
      sintomas: fallbackData.sintomas,
      ultimaAtualizacao: fallbackData.ultimaAtualizacao,
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

