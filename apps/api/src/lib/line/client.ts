import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '@api/env'

export type LinePushResult = { ok: true } | { ok: false; message: string }

export function isLineConfigured(): boolean {
  return Boolean(env.LINE_CHANNEL_ACCESS_TOKEN && env.LINE_CHANNEL_SECRET)
}

/** LINE signs the raw request body with the channel secret — verify before trusting the payload. */
export function verifyLineSignature(rawBody: string, signature: string): boolean {
  if (!env.LINE_CHANNEL_SECRET) return false
  const expected = createHmac('sha256', env.LINE_CHANNEL_SECRET).update(rawBody).digest('base64')
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(signature)
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

/** `ti/p` is LINE's canonical add-friend link: opens the app on mobile, shows a scannable QR page on desktop. */
export function buildLineAddFriendUrl(): string {
  const oaId = env.LINE_OA_ID?.replace(/^@api/, '')
  return `https://line.me/R/ti/p/@${oaId}`
}

/** `oaMessage` opens the OA chat with the text already typed into the input box — the user only taps send. */
export function buildLineSendCodeUrl(code: string): string {
  const oaId = env.LINE_OA_ID?.replace(/^@api/, '')
  return `https://line.me/R/oaMessage/@${oaId}/?${encodeURIComponent(code)}`
}

export async function pushLineFlexMessage(
  lineUserId: string,
  opts: { title: string; status: string; url: string },
): Promise<LinePushResult> {
  if (!isLineConfigured()) return { ok: false, message: 'LINE is not configured' }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: 'flex',
            altText: opts.title,
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: opts.title, weight: 'bold', size: 'lg', wrap: true },
                  { type: 'text', text: opts.status, size: 'sm', color: '#666666', wrap: true, margin: 'md' },
                ],
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    action: { type: 'uri', label: 'View in Mana', uri: opts.url },
                  },
                ],
              },
            },
          },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, message: `LINE push failed (${res.status}): ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'LINE push request failed' }
  }
}

export async function replyLineTextMessage(replyToken: string, text: string): Promise<LinePushResult> {
  if (!isLineConfigured()) return { ok: false, message: 'LINE is not configured' }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, message: `LINE reply failed (${res.status}): ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'LINE reply request failed' }
  }
}
