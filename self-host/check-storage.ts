import assert from 'node:assert/strict'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const endpoint = process.env.R2_ENDPOINT!
const storage = new S3Client({
  endpoint,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
const Key = `self-host-check/${crypto.randomUUID()}.txt`
const Body = `Storage acceptance check ${Key}`

try {
  for (const Bucket of ['mana', 'mana-public']) {
    await storage.send(new PutObjectCommand({ Bucket, Key, Body, ContentType: 'text/plain' }))
  }

  const publicRead = await fetch(`${endpoint}/mana-public/${Key}`)
  assert.equal(publicRead.status, 200, 'public objects must be readable anonymously')
  assert.equal(await publicRead.text(), Body)

  for (const path of [`mana/${Key}`, 'mana?list-type=2', 'mana-public?list-type=2', '']) {
    const response = await fetch(`${endpoint}/${path}`)
    assert.equal(response.status, 403, `anonymous access must be denied: ${path || 'bucket list'}`)
    await response.body?.cancel()
  }

  const anonymousWrite = await fetch(`${endpoint}/mana-public/${Key}`, { method: 'PUT', body: 'unauthorized' })
  assert.equal(anonymousWrite.status, 403, 'public objects must not be writable anonymously')
  await anonymousWrite.body?.cancel()

  const signedUrl = await getSignedUrl(storage, new GetObjectCommand({ Bucket: 'mana', Key }), { expiresIn: 60 })
  const signedRead = await fetch(signedUrl)
  assert.equal(signedRead.status, 200, 'private objects must be readable with a valid presigned URL')
  assert.equal(await signedRead.text(), Body)

  const preflight = await fetch(`${endpoint}/mana/${Key}`, {
    method: 'OPTIONS',
    headers: { Origin: process.env.WEB_URL!, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' },
  })
  assert.equal(preflight.ok, true, 'browser uploads require a successful CORS preflight')
  assert.equal(preflight.headers.get('access-control-allow-origin'), process.env.WEB_URL)
  await preflight.body?.cancel()
  console.log('PASS: public read, private isolation, denied listing/write, presigned read, and upload CORS.')
} finally {
  await Promise.all(['mana', 'mana-public'].map((Bucket) => storage.send(new DeleteObjectCommand({ Bucket, Key }))))
}
