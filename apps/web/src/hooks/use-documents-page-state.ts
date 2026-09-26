import { useDocumentsList } from '@/hooks/use-documents'
import { useProjects } from '@/context/projects'
import { enrichWithProjectName } from '@/lib/selectors'
import { timestampFilterToCalendarDate } from '@/components/documents/document-list'
import type { DocumentType, DocumentStatus } from '@/components/documents/types'
import { Route } from '@/routes/_app/documents/index'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table'
import { useMemo } from 'react'
import type { DocumentsSearch } from '@/routes/_app/documents/index'

export type DocumentsPageState = {
  documents: ReturnType<typeof enrichWithProjectName>
  isPending: boolean
  isError: boolean
  refetch: () => void
  currentPage: number
  totalPages: number
  sorting: SortingState
  columnFilters: ColumnFiltersState
  searchQuery: string
  onSearchChange: (value: string) => void
  onSortingChange: (s: SortingState) => void
  onColumnFiltersChange: (filters: ColumnFiltersState) => void
  onPageChange: (page: number) => void
}

export function useDocumentsPageState(): DocumentsPageState {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { projects } = useProjects()

  const { data: page, isPending, isError, refetch } = useDocumentsList({
    type: search.type as DocumentType | undefined,
    status: search.status as DocumentStatus | undefined,
    projectId: search.projectId,
    recurring: search.recurring,
    paid: search.paid,
    search: search.q,
    from: search.from,
    to: search.to,
    sort: 'issueDateDesc',
    page: search.page,
    limit: search.limit,
  })

  const documents = enrichWithProjectName(page?.data ?? [], projects)
  const totalPages = page?.totalPages ?? 1
  const currentPage = search.page ?? 1

  const sorting: SortingState = search.sortId
    ? [{ id: search.sortId, desc: search.sortDesc ?? false }]
    : []

  const columnFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = []
    if (search.type) filters.push({ id: 'type', value: [search.type] })
    if (search.status) filters.push({ id: 'status', value: [search.status] })
    if (search.recurring) filters.push({ id: 'recurring', value: ['true'] })
    if (search.paid) filters.push({ id: 'paid', value: [search.paid] })
    if (search.q) filters.push({ id: 'clientName', value: search.q })
    if (search.from || search.to) {
      const from = search.from ? new Date(search.from).getTime() : undefined
      const to = search.to ? new Date(search.to).getTime() : undefined
      filters.push({ id: 'issueDate', value: [from, to] })
    }
    return filters
  }, [search.type, search.status, search.recurring, search.paid, search.q, search.from, search.to])

  function setSearch(updates: Partial<DocumentsSearch>) {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        page: 'page' in updates ? updates.page : 1,
      }),
      replace: true,
      resetScroll: false,
    })
  }

  function onSearchChange(value: string) {
    setSearch({ q: value.trim() || undefined })
  }

  function onSortingChange(s: SortingState) {
    const first = s[0]
    setSearch({ sortId: first?.id, sortDesc: first?.desc ?? false })
  }

  function onColumnFiltersChange(filters: ColumnFiltersState) {
    const type = filters.find((f) => f.id === 'type')?.value as string[] | undefined
    const status = filters.find((f) => f.id === 'status')?.value as string[] | undefined
    const recurring = filters.find((f) => f.id === 'recurring')?.value as string[] | undefined
    const paid = filters.find((f) => f.id === 'paid')?.value as string[] | undefined
    const clientName = filters.find((f) => f.id === 'clientName')?.value as string | undefined
    const issueDateVal = filters.find((f) => f.id === 'issueDate')?.value as
      | [number?, number?]
      | undefined

    setSearch({
      type: type?.[0] as DocumentType | undefined,
      status: status?.[0] as DocumentStatus | undefined,
      projectId: search.projectId,
      recurring: recurring?.includes('true') ? true : undefined,
      paid: paid?.[0] as 'paid' | 'unpaid' | undefined,
      q: clientName || undefined,
      from: timestampFilterToCalendarDate(issueDateVal?.[0]),
      to: timestampFilterToCalendarDate(issueDateVal?.[1]),
    })
  }

  function onPageChange(p: number) {
    setSearch({ page: p })
  }

  return {
    documents,
    isPending,
    isError,
    refetch: () => { void refetch() },
    currentPage,
    totalPages,
    sorting,
    columnFilters,
    searchQuery: search.q ?? '',
    onSearchChange,
    onSortingChange,
    onColumnFiltersChange,
    onPageChange,
  }
}
