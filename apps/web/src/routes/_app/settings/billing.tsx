import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/billing')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/usage' })
  },
})
