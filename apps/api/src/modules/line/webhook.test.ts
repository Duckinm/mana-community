import { describe, expect, it, mock } from 'bun:test'

const replyLineTextMessage = mock(async () => ({ ok: true as const }))

mock.module('../../db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => [],
      }),
    }),
  },
}))

mock.module('../../lib/line/client', () => ({ replyLineTextMessage }))

const { handleLineWebhookEvents } = await import('@api/modules/line/webhook')

describe('LINE webhook', () => {
  it('greets a new follower with connect instructions', async () => {
    await handleLineWebhookEvents(JSON.stringify({
      events: [{ type: 'follow', replyToken: 'follow-token', source: { userId: 'line-user-id' } }],
    }))

    expect(replyLineTextMessage).toHaveBeenCalledWith('follow-token', expect.stringContaining('Settings'))
  })

  it('guides an unlinked user who messages the official account', async () => {
    await handleLineWebhookEvents(JSON.stringify({
      events: [{
        type: 'message',
        replyToken: 'reply-token',
        message: { type: 'text', text: 'Hey mana' },
        source: { userId: 'line-user-id' },
      }],
    }))

    expect(replyLineTextMessage).toHaveBeenCalledWith(
      'reply-token',
      expect.stringContaining('Settings'),
    )
  })
})
