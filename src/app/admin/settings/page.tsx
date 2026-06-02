'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
// Removido toast do sonner temporariamente
import { Loader2 } from 'lucide-react'
import BlurredContentAdvanced from '@/components/BlurredContentAdvanced'

// Modelo de configurações de blur
interface BlurSettings {
  firstWeek: {
    enabled: boolean
    blurIntensity: number
    visibleLines: number
    showPreview: boolean
    customMessage: string
  }
  secondToFourthWeek: {
    enabled: boolean
    blurIntensity: number
    visibleLines: number
    showPreview: boolean
    customMessage: string
  }
  beyondMonth: {
    enabled: boolean
    blurIntensity: number
    visibleLines: number
    showPreview: boolean
    customMessage: string
  }
}

// Configurações padrão
const defaultBlurSettings: BlurSettings = {
  firstWeek: {
    enabled: false,
    blurIntensity: 0,
    visibleLines: 0,
    showPreview: false,
    customMessage: 'Conteúdo disponível apenas para assinantes'
  },
  secondToFourthWeek: {
    enabled: true,
    blurIntensity: 5,
    visibleLines: 1,
    showPreview: false,
    customMessage: 'Assine para ver o conteúdo completo'
  },
  beyondMonth: {
    enabled: true,
    blurIntensity: 8,
    visibleLines: 1,
    showPreview: false,
    customMessage: 'Assine agora para desbloquear'
  }
}

// Conteúdo de exemplo para a visualização prévia
const previewContent = `
## Impacto no Sistema Nervoso

O sistema nervoso é um dos principais afetados por essa condição. Os sintomas incluem:

- Dores de cabeça frequentes
- Fadiga e letargia
- Dificuldade de concentração
- Alterações no sono
- Sensibilidade aumentada a estímulos externos

Estudos recentes mostram que 78% dos pacientes apresentam melhora significativa após o tratamento adequado.

### Tratamentos Recomendados

1. Terapia cognitivo-comportamental
2. Medicamentos específicos (quando necessário)
3. Exercícios físicos regulares
4. Técnicas de relaxamento e meditação
5. Ajustes na alimentação e hidratação
`

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('blur')
  const [blurSettings, setBlurSettings] = useState<BlurSettings>(defaultBlurSettings)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  // Função simples para mostrar notificações
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }
  
  const handleSaveSettings = async () => {
    setSubmitting(true)
    
    // Simulando uma chamada de API para salvar as configurações
    setTimeout(() => {
      showNotification('Configurações salvas com sucesso', 'success')
      setSubmitting(false)
    }, 1500)
    
    // Em um cenário real, você faria uma chamada à API:
    // try {
    //   const response = await fetch('/api/admin/settings', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ blurSettings })
    //   })
    //   
    //   if (!response.ok) {
    //     throw new Error('Erro ao salvar configurações')
    //   }
    //   
    //   showNotification('Configurações salvas com sucesso', 'success')
    // } catch (error) {
    //   console.error(error)
    //   showNotification('Erro ao salvar configurações', 'error')
    // } finally {
    //   setSubmitting(false)
    // }
  }
  
  // Função para atualizar as configurações de um período específico
  const updatePeriodSettings = <K extends keyof BlurSettings, F extends keyof BlurSettings[K]>(
    period: K,
    field: F,
    value: BlurSettings[K][F]
  ) => {
    setBlurSettings(prev => ({
      ...prev,
      [period]: {
        ...prev[period],
        [field]: value
      }
    }))
  }
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Configurações do Sistema</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="blur">Configurações de Blur</TabsTrigger>
          <TabsTrigger value="popup">Pop-ups</TabsTrigger>
          <TabsTrigger value="general">Configurações Gerais</TabsTrigger>
        </TabsList>
        
        <TabsContent value="blur" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Configurações de Visualização Parcial</CardTitle>
                <CardDescription>
                  Configure como o conteúdo truncado e com blur será exibido para diferentes períodos de usuário
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Primeiro período: 1-7 dias */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Usuários de 1-7 dias</h3>
                    <div className="flex items-center">
                      <Label htmlFor="firstWeekEnabled" className="mr-2">Ativar blur</Label>
                      <Switch
                        id="firstWeekEnabled"
                        checked={blurSettings.firstWeek.enabled}
                        onCheckedChange={(checked) => updatePeriodSettings('firstWeek', 'enabled', checked)}
                      />
                    </div>
                  </div>
                  
                  {blurSettings.firstWeek.enabled && (
                    <div className="space-y-6 pl-4 border-l-2 border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstWeekBlurIntensity">Intensidade do Blur (1-10)</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              id="firstWeekBlurIntensity"
                              defaultValue={[blurSettings.firstWeek.blurIntensity]}
                              min={0}
                              max={10}
                              step={1}
                              onValueChange={(value) => updatePeriodSettings('firstWeek', 'blurIntensity', value[0])}
                              className="flex-1"
                            />
                            <span className="w-8 text-center">{blurSettings.firstWeek.blurIntensity}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="firstWeekVisibleLines">Linhas Visíveis</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              id="firstWeekVisibleLines"
                              defaultValue={[blurSettings.firstWeek.visibleLines]}
                              min={0}
                              max={5}
                              step={1}
                              onValueChange={(value) => updatePeriodSettings('firstWeek', 'visibleLines', value[0])}
                              className="flex-1"
                            />
                            <span className="w-8 text-center">{blurSettings.firstWeek.visibleLines}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="firstWeekMessage">Mensagem Personalizada</Label>
                        <Input
                          id="firstWeekMessage"
                          value={blurSettings.firstWeek.customMessage}
                          onChange={(e) => updatePeriodSettings('firstWeek', 'customMessage', e.target.value)}
                          placeholder="Mensagem para exibir no conteúdo com blur"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="firstWeekShowPreview"
                          checked={blurSettings.firstWeek.showPreview}
                          onCheckedChange={(checked) => updatePeriodSettings('firstWeek', 'showPreview', checked)}
                        />
                        <Label htmlFor="firstWeekShowPreview">Permitir visualização prévia</Label>
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                </div>
                
                {/* Segundo período: 8-30 dias */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Usuários de 8-30 dias</h3>
                    <div className="flex items-center">
                      <Label htmlFor="secondWeekEnabled" className="mr-2">Ativar blur</Label>
                      <Switch
                        id="secondWeekEnabled"
                        checked={blurSettings.secondToFourthWeek.enabled}
                        onCheckedChange={(checked) => updatePeriodSettings('secondToFourthWeek', 'enabled', checked)}
                      />
                    </div>
                  </div>
                  
                  {blurSettings.secondToFourthWeek.enabled && (
                    <div className="space-y-6 pl-4 border-l-2 border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="secondWeekBlurIntensity">Intensidade do Blur (1-10)</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              id="secondWeekBlurIntensity"
                              defaultValue={[blurSettings.secondToFourthWeek.blurIntensity]}
                              min={0}
                              max={10}
                              step={1}
                              onValueChange={(value) => updatePeriodSettings('secondToFourthWeek', 'blurIntensity', value[0])}
                              className="flex-1"
                            />
                            <span className="w-8 text-center">{blurSettings.secondToFourthWeek.blurIntensity}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="secondWeekVisibleLines">Linhas Visíveis</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              id="secondWeekVisibleLines"
                              defaultValue={[blurSettings.secondToFourthWeek.visibleLines]}
                              min={0}
                              max={5}
                              step={1}
                              onValueChange={(value) => updatePeriodSettings('secondToFourthWeek', 'visibleLines', value[0])}
                              className="flex-1"
                            />
                            <span className="w-8 text-center">{blurSettings.secondToFourthWeek.visibleLines}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="secondWeekMessage">Mensagem Personalizada</Label>
                        <Input
                          id="secondWeekMessage"
                          value={blurSettings.secondToFourthWeek.customMessage}
                          onChange={(e) => updatePeriodSettings('secondToFourthWeek', 'customMessage', e.target.value)}
                          placeholder="Mensagem para exibir no conteúdo com blur"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="secondWeekShowPreview"
                          checked={blurSettings.secondToFourthWeek.showPreview}
                          onCheckedChange={(checked) => updatePeriodSettings('secondToFourthWeek', 'showPreview', checked)}
                        />
                        <Label htmlFor="secondWeekShowPreview">Permitir visualização prévia</Label>
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                </div>
                
                {/* Terceiro período: 31+ dias */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Usuários de 31+ dias</h3>
                    <div className="flex items-center">
                      <Label htmlFor="beyondMonthEnabled" className="mr-2">Ativar blur</Label>
                      <Switch
                        id="beyondMonthEnabled"
                        checked={blurSettings.beyondMonth.enabled}
                        onCheckedChange={(checked) => updatePeriodSettings('beyondMonth', 'enabled', checked)}
                      />
                    </div>
                  </div>
                  
                  {blurSettings.beyondMonth.enabled && (
                    <div className="space-y-6 pl-4 border-l-2 border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="beyondMonthBlurIntensity">Intensidade do Blur (1-10)</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              id="beyondMonthBlurIntensity"
                              defaultValue={[blurSettings.beyondMonth.blurIntensity]}
                              min={0}
                              max={10}
                              step={1}
                              onValueChange={(value) => updatePeriodSettings('beyondMonth', 'blurIntensity', value[0])}
                              className="flex-1"
                            />
                            <span className="w-8 text-center">{blurSettings.beyondMonth.blurIntensity}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="beyondMonthVisibleLines">Linhas Visíveis</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              id="beyondMonthVisibleLines"
                              defaultValue={[blurSettings.beyondMonth.visibleLines]}
                              min={0}
                              max={5}
                              step={1}
                              onValueChange={(value) => updatePeriodSettings('beyondMonth', 'visibleLines', value[0])}
                              className="flex-1"
                            />
                            <span className="w-8 text-center">{blurSettings.beyondMonth.visibleLines}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="beyondMonthMessage">Mensagem Personalizada</Label>
                        <Input
                          id="beyondMonthMessage"
                          value={blurSettings.beyondMonth.customMessage}
                          onChange={(e) => updatePeriodSettings('beyondMonth', 'customMessage', e.target.value)}
                          placeholder="Mensagem para exibir no conteúdo com blur"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="beyondMonthShowPreview"
                          checked={blurSettings.beyondMonth.showPreview}
                          onCheckedChange={(checked) => updatePeriodSettings('beyondMonth', 'showPreview', checked)}
                        />
                        <Label htmlFor="beyondMonthShowPreview">Permitir visualização prévia</Label>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="border-t p-6">
                <Button
                  onClick={handleSaveSettings}
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 ml-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configurações'
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Preview do blur */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Visualização</CardTitle>
                <CardDescription>
                  Prévia de como o conteúdo ficará para cada período de usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Preview do primeiro período */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Usuários de 1-7 dias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {blurSettings.firstWeek.enabled ? (
                        <BlurredContentAdvanced
                          blurIntensity={blurSettings.firstWeek.blurIntensity}
                          visibleLines={blurSettings.firstWeek.visibleLines}
                          customMessage={blurSettings.firstWeek.customMessage}
                          showPreview={blurSettings.firstWeek.showPreview}
                          onSubscribe={() => {}}
                        >
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                          </div>
                        </BlurredContentAdvanced>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Preview do segundo período */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Usuários de 8-30 dias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {blurSettings.secondToFourthWeek.enabled ? (
                        <BlurredContentAdvanced
                          blurIntensity={blurSettings.secondToFourthWeek.blurIntensity}
                          visibleLines={blurSettings.secondToFourthWeek.visibleLines}
                          customMessage={blurSettings.secondToFourthWeek.customMessage}
                          showPreview={blurSettings.secondToFourthWeek.showPreview}
                          onSubscribe={() => {}}
                        >
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                          </div>
                        </BlurredContentAdvanced>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Preview do terceiro período */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Usuários de 31+ dias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {blurSettings.beyondMonth.enabled ? (
                        <BlurredContentAdvanced
                          blurIntensity={blurSettings.beyondMonth.blurIntensity}
                          visibleLines={blurSettings.beyondMonth.visibleLines}
                          customMessage={blurSettings.beyondMonth.customMessage}
                          showPreview={blurSettings.beyondMonth.showPreview}
                          onSubscribe={() => {}}
                        >
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                          </div>
                        </BlurredContentAdvanced>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="popup">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Pop-up</CardTitle>
              <CardDescription>
                Gerencie as configurações gerais dos pop-ups entre pesquisas
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center">
              <p className="text-gray-500">
                Para configurações detalhadas, acesse a{' '}
                <a href="/admin/popup" className="text-indigo-600 hover:underline">
                  página de gerenciamento de pop-ups
                </a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Gerencie as configurações gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center">
              <p className="text-gray-500">
                Configurações gerais em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Notificação simples */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          notification.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  )
}
