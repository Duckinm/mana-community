import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET } from '@api/utils/r2'

export async function uploadPdfToR2(documentId: string, pdf: Buffer): Promise<string> {
  const key = `documents/${documentId}/invoice.pdf`
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: pdf,
    ContentType: 'application/pdf',
    ContentLength: pdf.byteLength,
  }))
  return key
}
