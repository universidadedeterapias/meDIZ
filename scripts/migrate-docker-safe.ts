// Script seguro para rodar migrations no Docker
// Faz backup do .env, modifica temporariamente e restaura

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

const envPath = join(process.cwd(), '.env')
const envBackupPath = join(process.cwd(), '.env.backup')
const dockerDatabaseUrl = 'postgresql://mediz:mediz_password@localhost:5432/mediz_db?schema=public&sslmode=disable'

console.log('🔄 Preparando para rodar migrations no Docker...')

try {
  // 1. Fazer backup do .env
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    writeFileSync(envBackupPath, envContent, 'utf-8')
    console.log('✅ Backup do .env criado')
  }

  // 2. Ler .env atual
  let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : ''
  
  // 3. Substituir DATABASE_URL e adicionar DIRECT_URL
  const lines = envContent.split('\n')
  let hasDatabaseUrl = false
  let hasDirectUrl = false
  
  const newLines = lines.map(line => {
    if (line.startsWith('DATABASE_URL=') || line.startsWith('DATABASE_URL =')) {
      hasDatabaseUrl = true
      return `DATABASE_URL="${dockerDatabaseUrl}"`
    }
    // Usar mesma URL para DIRECT_URL no Docker (não precisa de proxy)
    if (line.startsWith('DIRECT_URL=') || line.startsWith('DIRECT_URL =')) {
      hasDirectUrl = true
      return `DIRECT_URL="${dockerDatabaseUrl}"`
    }
    return line
  })

  // Se não tinha DATABASE_URL, adicionar
  if (!hasDatabaseUrl) {
    newLines.push(`DATABASE_URL="${dockerDatabaseUrl}"`)
  }
  
  // Se não tinha DIRECT_URL, adicionar (mesma URL do Docker)
  if (!hasDirectUrl) {
    newLines.push(`DIRECT_URL="${dockerDatabaseUrl}"`)
  }

  // 4. Escrever .env temporário
  writeFileSync(envPath, newLines.join('\n'), 'utf-8')
  console.log('✅ .env atualizado temporariamente para Docker')
  console.log(`📊 Database: ${dockerDatabaseUrl.replace(/:[^:@]+@/, ':****@')}`)

  // 5. Executar migration com variáveis de ambiente explícitas
  console.log('🔄 Executando migrations...')
  execSync('npx prisma migrate dev', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: dockerDatabaseUrl,
      DIRECT_URL: dockerDatabaseUrl
    }
  })

  console.log('✅ Migrations executadas com sucesso!')

} catch (error) {
  console.error('❌ Erro ao executar migrations:', error)
  
  // Restaurar backup em caso de erro
  if (existsSync(envBackupPath)) {
    const backupContent = readFileSync(envBackupPath, 'utf-8')
    writeFileSync(envPath, backupContent, 'utf-8')
    console.log('✅ .env restaurado do backup')
  }
  
  process.exit(1)
} finally {
  // 6. Restaurar .env original
  if (existsSync(envBackupPath)) {
    const backupContent = readFileSync(envBackupPath, 'utf-8')
    writeFileSync(envPath, backupContent, 'utf-8')
    
    // Remover backup
    try {
      require('fs').unlinkSync(envBackupPath)
    } catch {}
    
    console.log('✅ .env restaurado para configuração original')
  }
}
