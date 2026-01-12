import { ThemeProvider } from '@/components/theme-provider'
import { UserProvider } from '@/contexts/user'
import SessionProvider from '@/components/SessionProvider'
import { HydrationBoundary } from '@/components/hydration-boundary'
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import PushNotificationBanner from '@/components/PushNotificationBanner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { getCurrentLanguage } from '@/i18n/server'
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
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'meDIZ'
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
  themeColor: '#6366f1'
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const language = await getCurrentLanguage()

  return (
    <html lang={language} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
        data-language={language}
      >
        <HydrationBoundary>
          <GlobalErrorHandler />
          <ServiceWorkerRegistration />
          <LanguageProvider initialLanguage={language}>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <SessionProvider>
                <UserProvider>
                  <PushNotificationBanner />
                  {children}
                </UserProvider>
              </SessionProvider>
            </ThemeProvider>
          </LanguageProvider>
        </HydrationBoundary>
      </body>
    </html>
  )
}
