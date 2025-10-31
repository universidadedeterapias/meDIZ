'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Crown, ExternalLink } from 'lucide-react'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal exibido para usuários sem assinatura ativa
 * quando tentam usar funcionalidades premium
 */
export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const handleUpgrade = () => {
    // Redireciona para a página de upgrade (Hotmart)
    window.open('https://go.hotmart.com/N101121884P', '_blank')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold text-indigo-600">
            Função Premium
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 mt-2">
            Esta funcionalidade está disponível apenas para usuários do plano profissional.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-semibold text-indigo-800 mb-2">
              Com o plano profissional você tem:
            </h3>
            <ul className="space-y-1 text-sm text-indigo-700">
              <li>• Exportação de consultas em PDF</li>
              <li>• Organização de sintomas em pastas personalizadas</li>
              <li>• Adição de observações e notas nas pastas</li>
              <li>• Acesso completo a todas as funcionalidades</li>
              <li>• Sem limitações de uso</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3"
            >
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade Agora
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
