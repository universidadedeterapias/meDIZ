'use client'

import { AssistantChatPage } from '@/components/AssistantChatPage'
import { useTranslation } from '@/i18n/useTranslation'
import { ASSISTANT_HANDOFF_STORAGE_KEYS } from '@/lib/chatHandoff'

export default function MeAtendePage() {
  const { t } = useTranslation()

  return (
    <AssistantChatPage
      assistantName="Simulador de atendimento"
      assistantSubtitle={t('chat.meatende.subtitle', 'Acolhimento e conversa inicial')}
      apiEndpoint="/api/meatende"
      welcomeTitle={t('chat.meatende.welcome', 'Pronto para simular um atendimento')}
      welcomeDescription={t(
        'chat.meatende.emptyState',
        'Descreva o cenário de hoje para treinarmos abordagem, acolhimento e próximos passos.'
      )}
      inputPlaceholder={t(
        'chat.meatende.input.placeholder',
        'Digite sua mensagem para o Simulador de atendimento'
      )}
      typingLabel={t('chat.meatende.typing', 'Simulador de atendimento está digitando...')}
      sendLabel={t('chat.meatende.send', 'Enviar')}
      handoffStorageKey={ASSISTANT_HANDOFF_STORAGE_KEYS.meatende}
    />
  )
}
