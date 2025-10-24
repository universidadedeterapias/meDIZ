'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface PasswordResetModalProps {
  userId: string
  userName: string
  userEmail: string
  onPasswordReset?: () => void
}

export function PasswordResetModal({ userId, userName, userEmail, onPasswordReset }: PasswordResetModalProps) {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [useDefault, setUseDefault] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleReset = async () => {
    setLoading(true)
    setMessage(null)

    const passwordToSend = useDefault ? 'mediz123' : newPassword

    if (!useDefault && passwordToSend.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' })
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, newPassword: passwordToSend }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        setNewPassword('')
        setUseDefault(true)
        onPasswordReset?.()
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao resetar senha'
        })
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'Erro de conexão'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4 mr-1" />
          Resetar Senha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Resetar Senha de {userName}</DialogTitle>
          <DialogDescription>
            Você está resetando a senha do usuário <span className="font-medium text-indigo-600">{userEmail}</span>.
            Escolha uma senha padrão ou defina uma nova.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="use-default-password"
              checked={useDefault}
              onChange={(e) => {
                setUseDefault(e.target.checked)
                if (e.target.checked) setNewPassword('')
              }}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <Label htmlFor="use-default-password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Usar senha padrão (mediz123)
            </Label>
          </div>
          {!useDefault && (
            <div className="grid gap-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="col-span-3"
              />
            </div>
          )}
          {message && (
            <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <span>{message.text}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleReset} disabled={loading || (!useDefault && newPassword.length < 6)}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resetar Senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}