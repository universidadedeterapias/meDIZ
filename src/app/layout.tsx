import { ThemeProvider } from '@/components/theme-provider'
import { UserProvider } from '@/contexts/user'
import SessionProvider from '@/components/SessionProvider'
import { HydrationBoundary } from '@/components/hydration-boundary'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'meDIZ!',
  description: 'Aplicativo meDIZ!',
  icons: {
    icon: 'https://mediz.app/imgs/logo192.png',
    apple: 'https://mediz.app/imgs/logo512.png'
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <HydrationBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <SessionProvider>
              <UserProvider>{children}</UserProvider>
            </SessionProvider>
          </ThemeProvider>
        </HydrationBoundary>
      </body>
    </html>
  )
}
