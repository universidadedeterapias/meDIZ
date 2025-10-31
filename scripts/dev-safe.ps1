# Script PowerShell seguro para iniciar Next.js no Windows/OneDrive
Write-Host "🔧 Iniciando servidor Next.js com proteção contra symlinks..." -ForegroundColor Cyan

# 1. Limpa cache
Write-Host "`n1️⃣ Limpando cache .next..." -ForegroundColor Yellow
node scripts/fix-einval.js

# 2. Configura variáveis de ambiente
Write-Host "`n2️⃣ Configurando variáveis de ambiente..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--no-preserve-symlinks --preserve-symlinks-main=false"
Write-Host "   ✅ NODE_OPTIONS configurado" -ForegroundColor Green

# 3. Inicia servidor
Write-Host "`n3️⃣ Iniciando servidor Next.js..." -ForegroundColor Yellow
Write-Host "   ⏳ Aguarde...`n" -ForegroundColor Gray

& npm run dev

