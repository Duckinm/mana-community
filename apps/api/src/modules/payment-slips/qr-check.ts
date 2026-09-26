import sharp from 'sharp'
import jsQR from 'jsqr'

export interface QrCheckResult {
  qrFound: boolean
  qrRawText: string | null
}

// ponytail: QR-found + raw text is the whole free-tier signal — no EMV amount
// parsing, Thai bank QR payloads vary too much to parse reliably. Thunder Solution does
// the real amount cross-check server-side for the paid tier.
export async function checkSlipQr(buffer: Buffer): Promise<QrCheckResult> {
  try {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const result = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height)
    if (!result) return { qrFound: false, qrRawText: null }
    return { qrFound: true, qrRawText: result.data }
  } catch {
    return { qrFound: false, qrRawText: null }
  }
}
