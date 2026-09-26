import assert from 'node:assert/strict'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'

assert.equal(process.env.DEPLOYMENT_MODE, 'self-hosted', 'Run this check inside the local self-host API container')
assert.ok(process.env.R2_ENDPOINT)
assert.ok(process.env.R2_PRESIGN_ENDPOINT)

let imageUrl = ''
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () => new Response(`<html><body><div data-pdf-ready><img src="${imageUrl.replaceAll('&', '&amp;')}" /></div></body></html>`, {
    headers: { 'content-type': 'text/html' },
  }),
})
process.env.PDF_WEB_ORIGIN = server.url.origin

const { r2, r2Presigner, R2_BUCKET } = await import('@api/utils/r2')
const { generateDocumentPdf } = await import('@api/utils/pdf/generate-pdf')
const Key = `self-host-check/${crypto.randomUUID()}.png`
const Body = await sharp({ create: { width: 17, height: 13, channels: 3, background: '#f07143' } }).png().toBuffer()

try {
  await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key, Body, ContentType: 'image/png' }))
  const anonymous = await fetch(`${process.env.R2_ENDPOINT}/${R2_BUCKET}/${Key}`)
  assert.equal(anonymous.status, 403, 'The PDF image must remain private')
  await anonymous.body?.cancel()

  imageUrl = await getSignedUrl(r2Presigner, new GetObjectCommand({ Bucket: R2_BUCKET, Key }), { expiresIn: 60 })
  const pdf = await generateDocumentPdf('signed-image-check')
  assert.equal(/\/Width 17\b/.test(pdf.toString('latin1')), true, 'The PDF must embed the private image from its browser-facing signed URL')
  assert.equal(/\/Height 13\b/.test(pdf.toString('latin1')), true)

  const invalid = new URL(imageUrl)
  invalid.searchParams.set('X-Amz-Signature', '0'.repeat(64))
  imageUrl = invalid.toString()
  const rejectedPdf = await generateDocumentPdf('invalid-signature-check')
  assert.equal(/\/Width 17\b/.test(rejectedPdf.toString('latin1')), false, 'Routing must not bypass a rejected storage signature')
  console.log('PASS: PDF embeds a valid private signed image; anonymous and invalid-signature access remain denied.')
} finally {
  server.stop(true)
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key }))
}
