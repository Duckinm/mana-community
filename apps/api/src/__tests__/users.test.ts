import { describe, expect, it } from 'bun:test'
import Elysia from 'elysia'
import { UpdateUserBody } from '@api/modules/user/model'

const validationApp = new Elysia().patch('/api/users/me', ({ body }) => body, {
  body: UpdateUserBody,
})

describe('User endpoints', () => {
  it.todo('GET /api/users/me — returns 401 without session', () => {})
  it.todo('GET /api/users/me — returns user with valid session', () => {})
  it.todo('PATCH /api/users/me — updates user name', () => {})
  it.todo('GET /api/users/me/get-started — returns 401 without session', () => {})
  it.todo('GET /api/users/me/get-started — returns hasContact/hasProject/hasDocument/hasTransaction booleans', () => {})

  it.each([
    { region: 'TH', dateFormat: 'dmy', timeFormat: 'h24' },
    { region: 'US', dateFormat: 'mdy', timeFormat: 'h12' },
    { dateFormat: 'regional', timeFormat: 'regional' },
  ])('PATCH /api/users/me — accepts regional preferences %j', async (body) => {
    const response = await validationApp.handle(new Request('http://localhost/api/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }))

    expect(response.status).toBe(200)
  })

  it.each([
    { region: 'GB' },
    { dateFormat: 'ymd' },
    { timeFormat: 'h48' },
  ])('PATCH /api/users/me — rejects unsupported regional preference %j', async (body) => {
    const response = await validationApp.handle(new Request('http://localhost/api/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }))

    expect(response.status).toBe(422)
  })

  it('PATCH /api/users/me — accepts a partial notification preference map', async () => {
    const response = await validationApp.handle(new Request('http://localhost/api/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notificationPreferences: { 'invoiceViewed.email': false } }),
    }))

    expect(response.status).toBe(200)
  })

  it('PATCH /api/users/me — accepts external MCP tool permissions', async () => {
    const response = await validationApp.handle(new Request('http://localhost/api/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ disabledExternalMcpTools: ['get_projects'] }),
    }))

    expect(response.status).toBe(200)
  })

  it('PATCH /api/users/me — strips unknown notification preference keys', async () => {
    const response = await validationApp.handle(new Request('http://localhost/api/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notificationPreferences: { 'invoiceViewed.sms': true } }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ notificationPreferences: {} })
  })

  it('PATCH /api/users/me — rejects non-boolean notification preferences', async () => {
    const body = { notificationPreferences: { 'invoiceViewed.email': 'yes' } }
    const response = await validationApp.handle(new Request('http://localhost/api/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }))

    expect(response.status).toBe(422)
  })
})
