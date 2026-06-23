import { ConversationalChatPage } from '@/components/conversational-chat/ConversationalChatPage'

export default function ProfPage() {
  return (
    <ConversationalChatPage
      chatKind="PROF"
      title="Professor Paulo"
      subtitle="IA professor — tire dúvidas e aprofunde seus estudos"
      emptyHint="Faça uma pergunta ao professor. Você pode retomar esta conversa depois pelo histórico."
    />
  )
}
