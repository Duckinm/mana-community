import { describe, expect, it } from 'bun:test'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { checkSlipQr } from '@api/modules/payment-slips/qr-check'

describe('checkSlipQr', () => {
  it('decodes a real QR code from an image', async () => {
    const rawText = '00020101021129370016A00000067701011201150999999999995802TH6304ABCD'
    const png = await QRCode.toBuffer(rawText, { type: 'png', margin: 2, width: 300 })
    const result = await checkSlipQr(png)
    expect(result.qrFound).toBe(true)
    expect(result.qrRawText).toBe(rawText)
  })

  it('reports no QR found for a blank image', async () => {
    const blank = await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 255, g: 255, b: 255 } } })
      .png()
      .toBuffer()
    const result = await checkSlipQr(blank)
    expect(result.qrFound).toBe(false)
    expect(result.qrRawText).toBe(null)
  })
})
