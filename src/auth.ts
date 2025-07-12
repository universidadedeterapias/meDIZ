import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

const prisma = new PrismaClient()

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }),
    CredentialsProvider({
      name: 'E-mail e Senha',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email?: string
          password?: string
        }
        if (!email || !password) return null
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) return null
        const isValid = await compare(password, user.passwordHash)
        if (!isValid) return null
        return { id: user.id, name: user.name!, email: user.email }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  jwt: {
    maxAge: 365 * 24 * 60 * 60
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      return session
    }
  }
})
