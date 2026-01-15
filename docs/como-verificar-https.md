# 🔒 Como Verificar se o Site Está Usando HTTPS

## 📋 Formas de Verificar HTTPS

### 1️⃣ **Verificação Visual no Navegador** (Mais Simples)

#### **Chrome/Edge/Brave:**
- ✅ **Cadeado verde** 🔒 no início da barra de endereço = HTTPS
- ❌ **Ícone de informação** ⓘ ou **"Não seguro"** = HTTP
- ✅ URL começa com `https://` = HTTPS
- ❌ URL começa com `http://` = HTTP

#### **Firefox:**
- ✅ **Cadeado cinza** 🔒 = HTTPS
- ✅ **Cadeado verde** 🔒 com nome da empresa = HTTPS com certificado estendido
- ❌ **Cadeado riscado** ou **"Não seguro"** = HTTP

#### **Safari (iOS/Mac):**
- ✅ **Cadeado** 🔒 na barra de endereço = HTTPS
- ❌ **Sem cadeado** ou **"Não seguro"** = HTTP

### 2️⃣ **Verificar na URL**

Olhe para a barra de endereço do navegador:

```
✅ HTTPS (Seguro):
https://mediz.app
https://www.mediz.app

❌ HTTP (Não Seguro):
http://mediz.app
http://localhost:3000
```

**Regra simples:** Se começa com `https://` = seguro ✅

### 3️⃣ **Verificar Programaticamente (JavaScript)**

No console do navegador (F12):

```javascript
// Verificar se está em HTTPS
if (window.location.protocol === 'https:') {
  console.log('✅ Site está usando HTTPS')
} else {
  console.log('❌ Site está usando HTTP')
}

// Verificar URL completa
console.log('URL atual:', window.location.href)
console.log('Protocolo:', window.location.protocol)
```

### 4️⃣ **Verificar no Código (Server-side)**

No seu código Next.js, você pode verificar:

```typescript
// Em uma API Route ou Server Component
const isHTTPS = process.env.NEXTAUTH_URL?.startsWith('https://') || 
                process.env.VERCEL_URL?.includes('vercel.app') ||
                process.env.NODE_ENV === 'production'

if (isHTTPS) {
  console.log('✅ HTTPS configurado')
} else {
  console.log('⚠️ Pode não estar em HTTPS')
}
```

### 5️⃣ **Verificar Variáveis de Ambiente**

No seu arquivo `.env` ou nas configurações do Vercel:

```env
# ✅ HTTPS (Produção)
NEXTAUTH_URL=https://mediz.app

# ❌ HTTP (Desenvolvimento local)
NEXTAUTH_URL=http://localhost:3000
```

### 6️⃣ **Testar com Ferramentas Online**

Use estas ferramentas para verificar o certificado SSL:

- **SSL Labs:** https://www.ssllabs.com/ssltest/
- **SSL Checker:** https://www.sslshopper.com/ssl-checker.html
- **Digicert:** https://www.digicert.com/help/

Digite seu domínio (ex: `mediz.app`) e veja o status do certificado.

## 🎯 Verificação Rápida para meDIZ

### **Em Produção (Vercel):**
1. Acesse: https://mediz.app
2. Olhe para a barra de endereço
3. Deve ter **cadeado verde** 🔒
4. URL deve começar com `https://`

### **Em Desenvolvimento Local:**
- Normalmente usa `http://localhost:3000` (HTTP)
- Isso é **normal** para desenvolvimento
- **Não funciona** para notificações push iOS (precisa HTTPS)

## ⚠️ Importante para Notificações Push

### **iOS:**
- ✅ **Requer HTTPS obrigatoriamente**
- ❌ HTTP não funciona para push notifications
- ✅ Vercel fornece HTTPS automaticamente

### **Android:**
- ✅ Funciona com HTTP em desenvolvimento (localhost)
- ✅ Funciona com HTTPS em produção
- ✅ Recomendado usar HTTPS sempre

## 🔧 Como Forçar HTTPS no Vercel

O Vercel **fornece HTTPS automaticamente** para todos os domínios. Não precisa configurar nada!

Se você quiser garantir redirecionamento HTTP → HTTPS, adicione no `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "has": [
        {
          "type": "header",
          "key": "x-forwarded-proto",
          "value": "http"
        }
      ],
      "destination": "https://mediz.app/:1",
      "permanent": true
    }
  ]
}
```

Mas geralmente **não é necessário** - o Vercel já faz isso automaticamente.

## ✅ Checklist de Verificação

- [ ] URL começa com `https://`
- [ ] Cadeado 🔒 visível na barra de endereço
- [ ] Navegador não mostra aviso de "Não seguro"
- [ ] `NEXTAUTH_URL` configurado com `https://` em produção
- [ ] Certificado SSL válido (verificar com SSL Labs)

## 🚨 Problemas Comuns

### **"Site não seguro" no navegador:**
- Certificado SSL expirado ou inválido
- Domínio não configurado corretamente
- **Solução:** Verificar configuração no Vercel

### **HTTP em produção:**
- `NEXTAUTH_URL` configurado com `http://`
- **Solução:** Alterar para `https://mediz.app`

### **HTTPS não funciona:**
- Verificar configuração de domínio no Vercel
- Verificar se o certificado SSL está ativo
- **Solução:** Vercel fornece SSL automaticamente, verificar configuração do domínio
