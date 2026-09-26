import { env } from '@api/env'

const R2_ENDPOINT_HOST = '.r2.cloudflarestorage.com'

export function isPrivateR2EndpointUrl(url: string): boolean {
  return url.includes(R2_ENDPOINT_HOST)
}

export function buildPublicUrl(key: string): string {
  const base = env.R2_PUBLIC_URL.replace(/\/$/, '')
  if (isPrivateR2EndpointUrl(base)) {
    throw new Error(
      'R2_PUBLIC_URL must be a public custom domain or r2.dev URL, not the S3 API endpoint (*.r2.cloudflarestorage.com)',
    )
  }
  return `${base}/${key}`
}

export function extractR2Key(url: string): string | null {
  const publicBase = env.R2_PUBLIC_URL.replace(/\/$/, '')
  if (url.startsWith(`${publicBase}/`)) {
    return url.slice(publicBase.length + 1)
  }
  const endpointMatch = url.match(/\.r2\.cloudflarestorage\.com\/(.+)$/)
  return endpointMatch?.[1] ?? null
}

export function resolvePublicAssetUrl(url: string): string {
  if (url.startsWith('data:') || url.startsWith('http') === false) return url
  if (isPrivateR2EndpointUrl(url)) {
    const key = extractR2Key(url)
    if (key) return buildPublicUrl(key)
  }
  return url
}
