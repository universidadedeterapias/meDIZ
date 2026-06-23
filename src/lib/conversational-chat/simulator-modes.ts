export type SimulatorMode = 'terapeuta' | 'experiencia'

export type SimulatorModeConfig = {
  id: SimulatorMode
  badge: string
  badgeIcon: 'user' | 'leaf'
  title: string
  description: string
  disclaimer?: string
  buttonLabel: string
  buttonClassName: string
  initialMessage: string
  chatSubtitle: string
  emptyHint: string
}

export const SIMULATOR_MODES: Record<SimulatorMode, SimulatorModeConfig> = {
  terapeuta: {
    id: 'terapeuta',
    badge: 'Simular um atendimento',
    badgeIcon: 'user',
    title: 'Sou terapeuta',
    description:
      'Treine sua condução com um cliente virtual que busca ajuda. Ideal para praticar perguntas, escuta e raciocínio terapêutico.',
    buttonLabel: 'QUERO SIMULAR',
    buttonClassName:
      'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25',
    initialMessage: 'Quero simular um atendimento como terapeuta',
    chatSubtitle: 'Modo terapeuta — simulação de atendimento',
    emptyHint: 'A simulação começou. Continue a conversa quando quiser.'
  },
  experiencia: {
    id: 'experiencia',
    badge: 'Experiência guiada',
    badgeIcon: 'leaf',
    title: 'Quero viver um atendimento',
    description:
      'Vivencie uma experiência inspirada no Método [RE]Sentir para entender como um atendimento pode acontecer e ampliar sua percepção sobre si.',
    disclaimer:
      'Conteúdo educativo e de autoconhecimento. Não substitui atendimento profissional.',
    buttonLabel: 'QUERO EXPLORAR',
    buttonClassName:
      'bg-[#16a34a] hover:bg-[#15803d] text-white shadow-md shadow-green-500/25',
    initialMessage: 'Quero viver um atendimento',
    chatSubtitle: 'Experiência guiada — vivenciar um atendimento',
    emptyHint: 'Sua experiência começou. Siga o fluxo com calma.'
  }
}

export function parseSimulatorMode(
  value: string | null | undefined
): SimulatorMode | null {
  if (value === 'terapeuta' || value === 'experiencia') return value
  return null
}

export function isSimulatorMode(value: string): value is SimulatorMode {
  return value === 'terapeuta' || value === 'experiencia'
}
