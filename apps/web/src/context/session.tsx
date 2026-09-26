import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getSession } from '@/lib/auth-client'
import { initOfflineListener } from '@/lib/offline'
import { initSessionSync } from '@/lib/session-sync'

interface User {
 id: string
 name: string
 email: string
 emailVerified: boolean
 createdAt: Date | string
 updatedAt: Date | string
}

interface SessionContextType {
 user: User | null
 isLoading: boolean
 refetch: () => Promise<void>
}

const SessionContext = createContext<SessionContextType>({
 user: null,
 isLoading: true,
 refetch: async () => {},
})

export function SessionProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<User | null>(null)
 const [isLoading, setIsLoading] = useState(true)

 const refetch = async () => {
 try {
 const data = await getSession()
 setUser((data?.data?.user as User) ?? null)
 } catch {
 setUser(null)
 } finally {
 setIsLoading(false)
 }
 }

 useEffect(() => { refetch() }, [])

 useEffect(() => {
   initSessionSync()
   initOfflineListener()
 }, [])

 return (
 <SessionContext.Provider value={{ user, isLoading, refetch }}>
 {children}
 </SessionContext.Provider>
 )
}

export const useSessionContext = () => useContext(SessionContext)
