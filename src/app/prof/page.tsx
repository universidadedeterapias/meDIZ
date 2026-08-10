import { ConversationalChatPage } from '@/components/conversational-chat/ConversationalChatPage'

export default function ProfPage() {
  return (
    <ConversationalChatPage
      chatKind="PROF"
      title="Professor Paulo"
      subtitle="IA professor — tire dúvidas e aprofunde seus estudos"
      emptyHint="Faça uma pergunta ao professor. Você pode retomar esta conversa depois pelo histórico."
      // Só o fundo muda em relação ao /chat; os componentes de conversa são os mesmos.
      backgroundClassName="bg-gradient-to-br from-[#efe7fb] via-[#f7f3fd] to-[#e9e1fa] dark:from-[#140c22] dark:via-[#0f0a18] dark:to-[#17102a]"
    />
  )
}
