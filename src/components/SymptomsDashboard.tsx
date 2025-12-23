// components/SymptomsDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  Calendar, 
  FileText, 
  Globe, 
  Activity,
  ArrowLeft
} from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useLanguage } from '@/i18n/useLanguage'
import Link from 'next/link'

interface DashboardData {
  searchedSymptoms: {
    total: number
    top: Array<{ symptom: string; count: number; lastSearched: string }>
    frequencyByPeriod: {
      today: number
      last7Days: number
      last30Days: number
      allTime: number
    }
  }
  savedSymptoms: {
    total: number
    withAdditionalInfo: number
    byCopingStrategy: Record<string, number>
    recent: Array<{
      id: string
      symptom: string
      folderName: string
      createdAt: string
      hasAdditionalInfo: boolean
    }>
  }
  isPremium: boolean
}

interface GlobalData {
  global: {
    topSymptoms: Array<{ symptom: string; count: number }>
    totalSearches: number
  }
  period: string
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

export function SymptomsDashboard() {
  const { t } = useTranslation()
  const { language: currentLanguage } = useLanguage()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [globalData, setGlobalData] = useState<GlobalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingGlobal, setLoadingGlobal] = useState(false)
  const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal')

  // Recarregar dados quando o idioma mudar
  useEffect(() => {
    loadDashboardData()
  }, [currentLanguage])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const response = await fetch('/api/symptoms/dashboard')
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
        
        // Carregar dados globais para todos os usuários
        loadGlobalData()
      } else {
        console.error('Erro ao carregar dashboard')
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadGlobalData() {
    setLoadingGlobal(true)
    
    try {
      const response = await fetch('/api/symptoms/global')
      
      if (response.ok) {
        const data = await response.json()
        setGlobalData(data)
      } else {
        const errorText = await response.text()
        if (process.env.NODE_ENV === 'development') {
          console.error('[SymptomsDashboard] ❌ Erro na resposta:', response.status, errorText)
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[SymptomsDashboard] ❌ Erro ao carregar dados globais:', error)
      }
    } finally {
      setLoadingGlobal(false)
    }
  }


  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t('dashboard.symptoms.error.loading', 'Erro ao carregar dashboard')}
      </div>
    )
  }

  const frequencyData = [
    { name: t('dashboard.symptoms.period.today', 'Hoje'), value: dashboardData.searchedSymptoms.frequencyByPeriod.today },
    { name: t('dashboard.symptoms.period.last7Days', '7 dias'), value: dashboardData.searchedSymptoms.frequencyByPeriod.last7Days },
    { name: t('dashboard.symptoms.period.last30Days', '30 dias'), value: dashboardData.searchedSymptoms.frequencyByPeriod.last30Days },
    { name: t('dashboard.symptoms.period.total', 'Total'), value: dashboardData.searchedSymptoms.frequencyByPeriod.allTime }
  ]

  const topSymptomsData = dashboardData.searchedSymptoms.top.slice(0, 10).map(item => ({
    name: item.symptom.length > 15 ? item.symptom.substring(0, 15) + '...' : item.symptom,
    fullName: item.symptom,
    count: item.count
  }))

  const copingStrategyData = Object.entries(dashboardData.savedSymptoms.byCopingStrategy).map(([key, value]) => ({
    name: key === 'ACCEPTED_AND_SOUGHT_HELP' ? t('symptom.coping.accepted', 'Aceitei e busquei ajuda') :
          key === 'DENIED_INITIALLY' ? t('symptom.coping.denied', 'Neguei inicialmente') :
          key === 'IGNORED_SYMPTOM' ? t('symptom.coping.ignored', 'Ignorei o sintoma') :
          key === 'SOUGHT_INFO_ALONE' ? t('symptom.coping.infoAlone', 'Busquei informações sozinho') :
          key === 'SHARED_WITH_FAMILY_FRIENDS' ? t('symptom.coping.shared', 'Compartilhei com familiares/amigos') :
          key === 'OTHER' ? t('symptom.coping.other', 'Outro') : key,
    value
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/chat"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors group -ml-12"
          aria-label={t('dashboard.symptoms.backToChat', 'Voltar para o chat')}
        >
          <ArrowLeft className="h-5 w-5 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors" />
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Activity className="h-8 w-8 text-indigo-600" />
          {t('dashboard.symptoms.title', 'Dashboard de Sintomas')}
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v as 'personal' | 'global')
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">{t('dashboard.symptoms.tabs.personal', 'Meus Sintomas')}</TabsTrigger>
          <TabsTrigger value="global">
            {t('dashboard.symptoms.tabs.global', 'Dados Globais')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          {/* Gráfico de frequência por período */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('dashboard.symptoms.frequency.title', 'Frequência por Período')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.symptoms.frequency.description', 'Quantidade de sintomas pesquisados em diferentes períodos')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={frequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top sintomas pesquisados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('dashboard.symptoms.top.title', 'Top Sintomas Pesquisados')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.symptoms.top.description.premium', 'Os sintomas que você mais pesquisou')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSymptomsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip 
                    formatter={(value: number) => [value, t('dashboard.symptoms.searches', 'Pesquisas')]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullName
                      }
                      return label
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de estratégias de enfrentamento */}
          {copingStrategyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('dashboard.symptoms.coping.title', 'Estratégias de Enfrentamento')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.symptoms.coping.description', 'Como o paciente encarou os sintomas')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={copingStrategyData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={(props: any) => {
                        const percent = props.percent || 0
                        const name = props.name || ''
                        return `${name}: ${(percent * 100).toFixed(0)}%`
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {copingStrategyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="global" className="space-y-4">
          {loadingGlobal ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground space-y-2">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p>{t('dashboard.symptoms.global.loading', 'Carregando dados globais... Isso pode levar alguns segundos.')}</p>
                </div>
              </CardContent>
            </Card>
          ) : globalData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t('dashboard.symptoms.global.title', 'Sintomas Mais Pesquisados Globalmente')}
                </CardTitle>
                <CardDescription>
                  {globalData.period} - {t('dashboard.symptoms.global.subtitle', 'Top 20 sintomas mais pesquisados')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart 
                    data={globalData.global.topSymptoms}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="symptom" 
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value, t('dashboard.symptoms.searches', 'Pesquisas')]}
                      labelFormatter={(label) => `${t('dashboard.symptoms.symptom', 'Sintoma')}: ${label}`}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  {t('dashboard.symptoms.global.loading.short', 'Carregando dados globais...')}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

    </div>
  )
}

