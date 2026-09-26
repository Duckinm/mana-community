import { createFileRoute, redirect } from '@tanstack/react-router'

// Usage merged into Billing ("Usage & Billing") — this route only exists to redirect old bookmarks/links.
export const Route = createFileRoute('/_app/settings/usage')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/billing', search: { success: false, canceled: false } })
  },
})
