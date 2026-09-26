import { saveLastVisited } from '@/lib/last-visited'
import { StorageProvider } from '@/context/storage'
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'

function ProjectsLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    saveLastVisited('projects', pathname)
  }, [pathname])

  return <Outlet />
}

export const Route = createFileRoute('/_app/projects')({
  component: () => (
    <StorageProvider>
      <ProjectsLayout />
    </StorageProvider>
  ),
})
