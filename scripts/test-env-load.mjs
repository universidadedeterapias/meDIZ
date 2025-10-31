// Teste simples para verificar se as variáveis estão disponíveis
// Simula o que o Next.js faz ao carregar .env.local

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectDir = resolve(__dirname, '..');
const envPath = resolve(projectDir, '.env.local');

console.log('🔍 Testando carregamento de .env.local...\n');
console.log('📁 Caminho do arquivo:', envPath);

try {
  const envContent = readFileSync(envPath, 'utf8');
  console.log('✅ Arquivo .env.local encontrado e lido');
  
  // Simular parsing básico (Next.js usa dotenv internamente)
  const envVars = {};
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remover aspas se existirem
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      }
    }
  });
  
  console.log(`\n📋 Total de variáveis encontradas: ${Object.keys(envVars).length}`);
  
  const criticalVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'OPENAI_API_KEY',
    'OPENAI_ASSISTANT_ID'
  ];
  
  console.log('\n🔑 Variáveis críticas:');
  let allPresent = true;
  criticalVars.forEach(varName => {
    if (envVars[varName]) {
      const masked = varName.includes('SECRET') || varName.includes('KEY')
        ? `${envVars[varName].substring(0, 10)}...`
        : envVars[varName].length > 50
        ? `${envVars[varName].substring(0, 30)}...`
        : envVars[varName];
      console.log(`   ✅ ${varName}: ${masked}`);
    } else {
      console.log(`   ❌ ${varName}: NÃO ENCONTRADO`);
      allPresent = false;
    }
  });
  
  if (allPresent) {
    console.log('\n✅ Todas as variáveis críticas estão no arquivo!');
    console.log('\n💡 Se o servidor ainda não iniciar, o problema pode ser:');
    console.log('   1. Next.js não está carregando o .env.local corretamente');
    console.log('   2. Há um erro de sintaxe/importação nos arquivos TypeScript');
    console.log('   3. Há um problema com a ordem de carregamento dos módulos');
    console.log('\n🔍 Execute "npm run dev" e verifique os logs de DEBUG que adicionamos');
  } else {
    console.log('\n❌ Algumas variáveis críticas estão faltando no arquivo!');
  }
  
} catch (error) {
  console.error('❌ Erro ao ler .env.local:', error.message);
  process.exit(1);
}

