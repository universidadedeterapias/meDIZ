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
    interval?: string | null
    provider?: 'Stripe' | 'Hotmart' | null
  }
}

interface Plan {
  id: string
  name: string
  amount: number
  interval: string | null
  intervalCount?: number | null
  currency: string | null
  trialPeriodDays?: number | null
  hotmartOfferKey?: string | null
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

  const parseLocalDateInput = (dateInput: string) => {
    const [year, month, day] = dateInput.split('-').map(Number)
    return new Date(year, (month || 1) - 1, day || 1)
  }

  const formatLocalDateInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const calculatePeriodEnd = (startDate: string, plan?: Plan | null) => {
    if (!startDate || !plan?.interval) return null
    const baseDate = parseLocalDateInput(startDate)
    const intervalCount = plan.intervalCount ?? 1

    switch (plan.interval.toUpperCase()) {
      case 'YEAR':
        baseDate.setFullYear(baseDate.getFullYear() + intervalCount)
        break
      case 'MONTH':
        baseDate.setMonth(baseDate.getMonth() + intervalCount)
        break
      case 'WEEK':
        baseDate.setDate(baseDate.getDate() + intervalCount * 7)
        break
      case 'DAY':
        baseDate.setDate(baseDate.getDate() + intervalCount)
        break
      default:
        return null
    }

    return formatLocalDateInput(baseDate)
  }

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[SubscriptionManager] 🔍 Buscando assinaturas e planos...')
      const [subscriptionsResponse, plansResponse] = await Promise.all([
        fetch(`/api/admin/subscriptions?userId=${userId}`),
        fetch('/api/admin/plans')
      ])
      
      console.log('[SubscriptionManager] 📊 Status das respostas:', {
        subscriptions: subscriptionsResponse.status,
        plans: plansResponse.status
      })

      if (!subscriptionsResponse.ok) {
        const errorData = await subscriptionsResponse.json().catch(() => ({}))
        console.error('[SubscriptionManager] ❌ Erro ao carregar assinaturas:', {
          status: subscriptionsResponse.status,
          statusText: subscriptionsResponse.statusText,
          error: errorData
        })
        throw new Error(`Erro ao carregar assinaturas: ${subscriptionsResponse.status} ${subscriptionsResponse.statusText}`)
      }

      if (!plansResponse.ok) {
        const errorData = await plansResponse.json().catch(() => ({}))
        console.error('[SubscriptionManager] ❌ Erro ao carregar planos:', {
          status: plansResponse.status,
          statusText: plansResponse.statusText,
          error: errorData
        })
        throw new Error(`Erro ao carregar planos: ${plansResponse.status} ${plansResponse.statusText} - ${errorData.error || errorData.message || 'Erro desconhecido'}`)
      }

      const [subscriptionsData, plansData] = await Promise.all([
        subscriptionsResponse.json(),
        plansResponse.json()
      ])
      
      console.log('[SubscriptionManager] ✅ Dados carregados:', {
        subscriptions: subscriptionsData.length,
        plans: plansData.length
      })
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubscriptionManager.tsx:fetchSubscriptions',message:'Resumo de assinaturas carregadas',data:{subscriptionsCount:subscriptionsData.length,plansCount:plansData.length,subscriptionSamples:subscriptionsData.slice(0,5).map((sub: Subscription) => ({planInterval:sub.plan?.interval || null,currentPeriodStart:sub.currentPeriodStart,currentPeriodEnd:sub.currentPeriodEnd,periodDays:Math.round((new Date(sub.currentPeriodEnd).getTime() - new Date(sub.currentPeriodStart).getTime()) / 86400000)}))},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      setSubscriptions(subscriptionsData)
      setPlans(plansData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('[SubscriptionManager] ❌ Erro ao buscar dados:', err)
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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubscriptionManager.tsx:handleSave',message:'Salvando assinatura (admin)',data:{editing:Boolean(editingSubscription),planId:formData.planId,status:formData.status,currentPeriodStart:formData.currentPeriodStart,currentPeriodEnd:formData.currentPeriodEnd},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

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

  const handleRecalculatePeriods = async () => {
    if (!confirm('Recalcular o fim do período para todas as assinaturas deste usuário?')) {
      return
    }

    try {
      setLoading(true)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubscriptionManager.tsx:handleRecalculatePeriods',message:'Iniciando recálculo de períodos',data:{userIdSuffix:userId.slice(-6)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion

      const response = await fetch('/api/admin/subscriptions/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        throw new Error('Erro ao recalcular períodos')
      }

      await fetchSubscriptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao recalcular períodos:', err)
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
    const defaultStart = new Date().toISOString().split('T')[0]
    const defaultEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setFormData({
      planId: '',
      status: 'active',
      currentPeriodStart: defaultStart,
      currentPeriodEnd: defaultEnd
    })
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubscriptionManager.tsx:openCreateDialog',message:'Defaults de periodo ao abrir modal',data:{defaultStart,defaultEnd},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRecalculatePeriods} disabled={loading}>
              Recalcular períodos
            </Button>
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
                      onValueChange={(value) => {
                        const selectedPlan = plans.find(plan => plan.id === value)
                        const computedEnd = calculatePeriodEnd(formData.currentPeriodStart, selectedPlan)
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubscriptionManager.tsx:onPlanChange',message:'Plano selecionado no modal',data:{planId:value,interval:selectedPlan?.interval || null,intervalCount:selectedPlan?.intervalCount ?? null,trialPeriodDays:selectedPlan?.trialPeriodDays ?? null,currentPeriodEnd:formData.currentPeriodEnd,computedEnd},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
                        // #endregion
                        setFormData(prev => ({
                          ...prev,
                          planId: value,
                          currentPeriodEnd: computedEnd || prev.currentPeriodEnd
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => {
                          const price = plan.amount ? (plan.amount / 100).toFixed(2) : '0.00'
                          const currency = plan.currency?.toUpperCase() || 'BRL'
                          const interval = plan.interval?.toLowerCase() || 'mês'
                          const trialInfo = plan.trialPeriodDays ? ` (${plan.trialPeriodDays}D trial)` : ''
                          return (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - {currency} {price}/{interval}{trialInfo}
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
                      onChange={(e) => {
                        const value = e.target.value
                        const selectedPlan = plans.find(plan => plan.id === formData.planId)
                        const computedEnd = calculatePeriodEnd(value, selectedPlan)
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SubscriptionManager.tsx:onStartChange',message:'Início do período alterado',data:{planId:formData.planId || null,interval:selectedPlan?.interval || null,intervalCount:selectedPlan?.intervalCount ?? null,start:value,computedEnd},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
                        // #endregion
                        setFormData(prev => ({
                          ...prev,
                          currentPeriodStart: value,
                          currentPeriodEnd: computedEnd || prev.currentPeriodEnd
                        }))
                      }}
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
                        {subscription.plan.interval && (
                          <Badge variant="outline" className="text-xs">
                            {subscription.plan.interval === 'YEAR' ? 'Anual' : 
                             subscription.plan.interval === 'MONTH' ? 'Mensal' : 
                             subscription.plan.interval}
                          </Badge>
                        )}
                        {subscription.plan.provider && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              subscription.plan.provider === 'Hotmart' 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {subscription.plan.provider}
                          </Badge>
                        )}
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
