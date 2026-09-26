import { StorageProvider } from '@/context/storage'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/storage')({
  component: () => (
    <StorageProvider>
      <Outlet />
    </StorageProvider>
  ),
})
