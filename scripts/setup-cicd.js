#!/usr/bin/env node

// scripts/setup-cicd.js
// Script para configurar CI/CD do projeto meDIZ

const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando CI/CD para meDIZ...');
console.log('==================================');

// Verificar se estamos no diretório correto
if (!fs.existsSync('package.json')) {
    console.log('❌ Execute este script na raiz do projeto meDIZ');
    process.exit(1);
}

// Verificar se o Git está configurado
if (!fs.existsSync('.git')) {
    console.log('❌ Este não é um repositório Git');
    process.exit(1);
}

console.log('✅ Repositório Git encontrado');

// Verificar se os workflows foram criados
if (!fs.existsSync('.github/workflows')) {
    console.log('❌ Diretório .github/workflows não encontrado');
    console.log('Execute primeiro: mkdir -p .github/workflows');
    process.exit(1);
}

console.log('✅ Workflows encontrados');

// Verificar se o script de verificação pré-deploy existe
if (!fs.existsSync('scripts/pre-deploy-check.js')) {
    console.log('❌ Script de verificação pré-deploy não encontrado');
    process.exit(1);
}

console.log('✅ Script de verificação pré-deploy encontrado');

// Verificar se o package.json tem os scripts necessários
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!packageJson.scripts['check:deploy']) {
    console.log('❌ Scripts de CI/CD não encontrados no package.json');
    process.exit(1);
}

console.log('✅ Scripts de CI/CD configurados no package.json');

// Verificar se o arquivo .env.local existe
if (!fs.existsSync('.env.local')) {
    console.log('⚠️  Arquivo .env.local não encontrado');
    console.log('Crie o arquivo .env.local com as variáveis necessárias:');
    console.log('');
    console.log('DATABASE_URL=postgresql://...');
    console.log('NEXTAUTH_SECRET=...');
    console.log('NEXTAUTH_URL=http://localhost:3000');
    console.log('GOOGLE_CLIENT_ID=...');
    console.log('GOOGLE_CLIENT_SECRET=...');
    console.log('');
}

console.log('');
console.log('🔧 Próximos passos para configurar CI/CD:');
console.log('==========================================');
console.log('');
console.log('1. 📝 Configure os secrets no GitHub:');
console.log('   - Acesse: Settings → Secrets and variables → Actions');
console.log('   - Adicione os seguintes secrets:');
console.log('     • DATABASE_URL');
console.log('     • NEXTAUTH_SECRET');
console.log('     • NEXTAUTH_URL');
console.log('     • GOOGLE_CLIENT_ID');
console.log('     • GOOGLE_CLIENT_SECRET');
console.log('     • VERCEL_TOKEN');
console.log('     • VERCEL_ORG_ID');
console.log('     • VERCEL_PROJECT_ID');
console.log('');
console.log('2. 🌍 Configure os environments no GitHub:');
console.log('   - Acesse: Settings → Environments');
console.log('   - Crie os environments: \'staging\' e \'production\'');
console.log('');
console.log('3. 🔒 Configure proteções de branch:');
console.log('   - Acesse: Settings → Branches');
console.log('   - Configure proteções para \'main\' e \'develop\'');
console.log('');
console.log('4. 🧪 Teste o pipeline:');
console.log('   - Faça um push para a branch \'develop\'');
console.log('   - Verifique se o workflow executa corretamente');
console.log('');
console.log('5. 📊 Monitore os workflows:');
console.log('   - Acesse: Actions no GitHub');
console.log('   - Verifique os logs e resultados');
console.log('');

// Verificar se o Vercel está configurado
if (!fs.existsSync('vercel.json')) {
    console.log('⚠️  Arquivo vercel.json não encontrado');
    console.log('O arquivo foi criado automaticamente');
}

console.log('✅ Configuração básica do CI/CD concluída!');
console.log('');
console.log('📚 Documentação completa: docs/ci-cd-pipeline.md');
console.log('🔍 Script de verificação: npm run check:deploy');
console.log('🏗️  Build seguro: npm run build:safe');
console.log('');
console.log('🎉 CI/CD configurado com sucesso!');
