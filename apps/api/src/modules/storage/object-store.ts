import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, r2Presigner, R2_BUCKET } from '@api/utils/r2'

export interface ObjectStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>
  delete(key: string): Promise<void>
  get(key: string): Promise<Uint8Array | null>
  copy(sourceKey: string, targetKey: string): Promise<void>
  signGet(key: string, expiresInSeconds: number, responseContentDisposition?: string): Promise<string>
}

export const r2ObjectStore: ObjectStore = {
  async put(key, body, contentType) {
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
    }))
  },

  async delete(key) {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  },

  async get(key) {
    const response = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return response.Body ? response.Body.transformToByteArray() : null
  },

  async copy(sourceKey, targetKey) {
    await r2.send(new CopyObjectCommand({
      Bucket: R2_BUCKET,
      CopySource: `${R2_BUCKET}/${sourceKey}`,
      Key: targetKey,
    }))
  },

  signGet(key, expiresInSeconds, responseContentDisposition) {
    return getSignedUrl(
      r2Presigner,
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ResponseContentDisposition: responseContentDisposition,
      }),
      { expiresIn: expiresInSeconds },
    )
  },
}
