import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/business')({
  beforeLoad: () => {
    throw redirect({ to: '/documents/library/business', replace: true })
  },
  component: () => null,
})
