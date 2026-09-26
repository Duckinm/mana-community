import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18next from '@/lib/i18n'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import type {
  CalendarDateRange,
  CalendarEvent,
  CalendarEventInput,
  RecurrenceMutationOptions,
} from '@/components/calendar/types'

export function useCalendarEvents(range: CalendarDateRange | null) {
  const queryClient = useQueryClient()

  const eventsQuery = useQuery({
    queryKey: range ? queryKeys.calendarEvents(range) : ['calendar-events', 'idle'],
    queryFn: async () =>
      expectEden(
        await client.api.calendar.events.get({
          query: { start: range!.start, end: range!.end },
        }),
      ),
    enabled: !!range,
  })

  const overlaysQuery = useQuery({
    queryKey: range ? queryKeys.calendarOverlays(range) : ['calendar-overlays', 'idle'],
    queryFn: async () =>
      expectEden(
        await client.api.calendar.overlays.get({
          query: { start: range!.start, end: range!.end },
        }),
      ),
    enabled: !!range,
  })

  // Every visible range is its own key, and saving can move the view to another
  // one — scoping this to the current range leaves that month on 60s-fresh cache.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar-overlays'] })
  }

  const settled = (saved: { googleSyncFailed?: boolean }) => {
    invalidate()
    if (saved.googleSyncFailed) {
      toast.warning(i18next.t('toast.googleSyncFailed', { ns: 'calendar' }))
    }
  }

  const createMutation = useMutation({
    mutationFn: async (body: CalendarEventInput) =>
      expectEden(await client.api.calendar.events.post(body)),
    onSuccess: settled,
    onError: (_err, body) =>
      toast.error(i18next.t('toast.createEventFailed', { ns: 'calendar' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => createMutation.mutate(body) },
      }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
      opts,
    }: {
      id: string
      patch: Partial<CalendarEventInput>
      opts?: RecurrenceMutationOptions
    }) =>
      expectEden(
        await client.api.calendar.events({ id }).patch(patch, {
          query: { scope: opts?.scope, instanceStart: opts?.instanceStart },
        }),
      ),
    onSuccess: settled,
    onError: (_err, vars) =>
      toast.error(i18next.t('toast.saveEventFailed', { ns: 'calendar' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => updateMutation.mutate(vars) },
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ id, opts }: { id: string; opts?: RecurrenceMutationOptions }) =>
      expectEdenVoid(
        await client.api.calendar.events({ id }).delete({
          query: { scope: opts?.scope, instanceStart: opts?.instanceStart },
        }),
      ),
    onSuccess: invalidate,
    onError: (_err, vars) =>
      toast.error(i18next.t('toast.deleteEventFailed', { ns: 'calendar' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => deleteMutation.mutate(vars) },
      }),
  })

  return {
    events: (eventsQuery.data ?? []) as CalendarEvent[],
    overlays: overlaysQuery.data ?? [],
    isLoading: eventsQuery.isLoading || overlaysQuery.isLoading,
    isError: eventsQuery.isError || overlaysQuery.isError,
    refetch: () => {
      void eventsQuery.refetch()
      void overlaysQuery.refetch()
    },
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    createEvent: createMutation.mutateAsync,
    updateEvent: updateMutation.mutateAsync,
    deleteEvent: deleteMutation.mutateAsync,
  }
}
