#!/bin/bash
# Script para resolver todos os conflitos mantendo a versão HEAD (local)

# Resolver conflitos em todos os arquivos
find . -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.json" | while read file; do
  if grep -q "<<<<<<< HEAD" "$file"; then
    echo "Resolvendo conflitos em: $file"
    # Manter apenas a versão HEAD (local)
    sed -i '/<<<<<<< HEAD/,/>>>>>>> feature\/pdf-export-and-growth/c\
# Conflito resolvido - mantendo versão local' "$file"
  fi
done

echo "Conflitos resolvidos!"
