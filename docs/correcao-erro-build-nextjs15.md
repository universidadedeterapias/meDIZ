# Correção do Erro de Build Next.js 15 - UnhandledSchemeError

## 🚨 **PROBLEMA IDENTIFICADO**

O projeto estava apresentando erro de build do Next.js 15:

```
Module build failed: UnhandledSchemeError: Reading from "node:child_process" is not handled by plugins (Unhandled scheme).
Webpack supports "data:" and "file:" URIs by default. You may need an additional plugin to handle "node:" URIs.
```

**Erros similares para:**
- `node:module`
- `node:os` 
- `node:path`
- `node:process`
- `node:url`
- `node:async_hooks`

## 🔍 **CAUSA RAIZ**

O erro ocorreu devido a duas questões principais:

1. **Middleware usando `auth()` do NextAuth v5**: O middleware estava tentando usar `auth()` que depende de módulos Node.js internos, mas o middleware do Next.js tem limitações específicas.

2. **Configuração Webpack inadequada**: O Next.js 15 não estava configurado para lidar adequadamente com módulos Node.js no ambiente do cliente.

## ✅ **SOLUÇÕES IMPLEMENTADAS**

### 1. **Correção do Middleware**

**Arquivo:** `src/middleware.ts`

**Problema:** Usando `auth()` do NextAuth v5 no middleware
```typescript
// ❌ ANTES - Causava erro
import { auth } from '@/auth'
const session = await auth()
```

**Solução:** Usar `getToken` que é compatível com middleware
```typescript
// ✅ DEPOIS - Funciona corretamente
import { getToken } from 'next-auth/jwt'
const token = await getToken({
  req: request,
  secret: process.env.NEXTAUTH_SECRET
})
```

### 2. **Configuração Webpack no Next.js**

**Arquivo:** `next.config.ts`

**Adicionado:**
```typescript
// Configuração para lidar com módulos Node.js no cliente
webpack: (config, { isServer }) => {
  if (!isServer) {
    // Resolver módulos Node.js para o cliente
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
      child_process: false,
      module: false,
      async_hooks: false,
      process: false,
    }
  }
  return config
},
// Configuração experimental para Next.js 15
experimental: {
  serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs']
}
```

## 🧪 **TESTE DAS CORREÇÕES**

### **Script de Teste Criado:**
- **Arquivo:** `src/scripts/test-build-fix.ts`
- **Comando:** `npm run test-build-fix`

### **Resultados dos Testes:**
```
✅ Servidor respondendo corretamente
✅ Página de login admin carregando
✅ API de debug funcionando
✅ Encontrados 1 usuários admin
✅ Encontrados 7 planos
```

## 📋 **ARQUIVOS MODIFICADOS**

### **Correções Principais:**
1. `src/middleware.ts` - Substituído `auth()` por `getToken`
2. `next.config.ts` - Adicionada configuração Webpack e experimental

### **Scripts de Teste:**
3. `src/scripts/test-build-fix.ts` - Script de teste das correções
4. `package.json` - Adicionado comando `test-build-fix`

## 🚀 **COMO TESTAR**

### **1. Verificar se o servidor está funcionando:**
```bash
npm run dev
```

### **2. Executar teste completo:**
```bash
npm run test-build-fix
```

### **3. Testar manualmente:**
1. Acesse: `http://localhost:3000/admin-login`
2. Faça login com usuário admin
3. Navegue entre páginas do admin
4. Verifique se não há mais erros no console

## ✅ **STATUS FINAL**

**🎉 ERRO DE BUILD CORRIGIDO COM SUCESSO**

- ✅ Servidor Next.js 15 funcionando corretamente
- ✅ Middleware de autenticação operacional
- ✅ Páginas do admin carregando sem erros
- ✅ APIs funcionando normalmente
- ✅ Sistema de autenticação estável

## 🔧 **LIÇÕES APRENDIDAS**

1. **Middleware do Next.js**: Não pode usar `auth()` do NextAuth v5, deve usar `getToken`
2. **Next.js 15**: Requer configuração específica do Webpack para módulos Node.js
3. **Server Components**: `auth()` deve ser usado apenas em Server Components, não em middleware
4. **Configuração Experimental**: `serverComponentsExternalPackages` ajuda com dependências do servidor

## 📚 **REFERÊNCIAS**

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [NextAuth v5 Migration](https://authjs.dev/getting-started/migrating-to-v5)
- [Next.js 15 Webpack Configuration](https://nextjs.org/docs/app/api-reference/next-config-js/webpack)

---

**Status:** ✅ **RESOLVIDO**  
**Data:** 07/10/2025  
**Versão:** Next.js 15.2.4
