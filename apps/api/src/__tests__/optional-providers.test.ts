import { expect, it } from 'bun:test'

it('boots auth and email webhooks without email or AI keys, and excludes self-hosted billing', () => {
  const result = Bun.spawnSync({
    cmd: [process.execPath, '--no-env-file', '-e', `
      import { auth } from '@api/auth'
      import { emailDeliveryModule } from '@api/modules/email-delivery'
      const response = await emailDeliveryModule.handle(new Request('http://localhost/api/email/webhook', {
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}',
      }))
      console.log(JSON.stringify({
        status: response.status,
        body: await response.json(),
        stripeEnabled: auth.options.plugins?.some(plugin => plugin.id === 'stripe'),
      }))
    `],
    cwd: new URL('../..', import.meta.url).pathname,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'test',
      DEPLOYMENT_MODE: 'self-hosted',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:1/mana_test',
      BETTER_AUTH_SECRET: 'test-only-key',
      BETTER_AUTH_URL: 'http://localhost:4000',
      R2_ENDPOINT: 'http://127.0.0.1:1',
      R2_ACCESS_KEY_ID: 'test',
      R2_SECRET_ACCESS_KEY: 'test',
      R2_PUBLIC_URL: 'http://127.0.0.1:1',
      RESEND_WEBHOOK_SECRET: 'test-secret-without-api-key',
      STRIPE_SECRET_KEY: 'test-key-disabled-by-self-hosting',
      STRIPE_WEBHOOK_SECRET: 'test-secret-disabled-by-self-hosting',
    },
  })
  expect(result.exitCode).toBe(0)
  expect(JSON.parse(result.stdout.toString())).toEqual({
    status: 501,
    body: { error: 'Email delivery webhook is not configured' },
    stripeEnabled: false,
  })
})
