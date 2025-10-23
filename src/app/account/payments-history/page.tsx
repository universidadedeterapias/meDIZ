'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useUser } from '@/contexts/user'
import { ArrowLeft } from 'lucide-react'

type Invoice = {
  id: string
  created: number
  amountPaid: number
  currency: string
  status: string
  pdf: string | null
}

// export const metadata = { title: 'Histórico de Pagamentos' }

export default function PaymentsHistoryPage() {
  const { user } = useUser()
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.stripeCustomerId) {
      setInvoices([])
      return
    }
    fetch('/api/stripe/invoices')
      .then(res => {
        if (!res.ok) throw new Error('Erro ao carregar histórico')
        return res.json()
      })
      .then((data: { invoices: Invoice[] }) => setInvoices(data.invoices))
      .catch(err => {
        console.error(err)
        setError('Não foi possível carregar seu histórico')
        setInvoices([])
      })
  }, [user?.stripeCustomerId])

  if (invoices === null) {
    return <p className="p-4">Carregando histórico...</p>
  }

  if (error) {
    return <p className="p-4 text-red-500">{error}</p>
  }

  if (invoices.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Sem histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Você ainda não tem cobranças registradas.</p>
          <Link href="/myAccount">
            <Button className="mt-2" variant="outline" size="sm">
              Voltar
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <header className="w-full sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/myAccount" className="text-primary">
            <ArrowLeft />
          </a>
          <p className="text-primary font-bold text-2xl">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
          <div />
        </div>
      </header>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Histórico de Pagamentos</h1>
        <Link href="/myAccount">
          <Button variant="outline" size="sm">
            Voltar
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Últimas {invoices.length} faturas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell>
                    {format(new Date(inv.created * 1000), "dd 'de' MMMM yyyy", {
                      locale: ptBR
                    })}
                  </TableCell>
                  <TableCell>
                    {(inv.amountPaid / 100).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: inv.currency.toUpperCase()
                    })}
                  </TableCell>
                  <TableCell className="capitalize">{inv.status}</TableCell>
                  <TableCell className="text-right">
                    {inv.pdf ? (
                      <a href={inv.pdf} target="_blank" rel="noreferrer">
                        <Button size={'sm'} variant="link">
                          Baixar PDF
                        </Button>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
