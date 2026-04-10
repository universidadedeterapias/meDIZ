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
import { join, resolve } from 'path'
import * as dotenv from 'dotenv'

const execAsync = promisify(exec)

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

interface BackupOptions {
  outputDir?: string
  compress?: boolean
  timestamp?: boolean
}

function maskSensitive(input: string, secret?: string): string {
  if (!input) return input
  let output = input
  if (secret) {
    output = output.split(secret).join('***')
  }
  output = output.replace(/api_key=[^&\s]+/gi, 'api_key=***')
  return output
}

function isProxyLikeDatabaseUrl(url: string): boolean {
  return (
    url.startsWith('prisma://') ||
    url.startsWith('prisma+postgres://') ||
    url.includes('prisma-data.net')
  )
}

async function backupDatabase(options: BackupOptions = {}) {
  const {
    outputDir = './backups',
    compress = true,
    timestamp = true
  } = options

  console.log('🔄 Iniciando backup do banco de dados...')
  console.log(`📋 Configurações: outputDir=${outputDir}, compress=${compress}, timestamp=${timestamp}`)

  // Para backup, SEMPRE preferir URL direta (compatível com pg_dump)
  const directUrl = process.env.DIRECT_URL
  const databaseUrl = directUrl || process.env.DATABASE_URL
  if (!databaseUrl) {
    const errorMsg = '❌ DATABASE_URL ou DIRECT_URL não configurada'
    console.error(errorMsg)
    console.error('🔍 Variáveis de ambiente disponíveis:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DIRECT')).join(', ') || 'nenhuma')
    throw new Error(errorMsg)
  }

  if (!directUrl && isProxyLikeDatabaseUrl(databaseUrl)) {
    const errorMsg = '❌ URL de proxy detectada em DATABASE_URL. Defina DIRECT_URL com conexão PostgreSQL direta para o backup.'
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  console.log(`✅ URL do banco encontrada (${directUrl ? 'DIRECT_URL' : 'DATABASE_URL'})`)

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
    const url = new URL(databaseUrl)
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
  
  // Com compress=true, usamos formato custom (-Fc), que já é comprimido e portátil
  const extension = compress ? 'dump' : 'sql'
  const filename = `backup-${database}-${timestampStr}.${extension}`
  const filepath = join(outputDir, filename)
  const absoluteOutputDir = resolve(outputDir)

  console.log(`📦 Criando backup: ${filename}`)
  console.log(`📂 Caminho completo: ${filepath}`)

  try {
    const baseArgs = ['-h', host, '-p', port, '-U', username, '-d', database, '--no-owner', '--no-acl']
    const pgDumpArgs = compress
      ? [...baseArgs, '-Fc', '-f', filepath]
      : [...baseArgs, '-f', filepath]

    console.log('🔧 Executando comando pg_dump...')
    console.log(`📝 Comando (senha oculta): pg_dump -h ${host} -p ${port} -U ${username} -d ${database} ${compress ? '-Fc' : ''}`)

    try {
      const quotedArgs = pgDumpArgs.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ')
      const command = `pg_dump ${quotedArgs}`

      await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PGPASSWORD: password }
      })
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
      console.error('❌ Erro ao executar pg_dump:', maskSensitive(String(pgDumpError.message || ''), password))
      console.error('📋 Detalhes do erro:', {
        code: pgDumpError.code,
        signal: pgDumpError.signal,
        stdout: pgDumpError.stdout?.substring(0, 500),
        stderr: maskSensitive(String(pgDumpError.stderr || '').substring(0, 500), password)
      })
      
      // Tentativa de fallback via Docker (sem depender de pg_dump local)
      console.log('⚠️  Tentando backup via Docker...')
      try {
        try {
          await execAsync('docker info', { maxBuffer: 2 * 1024 * 1024 })
        } catch {
          throw new Error('Docker está instalado, mas o daemon não está em execução. Inicie o Docker Desktop e tente novamente.')
        }

        const dockerArgs = [
          'run',
          '--rm',
          '-e',
          `PGPASSWORD=${password}`,
          '-v',
          `${absoluteOutputDir}:/backups`,
          'postgres:17-alpine',
          'pg_dump',
          '-h',
          host,
          '-p',
          port,
          '-U',
          username,
          '-d',
          database,
          '--no-owner',
          '--no-acl',
          ...(compress ? ['-Fc'] : []),
          '-f',
          `/backups/${filename}`
        ]

        const dockerCommand = `docker ${dockerArgs.map(arg => `"${String(arg).replace(/"/g, '\\"')}"`).join(' ')}`
        await execAsync(dockerCommand, {
          maxBuffer: 10 * 1024 * 1024
        })

        console.log(`✅ Backup criado com sucesso via Docker: ${filepath}`)
        return filepath
      } catch (dockerError: any) {
        console.error('❌ Fallback via Docker também falhou:', maskSensitive(String(dockerError.message || ''), password))
      }

      // Último fallback: exportar apenas schema
      console.log('⚠️  Tentando método alternativo de schema...')
      
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
        const maskedPgError = maskSensitive(String(pgDumpError.message || ''), password)
        const maskedAltError = maskSensitive(String(altError.message || ''), password)
        console.error('❌ Método alternativo também falhou:', maskedAltError)
        throw new Error(`Falha no backup: pg_dump (${maskedPgError}) e método alternativo (${maskedAltError})`)
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
