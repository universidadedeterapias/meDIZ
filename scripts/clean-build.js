#!/usr/bin/env node

/**
 * Script para limpar cache e arquivos de build antes de fazer deploy
 * Resolve problemas de webpack-runtime e build corrompido
 */

const fs = require('fs')
const path = require('path')

console.log('🧹 Limpando cache e arquivos de build...\n')

const dirsToClean = [
  '.next',
  'node_modules/.cache',
  'dist',
  'out',
  'tsconfig.tsbuildinfo'
]

const filesToClean = [
  'tsconfig.tsbuildinfo'
]

let cleaned = 0

// Remove diretórios
dirsToClean.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir)
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true })
      console.log(`✅ Removido: ${dir}`)
      cleaned++
    } catch (error) {
      console.error(`❌ Erro ao remover ${dir}:`, error.message)
    }
  }
})

// Remove arquivos
filesToClean.forEach(file => {
  const fullPath = path.join(process.cwd(), file)
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath)
      console.log(`✅ Removido: ${file}`)
      cleaned++
    } catch (error) {
      console.error(`❌ Erro ao remover ${file}:`, error.message)
    }
  }
})

if (cleaned === 0) {
  console.log('ℹ️  Nenhum arquivo ou diretório para limpar.')
} else {
  console.log(`\n✅ Limpeza concluída! ${cleaned} item(ns) removido(s).`)
  console.log('💡 Execute "npm run build" para fazer um build limpo.')
}
