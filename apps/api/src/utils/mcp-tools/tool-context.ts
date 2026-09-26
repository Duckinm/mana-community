export interface ToolContext {
  source?: 'chat' | 'external-mcp'
  attachedFiles?: { name: string; mediaType: string; data: string; isImage: boolean }[]
}
