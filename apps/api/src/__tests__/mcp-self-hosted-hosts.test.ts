import { expect, test } from 'bun:test'

test('production MCP accepts configured self-hosted hosts while rejecting rebinding and cross-origin requests', () => {
  for (const config of [
    { auth: 'http://localhost:3350', web: 'http://localhost:3350' },
    { auth: 'https://api.mana.example', web: 'https://work.mana.example' },
  ]) {
    const result = Bun.spawnSync({
      cmd: [process.execPath, '--no-env-file', '-e', `
        import { mcpModule, allowedMcpHosts } from '@api/modules/mcp'
        const authHost = new URL(process.env.BETTER_AUTH_URL).host
        const webHost = new URL(process.env.WEB_URL).host
        async function status(host, origin) {
          const response = await mcpModule.handle(new Request('http://api:4000/mcp/', {
            method: 'POST', headers: { host, ...(origin ? { origin } : {}) },
          }))
          return response.status
        }
        console.log(JSON.stringify({
          hosts: allowedMcpHosts(),
          direct: await status(authHost),
          proxied: await status(webHost, process.env.WEB_URL),
          hostileHost: await status('attacker.example'),
          hostileOrigin: await status(webHost, 'https://attacker.example'),
          oldCloudHost: await status('mana-api.fly.dev'),
        }))
      `],
      cwd: new URL('../..', import.meta.url).pathname,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:1/mana_test',
        BETTER_AUTH_SECRET: 'mcp-local-test-secret-at-least-thirty-two-characters',
        BETTER_AUTH_URL: config.auth,
        WEB_URL: config.web,
        CORS_ORIGIN: config.web,
        R2_ENDPOINT: 'http://127.0.0.1:1',
        R2_ACCESS_KEY_ID: 'test',
        R2_SECRET_ACCESS_KEY: 'test',
        R2_PUBLIC_URL: 'http://127.0.0.1:1',
      },
    })
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout.toString())).toEqual({
      hosts: [...new Set([new URL(config.auth).host, new URL(config.web).host])],
      direct: 401,
      proxied: 401,
      hostileHost: 403,
      hostileOrigin: 403,
      oldCloudHost: 403,
    })
  }
})
