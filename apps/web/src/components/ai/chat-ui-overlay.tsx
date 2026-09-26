import type { ChatUiOverlay } from '@/components/ai/chat-ui-action'
import { ChatUiOverlaySkeleton } from '@/components/ai/chat-ui-overlay-skeleton'
import { ContactDetailBody } from '@/components/contacts/contact-detail-body'
import { TransactionDetailModal } from '@/components/finance/transaction-detail-modal'
import type { Wallet } from '@/components/finance/types'
import { TaskDetailPage } from '@/components/projects/task-detail-page'
import { DocumentDetailPage } from '@/components/documents/document-detail-page'
import { client, expectEden } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import { useQuery } from '@tanstack/react-query'
import { useContacts } from '@/context/contacts'
import { useProjects } from '@/context/projects'
import { useMilestones } from '@/hooks/use-milestones'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task, TaskPatch } from '@/components/projects/types'

interface Props {
  overlay: ChatUiOverlay | null
  onClose: () => void
}

function ContactOverlayContent({ id }: { id: string }) {
  const { t } = useTranslation('chat')
  const { contacts, loading } = useContacts()
  const contact = contacts.find((c) => c.id === id)

  if (!contact) {
    if (loading) return <ChatUiOverlaySkeleton />
    return <p className="p-1 text-sm text-muted-foreground">{t('overlay.notFound')}</p>
  }

  return <ContactDetailBody contact={contact} contactId={id} />
}

function TaskOverlayContent({
  projectId,
  taskId,
  onClose,
}: {
  projectId: string
  taskId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { projects, updateTask: apiUpdateTask, deleteTask: apiDeleteTask } = useProjects()
  const { milestones } = useMilestones(projectId)
  const project = projects.find((p) => p.id === projectId)

  let activeTask: Task | undefined
  let activeColumnLabel = ''
  for (const col of project?.columns ?? []) {
    const match = col.tasks.find((task) => task.id === taskId)
    if (match) {
      activeTask = match
      activeColumnLabel = col.label
      break
    }
  }

  const updateTask = useCallback(
    (patch: TaskPatch) => {
      if (!activeTask || !project) return
      apiUpdateTask(taskId, project.id, patch)
      if ('milestoneId' in patch || 'status' in patch) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.projectMilestones(project.id) })
      }
    },
    [project, apiUpdateTask, taskId, activeTask, queryClient],
  )

  const deleteTask = useCallback(() => {
    if (!project) return
    apiDeleteTask(taskId, project.id)
    onClose()
  }, [project, apiDeleteTask, taskId, onClose])

  if (!project || !activeTask) return <ChatUiOverlaySkeleton />

  return (
    <TaskDetailPage
      task={activeTask}
      projectName={project.name}
      columnLabel={activeColumnLabel}
      milestones={milestones}
      onBack={onClose}
      onUpdate={updateTask}
      onDelete={deleteTask}
      variant="overlay"
    />
  )
}

function TransactionOverlayContent({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: tx, isLoading: txLoading } = useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: async () => expectEden(await client.api.finance.transactions({ id }).get()),
  })
  const { data: wallets = [], isLoading: walletsLoading } = useQuery<Wallet[]>({
    queryKey: queryKeys.wallets,
    queryFn: async () => {
      const result = await client.api.wallets.get()
      if (result.error) throw result.error
      return (result.data ?? []) as unknown as Wallet[]
    },
    staleTime: 60_000,
  })

  if (txLoading || walletsLoading || !tx) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <ChatUiOverlaySkeleton />
        </DialogContent>
      </Dialog>
    )
  }

  return <TransactionDetailModal tx={tx} wallets={wallets} onClose={onClose} />
}

function overlayTitle(overlay: ChatUiOverlay, t: (key: string) => string): string {
  switch (overlay.entity) {
    case 'contact':
      return t('overlay.contact')
    case 'project':
      return t('overlay.project')
    case 'document':
      return t('overlay.document')
    case 'task':
      return t('overlay.task')
    case 'transaction':
      return t('overlay.transaction')
  }
}

export function ChatUiOverlay({ overlay, onClose }: Props) {
  const { t } = useTranslation('chat')

  if (overlay?.entity === 'transaction') {
    return <TransactionOverlayContent id={overlay.id} onClose={onClose} />
  }

  return (
    <Dialog open={overlay !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {overlay && (
          <>
            <DialogHeader>
              <DialogTitle>{overlayTitle(overlay, t)}</DialogTitle>
            </DialogHeader>
            {overlay.entity === 'contact' && <ContactOverlayContent id={overlay.id} />}
            {overlay.entity === 'document' && (
              <DocumentDetailPage documentId={overlay.id} variant="overlay" />
            )}
            {overlay.entity === 'task' && (
              <TaskOverlayContent
                projectId={overlay.projectId}
                taskId={overlay.id}
                onClose={onClose}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
