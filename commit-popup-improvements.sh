#!/bin/bash

# Script para fazer commit das melhorias do popup

echo "🚀 Criando branch e commitando melhorias do popup..."

# Criar nova branch
git checkout -b fix/popup-image-and-ux-improvements

# Adicionar todos os arquivos modificados
git add .

# Fazer commit com mensagem descritiva
git commit -m "fix: Corrigir imagem cortada do popup e melhorar UX

- Corrigir carregamento da imagem com unoptimized=true
- Aumentar tamanho da imagem (280-320px)
- Reduzir tamanho da descrição (prose-xs)
- Trocar ordem dos botões (Assinar Agora primeiro)
- Otimizar layout para não precisar de scroll
- Remover elementos de debug
- Melhorar responsividade do popup

Fixes: Imagem cortada no popup promocional
Improves: UX do popup com melhor hierarquia visual"

echo "✅ Commit realizado com sucesso!"
echo "📋 Branch: fix/popup-image-and-ux-improvements"
echo "🔧 Para fazer push: git push origin fix/popup-image-and-ux-improvements"
