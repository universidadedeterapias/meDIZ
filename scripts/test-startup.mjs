// Script para testar inicialização do Next.js com variáveis de ambiente
import { loadEnvConfig } from '@next/env';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectDir = resolve(__dirname, '..');

console.log('🔍 Testando carregamento de variáveis de ambiente...\n');
console.log('📁 Diretório do projeto:', projectDir);

// Carregar variáveis de ambiente como Next.js faz
const { combinedEnv } = loadEnvConfig(projectDir, false);

console.log('\n📋 Variáveis críticas após carregamento:');
const criticalVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'OPENAI_API_KEY',
  'OPENAI_ASSISTANT_ID'
];

let allPresent = true;
criticalVars.forEach(varName => {
  const value = combinedEnv[varName];
  if (value) {
    const masked = varName.includes('SECRET') || varName.includes('KEY')
      ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
      : value.length > 50 
      ? `${value.substring(0, 30)}...${value.substring(value.length - 10)}`
      : value;
    console.log(`   ✅ ${varName}: ${masked}`);
  } else {
    console.log(`   ❌ ${varName}: NÃO ENCONTRADO`);
    allPresent = false;
  }
});

if (allPresent) {
  console.log('\n✅ Todas as variáveis críticas estão presentes!');
  console.log('\n💡 Próximo passo: Verificar se o servidor consegue iniciar');
} else {
  console.log('\n❌ Algumas variáveis críticas estão faltando!');
  console.log('💡 Verifique o arquivo .env.local na raiz do projeto');
  process.exit(1);
}

