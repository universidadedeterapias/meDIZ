// Script para corrigir problemas EINVAL com symlinks no Windows/OneDrive
const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo problemas de symlinks no Windows/OneDrive...\n');

const nextDir = path.join(process.cwd(), '.next');

// Função para remover diretório recursivamente, evitando problemas com symlinks
function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  try {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      
      try {
        const stat = fs.lstatSync(filePath); // lstat não segue symlinks
        
        if (stat.isDirectory()) {
          removeDir(filePath);
        } else {
          // Remove arquivo ou symlink quebrado
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        // Se não conseguir ler, tenta remover diretamente
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn(`⚠️  Não foi possível remover: ${filePath}`);
        }
      }
    });
    
    // Remove o diretório vazio
    fs.rmdirSync(dirPath);
  } catch (err) {
    // Se falhar, tenta usar fs.rmSync (Node 14+)
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch (e) {
      console.error(`❌ Erro ao remover ${dirPath}:`, e.message);
    }
  }
}

// Remove .next completamente
if (fs.existsSync(nextDir)) {
  console.log('🗑️  Removendo diretório .next...');
  removeDir(nextDir);
  console.log('✅ Diretório .next removido com sucesso!\n');
} else {
  console.log('✅ Diretório .next não existe (já está limpo)\n');
}

console.log('✅ Correção concluída! Agora execute: npm run dev\n');

