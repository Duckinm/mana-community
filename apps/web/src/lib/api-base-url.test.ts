import { afterEach, expect, test, vi } from 'vitest'
import { resolveApiBaseUrl } from '@/lib/api-base-url'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('same-origin build follows the browser origin, including the PDF renderer', () => {
  vi.stubEnv('VITE_API_URL', 'same-origin')
  vi.stubGlobal('window', { location: new URL('http://localhost:3300/projects') })
  expect(resolveApiBaseUrl()).toBe('http://localhost:3300')
  vi.stubGlobal('window', { location: new URL('http://web:3000/view/example') })
  expect(resolveApiBaseUrl()).toBe('http://web:3000')
})

test('same-origin SSR uses the internal API origin', () => {
  vi.stubEnv('VITE_API_URL', 'same-origin')
  vi.stubEnv('API_ORIGIN', 'http://api:4000')
  vi.stubGlobal('window', undefined)
  expect(resolveApiBaseUrl()).toBe('http://api:4000')
})

test('configured hosted API origin remains unchanged', () => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.test')
  vi.stubGlobal('window', { location: new URL('https://app.example.test') })
  expect(resolveApiBaseUrl()).toBe('https://api.example.test')
})
