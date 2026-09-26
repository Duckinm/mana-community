import { describe, expect, it } from 'bun:test'
import { TypeCompiler } from 'elysia/type-system'
import { CreateBudgetBody, UpdateBudgetBody } from '@api/lib/db-schema/finance'
import { CreateItemTemplateBody } from '@api/lib/db-schema/templates'
import { CreateContactBody } from '@api/lib/db-schema/entities'
import { DocumentItemBody } from '@api/lib/db-schema/documents'

const budget = TypeCompiler.Compile(CreateBudgetBody)
const budgetPatch = TypeCompiler.Compile(UpdateBudgetBody)
const template = TypeCompiler.Compile(CreateItemTemplateBody)
const contact = TypeCompiler.Compile(CreateContactBody)
const item = TypeCompiler.Compile(DocumentItemBody)

describe('numeric request bounds', () => {
  it('requires a budget amount above zero on create and update', () => {
    expect(budget.Check({ category: 'Software', amountCents: 5000 })).toBe(true)
    expect(budget.Check({ category: 'Software', amountCents: 0 })).toBe(false)
    expect(budget.Check({ category: 'Software', amountCents: -1 })).toBe(false)
    expect(budgetPatch.Check({ amountCents: -1 })).toBe(false)
    expect(budgetPatch.Check({ category: 'Software' })).toBe(true)
  })

  it('keeps item template defaults positive and whole while staying optional', () => {
    expect(template.Check({ name: 'Workshop' })).toBe(true)
    expect(template.Check({ name: 'Workshop', defaultQty: 0 })).toBe(false)
    expect(template.Check({ name: 'Workshop', defaultUnitPriceCents: -1 })).toBe(false)
    expect(template.Check({ name: 'Workshop', defaultQty: 250 })).toBe(false)
    expect(template.Check({ name: 'Workshop', defaultQty: 200, defaultUnitPriceCents: 0 })).toBe(true)
  })

  it('takes line-item quantities only in whole units', () => {
    expect(item.Check({ description: 'Workshop', quantity: 100, unitPriceCents: 5000, position: 0 })).toBe(true)
    expect(item.Check({ description: 'Workshop', quantity: 250, unitPriceCents: 5000, position: 0 })).toBe(false)
    expect(item.Check({ description: 'Workshop', quantity: 0, unitPriceCents: 5000, position: 0 })).toBe(false)
  })

  it('holds the contact relationship level to 1–5', () => {
    expect(contact.Check({ name: 'Acme', relationshipLevel: 5 })).toBe(true)
    expect(contact.Check({ name: 'Acme', relationshipLevel: 0 })).toBe(false)
    expect(contact.Check({ name: 'Acme', relationshipLevel: 6 })).toBe(false)
  })
})
