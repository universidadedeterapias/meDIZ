// src/app/api/health/route.ts
// Endpoint de health check para monitoramento
// Não requer autenticação - ideal para serviços externos de monitoramento

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedisClient } from '@/lib/redis'

interface HealthStatus {
  status: 'online' | 'degraded' | 'offline'
  timestamp: string
  version: string
  services: {
    database: {
      status: 'healthy' | 'unhealthy'
      responseTime?: number
      error?: string
    }
    redis: {
      status: 'healthy' | 'unhealthy' | 'not_configured'
      responseTime?: number
      error?: string
    }
    environment: {
      status: 'healthy' | 'unhealthy'
      missingVars?: string[]
    }
  }
  uptime?: number
}

const APP_VERSION = process.env.npm_package_version || '0.1.0'
const START_TIME = Date.now()

export async function GET() {
  const healthStatus: HealthStatus = {
    status: 'online',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    services: {
      database: { status: 'unhealthy' },
      redis: { status: 'not_configured' },
      environment: { status: 'healthy' }
    },
    uptime: Math.floor((Date.now() - START_TIME) / 1000) // segundos
  }

  let hasErrors = false

  // 1. Verificar variáveis de ambiente críticas
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    healthStatus.services.environment = {
      status: 'unhealthy',
      missingVars
    }
    hasErrors = true
  }

  // 2. Verificar conexão com banco de dados
  try {
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Date.now() - dbStartTime

    healthStatus.services.database = {
      status: 'healthy',
      responseTime: dbResponseTime
    }
  } catch (error) {
    healthStatus.services.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
    hasErrors = true
  }

  // 3. Verificar conexão com Redis
  const redis = getRedisClient()
  if (redis) {
    try {
      const redisStartTime = Date.now()
      await redis.ping()
      const redisResponseTime = Date.now() - redisStartTime

      healthStatus.services.redis = {
        status: 'healthy',
        responseTime: redisResponseTime
      }
    } catch (error) {
      healthStatus.services.redis = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
      // Redis não é crítico, não marca como erro geral
    }
  } else {
    healthStatus.services.redis = {
      status: 'not_configured'
    }
    // Redis não configurado não é erro crítico
  }

  // Determinar status geral
  if (hasErrors) {
    // Se database ou environment estão unhealthy, status é degraded ou offline
    if (healthStatus.services.database.status === 'unhealthy' || 
        healthStatus.services.environment.status === 'unhealthy') {
      healthStatus.status = 'offline'
    } else {
      healthStatus.status = 'degraded'
    }
  }

  // Retornar status code apropriado
  const statusCode = healthStatus.status === 'online' ? 200 : 
                     healthStatus.status === 'degraded' ? 200 : 503

  return NextResponse.json(healthStatus, { status: statusCode })
}
