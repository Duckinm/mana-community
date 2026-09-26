import type { ChatUiOverlay } from '@/components/ai/chat-ui-action'
import type { ChatToolResult } from '@/components/ai/chat-tool-result'
import {
  isDashboardSnapshotResult,
  isFinancialSummaryResult,
  isRecord,
  isStorageSummaryResult,
} from '@/components/ai/chat-tool-result'
import { EntityRowsWidget } from '@/components/ai/entity-rows-widget'
import { DashboardSnapshotAiPanel } from '@/components/ai/widgets/dashboard-snapshot-panel'
import { FinancialSummaryAiPanel } from '@/components/ai/widgets/financial-summary-panel'
import { StorageSummaryAiPanel } from '@/components/ai/widgets/storage-summary-panel'

interface Props {
  toolResults?: ChatToolResult[]
  onOpenOverlay?: (overlay: ChatUiOverlay) => void
}

function ToolResultWidget({
  tool,
  onOpenOverlay,
}: {
  tool: ChatToolResult
  onOpenOverlay?: (overlay: ChatUiOverlay) => void
}) {
  const { name, result, display } = tool

  if (display && display.length > 0) {
    return <EntityRowsWidget rows={display} onOpen={onOpenOverlay} />
  }

  if (result && isRecord(result) && result.error) return null

  if (name === 'get_financial_summary' && isFinancialSummaryResult(result)) {
    return <FinancialSummaryAiPanel summary={result} />
  }

  if (name === 'get_dashboard_snapshot' && isDashboardSnapshotResult(result)) {
    return <DashboardSnapshotAiPanel snapshot={result} />
  }

  if (name === 'get_storage_summary' && isStorageSummaryResult(result)) {
    return <StorageSummaryAiPanel summary={result} />
  }

  return null
}

export function ChatToolWidgets({ toolResults, onOpenOverlay }: Props) {
  if (!toolResults?.length) return null

  // ponytail: the model often re-runs the same lookup across tool rounds; render one card per distinct payload
  const seen = new Set<string>()
  const widgets = toolResults
    .filter((tool) => {
      if (!tool.display?.length) return true
      const key = `${tool.name}:${tool.display.map((r) => `${r.entity}/${r.id}`).join(',')}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((tool, i) => (
      <ToolResultWidget key={`${tool.name}-${i}`} tool={tool} onOpenOverlay={onOpenOverlay} />
    ))
    .filter(Boolean)

  if (widgets.length === 0) return null

  return <div className="mt-3 space-y-2">{widgets}</div>
}
