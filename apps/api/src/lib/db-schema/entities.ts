import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { labels, categories, wallets, budgets, notifications, contacts, projects, tasks, milestones } from '@mana/db'
import { nullableTiptapDocSchema } from '@api/lib/rich-text'
import { IsoInstant, NullableIsoInstant, NullableString, OptionalNullableString } from '@api/lib/wire-schema'

const _labelSelect = createSelectSchema(labels)
export const LabelResponse = t.Omit(_labelSelect, ['userId', 'createdAt', 'updatedAt'])
export const LabelsListResponse = t.Array(LabelResponse)

const _labelInsert = createInsertSchema(labels)
export const CreateLabelBody = t.Omit(_labelInsert, ['id', 'userId', 'createdAt', 'updatedAt'])

const _labelUpdate = createUpdateSchema(labels)
export const UpdateLabelBody = t.Omit(_labelUpdate, ['id', 'userId', 'createdAt', 'updatedAt'])

const _categorySelect = createSelectSchema(categories)
export const CategoryResponse = t.Omit(_categorySelect, ['userId', 'createdAt'])
export const CategoriesListResponse = t.Array(CategoryResponse)

const _walletSelect = createSelectSchema(wallets, {
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
})
export const WalletResponse = _walletSelect
export const WalletsListResponse = t.Array(WalletResponse)

const _budgetSelect = createSelectSchema(budgets, {
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
})
export const BudgetResponse = _budgetSelect
export const BudgetsListResponse = t.Array(BudgetResponse)

const _notificationSelect = createSelectSchema(notifications, {
  params: t.Union([t.Record(t.String(), t.Union([t.String(), t.Number()])), t.Null()]),
  readAt: NullableIsoInstant,
  createdAt: t.String(),
})
export const NotificationResponse = t.Omit(_notificationSelect, ['userId', 'updatedAt'])
export const NotificationsListResponse = t.Object({
  items: t.Array(NotificationResponse),
  unread: t.Number(),
})

const contactRefine = {
  tags: t.Array(t.String()),
  lastContactedAt: NullableIsoInstant,
  createdAt: t.String(),
  role: t.String(),
  company: t.String(),
  email: t.String(),
  website: t.String(),
  color: t.String(),
  metVia: t.String(),
  stage: t.String(),
  dealStatus: t.String(),
  phone: t.Optional(t.String()),
  notes: t.Optional(nullableTiptapDocSchema),
  imageUrl: NullableString,
  dealValue: NullableString,
  nameTh: NullableString,
  addressTh: NullableString,
  taxId: NullableString,
  branchNumber: NullableString,
  zip: NullableString,
  country: NullableString,
  address: NullableString,
  nationalId: NullableString,
  companyNameEn: NullableString,
  companyNameTh: NullableString,
  companyAddress: NullableString,
  companyAddressTh: NullableString,
  companyZip: NullableString,
  companyCountry: NullableString,
}

const _contactSelect = createSelectSchema(contacts, contactRefine)
export const ContactResponse = t.Omit(_contactSelect, [
  'userId',
  'updatedAt',
  'briefingData',
  'briefingCheckedAt',
])

export const LinkedProjectSummary = t.Object({
  id: t.String(),
  name: t.String(),
  archived: t.Boolean(),
})

export const ContactListRowResponse = t.Composite([
  ContactResponse,
  t.Object({
    totalBilledCents: t.Number(),
    activeProjectCount: t.Number(),
    linkedProjects: t.Array(LinkedProjectSummary),
  }),
])

export const ContactsListResponse = t.Array(ContactListRowResponse)

const contactBodyRefine = {
  ...contactRefine,
  initials: t.Optional(t.String()),
  role: t.Optional(t.String()),
  company: t.Optional(t.String()),
  email: t.Optional(t.String()),
  website: t.Optional(t.String()),
  color: t.Optional(t.String()),
  tags: t.Optional(t.Array(t.String())),
  imageUrl: t.Optional(NullableString),
  stage: t.Optional(NullableString),
  dealValue: t.Optional(NullableString),
  dealStatus: t.Optional(t.String()),
  relationshipLevel: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
  metVia: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  notes: t.Optional(nullableTiptapDocSchema),
  entityType: t.Optional(t.String()),
  nameTh: t.Optional(NullableString),
  addressTh: t.Optional(NullableString),
  taxId: t.Optional(NullableString),
  branchNumber: t.Optional(NullableString),
  zip: t.Optional(NullableString),
  country: t.Optional(NullableString),
  address: t.Optional(NullableString),
  nationalId: t.Optional(NullableString),
  companyNameEn: t.Optional(NullableString),
  companyNameTh: t.Optional(NullableString),
  companyAddress: t.Optional(NullableString),
  companyAddressTh: t.Optional(NullableString),
  companyZip: t.Optional(NullableString),
  companyCountry: t.Optional(NullableString),
}

const _contactInsert = createInsertSchema(contacts, contactBodyRefine)
export const CreateContactBody = t.Omit(_contactInsert, [
  'id',
  'userId',
  'createdAt',
  'updatedAt',
  'briefingData',
  'briefingCheckedAt',
  'lastContactedAt',
])

const _contactUpdate = createUpdateSchema(contacts, contactBodyRefine)
export const UpdateContactBody = t.Partial(
  t.Omit(_contactUpdate, [
    'id',
    'userId',
    'createdAt',
    'updatedAt',
    'briefingData',
    'briefingCheckedAt',
  ]),
)

const projectRefine = {
  labelIds: t.Optional(t.Array(t.String())),
  contactId: OptionalNullableString,
  objective: t.Optional(t.String()),
  icon: t.Optional(t.String()),
  startDate: t.Optional(t.String()),
  dueDate: t.Optional(t.String()),
  description: t.Optional(nullableTiptapDocSchema),
}

const _projectInsert = createInsertSchema(projects, projectRefine)
export const CreateProjectBody = t.Omit(_projectInsert, [
  'id',
  'userId',
  'archived',
  'createdAt',
  'updatedAt',
  'deletedAt',
])

const _projectUpdate = createUpdateSchema(projects, projectRefine)
export const UpdateProjectBody = t.Omit(_projectUpdate, [
  'id',
  'userId',
  'createdAt',
  'updatedAt',
  'deletedAt',
])

const taskRefine = {
  labelIds: t.Optional(t.Array(t.String())),
  milestoneId: OptionalNullableString,
  due: OptionalNullableString,
  dueTime: t.Optional(t.Union([t.String({ pattern: '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' }), t.Null()])),
  scheduledStart: t.Optional(NullableIsoInstant),
  scheduledEnd: t.Optional(NullableIsoInstant),
  description: t.Optional(t.String()),
  aiAssigned: t.Optional(t.Boolean()),
}

const _taskInsert = createInsertSchema(tasks, {
  ...taskRefine,
  body: t.Optional(nullableTiptapDocSchema),
})
export const CreateTaskBody = t.Omit(_taskInsert, [
  'id',
  'projectId',
  'userId',
  'position',
  'estimatedHours',
  'createdAt',
  'updatedAt',
])

const _taskUpdate = createUpdateSchema(tasks, {
  ...taskRefine,
  body: t.Optional(nullableTiptapDocSchema),
})
export const UpdateTaskBody = t.Omit(_taskUpdate, [
  'id',
  'projectId',
  'userId',
  'estimatedHours',
  'createdAt',
  'updatedAt',
])

const milestoneRefine = {
  dueDate: t.Optional(t.String()),
  description: t.Optional(nullableTiptapDocSchema),
}

const _milestoneInsert = createInsertSchema(milestones, milestoneRefine)
export const CreateMilestoneBody = t.Omit(_milestoneInsert, [
  'id',
  'projectId',
  'userId',
  'createdAt',
  'updatedAt',
])

const _milestoneUpdate = createUpdateSchema(milestones, milestoneRefine)
export const UpdateMilestoneBody = t.Omit(_milestoneUpdate, [
  'id',
  'projectId',
  'userId',
  'createdAt',
  'updatedAt',
])
