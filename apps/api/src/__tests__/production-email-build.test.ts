import { expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

it('renders verification and password-reset emails from the production API build', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mana-email-build-'))
  const apiDirectory = new URL('../..', import.meta.url).pathname
  const packageJson = await Bun.file(join(apiDirectory, 'package.json')).json()
  const [, ...buildArguments] = packageJson.scripts.build.split(/\s+/)
  const environment = {
    PATH: process.env.PATH,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:1/mana_test',
    BETTER_AUTH_SECRET: 'production-email-render-test-only-secret',
    BETTER_AUTH_URL: 'http://localhost:4000',
    R2_ENDPOINT: 'http://127.0.0.1:1',
    R2_ACCESS_KEY_ID: 'test',
    R2_SECRET_ACCESS_KEY: 'test',
    R2_PUBLIC_URL: 'http://127.0.0.1:1',
  }

  try {
    const build = Bun.spawnSync({
      cmd: [process.execPath, '--no-env-file', ...buildArguments, 'src/utils/email/catalog.tsx', '--outdir', directory],
      cwd: apiDirectory,
      env: environment,
    })
    expect(build.exitCode, build.stderr.toString()).toBe(0)
    const render = Bun.spawnSync({
      cmd: [process.execPath, '--no-env-file', '-e', `
        const { renderCatalogEmail } = await import(${JSON.stringify(join(directory, 'utils/email/catalog.js'))})
        const emails = []
        for (const template of ['verify-email', 'password-reset']) {
          emails.push(await renderCatalogEmail(template, {
            recipientName: 'Production Recipient',
            actionUrl: 'http://localhost/verify?token=production-render-test',
          }))
        }
        console.log(JSON.stringify(emails))
      `],
      cwd: apiDirectory,
      env: environment,
    })
    expect(render.exitCode, render.stderr.toString()).toBe(0)
    const emails = JSON.parse(render.stdout.toString())
    expect(emails).toHaveLength(2)
    for (const email of emails) {
      expect(email.subject).not.toBe('')
      expect(email.html).toContain('Production Recipient')
      expect(email.html).toContain('http://localhost/verify?token=production-render-test')
      expect(email.text).toContain('http://localhost/verify?token=production-render-test')
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 30_000)
