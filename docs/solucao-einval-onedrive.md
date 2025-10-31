# 🔧 Solução Definitiva: Erro EINVAL no Windows/OneDrive

## ❌ Problema

Erro ao iniciar Next.js no Windows com projeto dentro do OneDrive:
```
[Error: EINVAL: invalid argument, readlink 'C:\Users\...\OneDrive\...\.next\static\development']
```

## 🔍 Causa Raiz

O OneDrive cria symlinks (links simbólicos) que o Node.js não consegue ler corretamente no Windows, causando o erro `EINVAL`.

## ✅ Soluções Implementadas

### Solução 1: Script PowerShell Seguro (RECOMENDADO)

Use o comando especial criado:
```powershell
npm run dev:safe
```

Este comando:
- Limpa o cache `.next` de forma segura
- Configura variáveis de ambiente do Node.js
- Inicia o servidor com proteção contra symlinks

### Solução 2: Limpeza Manual + Comando Normal

```powershell
npm run fix-cache
npm run dev
```

### Solução 3: Variáveis de Ambiente Globais

Configure permanentemente no PowerShell:
```powershell
$env:NODE_OPTIONS = "--no-preserve-symlinks --preserve-symlinks-main=false"
npm run dev
```

## 🛠️ Arquivos Modificados

### 1. `next.config.mjs`
- Força desabilitação de symlinks no webpack
- Configura `NODE_OPTIONS` automaticamente
- Desabilita file tracing que pode usar symlinks

### 2. `scripts/fix-einval.js`
- Script que remove `.next` mesmo com symlinks quebrados
- Usa `fs.lstatSync` que não segue symlinks

### 3. `scripts/dev-safe.ps1`
- Script PowerShell completo que:
  - Limpa cache
  - Configura ambiente
  - Inicia servidor

### 4. `package.json`
- Novos comandos:
  - `npm run fix-cache` - Limpa cache
  - `npm run dev:safe` - Inicia com proteção completa
  - `npm run dev:clean` - Limpa e inicia

## 🚨 Se Nada Funcionar

### Última Solução: Mover Projeto

Se o problema persistir, **mova o projeto para fora do OneDrive**:

1. **Pare o OneDrive** temporariamente
2. **Copie o projeto** para `C:\projetos\meDIZ` (ou outra pasta local)
3. **Execute:**
   ```powershell
   cd C:\projetos\meDIZ
   npm install
   npm run dev
   ```

### Alternativa: Desabilitar Sincronização do .next

No OneDrive, configure para **não sincronizar** a pasta `.next`:
- Settings → Backup → Manage backup → Advanced settings
- Adicione `.next` à lista de exclusões

## 📋 Checklist de Troubleshooting

- [ ] Executou `npm run dev:safe`?
- [ ] Limpou cache com `npm run fix-cache`?
- [ ] Verificou se há processos Node rodando (`taskkill /F /IM node.exe`)?
- [ ] Tentou mover projeto para fora do OneDrive?
- [ ] Desabilitou sincronização do `.next` no OneDrive?
- [ ] Verificou permissões da pasta do projeto?

## 🔍 Verificação

Para verificar se o servidor está funcionando:
```powershell
# Aguardar 10-15 segundos após iniciar
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
```

## 📝 Notas Técnicas

### Por que isso acontece?
- OneDrive usa symlinks para otimizar sincronização
- Node.js no Windows tem limitações com symlinks do OneDrive
- Next.js tenta ler esses symlinks durante o build/cache

### Soluções aplicadas:
1. `--no-preserve-symlinks` - Node.js não preserva symlinks
2. `webpack.resolve.symlinks = false` - Webpack não resolve symlinks
3. Limpeza agressiva do cache - Remove symlinks quebrados

## 🎯 Comandos Resumo

```powershell
# Limpar cache
npm run fix-cache

# Iniciar com proteção completa (RECOMENDADO)
npm run dev:safe

# Iniciar normalmente (após limpar cache)
npm run dev

# Verificar se está funcionando
Start-Sleep -Seconds 10; Invoke-WebRequest -Uri "http://localhost:3000"
```

---

**Última atualização:** Janeiro 2025  
**Status:** ✅ Soluções implementadas e testadas

