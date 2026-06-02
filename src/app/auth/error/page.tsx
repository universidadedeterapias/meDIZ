'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const errorMessages: Record<string, string> = {
  Configuration: 'Há um problema com a configuração do servidor.',
  AccessDenied: 'Você não tem permissão para acessar esta conta.',
  Verification: 'O token de verificação expirou ou já foi usado.',
  Default: 'Ocorreu um erro inesperado durante a autenticação.'
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  
  const errorMessage = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Erro de Autenticação
          </CardTitle>
          <CardDescription>
            Não foi possível completar o processo de login
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Login
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/admin-login">
                Login Administrativo
              </Link>
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p>Código do erro: <code className="bg-gray-100 px-2 py-1 rounded">{error}</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
