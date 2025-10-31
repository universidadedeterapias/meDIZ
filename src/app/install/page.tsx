'use client'

import Image from 'next/image'
import React, { FC, useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

import { ArrowRight, CheckCircle, Download, Smartphone } from 'lucide-react'

import bannerApp from '@/app/assets/bannerapp(1).png'
import medizIcon from '@/app/assets/iconemeDIZ512x512.png'
import tela1 from '@/app/assets/TELA1.jpeg'
import tela2 from '@/app/assets/TELA2.png'
import tela3 from '@/app/assets/TELA3.jpeg'

// ----------------------------------------------------------------------------
// Evento de beforeinstallprompt
// ----------------------------------------------------------------------------
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

// ----------------------------------------------------------------------------
// Props para o componente de passos de instalação
// ----------------------------------------------------------------------------
interface InstallStepsProps {
  title: string
  steps: string[]
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const InstallSteps: FC<InstallStepsProps> = ({ title, steps, icon: Icon }) => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader className="text-center">
      <div className="flex justify-center mb-2">
        <Icon className="w-8 h-8" style={{ color: '#6366f1' }} />
      </div>
      <CardTitle className="text-xl">{title}</CardTitle>
      <CardDescription>Siga os passos abaixo para instalar</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start space-x-3">
            <Badge
              variant="outline"
              className="min-w-[24px] h-6 flex items-center justify-center text-xs"
            >
              {i + 1}
            </Badge>
            <p className="text-sm text-gray-600 flex-1">{step}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const Install: FC = () => {
  // Tipagens de state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deviceType, setDeviceType] = useState<
    'ios' | 'android' | 'desktop' | 'unknown'
  >('unknown')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [browserType, setBrowserType] = useState<
    'safari' | 'chrome' | 'other' | 'unknown'
  >('unknown')
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Detecta device/browser
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceType('ios')
      setBrowserType(/safari/.test(ua) ? 'safari' : 'other')
    } else if (/android/.test(ua)) {
      setDeviceType('android')
      setBrowserType(/chrome/.test(ua) ? 'chrome' : 'other')
    } else {
      setDeviceType('desktop')
    }

    // Captura evento beforeinstallprompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstallPrompt(false)
      }
      setDeferredPrompt(null)
    } else {
      window.location.href = 'https://mediz.app'
    }
  }

  const androidSteps = [
    'Abra o Google Chrome no seu celular',
    'Acesse mediz.app',
    'Toque nos 3 pontos (⋮) no canto superior direito',
    "Selecione 'Instalar app' ou 'Adicionar à tela inicial'",
    "Confirme tocando em 'Instalar'"
  ]

  const iosSteps = [
    'Abra o Safari no seu iPhone/iPad',
    'Acesse mediz.app',
    'Toque no ícone de compartilhar (□↗) na parte inferior',
    "Role para baixo e toque em 'Adicionar à Tela de Início'",
    "Toque em 'Adicionar' para confirmar"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src={medizIcon}
            alt="meDIZ Logo"
            width={80}
            height={80}
            className="mx-auto mb-4 rounded-2xl shadow-lg"
          />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            meDIZ<span style={{ color: '#fbbf24' }}>!</span>
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Instale o app na tela do seu celular
          </p>

          {/* Quick Install Button */}
          {showInstallPrompt && (
            <div className="mb-6">
              <Button
                onClick={handleInstallClick}
                className="text-white px-8 py-3 text-lg rounded-full shadow-lg transform transition hover:scale-105"
                style={{ backgroundColor: '#6366f1' }}
              >
                <Download className="w-5 h-5 mr-2" />
                Instalar Agora
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Clique no botão acima para instalar automaticamente
              </p>
            </div>
          )}
        </div>

        {/* App Preview */}
        <div className="mb-12">
          <Image
            src={bannerApp}
            alt="meDIZ App Preview"
            width={1024}
            height={512}
            className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl"
          />
        </div>

        {/* Instructions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            Como Instalar o meDIZ!
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <InstallSteps
              title="Android (Chrome)"
              icon={Smartphone}
              steps={androidSteps}
            />
            <InstallSteps
              title="iPhone/iPad (Safari)"
              icon={Smartphone}
              steps={iosSteps}
            />
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-12">
          <h3 className="text-xl font-bold text-center mb-6 text-gray-900">
            Por que instalar o app?
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              {
                title: 'Acesso Rápido',
                desc: 'Ícone na tela inicial para acesso instantâneo'
              },
              {
                title: 'Experiência Nativa',
                desc: 'Funciona como um app real, sem navegador'
              },
              {
                title: 'Sempre Atualizado',
                desc: 'Atualizações automáticas sem precisar baixar'
              }
            ].map(({ title, desc }, i) => (
              <Card key={i} className="text-center">
                <CardContent className="pt-6">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
                  <h4 className="font-semibold mb-2">{title}</h4>
                  <p className="text-sm text-gray-600">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Screenshots */}
        <div className="mb-12">
          <h3 className="text-xl font-bold text-center mb-6 text-gray-900">
            Conheça o meDIZ!
          </h3>
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Image
              src={tela1}
              alt="Tela 1"
              width={300}
              height={600}
              className="w-full rounded-lg shadow-md"
            />
            <Image
              src={tela2}
              alt="Tela 2"
              width={300}
              height={600}
              className="w-full rounded-lg shadow-md"
            />
            <Image
              src={tela3}
              alt="Tela 3"
              width={300}
              height={600}
              className="w-full rounded-lg shadow-md"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={() => (window.location.href = 'https://mediz.app')}
            className="text-white px-8 py-3 text-lg rounded-full shadow-lg transform transition hover:scale-105"
            style={{ backgroundColor: '#6366f1' }}
          >
            Acessar meDIZ.app
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Ou acesse diretamente:{' '}
            <a
              href="https://mediz.app"
              className="underline"
              style={{ color: '#6366f1' }}
            >
              mediz.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Install
