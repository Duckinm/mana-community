import { expect, test } from 'bun:test'

test('self-host storage uses internal requests and browser-reachable signed URLs without cloud credentials', () => {
  const result = Bun.spawnSync([process.execPath, '--no-env-file', '-e', `
    const { env } = await import('./src/env');
    const { r2 } = await import('./src/utils/r2');
    const { r2ObjectStore } = await import('./src/modules/storage/object-store');
    const { presignTemplateImage } = await import('./src/modules/item-templates/image');
    const endpoint = await r2.config.endpoint();
    console.log(JSON.stringify({ endpoint: endpoint.hostname, urls: [
      await r2ObjectStore.signGet('private.txt', 60),
      await presignTemplateImage('template-images/example.png'),
    ] }));
  `], {
    cwd: new URL('../..', import.meta.url).pathname,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      BETTER_AUTH_SECRET: 'test-only-secret-at-least-32-characters',
      BETTER_AUTH_URL: 'http://localhost:3300',
      R2_ENDPOINT: 'http://storage:8333',
      R2_PRESIGN_ENDPOINT: 'http://localhost:39000',
      R2_REGION: 'us-east-1',
      R2_FORCE_PATH_STYLE: 'true',
      R2_ACCESS_KEY_ID: 'test-key',
      R2_SECRET_ACCESS_KEY: 'test-secret',
      R2_PUBLIC_URL: 'http://localhost:39000/mana-public',
      MAILPIT_URL: 'http://mail:8025',
    },
  })
  expect(result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
  const config = JSON.parse(result.stdout.toString())
  expect(config.endpoint).toBe('storage')
  for (const signed of config.urls) {
    const url = new URL(signed)
    expect(url.origin).toBe('http://localhost:39000')
    expect(url.pathname).toStartWith('/mana/')
    expect(url.searchParams.has('X-Amz-Signature')).toBe(true)
  }
})
