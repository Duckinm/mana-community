import { createContext, useContext, useRef, useEffect, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18next from '@/lib/i18n'
import { client, expectEden } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import { syncCurrencyFromUser } from '@/hooks/use-currency'
import { inferBrowserRegion, inferBrowserTimeZone, syncDateTimePreferences } from '@/lib/date-time-preferences'
import type { UserPrefs, UserPatch } from '@/lib/user-types'

interface SettingsCtx {
 user: UserPrefs | null
 loading: boolean
 saving: boolean
 patchUser: (patch: UserPatch) => Promise<UserPrefs>
 saveFnRef: React.MutableRefObject<(() => Promise<void>) | null>
 triggerSave: () => Promise<void>
}

const SettingsContext = createContext<SettingsCtx>({
 user: null,
 loading: true,
 saving: false,
 patchUser: async () => { throw new Error('SettingsProvider not mounted') },
 saveFnRef: { current: null },
 triggerSave: async () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
 const queryClient = useQueryClient()
 const saveFnRef = useRef<(() => Promise<void>) | null>(null)

 const { data: user = null, isPending: loading } = useQuery({
 queryKey: queryKeys.user,
 queryFn: async () => expectEden(await client.api.users.me.get()),
 })

 // Apply animation preference as soon as user prefs load
 useEffect(() => {
 if (!user) return
 document.documentElement.setAttribute(
 'data-animations',
 user.animationsOn === false ? 'off' : 'on'
 )
 syncCurrencyFromUser(user.currency)
 }, [user?.animationsOn, user?.currency])

 const mutation = useMutation({
 mutationFn: async (patch: UserPatch) => expectEden(await client.api.users.me.patch(patch)),
 onSuccess: (updated) => {
 queryClient.setQueryData(queryKeys.user, updated)
 },
 onError: (_err, patch) => {
 toast.error(i18next.t('profileSaveFailed', { ns: 'settings' }), {
 action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => mutation.mutate(patch) },
 })
 },
 })

 if (user) syncDateTimePreferences(user)

 useEffect(() => {
 if (!user) return
 const patch: UserPatch = {}
 if (user.region === null) patch.region = inferBrowserRegion()
 if (!user.timezone) patch.timezone = inferBrowserTimeZone() ?? undefined
 if (Object.keys(patch).length > 0) mutation.mutate(patch)
 }, [user?.region, user?.timezone])

 async function patchUser(patch: UserPatch): Promise<UserPrefs> {
 return mutation.mutateAsync(patch)
 }

 async function triggerSave() {
 if (saveFnRef.current) {
 await saveFnRef.current()
 }
 }

 return (
 <SettingsContext.Provider value={{ user, loading, saving: mutation.isPending, patchUser, saveFnRef, triggerSave }}>
 {children}
 </SettingsContext.Provider>
 )
}

export const useSettings = () => useContext(SettingsContext)
