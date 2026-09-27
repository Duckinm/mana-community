import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth-client'

export const Route = createFileRoute('/_auth')({
 ssr: false,
 beforeLoad: async () => {
 const session = await getSession()
 if (session?.data?.user) {
 throw redirect({ to: '/home' })
 }
 },
 component: AuthLayout,
})

function AuthLayout() {
 return <Outlet />
}
