'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SintomaData {
  sintoma: string
  quantidade: number
  primeiraPesquisa: string
  ultimaPesquisa: string
}

interface ExportSummary {
  totalSintomas: number
  totalPesquisas: number
  sintomaMaisPesquisado: string
  quantidadeMaisPesquisado: number
  top10: Array<{
    posicao: number
    sintoma: string
    quantidade: number
  }>
}

export default function ExportSintomasPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SintomaData[]>([])
  const [summary, setSummary] = useState<ExportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Estados para filtros de período
  const [period, setPeriod] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    setData([])
    setSummary(null)

    try {
      const response = await fetch('/api/admin/export-sintomas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period,
          startDate: period === 'custom' ? startDate : undefined,
          endDate: period === 'custom' ? endDate : undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao exportar sintomas')
      }

      setData(result.data)
      setSummary(result.summary)
      setSuccess(true)

      // Download automático do CSV
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      // Nome do arquivo baseado no período
      const periodSuffix = period === 'custom' 
        ? `${startDate}-${endDate}` 
        : period === 'all' 
        ? 'completo' 
        : period
      
      link.setAttribute('download', `sintomas-pesquisados-${periodSuffix}-${new Date().toISOString().slice(0, 10)}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Exportar Sintomas Pesquisados</h1>
        <p className="text-gray-600">
          Gere uma planilha com os sintomas mais pesquisados pelos usuários da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Controle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Gerar Planilha
            </CardTitle>
            <CardDescription>
              Selecione o período e gere a planilha com todos os sintomas pesquisados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros de Período */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <Label className="font-medium">Filtro por Período</Label>
              </div>
              
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os dados</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
              
              {period === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="startDate" className="text-sm">Data inicial</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-sm">Data final</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleExport}
                disabled={loading || (period === 'custom' && (!startDate || !endDate))}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 mr-2" />
                )}
                Gerar Planilha de Sintomas
              </Button>
            </div>

            {loading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Processando todas as sessões do período selecionado... 
                  Isso pode levar alguns minutos dependendo da quantidade de dados.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Planilha gerada com sucesso! O download foi iniciado automaticamente.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Resumo dos Dados */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Exportação</CardTitle>
              <CardDescription>
                Estatísticas dos sintomas mais pesquisados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.totalSintomas}
                  </div>
                  <div className="text-sm text-blue-600">Sintomas Únicos</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {summary.totalPesquisas}
                  </div>
                  <div className="text-sm text-green-600">Total de Pesquisas</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Sintoma Mais Pesquisado:</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {summary.quantidadeMaisPesquisado} pesquisas
                  </Badge>
                  <span className="text-sm">{summary.sintomaMaisPesquisado}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Top 5 Sintomas:</h4>
                <div className="space-y-1">
                  {summary.top10.slice(0, 5).map((item) => (
                    <div key={item.posicao} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {item.posicao}
                        </Badge>
                        {item.sintoma}
                      </span>
                      <Badge variant="secondary">
                        {item.quantidade}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lista Completa (se houver dados) */}
      {data.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Lista Completa de Sintomas</CardTitle>
            <CardDescription>
              Todos os sintomas encontrados ordenados por frequência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {data.map((sintoma, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-6 p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">{sintoma.sintoma}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{sintoma.quantidade} pesquisas</span>
                      <span>{sintoma.primeiraPesquisa} - {sintoma.ultimaPesquisa}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
