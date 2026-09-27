import Anthropic from '@anthropic-ai/sdk'
import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages/messages.js'
import { AppError } from '@api/lib/errors'
import { env } from '@api/env'
import { recordAiTokens } from '@api/modules/billing/usage'

let anthropic: Anthropic | undefined

export const AI_UNAVAILABLE = {
  code: 'AI_NOT_CONFIGURED' as const,
  message: 'AI is not configured. Ask your administrator to configure an AI provider.',
}

export class AiNotConfiguredError extends AppError {
  readonly code = AI_UNAVAILABLE.code

  constructor() {
    super(AI_UNAVAILABLE.message, 503)
  }
}

export function assertAiConfigured() {
  if (!env.ANTHROPIC_API_KEY) throw new AiNotConfiguredError()
}

function getAnthropic() {
  assertAiConfigured()
  anthropic ??= new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    baseURL: env.ANTHROPIC_BASE_URL,
  })
  return anthropic
}

function recordUsage(userId: string, usage: Anthropic.Usage) {
  recordAiTokens(userId, usage).catch((error) => {
    console.error('[ai] token accounting failed:', error)
  })
}

export async function trackedCreate(
  userId: string,
  params: Anthropic.MessageCreateParamsNonStreaming,
) {
  const response = await getAnthropic().messages.create(
    { thinking: { type: 'disabled' }, ...params },
    { timeout: 90_000 },
  )
  recordUsage(userId, response.usage)
  return response
}

export function trackedStream(
  userId: string,
  params: MessageCreateParamsBase,
  signal?: AbortSignal,
) {
  const stream = getAnthropic().messages.stream(
    { thinking: { type: 'disabled' }, ...params },
    { signal, timeout: 90_000 },
  )
  return {
    stream,
    async finalMessage() {
      const response = await stream.finalMessage()
      recordUsage(userId, response.usage)
      return response
    },
  }
}
