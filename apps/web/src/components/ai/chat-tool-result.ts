export type DisplayRow = {
  entity: 'contact' | 'project' | 'document' | 'task' | 'transaction' | 'template'
  id: string
  title: string
  subtitle?: string
  value?: string
  badge?: string
  projectId?: string
}

export type ChatToolResult = {
  name: string
  result: unknown
  display?: DisplayRow[]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isFinancialSummaryResult(result: unknown): result is {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  monthlyAvgRevenue: number
  monthlyAvgExpenses: number
  runwayMonths: number | null
} {
  return (
    isRecord(result) &&
    typeof result.totalRevenue === 'number' &&
    typeof result.totalExpenses === 'number' &&
    typeof result.netIncome === 'number'
  )
}

export function isDashboardSnapshotResult(result: unknown): result is {
  activeProjects: number
  openTasks: number
  overdueTasks: number
  thisMonthRevenue: number
  thisMonthExpenses: number
  thisMonthNet: number
  totalFiles: number
  baseCurrency?: string
} {
  return (
    isRecord(result) &&
    typeof result.activeProjects === 'number' &&
    typeof result.openTasks === 'number' &&
    typeof result.thisMonthRevenue === 'number' &&
    typeof result.thisMonthExpenses === 'number'
  )
}

export function isStorageSummaryResult(result: unknown): result is {
  totalFiles: number
  totalFolders: number
  totalSizeMb: number
  byKind?: Record<string, number>
} {
  return (
    isRecord(result) &&
    typeof result.totalFiles === 'number' &&
    typeof result.totalSizeMb === 'number'
  )
}
