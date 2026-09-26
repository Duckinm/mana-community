import { createFileRoute, redirect } from '@tanstack/react-router'

const EMPTY_ISSUES_SEARCH = {
  statuses: [] as ("todo" | "in-progress" | "done" | "canceled")[],
  priorities: [] as ("high" | "med" | "low")[],
  tags: [] as string[],
  due: null as "overdue" | "today" | "week" | "month" | null,
  created: null as "today" | "week" | "month" | null,
  milestone: null as string | null,
}

export const Route = createFileRoute('/_app/projects/$projectId/board/$taskId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/projects/$projectId/issues/$taskId',
      params: { projectId: params.projectId, taskId: params.taskId },
      search: EMPTY_ISSUES_SEARCH,
    })
  },
})
