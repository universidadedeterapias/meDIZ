import { PrismaAdapter } from '@auth/prisma-adapter'
import { compare } from 'bcryptjs'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

// Verificar se as variáveis de ambiente estão configuradas
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET não está configurado')
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não está configurado')
}

// Validar e corrigir NEXTAUTH_URL
let nextAuthUrl = process.env.NEXTAUTH_URL

if (!nextAuthUrl) {
  // Em desenvolvimento, usar localhost automaticamente
  // Em produção, NEXTAUTH_URL é obrigatório e será lançado um erro
  if (process.env.NODE_ENV === 'development') {
    nextAuthUrl = process.env.PORT 
      ? `http://localhost:${process.env.PORT}`
      : 'http://localhost:3000'
    console.warn('[NextAuth] NEXTAUTH_URL não configurado, usando URL de desenvolvimento:', nextAuthUrl)
  } else {
    // ⚠️ PRODUÇÃO: NEXTAUTH_URL é obrigatório
    console.warn('[NextAuth] NEXTAUTH_URL não configurado')
    throw new Error('NEXTAUTH_URL deve ser configurado em produção')
  }
}

// 🔧 DESENVOLVIMENTO: Se NEXTAUTH_URL aponta para produção, forçar localhost
// ✅ PRODUÇÃO: Esta condição NUNCA será verdadeira, então usa NEXTAUTH_URL normalmente
if (process.env.NODE_ENV === 'development' && nextAuthUrl.includes('mediz.app')) {
  const port = process.env.PORT || '3000'
  nextAuthUrl = `http://localhost:${port}`
  console.warn('[NextAuth] ⚠️ Desenvolvimento detectado - Forçando uso de localhost:', nextAuthUrl)
}

// Garantir que a URL seja válida
try {
  new URL(nextAuthUrl)
} catch {
  console.error('[NextAuth] NEXTAUTH_URL inválida:', nextAuthUrl)
  throw new Error(`NEXTAUTH_URL inválida: ${nextAuthUrl}`)
}

// Log de configuração apenas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('[NextAuth] Configuração:', {
    url: nextAuthUrl,
    secret: process.env.NEXTAUTH_SECRET ? 'Configurado' : 'Não configurado',
    database: process.env.DATABASE_URL ? 'Configurado' : 'Não configurado'
  })
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }),
    CredentialsProvider({
      name: 'E‑mail e Senha',
      credentials: {
        email: { label: 'E‑mail', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        try {
          const { email, password } = credentials as {
            email?: string
            password?: string
          }
          if (!email || !password) return null
          
          // Rate limiting será aplicado na rota /api/admin/audit-logs/login-failed
          // Bloqueio por IP será aplicado na mesma rota
          // Aqui apenas validamos credenciais
          
          const user = await prisma.user.findUnique({ where: { email } })
          if (!user?.passwordHash) return null
          const isValid = await compare(password, user.passwordHash)
          if (!isValid) return null
          return { id: user.id, name: user.name!, email: user.email }
        } catch {
          // Usar sistema de logs estruturado (será implementado)
          return null
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    updateAge: 24 * 60 * 60, // Atualizar a cada 24 horas
  },
  jwt: { 
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 dias
        // NÃO definir domain em dev; em prod só se precisar compartilhar entre subdomínios
        // domain: process.env.NODE_ENV === 'production' ? '.mediz.com' : undefined,
      },
    },
  },
  callbacks: {
    // **1**: Antes de tudo, tenta linkar conta Google existente
    async signIn({ user, account, profile: _profile }) {
      try {
        if (account?.provider === 'google' && _profile?.email) {
          // procura usuário com mesmo e‑mail
          const existing = await prisma.user.findUnique({
            where: { email: _profile.email }
          })
          if (existing && existing.id !== user.id) {
            const sessionState =
              typeof account.session_state === 'string'
                ? account.session_state
                : undefined
            // vincula o provider Google a esse usuário já existente
            await prisma.account.create({
              data: {
                userId: existing.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at!,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: sessionState
              }
            })
            // devolve true pra autorizar o login
            return true
          }
        }
        // em todos os outros casos, segue normalmente
        return true
      } catch (error) {
        console.error('[NextAuth] Erro no callback signIn:', error)
        return false
      }
    },

    // **2**: mantém seus callbacks atuais
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      return session
    }
  },
  
  // Configuração de debug para desenvolvimento
  debug: process.env.NODE_ENV === 'development',
  
  // Configuração de eventos para debug (apenas em desenvolvimento)
  events: process.env.NODE_ENV === 'development' ? {
    async signIn({ user: _user, account, profile: _profile, isNewUser }) {
      console.log('[NextAuth] SignIn event:', { 
        provider: account?.provider,
        isNewUser 
      })
    },
    async signOut() {
      console.log('[NextAuth] SignOut event')
    },
    async createUser() {
      console.log('[NextAuth] CreateUser event')
    },
    async updateUser() {
      console.log('[NextAuth] UpdateUser event')
    },
    async linkAccount({ account }) {
      console.log('[NextAuth] LinkAccount event:', { 
        provider: account.provider 
      })
    },
    async session() {
      console.log('[NextAuth] Session event')
    }
  } : {},
  
  // opcional: redireciona erros pra uma página customizada
  pages: {
    error: '/auth/error' // vai receber ?error=OAuthAccountNotLinked
  }
})
