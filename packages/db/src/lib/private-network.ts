// Single source of truth for "is this host local/private?" — consumed by the API's CORS
// dev fallback and HQ's environment badge, which must agree on the answer.
// Hostnames come from WHATWG URL.hostname, which brackets IPv6 ('[::1]').
export function isPrivateNetworkHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  if (hostname === '[::1]' || hostname === '::1') return true
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  return false
}
