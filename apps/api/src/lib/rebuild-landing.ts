import * as Sentry from '@sentry/bun'
import { env } from '@api/env'

const WORKFLOW_FILE = 'rebuild-landing.yml'

/**
 * Dispatches the landing rebuild workflow so published articles reach the statically
 * built blog. Never throws: a failed dispatch must not fail the publish that caused it —
 * the next publish (or a manual workflow run) rebuilds the same content.
 */
export async function triggerLandingRebuild(): Promise<void> {
  if (!env.GITHUB_REBUILD_TOKEN) {
    console.warn('[cms] GITHUB_REBUILD_TOKEN is unset — skipping landing rebuild dispatch')
    return
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${env.GITHUB_REBUILD_TOKEN}`,
          'content-type': 'application/json',
          'x-github-api-version': '2022-11-28',
        },
        body: JSON.stringify({ ref: 'main' }),
      },
    )

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`landing rebuild dispatch failed (${response.status}): ${detail.slice(0, 200)}`)
    }
  } catch (error) {
    console.error('[cms] landing rebuild dispatch failed', error)
    Sentry.captureException(error)
  }
}
