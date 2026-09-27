import { expect, test } from 'bun:test'

test('community API exposes usage without subscription, landing, or operator routes', async () => {
  const script = `
    const { app } = await import('./src/index.ts');
    console.log('COMMUNITY_ROUTES=' + JSON.stringify(app.routes.filter(({ path }) => !path.endsWith('*')).map(({ path }) => path)));
    for (const path of ['/api/billing/checkout-session', '/api/billing/portal-session', '/api/billing/webhook']) {
      const response = await app.handle(new Request('http://localhost' + path, { method: 'POST' }));
      if (response.status !== 404) throw new Error(path + ' must be absent: ' + response.status);
    }
    await app.stop(true);
    process.exit(0);
  `
  const child = Bun.spawn([process.execPath, '--no-env-file', '-e', script], {
    cwd: new URL('../..', import.meta.url).pathname,
    env: { ...process.env, PORT: '0' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const output = await new Response(child.stdout).text()
  const errors = await new Response(child.stderr).text()
  expect(await child.exited, errors).toBe(0)
  const line = output.split('\n').find((value) => value.startsWith('COMMUNITY_ROUTES='))
  expect(line).toBeDefined()
  const paths: string[] = JSON.parse(line!.slice('COMMUNITY_ROUTES='.length))
  expect(paths).toContain('/api/billing/usage')
  expect(paths).toContain('/api/billing/usage/daily')
  expect(paths).toContain('/api/projects')
  for (const path of paths) {
    expect(path).not.toMatch(/^\/api\/(?:cms|blog|operations|ledger|landing)/)
    if (path.startsWith('/api/billing/')) {
      expect(['/api/billing/usage', '/api/billing/usage/daily']).toContain(path)
    }
    expect(path).not.toContain('complete-profile')
  }
}, 15000)
