// Script para rodar migrations no banco Docker local
// Ignora o .env e usa DATABASE_URL do Docker

import { execSync } from 'child_process'

const dockerDatabaseUrl = 'postgresql://mediz:mediz_password@localhost:5432/mediz_db?schema=public'

console.log('🔄 Rodando migrations no banco Docker local...')
console.log(`📊 Database: ${dockerDatabaseUrl.replace(/:[^:@]+@/, ':****@')}`)

try {
  // Executar migration com DATABASE_URL do Docker
  execSync(
    `npx prisma migrate dev`,
    {
      env: {
        ...process.env,
        DATABASE_URL: dockerDatabaseUrl,
        // Remover DIRECT_URL se existir (não precisa para Docker local)
        DIRECT_URL: undefined
      },
      stdio: 'inherit'
    }
  )
  
  console.log('✅ Migrations executadas com sucesso!')
} catch (error) {
  console.error('❌ Erro ao executar migrations:', error)
  process.exit(1)
}
