'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AdminRequest {
  id: string
  userId: string
  userEmail: string
  userName: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requestedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewerEmail?: string
  notes?: string
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null)
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const loadRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/admin/requests?${params}`)
      const data = await response.json()

      if (response.ok) {
        setRequests(data.requests)
      } else {
        setMessage('Erro ao carregar solicitações')
      }
    } catch {
      setMessage('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleApprove = async (requestId: string) => {
    await processRequest(requestId, 'APPROVED')
  }

  const handleReject = async (requestId: string) => {
    await processRequest(requestId, 'REJECTED')
  }

  const processRequest = async (requestId: string, action: 'APPROVED' | 'REJECTED') => {
    setProcessing(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action,
          notes: notes.trim() || null
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setSelectedRequest(null)
        setNotes('')
        loadRequests()
      } else {
        setMessage(data.error || 'Erro ao processar solicitação')
      }
    } catch {
      setMessage('Erro de conexão')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
      case 'APPROVED':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitações de Acesso Admin</h1>
          <p className="text-gray-600">Gerencie solicitações de acesso administrativo</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="PENDING">Pendentes</SelectItem>
              <SelectItem value="APPROVED">Aprovadas</SelectItem>
              <SelectItem value="REJECTED">Rejeitadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {message && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma solicitação encontrada</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium">{request.userName}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{request.userEmail}</p>
                    
                    <p className="text-sm text-gray-700 mb-3">{request.reason}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        Solicitado: {formatDistanceToNow(new Date(request.requestedAt), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                      {request.reviewedAt && (
                        <span>
                          Revisado: {formatDistanceToNow(new Date(request.reviewedAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      )}
                    </div>

                    {request.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Notas:</p>
                        <p className="text-sm text-gray-600">{request.notes}</p>
                      </div>
                    )}
                  </div>

                  {request.status === 'PENDING' && (
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRequest(request)}
                      >
                        Revisar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Revisão */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Revisar Solicitação</CardTitle>
              <CardDescription>
                {selectedRequest.userName} - {selectedRequest.userEmail}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Motivo:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedRequest.reason}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Notas (opcional):
                </label>
                <Textarea
                  placeholder="Adicione notas sobre sua decisão..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(null)
                    setNotes('')
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rejeitar'}
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aprovar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
