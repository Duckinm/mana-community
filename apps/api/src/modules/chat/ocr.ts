import { env } from '@api/env'
import { toVisionJpegBase64 } from '@api/lib/vision-image'

const TYPHOON_URL = 'https://api.opentyphoon.ai/v1/chat/completions'

// Typhoon OCR is a document model, not a chat model: it answers this instruction with the
// page transcribed, and ignores anything conversational.
const OCR_PROMPT =
  'Transcribe this document into structured markdown. Preserve tables, line items, amounts and dates exactly as printed. Return only the transcription.'

/**
 * v1 returns a JSON envelope with the markdown under `natural_text`; v1.5 returns the
 * markdown directly. Accept either, and treat a JSON body without `natural_text` as prose.
 */
export function parseOcrContent(content: string): string | null {
  const text = content.trim()
  if (!text) return null
  if (text.startsWith('{')) {
    try {
      const natural = JSON.parse(text)?.natural_text
      if (typeof natural === 'string') return natural.trim() || null
    } catch {
      // Not the envelope — the model transcribed something that merely looks like JSON.
    }
  }
  return text
}

/**
 * Reads an attached image with Typhoon OCR so the agent gets text instead of pixels.
 * Returns null when OCR is not configured or the call fails — the caller then falls back
 * to handing the raw image to the chat model.
 */
export async function extractImageText(base64: string): Promise<string | null> {
  if (!env.TYPHOON_OCR_API_KEY) return null

  try {
    const resized = await toVisionJpegBase64(Buffer.from(base64, 'base64'))

    const res = await fetch(TYPHOON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.TYPHOON_OCR_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'typhoon-ocr',
        max_tokens: 16000,
        temperature: 0.1,
        top_p: 0.6,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: OCR_PROMPT },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${resized}` },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!res.ok) {
      console.error('[ocr] typhoon returned', res.status, await res.text().catch(() => ''))
      return null
    }

    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = body.choices?.[0]?.message?.content
    return content ? parseOcrContent(content) : null
  } catch (err) {
    console.error('[ocr] extraction failed, falling back to the chat model:', err)
    return null
  }
}
