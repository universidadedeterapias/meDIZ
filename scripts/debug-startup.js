// Script de debug para identificar problemas ao iniciar o servidor
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Iniciando diagnóstico de startup...\n');

// 1. Verificar variáveis de ambiente críticas
console.log('1️⃣ Verificando variáveis de ambiente:');
const criticalVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'OPENAI_API_KEY',
  'OPENAI_ASSISTANT_ID'
];

let missingVars = [];
criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mostrar apenas primeiros e últimos caracteres para segurança
    const masked = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('URL')
      ? `${value.substring(0, 5)}...${value.substring(value.length - 5)}`
      : value;
    console.log(`   ✅ ${varName}: ${masked}`);
  } else {
    console.log(`   ❌ ${varName}: NÃO CONFIGURADO`);
    missingVars.push(varName);
  }
});

// 2. Verificar arquivos críticos
console.log('\n2️⃣ Verificando arquivos críticos:');

const criticalFiles = [
  'src/auth.ts',
  'src/lib/prisma.ts',
  'prisma/schema.prisma',
  'next.config.mjs',
  'package.json'
];

criticalFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file}: Existe`);
  } else {
    console.log(`   ❌ ${file}: NÃO ENCONTRADO`);
  }
});

// 3. Verificar arquivo .env.local
console.log('\n3️⃣ Verificando arquivo .env.local:');
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('   ✅ .env.local: Existe');
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
  console.log(`   📄 Total de variáveis configuradas: ${lines.length}`);
} else {
  console.log('   ❌ .env.local: NÃO EXISTE');
  console.log('   ⚠️  Crie o arquivo .env.local com as variáveis necessárias');
}

// 4. Tentar importar módulos críticos
console.log('\n4️⃣ Testando importação de módulos críticos:');
try {
  await import('next');
  console.log('   ✅ next: OK');
} catch (error) {
  console.log(`   ❌ next: ${error.message}`);
}

try {
  await import('@prisma/client');
  console.log('   ✅ @prisma/client: OK');
} catch (error) {
  console.log(`   ❌ @prisma/client: ${error.message}`);
}

try {
  await import('next-auth');
  console.log('   ✅ next-auth: OK');
} catch (error) {
  console.log(`   ❌ next-auth: ${error.message}`);
}

// 5. Testar conexão com Prisma (se DATABASE_URL estiver configurado)
console.log('\n5️⃣ Testando conexão com banco de dados:');
if (process.env.DATABASE_URL) {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({
      log: ['error'],
    });
    
    // Tentar conectar com timeout
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout após 5 segundos')), 5000)
      )
    ]);
    
    console.log('   ✅ Conexão com banco: OK');
    await prisma.$disconnect();
  } catch (error) {
    console.log(`   ❌ Conexão com banco: ${error.message}`);
    console.log(`   🔍 Erro detalhado: ${error.stack || error}`);
  }
} else {
  console.log('   ⏭️  DATABASE_URL não configurado, pulando teste de conexão');
}

// Resumo
console.log('\n📊 RESUMO:');
if (missingVars.length > 0) {
  console.log(`   ❌ Variáveis faltando: ${missingVars.join(', ')}`);
  console.log('\n   💡 SOLUÇÃO:');
  console.log('   1. Crie um arquivo .env.local na raiz do projeto');
  console.log('   2. Configure as seguintes variáveis obrigatórias:');
  missingVars.forEach(varName => {
    console.log(`      - ${varName}`);
  });
  console.log('\n   📖 Consulte docs/configuracao-variaveis-ambiente.md para mais detalhes');
  process.exit(1);
} else {
  console.log('   ✅ Todas as variáveis críticas estão configuradas');
  console.log('   ✅ Arquivos críticos encontrados');
  console.log('\n   💡 Se o servidor ainda não iniciar, verifique os logs acima para mais detalhes');
}

