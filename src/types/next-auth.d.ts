// src/types/next-auth.d.ts
import { DefaultSession } from 'next-auth'

// Declaramos um módulo virtual que “acrescenta” à definição original do NextAuth
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      /** O ID que você injetou no callback jwt */
      id: string
    } & DefaultSession['user']
  }
}
