import type { EmailResult, SingleEmailPayload } from '@api/utils/email'

function address(value: string) {
  const named = value.match(/^(.*?)\s*<([^<>]+)>$/)
  return named
    ? { Name: named[1].trim().replace(/^"|"$/g, ''), Email: named[2].trim() }
    : { Email: value.trim() }
}

export async function sendMailpitEmail(
  url: string,
  payload: SingleEmailPayload & { from: string },
): Promise<EmailResult> {
  try {
    const cc = payload.cc === undefined ? [] : Array.isArray(payload.cc) ? payload.cc : [payload.cc]
    const response = await fetch(`${url.replace(/\/$/, '')}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        From: address(payload.from),
        To: [address(payload.to)],
        Cc: cc.map(address),
        Subject: payload.subject,
        HTML: payload.html,
        Attachments: payload.attachments?.map((attachment) => ({
          Filename: attachment.filename,
          Content: attachment.content.toString('base64'),
        })),
      }),
    })
    if (!response.ok) throw new Error(`Mailpit rejected email (HTTP ${response.status})`)
    const result: unknown = await response.json()
    if (!result || typeof result !== 'object' || !('ID' in result) || typeof result.ID !== 'string' || !result.ID) {
      throw new Error('Mailpit returned no message ID')
    }
    return { to: payload.to, status: 'sent' }
  } catch (error) {
    return {
      to: payload.to,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Mailpit request failed',
    }
  }
}
