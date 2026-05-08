'use client'

import { AssistantChatPage } from '@/components/AssistantChatPage'
import { useTranslation } from '@/i18n/useTranslation'
import { ASSISTANT_HANDOFF_STORAGE_KEYS } from '@/lib/chatHandoff'

export default function ProfessorPauloPage() {
  const { t } = useTranslation()

  return (
    <AssistantChatPage
      assistantName="Professor"
      assistantSubtitle={t('chat.professor.subtitle', 'Conversa terapêutica guiada')}
      apiEndpoint="/api/professor-paulo"
      welcomeTitle={t('chat.professor.welcome', 'Vamos começar sua conversa guiada')}
      welcomeDescription={t(
        'chat.professor.emptyState',
        'Conte o que você busca hoje e eu te acompanho passo a passo nessa conversa.'
      )}
      inputPlaceholder={t(
        'chat.professor.input.placeholder',
        'Digite sua pergunta para o Professor'
      )}
      typingLabel={t('chat.professor.typing', 'Professor está digitando...')}
      sendLabel={t('chat.professor.send', 'Enviar')}
      handoffStorageKey={ASSISTANT_HANDOFF_STORAGE_KEYS['professor-paulo']}
    />
  )
}
