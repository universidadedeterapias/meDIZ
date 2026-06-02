import { auth } from '@/auth'
import { isUserPremium } from '@/lib/premiumUtils'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentLanguage } from '@/i18n/server'
import { getUpgradeLink } from '@/lib/upgradeLinks'

/**
 * Endpoint para verificar se usuário pode exportar PDF
 * Validação server-side adicional para segurança
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verifica se usuário tem assinatura ativa
    const isPremium = await isUserPremium(session.user.id)
    
    if (!isPremium) {
      // Obter idioma do usuário e retornar link de upgrade apropriado
      const language = await getCurrentLanguage()
      const upgradeUrl = getUpgradeLink(language)
      
      return NextResponse.json(
        { 
          error: 'Função disponível apenas para assinantes',
          upgradeUrl
        },
        { status: 403 }
      )
    }

    // Se chegou até aqui, usuário pode exportar
    return NextResponse.json({ 
      success: true,
      message: 'Usuário autorizado para exportação PDF'
    })

  } catch (error) {
    console.error('Erro na verificação de exportação PDF:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
