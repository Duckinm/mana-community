import { S3Client } from '@aws-sdk/client-s3'
import { env } from '@api/env'

const config = {
  region: env.R2_REGION,
  endpoint: env.R2_ENDPOINT ?? `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: env.R2_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
}

export const r2 = new S3Client(config)
// Signing must use the browser's endpoint; changing a signed URL's host invalidates it.
export const r2Presigner = env.R2_PRESIGN_ENDPOINT
  ? new S3Client({ ...config, endpoint: env.R2_PRESIGN_ENDPOINT })
  : r2

export const R2_BUCKET = env.R2_BUCKET_NAME
export const R2_PUBLIC_BUCKET = env.R2_PUBLIC_BUCKET_NAME ?? env.R2_BUCKET_NAME
