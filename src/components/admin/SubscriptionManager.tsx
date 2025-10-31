'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface Subscription {
  id: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  createdAt: string
  plan: {
    id: string
    name: string
  }
}

interface Plan {
  id: string
  name: string
  amount: number
  interval: string
  currency: string
}

interface SubscriptionManagerProps {
  userId: string
  userName: string
  userEmail: string
}

export function SubscriptionManager({ userId, userName, userEmail }: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [formData, setFormData] = useState({
    planId: '',
    status: 'active',
    currentPeriodStart: '',
    currentPeriodEnd: ''
  })

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [subscriptionsResponse, plansResponse] = await Promise.all([
        fetch(`/api/admin/subscriptions?userId=${userId}`),
        fetch('/api/admin/plans')
      ])
      
      if (!subscriptionsResponse.ok) {
        throw new Error('Erro ao carregar assinaturas')
      }

      if (!plansResponse.ok) {
        throw new Error('Erro ao carregar planos')
      }

      const [subscriptionsData, plansData] = await Promise.all([
        subscriptionsResponse.json(),
        plansResponse.json()
      ])
      
      setSubscriptions(subscriptionsData)
      setPlans(plansData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao buscar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const handleSave = async () => {
    try {
      setLoading(true)

      if (editingSubscription) {
        // Atualizar subscription existente
        const response = await fetch('/api/admin/subscriptions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSubscription.id,
            ...formData
          })
        })

        if (!response.ok) {
          throw new Error('Erro ao atualizar assinatura')
        }
      } else {
        // Criar nova subscription
        const response = await fetch('/api/admin/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ...formData
          })
        })

        if (!response.ok) {
          throw new Error('Erro ao criar assinatura')
        }
      }

      await fetchSubscriptions()
      setIsDialogOpen(false)
      setEditingSubscription(null)
      setFormData({
        planId: '',
        status: 'active',
        currentPeriodStart: '',
        currentPeriodEnd: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao salvar assinatura:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta assinatura?')) {
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/admin/subscriptions?id=${subscriptionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar assinatura')
      }

      await fetchSubscriptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao deletar assinatura:', err)
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (subscription: Subscription) => {
    setEditingSubscription(subscription)
    setFormData({
      planId: subscription.plan.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart.split('T')[0],
      currentPeriodEnd: subscription.currentPeriodEnd.split('T')[0]
    })
    setIsDialogOpen(true)
  }

  const openCreateDialog = async () => {
    setEditingSubscription(null)
    setFormData({
      planId: '',
      status: 'active',
      currentPeriodStart: new Date().toISOString().split('T')[0],
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    
    // Recarregar planos quando abrir o modal para garantir dados atualizados
    try {
      const plansResponse = await fetch('/api/admin/plans', {
        cache: 'no-store' // Força busca atualizada, sem cache
      })
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setPlans(plansData)
      }
    } catch (err) {
      console.error('Erro ao recarregar planos:', err)
    }
    
    setIsDialogOpen(true)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'canceled':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'cancel_at_period_end':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Assinaturas
            </CardTitle>
            <CardDescription>
              Gerenciar assinaturas de {userName} ({userEmail})
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Assinatura
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSubscription ? 'Editar Assinatura' : 'Nova Assinatura'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="planId">Plano</Label>
                  <Select
                    value={formData.planId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, planId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => {
                        const price = plan.amount ? (plan.amount / 100).toFixed(2) : '0.00'
                        return (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {plan.currency?.toUpperCase() || 'BRL'} {price}/{plan.interval}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="canceled">Cancelada</SelectItem>
                      <SelectItem value="cancel_at_period_end">Cancelar no fim do período</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currentPeriodStart">Início do Período</Label>
                  <Input
                    id="currentPeriodStart"
                    type="date"
                    value={formData.currentPeriodStart}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPeriodStart: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="currentPeriodEnd">Fim do Período</Label>
                  <Input
                    id="currentPeriodEnd"
                    type="date"
                    value={formData.currentPeriodEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPeriodEnd: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingSubscription ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma assinatura encontrada</p>
              </div>
            ) : (
              subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <CreditCard className="h-8 w-8 text-indigo-600" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{subscription.plan.name}</h3>
                        <Badge className={getStatusBadgeColor(subscription.status)}>
                          {subscription.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Início: {formatDate(subscription.currentPeriodStart)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Fim: {formatDate(subscription.currentPeriodEnd)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(subscription)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(subscription.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
