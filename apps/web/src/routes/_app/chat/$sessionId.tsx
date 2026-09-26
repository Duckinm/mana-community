import { ChatSessionPage } from '@/components/ai/chat-session-page'
import { FinanceProvider } from '@/context/finance'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/chat/$sessionId')({
  component: () => (
    <FinanceProvider>
      <ChatSessionPage />
    </FinanceProvider>
  ),
})
