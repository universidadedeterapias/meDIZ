/**
 * Script de Backup Semanal do Banco de Dados
 * 
 * Executa backup do PostgreSQL e salva em arquivo
 * Pode ser executado manualmente ou via GitHub Actions (semanal)
 * 
 * Uso:
 *   npx tsx scripts/backup-database-weekly.ts
 * 
 * Requer:
 *   - DATABASE_URL configurada
 *   - pg_dump instalado (ou usar node-postgres)
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

const execAsync = promisify(exec)

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

interface BackupOptions {
  outputDir?: string
  compress?: boolean
  timestamp?: boolean
}

async function backupDatabase(options: BackupOptions = {}) {
  const {
    outputDir = './backups',
    compress = true,
    timestamp = true
  } = options

  console.log('🔄 Iniciando backup do banco de dados...')
  console.log(`📋 Configurações: outputDir=${outputDir}, compress=${compress}, timestamp=${timestamp}`)

  // Verificar DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL
  if (!databaseUrl) {
    const errorMsg = '❌ DATABASE_URL ou DIRECT_URL não configurada'
    console.error(errorMsg)
    console.error('🔍 Variáveis de ambiente disponíveis:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DIRECT')).join(', ') || 'nenhuma')
    throw new Error(errorMsg)
  }

  console.log('✅ URL do banco de dados encontrada (ocultando credenciais)')

  // Criar diretório de backups se não existir
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
    console.log(`📁 Diretório criado: ${outputDir}`)
  } else {
    console.log(`📁 Diretório já existe: ${outputDir}`)
  }

  // Extrair informações da URL
  let host: string, port: string, database: string, username: string, password: string
  
  try {
    // Normalizar URL para parsing
    const normalizedUrl = databaseUrl.startsWith('postgresql://') 
      ? databaseUrl.replace(/^postgresql:\/\//, 'https://')
      : databaseUrl.startsWith('postgres://')
      ? databaseUrl.replace(/^postgres:\/\//, 'https://')
      : databaseUrl.startsWith('https://') || databaseUrl.startsWith('http://')
      ? databaseUrl
      : `https://${databaseUrl}`
    
    const url = new URL(normalizedUrl)
    host = url.hostname
    port = url.port || '5432'
    database = url.pathname.slice(1) // Remove leading /
    username = url.username
    password = url.password

    console.log(`🔗 Conectando: ${host}:${port}/${database} (usuário: ${username})`)
    
    if (!host || !database || !username || !password) {
      throw new Error('Informações incompletas na URL do banco de dados')
    }
  } catch (urlError) {
    const errorMsg = `❌ Erro ao parsear URL do banco: ${urlError instanceof Error ? urlError.message : String(urlError)}`
    console.error(errorMsg)
    console.error(`🔍 URL recebida (primeiros 50 chars): ${databaseUrl.substring(0, 50)}...`)
    throw new Error(errorMsg)
  }

  // Gerar nome do arquivo
  const timestampStr = timestamp 
    ? new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    : 'latest'
  
  // Corrigir extensão: se compress=true, usar gzip via pipe, não formato custom
  const extension = compress ? 'sql.gz' : 'sql'
  const filename = `backup-${database}-${timestampStr}.${extension}`
  const filepath = join(outputDir, filename)

  console.log(`📦 Criando backup: ${filename}`)
  console.log(`📂 Caminho completo: ${filepath}`)

  try {
    // Escapar senha para uso seguro no shell (evitar injection)
    const escapedPassword = password.replace(/'/g, "'\"'\"'")
    
    // Usar pg_dump com compressão via gzip se solicitado
    // Formato correto: usar pipe para gzip ao invés de formato custom
    let pgDumpCommand: string
    
    if (compress) {
      // Usar formato plain SQL com compressão via gzip
      pgDumpCommand = `PGPASSWORD='${escapedPassword}' pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-owner --no-acl | gzip > "${filepath}"`
    } else {
      // Formato plain SQL sem compressão
      pgDumpCommand = `PGPASSWORD='${escapedPassword}' pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-owner --no-acl > "${filepath}"`
    }

    console.log('🔧 Executando comando pg_dump...')
    console.log(`📝 Comando (senha oculta): pg_dump -h ${host} -p ${port} -U ${username} -d ${database} ${compress ? '| gzip' : ''}`)

    try {
      await execAsync(pgDumpCommand, { maxBuffer: 10 * 1024 * 1024 }) // 10MB buffer
      console.log(`✅ Backup criado com sucesso: ${filepath}`)
      
      // Verificar se arquivo foi criado
      const { statSync } = require('fs')
      try {
        const stats = statSync(filepath)
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
        const sizeKB = (stats.size / 1024).toFixed(2)
        console.log(`📊 Tamanho do arquivo: ${sizeMB} MB (${sizeKB} KB)`)
        
        if (stats.size === 0) {
          console.warn('⚠️  AVISO: Arquivo de backup está vazio!')
        }
      } catch (statError) {
        console.warn('⚠️  Não foi possível obter tamanho do arquivo:', statError)
      }
      
      return filepath
    } catch (pgDumpError: any) {
      console.error('❌ Erro ao executar pg_dump:', pgDumpError.message)
      console.error('📋 Detalhes do erro:', {
        code: pgDumpError.code,
        signal: pgDumpError.signal,
        stdout: pgDumpError.stdout?.substring(0, 500),
        stderr: pgDumpError.stderr?.substring(0, 500)
      })
      
      // Se pg_dump não estiver disponível ou falhar, tentar método alternativo
      console.log('⚠️  Tentando método alternativo...')
      
      try {
        // Método alternativo: usar Prisma para exportar schema
        const { PrismaClient } = require('@prisma/client')
        const prisma = new PrismaClient()
        
        console.log('📋 Exportando schema via Prisma...')
        const schemaResult = await execAsync('npx prisma db pull --print', { 
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, DATABASE_URL: databaseUrl }
        })
        
        // Salvar schema
        const schemaFilepath = filepath.replace(/\.(sql\.gz|sql)$/, '.schema.sql')
        await writeFile(schemaFilepath, schemaResult.stdout)
        
        console.log(`✅ Schema exportado: ${schemaFilepath}`)
        console.log('⚠️  ATENÇÃO: Apenas o schema foi exportado. Para backup completo de dados, use pg_dump.')
        
        await prisma.$disconnect()
        return schemaFilepath
      } catch (altError: any) {
        console.error('❌ Método alternativo também falhou:', altError.message)
        throw new Error(`Falha no backup: pg_dump (${pgDumpError.message}) e método alternativo (${altError.message})`)
      }
    }
  } catch (error: any) {
    const errorMsg = `❌ Erro ao criar backup: ${error.message || String(error)}`
    console.error(errorMsg)
    console.error('📋 Stack trace:', error.stack)
    throw error
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  backupDatabase()
    .then((filepath) => {
      console.log(`\n✅ Backup concluído: ${filepath}`)
      console.log('\n💡 Próximos passos:')
      console.log('   1. Verificar se o arquivo foi criado corretamente')
      console.log('   2. (Opcional) Fazer upload para S3/Cloud Storage')
      console.log('   3. (Opcional) Configurar GitHub Actions para execução semanal')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erro ao executar backup:', error)
      process.exit(1)
    })
}

export { backupDatabase }
