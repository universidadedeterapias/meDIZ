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
  // Skip this check in CI/CD environments
  // Environment variables should be set as GitHub Secrets or Vercel Environment Variables
  if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.VERCEL) {
    console.log('⏭️  Skipping local env check (running in CI/CD)');
    return 0;
  }
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];
  
  let issues = 0;
  
  // Check if .env.local exists (only for local development)
  if (!fs.existsSync('.env.local')) {
    console.log('⚠️  .env.local file not found');
    console.log('   Note: In CI/CD, environment variables should be configured as secrets');
    console.log('   For local development, create .env.local with required variables');
    // Don't fail in CI/CD - just warn
    return 0;
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
    console.log('❌ TypeScript compilation errors found:');
    console.log(error.stdout?.toString() || error.message);
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
    console.log('❌ ESLint errors found:');
    console.log(error.stdout?.toString() || error.message);
    return 1;
  }
};

// Check for Prisma schema issues
const checkPrisma = () => {
  console.log('🔍 Checking Prisma schema...');
  
  // Em CI/CD, usar DATABASE_URL dummy (o workflow já fornece)
  // Em ambiente local, usar dummy apenas para validação do schema
  const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.VERCEL;
  
  if (!isCI && !process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL não encontrada no ambiente local');
    console.log('   Configure DATABASE_URL no arquivo .env ou .env.local');
    console.log('   Em CI/CD, a variável é fornecida automaticamente pelo workflow');
    console.log('   Usando valor dummy apenas para validação do schema Prisma...');
  }
  
  try {
    const { execSync } = require('child_process');
    // Usar dummy se não estiver definida (apenas para validação do schema, não para uso real)
    const env = {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test'
    };
    execSync('npx prisma validate', { 
      stdio: 'pipe',
      env: env
    });
    console.log('✅ Prisma schema is valid');
    return 0;
  } catch (error) {
    const errorMessage = error.stdout?.toString() || error.message || '';
    console.log('❌ Prisma schema validation failed:');
    console.log(errorMessage);
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
  console.log('\n✅ All checks passed! Ready for deployment.');
  console.log('🚀 You can now run: npm run build');
} else {
  console.log(`\n⚠️  Found ${totalIssues} issues. Fix before deploying.`);
  console.log('💡 Run individual checks:');
  console.log('   - npm run check:deploy (this script)');
  console.log('   - npx tsc --noEmit (TypeScript)');
  console.log('   - npx eslint src (ESLint)');
  console.log('   - npx prisma validate (Prisma)');
  process.exit(1);
}
