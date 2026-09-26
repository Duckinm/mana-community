import assert from 'node:assert/strict'
import { rename, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type BrowserContext } from '@playwright/test'

const base = process.env.SELF_HOST_URL ?? 'http://localhost:3300'
const mail = process.env.SELF_HOST_MAIL_URL ?? 'http://localhost:38025'
const statePath = process.env.SELF_HOST_SMOKE_STATE ?? join(tmpdir(), 'mana-self-host-smoke.json')
for (const url of [base, mail]) {
  assert(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Run this account-creating smoke test only against a local rehearsal')
}
const browser = await chromium.launch()
const context = await browser.newContext({ baseURL: base, reducedMotion: 'reduce' })
await context.addInitScript(() => localStorage.setItem('locale', 'en'))
const page = await context.newPage()

async function saveState(state: object) {
  const temporary = `${statePath}.${crypto.randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' })
  await rename(temporary, statePath)
  assert.equal((await stat(statePath)).mode & 0o777, 0o600, 'Smoke credentials must be readable only by their owner')
}

async function api(path: string, data?: object, method = data ? 'POST' : 'GET', client = context) {
  const response = await client.request.fetch(`${base}/api/${path}`, {
    method, data, headers: { Origin: base },
  })
  assert(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`)
  return response.json()
}

async function verifyEmail(email: string, client: BrowserContext) {
  let html = ''
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(`${mail}/view/latest.html?query=${encodeURIComponent(`to:${email}`)}`)
    if (response.ok) { html = await response.text(); break }
    await Bun.sleep(500)
  }
  const link = html.match(/href="([^"]*\/api\/auth\/verify-email[^\"]*)"/)?.[1]?.replaceAll('&amp;', '&')
  assert(link, 'Signup must produce a real verification message in the local inbox')
  assert.equal(new URL(link).origin, base, 'Verification must return to this installation')
  // Bun 1.3.10's HTTP response URL breaks Playwright's API cookie parser; browsers handle auth cookies normally.
  const verificationPage = await client.newPage()
  try {
    const verification = await verificationPage.goto(link)
    assert(verification?.ok(), `Verification failed: ${verification?.status()}`)
  } finally {
    await verificationPage.close()
  }
}

async function login(email: string, password: string, client = context) {
  const loginPage = client === context ? page : await client.newPage()
  try {
    await client.clearCookies()
    await loginPage.goto('/login')
    await loginPage.locator('input[type="email"]').fill(email)
    await loginPage.locator('input[type="password"]').fill(password)
    const responsePromise = loginPage.waitForResponse((r) => r.url().endsWith('/api/auth/sign-in/email'))
    await loginPage.locator('button[type="submit"]').click()
    const response = await responsePromise
    assert(response.ok(), `Browser login failed: ${response.status()} ${await response.text()}`)
    const session = await api('auth/get-session', undefined, 'GET', client)
    assert.equal(session.user.email, email)
  } finally {
    if (loginPage !== page) await loginPage.close()
  }
}

async function checkFile(id: string, expected: string) {
  const signed = await api(`storage/files/${id}/url`)
  const response = await fetch(signed.url)
  assert.equal(response.status, 200)
  assert.equal(await response.text(), expected)
  const unsigned = new URL(signed.url)
  unsigned.search = ''
  assert.equal((await fetch(unsigned)).status, 403, 'Private storage must not allow anonymous reads')
}

try {
  if (process.argv.includes('--verify-persistence')) {
    const state = await Bun.file(statePath).json()
    await login(state.email, state.password)
    const projects = await api('projects')
    const project = projects.find((item: { id: string }) => item.id === state.projectId)
    assert(project)
    assert.equal(project.name, state.projectName)
    assert(project.columns.flatMap((column: { tasks: { id: string; title: string }[] }) => column.tasks).some((task: { id: string; title: string }) => task.id === state.taskId && task.title === 'Confirm first self-hosted workflow'))
    assert(projects.some((item: { id: string }) => item.id === state.secondProjectId))
    const contacts = await api('contacts')
    assert(contacts.some((item: { id: string }) => item.id === state.contactId))
    const doc = await api(`documents/${state.documentId}`)
    assert.equal(doc.id, state.documentId)
    assert.equal(doc.clientName, state.clientName)
    assert.equal(doc.items[0].description, 'งานออกแบบ / Design work')
    const transaction = await api(`finance/transactions/${state.transactionId}`)
    assert.equal(transaction.description, 'Self-host payment')
    assert.equal(transaction.amount, 100)
    const pdf = await api(`documents/${state.documentId}/pdf`)
    assert(pdf.url, 'Published PDF remains available after restart')
    assert.equal((await fetch(pdf.url)).status, 200)
    await checkFile(state.fileId, state.fileText)
    console.log('PASS: fresh browser login, both projects, contact, document, and private file survived recreation')
  } else {
    const suffix = crypto.randomUUID().slice(0, 8)
    const email = `self-host-${suffix}@example.test`
    const password = `Mana-${crypto.randomUUID()}!`
    await page.goto('/register')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').nth(0).fill(password)
    await page.locator('input[type="password"]').nth(1).fill(password)
    const signupPromise = page.waitForResponse((r) => r.url().endsWith('/api/auth/sign-up/email'))
    await page.locator('button[type="submit"]').click()
    const signup = await signupPromise
    assert(signup.ok(), `Signup failed: ${signup.status()} ${await signup.text()}`)
    assert.equal((await signup.json()).token, null, 'Verification must remain required')
    const unverifiedLogin = await context.request.post(`${base}/api/auth/sign-in/email`, {
      data: { email, password }, headers: { Origin: base },
    })
    assert.equal(unverifiedLogin.status(), 403, 'An unverified account cannot sign in')
    assert.equal((await unverifiedLogin.json()).code, 'EMAIL_NOT_VERIFIED')
    await verifyEmail(email, context)
    await login(email, password)
    await saveState({ email, password })
    console.log('PASS: browser signup → captured email → real verification → fresh browser login')

    const contact = await api('contacts', { name: `Self-host client ${suffix}`, email: 'client@example.test', phone: '0800000000', initials: 'SC', color: '#6366f1' })
    const project = await api('projects', { name: `Self-host project ${suffix}`, color: '#6366f1', contactId: contact.id })
    const secondProject = await api('projects', { name: `Second self-host project ${suffix}`, color: '#6366f1' })
    const task = await api(`projects/${project.id}/tasks`, { title: 'Confirm first self-hosted workflow', status: 'todo', priority: 'med' })
    assert(task.id)
    const doc = await api('documents', {
      type: 'INV', currency: 'THB', issueDate: '2026-09-17', projectId: project.id,
      registeredName: 'MANA Self-host Test', clientName: contact.name, clientPhone: '0800000000',
      items: [{ description: 'งานออกแบบ / Design work', quantity: 100, unitPriceCents: 10000, position: 0 }],
    })
    const transaction = await api('finance/transactions', { type: 'revenue', amount: 100, description: 'Self-host payment', date: '2026-09-17', projectId: project.id, status: 'pending' })
    assert(transaction.id)
    console.log('PASS: contact → two projects → task → invoice → transaction')

    const fileText = `Private self-host file ${suffix}\n`
    const uploaded = await context.request.post(`${base}/api/storage/upload`, {
      headers: { Origin: base },
      multipart: { kind: 'doc', file: { name: 'self-host.txt', mimeType: 'text/plain', buffer: Buffer.from(fileText) } },
    })
    assert.equal(uploaded.status(), 201, await uploaded.text())
    const file = await uploaded.json()
    await checkFile(file.id, fileText)
    await api(`storage/files/${file.id}`, undefined, 'DELETE')
    const trashed = await context.request.get(`${base}/api/storage/files/${file.id}/url`)
    assert.equal(trashed.status(), 404, 'A trashed file cannot receive a new download URL')
    await api(`storage/files/${file.id}/restore`, {})
    await checkFile(file.id, fileText)

    const stranger = await browser.newContext({ baseURL: base })
    const strangerEmail = `other-${suffix}@example.test`
    await api('auth/sign-up/email', { name: 'Other local user', email: strangerEmail, password }, 'POST', stranger)
    await verifyEmail(strangerEmail, stranger)
    await login(strangerEmail, password, stranger)
    const forbidden = await stranger.request.get(`${base}/api/storage/files/${file.id}/url`)
    assert.equal(forbidden.status(), 404, 'A second account cannot sign a private file download')
    await stranger.close()
    console.log('PASS: private upload/download byte match, trash/restore, anonymous and cross-account denial')

    const logo = Buffer.from(await Bun.file(new URL('../../apps/web/public/logo/mana-logo-landscape.png', import.meta.url)).arrayBuffer())
    await api(`documents/${doc.id}/image/logo`, { data: logo.toString('base64'), mediaType: 'image/png' })
    await api(`documents/${doc.id}/publish`, { sendEmail: false })
    let pdfUrl: string | undefined
    for (let attempt = 0; attempt < 60; attempt++) {
      const result = await api(`documents/${doc.id}/pdf`)
      assert.notEqual(result.status, 'failed', 'PDF generation failed')
      if (result.url) { pdfUrl = result.url; break }
      await Bun.sleep(1000)
    }
    assert(pdfUrl, 'Publishing must finish generating a downloadable PDF')
    const pdf = await fetch(pdfUrl)
    assert.equal(pdf.status, 200)
    const pdfBytes = Buffer.from(await pdf.arrayBuffer())
    assert.equal(pdfBytes.subarray(0, 5).toString(), '%PDF-')
    assert(pdfBytes.toString('latin1').includes(`/Width ${logo.readUInt32BE(16)}`), 'Generated PDF must contain the uploaded logo image')
    await Bun.write(join(tmpdir(), 'mana-self-host-invoice.pdf'), pdfBytes)
    console.log(`PASS: published invoice produced a real ${pdfBytes.length}-byte PDF`)

    await saveState({ email, password, contactId: contact.id, projectId: project.id, projectName: project.name, secondProjectId: secondProject.id, documentId: doc.id, clientName: contact.name, transactionId: transaction.id, taskId: task.id, fileId: file.id, fileText })
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => localStorage.setItem('theme', value), theme)
      await page.goto(`/projects/${project.id}/issues`)
      await page.getByText('Confirm first self-hosted workflow', { exact: true }).first().waitFor()
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme)
      await page.screenshot({ path: join(tmpdir(), `mana-self-host-${theme}.png`), fullPage: true, animations: 'disabled' })
    }
    console.log(`PASS: browser shows persisted projects in light/dark themes. Restart evidence saved at ${statePath}`)
  }
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'mana-self-host-failure.png'), fullPage: true })
  console.error('Browser page:', page.url(), await page.locator('body').innerText())
  throw error
} finally {
  await browser.close()
}
