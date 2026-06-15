import { ConversationalChatPage } from '@/components/conversational-chat/ConversationalChatPage'

export default function SimuladorPage() {
  return (
    <ConversationalChatPage
      chatKind="SIMULADOR"
      title="meDIZ! Simulador"
      subtitle="Conversa guiada para explorar sintomas e emoções"
      emptyHint="Conte o que você está sentindo. A conversa continua aqui e fica salva no seu histórico."
    />
  )
}
