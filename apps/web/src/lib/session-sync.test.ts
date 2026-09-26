import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.hoisted(() => ({ signOut: vi.fn().mockResolvedValue(undefined) }))
const storageMock = vi.hoisted(() => ({ setItem: vi.fn() }))

vi.mock('@/lib/auth-client', () => ({
  getSession: vi.fn(),
  signOut: authMock.signOut,
}))

import { queryClient } from '@/lib/query-client'
import { signOutAndSync } from '@/lib/session-sync'

describe('signOutAndSync', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.stubGlobal('localStorage', storageMock)
    storageMock.setItem.mockClear()
    authMock.signOut.mockClear()
  })

  it('clears cached data from the signed-out account', async () => {
    queryClient.setQueryData(['user'], { email: 'old@example.com' })
    queryClient.setQueryData(['projects'], [{ id: 'old-project' }])

    await signOutAndSync()

    expect(authMock.signOut).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(['user'])).toBeUndefined()
    expect(queryClient.getQueryData(['projects'])).toBeUndefined()
  })
})
