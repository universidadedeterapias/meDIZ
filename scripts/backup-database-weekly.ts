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

  // Verificar DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL
  if (!databaseUrl) {
    throw new Error('❌ DATABASE_URL ou DIRECT_URL não configurada')
  }

  // Criar diretório de backups se não existir
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
    console.log(`📁 Diretório criado: ${outputDir}`)
  }

  // Extrair informações da URL
  const url = new URL(databaseUrl.replace(/^postgresql:\/\//, 'https://'))
  const host = url.hostname
  const port = url.port || '5432'
  const database = url.pathname.slice(1) // Remove leading /
  const username = url.username
  const password = url.password

  // Gerar nome do arquivo
  const timestampStr = timestamp 
    ? new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    : 'latest'
  const extension = compress ? 'sql.gz' : 'sql'
  const filename = `backup-${database}-${timestampStr}.${extension}`
  const filepath = join(outputDir, filename)

  console.log(`📦 Criando backup: ${filename}`)

  try {
    // Usar pg_dump se disponível (mais eficiente)
    const pgDumpCommand = compress
      ? `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F c -f "${filepath}"`
      : `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} > "${filepath}"`

    try {
      await execAsync(pgDumpCommand)
      console.log(`✅ Backup criado com sucesso: ${filepath}`)
      
      // Obter tamanho do arquivo
      const { exec: execSync } = require('child_process')
      const { stdout } = await execAsync(`du -h "${filepath}"`)
      console.log(`📊 Tamanho: ${stdout.split('\t')[0]}`)
      
      return filepath
    } catch (pgDumpError) {
      // Se pg_dump não estiver disponível, usar alternativa
      console.log('⚠️  pg_dump não disponível, usando método alternativo...')
      
      // Método alternativo: usar Prisma para exportar schema + dados
      // Nota: Isso é menos eficiente, mas funciona sem pg_dump
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      
      // Exportar schema
      const schema = await execAsync('npx prisma db pull --print')
      
      // Salvar schema
      await writeFile(filepath.replace('.sql.gz', '.schema.sql'), schema.stdout)
      
      console.log(`✅ Schema exportado: ${filepath.replace('.sql.gz', '.schema.sql')}`)
      console.log('⚠️  Para backup completo de dados, use pg_dump ou configure no provedor do banco')
      
      await prisma.$disconnect()
      return filepath.replace('.sql.gz', '.schema.sql')
    }
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error)
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
