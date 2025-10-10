# Correção do Erro de Build no Painel Administrativo

## Descrição do Problema

Durante o processo de build, encontramos o seguinte erro:

```
Module build failed: UnhandledSchemeError: Reading from "node:async_hooks" is not handled by plugins (Unhandled scheme).
```

Este erro ocorreu porque o layout do painel administrativo (`src/app/admin/layout.tsx`) estava configurado como um componente de cliente ('use client'), mas importava a função `auth()` que utiliza módulos internos do Node.js que não são compatíveis com o ambiente de navegador.

## Causa Raiz

1. O módulo `node:async_hooks` é um módulo interno do Node.js que é usado indiretamente pelo adapter do Prisma no módulo Auth.js.
2. No Next.js, componentes marcados com `'use client'` são executados no navegador, onde módulos específicos do Node.js não estão disponíveis.
3. O layout do admin estava marcado como cliente, mas realizava verificações de autenticação que exigiam acesso às APIs do servidor.

## Solução Implementada

A solução adotada foi dividir o layout em dois componentes:

1. **Componente de Servidor (Server Component)**
   - Arquivo: `src/app/admin/layout.tsx`
   - Responsabilidade: Realizar a verificação de autenticação usando `auth()` no servidor
   - Redirecionar para a página de login caso o usuário não tenha permissões adequadas
   - Passar informações seguras do usuário para o componente cliente

2. **Componente de Cliente (Client Component)**
   - Arquivo: `src/app/admin/AdminClientLayout.tsx`
   - Marcado com `'use client'`
   - Responsabilidade: Renderizar a interface do painel administrativo
   - Gerenciar a navegação entre as diferentes seções
   - Exibir o conteúdo das páginas administrativas

## Benefícios da Solução

1. **Segurança Aprimorada**: A verificação de autenticação é realizada exclusivamente no servidor
2. **Melhor Desempenho**: Menos código JavaScript é enviado para o navegador
3. **Compatibilidade**: Elimina o uso de APIs do Node.js no ambiente do navegador
4. **Experiência do Usuário**: Mantém todas as funcionalidades e aparência do painel administrativo

## Implementação Técnica

### 1. Componente de Servidor (layout.tsx)

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import AdminClientLayout from './AdminClientLayout'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Verificação de autenticação do lado do servidor
  const session = await auth()
  
  // Verifica se o usuário tem permissões de admin
  if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
    redirect('/login')
  }
  
  // Passa as props do usuário para o componente cliente
  return (
    <AdminClientLayout 
      userName={session.user.name || 'Admin'}
      userEmail={session.user.email}
    >
      {children}
    </AdminClientLayout>
  )
}
```

### 2. Componente de Cliente (AdminClientLayout.tsx)

```typescript
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
// ... outros imports ...

interface AdminClientLayoutProps {
  children: React.ReactNode
  userName: string
  userEmail: string
}

export default function AdminClientLayout({
  children,
  userName,
  userEmail
}: AdminClientLayoutProps) {
  const pathname = usePathname()
  
  // Layout com sidebar, header e conteúdo principal
  return (
    <div className="flex min-h-screen">
      {/* Componentes da interface */}
    </div>
  )
}
```

## Conclusão

Esta solução segue o padrão recomendado pelo Next.js para lidar com componentes que precisam de funcionalidades do servidor e do cliente simultaneamente. Ao separar as responsabilidades entre um componente de servidor e um componente de cliente, conseguimos resolver o erro de build e manter todas as funcionalidades do painel administrativo.

O painel administrativo agora funciona corretamente e pode ser acessado através da URL `/admin`, com proteção adequada para garantir que apenas usuários com email contendo o domínio `@mediz.com` tenham acesso.
