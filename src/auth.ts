import { PrismaAdapter } from '@auth/prisma-adapter'
import { compare } from 'bcryptjs'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

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
        const { email, password } = credentials as {
          email?: string
          password?: string
        }
        if (!email || !password) return null
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user?.passwordHash) return null
        const isValid = await compare(password, user.passwordHash)
        if (!isValid) return null
        return { id: user.id, name: user.name!, email: user.email }
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
        // NÃO definir domain em dev; em prod só se precisar compartilhar entre subdomínios
        // domain: process.env.NODE_ENV === 'production' ? '.mediz.com' : undefined,
      },
    },
  },
  callbacks: {
    // **1**: Antes de tudo, tenta linkar conta Google existente
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        // procura usuário com mesmo e‑mail
        const existing = await prisma.user.findUnique({
          where: { email: profile.email }
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
  // opcional: redireciona erros pra uma página customizada
  pages: {
    error: '/auth/error' // vai receber ?error=OAuthAccountNotLinked
  }
})
