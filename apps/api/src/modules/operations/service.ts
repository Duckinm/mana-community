import { env } from '@api/env'
import { z } from 'zod'
import { getStripeClient } from '@api/modules/billing/service'
import {
  currencyAmounts,
  providerState,
  resourceState,
  summarizePayments,
  summarizeSubscriptions,
} from '@api/modules/operations/helpers'

const flyMachinesSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  state: z.string(),
  region: z.string(),
  updated_at: z.string(),
}))

const neonProjectSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string(),
    region_id: z.string(),
    pg_version: z.number(),
    history_retention_seconds: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
})

const neonBranchesSchema = z.object({
  branches: z.array(z.object({
    id: z.string(),
    name: z.string(),
    current_state: z.string(),
    default: z.boolean(),
    parent_id: z.string().optional(),
    updated_at: z.string(),
  })),
})

const neonDatabasesSchema = z.object({
  databases: z.array(z.object({
    id: z.number(),
    name: z.string(),
    branch_id: z.string(),
  })),
})

const neonEndpointsSchema = z.object({
  endpoints: z.array(z.object({
    id: z.string(),
    branch_id: z.string(),
    current_state: z.string(),
    type: z.string(),
    region_id: z.string(),
    updated_at: z.string(),
  })),
})

const emptyBalance = { available: [], pending: [] }
const emptySubscriptions = { active: 0, trialing: 0, pastDue: 0, other: 0, hasMore: false }
const emptyPayments = { succeeded: 0, failed: 0, volume: [], hasMore: false }

function resultError(results: PromiseSettledResult<unknown>[]) {
  const messages = results.flatMap((result) =>
    result.status === 'rejected'
      ? [result.reason instanceof Error ? result.reason.message : 'Provider request failed']
      : [],
  )
  return messages.length ? [...new Set(messages)].join('; ') : null
}

async function fetchJson<T>(url: string, token: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error(`Provider request failed (${response.status})`)
  return schema.parse(await response.json())
}

async function stripeOverview() {
  const stripe = getStripeClient()
  if (!stripe) {
    return {
      state: 'unconfigured' as const,
      dashboardUrl: 'https://dashboard.stripe.com/',
      error: null,
      livemode: null,
      balance: emptyBalance,
      subscriptions: emptySubscriptions,
      paymentsLast30Days: emptyPayments,
    }
  }

  const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
  const results = await Promise.allSettled([
    stripe.balance.retrieve(),
    stripe.subscriptions.list({ status: 'all', limit: 100 }),
    stripe.paymentIntents.list({ created: { gte: since }, limit: 100 }),
  ])
  const [balanceResult, subscriptionsResult, paymentsResult] = results
  const livemode = balanceResult.status === 'fulfilled' ? balanceResult.value.livemode : null

  return {
    state: providerState(results),
    dashboardUrl: livemode === null
      ? 'https://dashboard.stripe.com/'
      : livemode
        ? 'https://dashboard.stripe.com/dashboard'
        : 'https://dashboard.stripe.com/test/dashboard',
    error: resultError(results),
    livemode,
    balance: balanceResult.status === 'fulfilled' ? {
      available: currencyAmounts(balanceResult.value.available),
      pending: currencyAmounts(balanceResult.value.pending),
    } : emptyBalance,
    subscriptions: subscriptionsResult.status === 'fulfilled'
      ? summarizeSubscriptions(subscriptionsResult.value.data, subscriptionsResult.value.has_more)
      : emptySubscriptions,
    paymentsLast30Days: paymentsResult.status === 'fulfilled'
      ? summarizePayments(paymentsResult.value.data.map((payment) => ({
        status: payment.status,
        amountReceived: payment.amount_received,
        currency: payment.currency,
        hasError: payment.last_payment_error !== null,
      })), paymentsResult.value.has_more)
      : emptyPayments,
  }
}

async function flyOverview() {
  if (!env.FLY_API_TOKEN || !env.FLY_APP_NAME) {
    return {
      state: 'unconfigured' as const,
      dashboardUrl: null,
      error: null,
      appName: env.FLY_APP_NAME ?? null,
      machines: [],
    }
  }

  const dashboardUrl = `https://fly.io/apps/${encodeURIComponent(env.FLY_APP_NAME)}`
  try {
    const machines = await fetchJson(
      `https://api.machines.dev/v1/apps/${encodeURIComponent(env.FLY_APP_NAME)}/machines`,
      env.FLY_API_TOKEN,
      flyMachinesSchema,
    )
    return {
      state: resourceState(machines, new Set(['started'])),
      dashboardUrl,
      error: null,
      appName: env.FLY_APP_NAME,
      machines: machines.map((machine) => ({
        id: machine.id,
        name: machine.name,
        state: machine.state,
        region: machine.region,
        updatedAt: machine.updated_at,
      })),
    }
  } catch (error) {
    return {
      state: 'unavailable' as const,
      dashboardUrl,
      error: error instanceof Error ? error.message : 'Provider request failed',
      appName: env.FLY_APP_NAME,
      machines: [],
    }
  }
}

async function neonOverview() {
  const projectId = env.NEON_PROJECT_ID
  const projectUrl = projectId
    ? `https://console.neon.tech/app/projects/${encodeURIComponent(projectId)}`
    : null
  if (!env.NEON_API_KEY || !projectId) {
    return {
      state: 'unconfigured' as const,
      dashboardUrl: projectUrl,
      error: null,
      project: null,
      branches: [],
      databases: [],
      endpoints: [],
      restore: { available: false, mode: 'console' as const, url: projectUrl },
    }
  }

  const baseUrl = `https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectId)}`
  const results = await Promise.allSettled([
    fetchJson(baseUrl, env.NEON_API_KEY, neonProjectSchema),
    fetchJson(`${baseUrl}/branches`, env.NEON_API_KEY, neonBranchesSchema),
    fetchJson(`${baseUrl}/endpoints`, env.NEON_API_KEY, neonEndpointsSchema),
  ])
  const [projectResult, branchesResult, endpointsResult] = results
  const rawBranches = branchesResult.status === 'fulfilled' ? branchesResult.value.branches : []
  const restoreBranch = rawBranches.find((branch) => branch.default && !branch.parent_id)
    ?? rawBranches.find((branch) => !branch.parent_id)
  const databaseResult = restoreBranch
    ? await Promise.allSettled([
      fetchJson(
        `${baseUrl}/branches/${encodeURIComponent(restoreBranch.id)}/databases`,
        env.NEON_API_KEY,
        neonDatabasesSchema,
      ),
    ]).then(([result]) => result)
    : null
  const allResults = databaseResult ? [...results, databaseResult] : results
  const remoteState = providerState(allResults)
  const rawEndpoints = endpointsResult.status === 'fulfilled' ? endpointsResult.value.endpoints : []
  const resources = [
    ...rawBranches.map((branch) => ({ state: branch.current_state })),
    ...rawEndpoints.map((endpoint) => ({ state: endpoint.current_state })),
  ]
  const project = projectResult.status === 'fulfilled' ? projectResult.value.project : null
  const restoreUrl = restoreBranch
    ? `${projectUrl}/branches/${encodeURIComponent(restoreBranch.id)}`
    : projectUrl

  return {
    state: remoteState === 'ready'
      ? resourceState(resources, new Set(['ready', 'active', 'idle']))
      : remoteState,
    dashboardUrl: projectUrl,
    error: resultError(allResults),
    project: project ? {
      id: project.id,
      name: project.name,
      regionId: project.region_id,
      pgVersion: project.pg_version,
      historyRetentionSeconds: project.history_retention_seconds,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    } : null,
    branches: rawBranches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      state: branch.current_state,
      primary: branch.default,
      updatedAt: branch.updated_at,
    })),
    databases: databaseResult?.status === 'fulfilled'
      ? databaseResult.value.databases.map((database) => ({
        id: database.id,
        name: database.name,
        branchId: database.branch_id,
      }))
      : [],
    endpoints: rawEndpoints.map((endpoint) => ({
      id: endpoint.id,
      branchId: endpoint.branch_id,
      state: endpoint.current_state,
      type: endpoint.type,
      regionId: endpoint.region_id,
      updatedAt: endpoint.updated_at,
    })),
    restore: {
      available: Boolean(restoreBranch && project && project.history_retention_seconds > 0),
      mode: 'console' as const,
      url: restoreUrl,
    },
  }
}

// GET /v2/info does not consume Thunder's paid quota — safe to poll for this dashboard.
async function thunderOverview() {
  const dashboardUrl = 'https://document.thunder.in.th/en/v2/info'
  if (!env.THUNDER_API_KEY) {
    return {
      state: 'unconfigured' as const,
      dashboardUrl,
      error: null,
      branchName: null,
      branchActive: null,
      accountEmail: null,
      credit: null,
      product: null,
      quotaUsed: null,
      quotaMax: null,
      quotaRemaining: null,
    }
  }

  try {
    const res = await fetch('https://api.thunder.in.th/v2/info', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${env.THUNDER_API_KEY}` },
      signal: AbortSignal.timeout(8_000),
    })
    const body: any = await res.json().catch(() => null)
    if (!res.ok || !body || body.success === false) {
      throw new Error(body?.error?.message ?? `Provider request failed (${res.status})`)
    }
    // Response shape per docs isn't schema-verified against a live account yet — read defensively.
    const data = body.data ?? body
    const branch = data.branch ?? {}
    const account = data.account ?? {}
    const quota = data.application?.quota ?? {}

    return {
      state: branch.isActive === false ? 'degraded' as const : 'ready' as const,
      dashboardUrl,
      error: null,
      branchName: branch.name ?? null,
      branchActive: branch.isActive ?? null,
      accountEmail: account.email ?? null,
      credit: typeof account.credit === 'number' ? account.credit : null,
      product: data.product?.name ?? null,
      quotaUsed: typeof quota.used === 'number' ? quota.used : null,
      quotaMax: typeof quota.max === 'number' ? quota.max : null,
      quotaRemaining: typeof quota.remaining === 'number' ? quota.remaining : null,
    }
  } catch (error) {
    return {
      state: 'unavailable' as const,
      dashboardUrl,
      error: error instanceof Error ? error.message : 'Provider request failed',
      branchName: null,
      branchActive: null,
      accountEmail: null,
      credit: null,
      product: null,
      quotaUsed: null,
      quotaMax: null,
      quotaRemaining: null,
    }
  }
}

export async function getOperationsOverview() {
  const [stripe, fly, neon, thunder] = await Promise.all([
    stripeOverview(),
    flyOverview(),
    neonOverview(),
    thunderOverview(),
  ])
  return { generatedAt: new Date().toISOString(), stripe, fly, neon, thunder }
}
