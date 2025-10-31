// scripts/pre-deploy-check.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Pre-deployment check starting...\n');

// Check for bcrypt vs bcryptjs
const checkBcrypt = () => {
  const files = getAllFiles('./src');
  let issues = 0;
  
  files.forEach(file => {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes("from 'bcrypt'") || content.includes('from "bcrypt"')) {
        console.log(`❌ Found 'bcrypt' import in: ${file}`);
        console.log('   Replace with: bcryptjs');
        issues++;
      }
    }
  });
  
  return issues;
};

// Check for server imports in client components
const checkClientComponents = () => {
  const files = getAllFiles('./src');
  let issues = 0;
  
  files.forEach(file => {
    if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('"use client"') || content.includes("'use client'")) {
        if (content.includes('@prisma/client')) {
          console.log(`❌ Prisma Client in client component: ${file}`);
          issues++;
        }
        if (content.includes('bcryptjs') || content.includes('bcrypt')) {
          console.log(`❌ bcrypt in client component: ${file}`);
          issues++;
        }
      }
    }
  });
  
  return issues;
};

// Check for missing environment variables
const checkEnvVariables = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];
  
  let issues = 0;
  
  // Check if .env.local exists
  if (!fs.existsSync('.env.local')) {
    console.log('❌ .env.local file not found');
    console.log('   Create .env.local with required environment variables');
    issues++;
    return issues;
  }
  
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  requiredEnvVars.forEach(envVar => {
    if (!envContent.includes(`${envVar}=`)) {
      console.log(`❌ Missing environment variable: ${envVar}`);
      issues++;
    }
  });
  
  return issues;
};

// Check for TypeScript errors
const checkTypeScript = () => {
  console.log('🔍 Checking TypeScript compilation...');
  
  try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
    return 0;
  } catch (error) {
    console.log('\n❌ TypeScript compilation errors found:');
    console.log('═══════════════════════════════════════════════════════════');
    const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
    if (output) {
      // Separar erros por linha e destacar
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.includes('error TS')) {
          console.log('  ❌', line);
        } else if (line.trim()) {
          console.log('     ', line);
        }
      });
    }
    console.log('═══════════════════════════════════════════════════════════');
    return 1;
  }
};

// Check for ESLint errors
const checkESLint = () => {
  console.log('🔍 Checking ESLint...');
  
  try {
    const { execSync } = require('child_process');
    execSync('npx eslint src --ext .ts,.tsx', { stdio: 'pipe' });
    console.log('✅ ESLint checks passed');
    return 0;
  } catch (error) {
    console.log('\n❌ ESLint errors found:');
    console.log('═══════════════════════════════════════════════════════════');
    const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
    if (output) {
      // Separar erros por arquivo
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.includes('error') || line.includes('warning')) {
          console.log('  ❌', line);
        } else if (line.trim()) {
          console.log('     ', line);
        }
      });
    }
    console.log('═══════════════════════════════════════════════════════════');
    return 1;
  }
};

// Check for Prisma schema issues
const checkPrisma = () => {
  console.log('🔍 Checking Prisma schema...');
  
  try {
    const { execSync } = require('child_process');
    execSync('npx prisma validate', { stdio: 'pipe' });
    console.log('✅ Prisma schema is valid');
    return 0;
  } catch (error) {
    console.log('❌ Prisma schema validation failed:');
    console.log(error.stdout?.toString() || error.message);
    return 1;
  }
};

function getAllFiles(dirPath, arrayOfFiles = []) {
  try {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
          arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        }
      } else {
        arrayOfFiles.push(fullPath);
      }
    });
  } catch (error) {
    // Directory might not exist or be accessible
    console.log(`⚠️  Warning: Could not access directory ${dirPath}`);
  }
  
  return arrayOfFiles;
}

// Run all checks
const runChecks = () => {
  let totalIssues = 0;
  
  console.log('📦 Checking package imports...');
  totalIssues += checkBcrypt();
  totalIssues += checkClientComponents();
  
  console.log('\n🔧 Checking environment variables...');
  totalIssues += checkEnvVariables();
  
  console.log('\n📝 Checking code quality...');
  totalIssues += checkTypeScript();
  totalIssues += checkESLint();
  
  console.log('\n🗄️  Checking database schema...');
  totalIssues += checkPrisma();
  
  return totalIssues;
};

// Main execution
const totalIssues = runChecks();

if (totalIssues === 0) {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ TODAS AS VERIFICAÇÕES PASSARAM!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 Pronto para deployment.');
  console.log('💡 Execute: npm run build');
  console.log('═══════════════════════════════════════════════════════════\n');
} else {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`❌ ERROS ENCONTRADOS: ${totalIssues} problema(s) detectado(s)`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('⚠️  CORRIJA OS ERROS ANTES DE FAZER COMMIT!');
  console.log('\n💡 Comandos úteis para debugar:');
  console.log('   • npm run check:deploy     - Executar todas as verificações');
  console.log('   • npx tsc --noEmit        - Verificar apenas TypeScript');
  console.log('   • npx eslint src          - Verificar apenas ESLint');
  console.log('   • npx prisma validate     - Verificar apenas Prisma');
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(1);
}
