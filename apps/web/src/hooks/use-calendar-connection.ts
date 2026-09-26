import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'

export function useCalendarConnection() {
  const queryClient = useQueryClient()

  const connectionQuery = useQuery({
    queryKey: queryKeys.calendarConnection,
    queryFn: async () => expectEden(await client.api.calendar.connection.get()),
  })

  const connected = !!connectionQuery.data?.connected
  const syncedCalendars = connectionQuery.data?.calendars ?? []
  const limit = connectionQuery.data?.limit ?? 1

  const calendarsQuery = useQuery({
    queryKey: queryKeys.googleCalendars,
    queryFn: async () => expectEden(await client.api.calendar.google.calendars.get()),
    enabled: connected && syncedCalendars.length < limit,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendarConnection })
    void queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendars })
  }

  const addCalendarMutation = useMutation({
    mutationFn: async (body: {
      accountId: string
      calendarId: string
      calendarName: string
      accountEmail: string
    }) => expectEden(await client.api.calendar.connection.patch(body)),
    onSuccess: invalidate,
  })

  const removeCalendarMutation = useMutation({
    mutationFn: async (connectionId: string) =>
      expectEdenVoid(await client.api.calendar.connection({ connectionId }).delete()),
    onSuccess: invalidate,
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => expectEdenVoid(await client.api.calendar.connection.delete()),
    onSuccess: invalidate,
  })

  const syncMutation = useMutation({
    mutationFn: async () => expectEden(await client.api.calendar.sync.post()),
    onSuccess: () => {
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })

  return {
    connection: connectionQuery.data,
    calendarGroups: calendarsQuery.data ?? [],
    isLoading: connectionQuery.isLoading,
    isCalendarsLoading: calendarsQuery.isLoading,
    calendarsError: calendarsQuery.isError,
    addCalendar: addCalendarMutation.mutateAsync,
    removeCalendar: removeCalendarMutation.mutateAsync,
    disconnect: disconnectMutation.mutateAsync,
    sync: syncMutation.mutateAsync,
    isPending:
      addCalendarMutation.isPending ||
      removeCalendarMutation.isPending ||
      disconnectMutation.isPending ||
      syncMutation.isPending,
    refetch: connectionQuery.refetch,
  }
}
