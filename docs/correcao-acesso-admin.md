# Correção de Acesso ao Painel Administrativo

## Problema Identificado

O acesso ao painel administrativo (`/admin`) estava apresentando os seguintes erros:

1. Erro de build com a mensagem: 
   ```
   Attempted import error: 'getServerSession' is not exported from 'next-auth'
   ```

2. Erro de middleware:
   ```
   /src/middleware contains invalid middleware config: source must start with / at "matcher[1]"
   ```

3. Erro 401 (Não autorizado) ao tentar acessar o painel, mesmo com credenciais válidas.

## Causa Raiz

1. **Incompatibilidade de Versões**: O código estava usando a função `getServerSession()` importada diretamente de 'next-auth', mas na versão 5 do NextAuth.js (que estamos usando), essa função foi substituída por `auth()` configurada no arquivo `src/auth.ts`.

2. **Configuração Incorreta no Middleware**: A configuração do matcher no middleware tinha um formato incorreto.

3. **Problemas de Autenticação**: O usuário administrador não tinha a senha configurada corretamente ou não estava sendo validado adequadamente.

## Solução Implementada

### 1. Correção do Layout Administrativo

Atualizamos `src/app/admin/layout.tsx` para usar a função `auth()` em vez de `getServerSession()`:

```typescript
// Antes
import { getServerSession } from 'next-auth'
const session = await getServerSession()

// Depois
import { auth } from '@/auth'
const session = await auth()
```

### 2. Correção do Middleware

Atualizamos `src/middleware.ts` para usar o formato correto de matcher e melhorar o tratamento de rotas:

```typescript
// Configurar quais caminhos o middleware deve executar
export const config = {
  matcher: ['/admin/:path*', '/admin-login']
}
```

### 3. Garantia de Usuário Admin

Criamos um script `src/scripts/ensure-admin.js` para verificar e criar um usuário administrador com credenciais válidas:

```javascript
// Verificar se existe admin com email @mediz.com
const existingAdmin = await prisma.user.findFirst({
  where: {
    email: {
      endsWith: '@mediz.com'
    }
  }
});

// Atualizar senha para garantir acesso
const hashedPassword = await bcrypt.hash('Admin123!', 10);
```

### 4. Correção do Endpoint de Debug

Atualizamos `src/app/api/auth-debug/route.ts` para usar `await` com `cookies()`:

```typescript
// Antes
const cookiesList = cookies()

// Depois
const cookiesList = await cookies()
```

## Como Acessar o Painel Administrativo

1. Inicie o servidor de desenvolvimento: `npm run dev`

2. Acesse: `http://localhost:3000/admin-login`

3. Faça login com as credenciais:
   - **Email**: marianna.yaskara@mediz.com (ou qualquer email com domínio @mediz.com)
   - **Senha**: Admin123!

4. Após o login bem-sucedido, você será redirecionado para o painel: `http://localhost:3000/admin`

## Verificação e Solução de Problemas

Se encontrar problemas ao acessar o painel, execute:

```bash
npm run ensure-admin
```

Este comando verificará se existe um usuário administrador e, se necessário, criará um novo ou atualizará a senha do existente.

## Observações Importantes

1. O acesso ao painel administrativo é restrito a usuários com emails que terminam com `@mediz.com`.

2. A validação é feita em três camadas:
   - No middleware (para todas as rotas `/admin/*`)
   - No layout do admin (para verificação adicional)
   - Nas APIs administrativas

3. Se você precisar adicionar um novo administrador, use o script `ensure-admin.js` como referência para criar um novo usuário com email `@mediz.com`.

---

*Última atualização: Outubro de 2025*