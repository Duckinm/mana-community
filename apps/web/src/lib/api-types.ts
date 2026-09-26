import type { Treaty } from '@elysiajs/eden'
import { client } from '@/lib/eden'

export type { Api } from '@/lib/eden'

export type ApiLabel = Treaty.Data<typeof client.api.labels.get>[number]
export type ApiContact = Treaty.Data<typeof client.api.contacts.get>[number]
export type ApiContactCreateBody = Parameters<typeof client.api.contacts.post>[0]
export type ApiContactPatchBody = Parameters<ReturnType<typeof client.api.contacts>['patch']>[0]

export type ApiProject = Treaty.Data<typeof client.api.projects.get>[number]
export type ApiTask = ApiProject['columns'][number]['tasks'][number]
export type ApiMilestone = Treaty.Data<
  ReturnType<ReturnType<typeof client.api.projects>['milestones']['get']>
>[number]

export type ApiProjectCreateBody = Parameters<typeof client.api.projects.post>[0]
export type ApiProjectPatchBody = Parameters<ReturnType<typeof client.api.projects>['patch']>[0]

export type ApiTaskCreateBody = Parameters<
  ReturnType<typeof client.api.projects>['tasks']['post']
>[0]
export type ApiTaskPatchBody = NonNullable<Parameters<ReturnType<typeof client.api.tasks>['patch']>[0]>

export type ApiDocument = Treaty.Data<typeof client.api.documents.get> extends infer R
  ? R extends { data: (infer U)[] } ? U : never
  : never
export type ApiDocumentPage = Treaty.Data<typeof client.api.documents.get>
export type ApiDocumentCreateBody = NonNullable<Parameters<typeof client.api.documents.post>[0]>
export type ApiDocumentPatchBody = NonNullable<
  Parameters<ReturnType<typeof client.api.documents>['patch']>[0]
>
export type ApiPromoteDocumentBody = NonNullable<
  Parameters<ReturnType<typeof client.api.documents>['promote']['post']>[0]
>
export type ApiTransaction = Treaty.Data<typeof client.api.finance.transactions.get>['data'][number]
export type ApiTransactionsPage = Treaty.Data<typeof client.api.finance.transactions.get>
export type ApiWallet = Treaty.Data<typeof client.api.wallets.get>[number]

export type ApiUser = Treaty.Data<typeof client.api.users.me.get>
export type ApiUserPatch = Parameters<typeof client.api.users.me.patch>[0]
export type ApiGetStartedStatus = Treaty.Data<
  typeof client.api.users.me['get-started']['get']
>
export type ApiAiUsage = Treaty.Data<typeof client.api.billing.usage.get>
export type ApiAiUsageBucket = ApiAiUsage['ai']
export type ApiAiUsageDaily = Treaty.Data<typeof client.api.billing.usage.daily.get>
export type ApiInvoiceSummary = Treaty.Data<typeof client.api.billing.invoices.get>[number]

export type ApiCalendarEvent = Treaty.Data<typeof client.api.calendar.events.get>[number]
export type ApiCalendarEventCreateBody = Parameters<typeof client.api.calendar.events.post>[0]
export type ApiCalendarEventPatchBody = Parameters<
  ReturnType<typeof client.api.calendar.events>['patch']
>[0]
export type ApiCalendarOverlay = Treaty.Data<typeof client.api.calendar.overlays.get>[number]
export type ApiCalendarConnection = Treaty.Data<typeof client.api.calendar.connection.get>

export type RecurrenceMutationOptions = {
  scope?: 'single' | 'following' | 'all'
  instanceStart?: string
}

export type ApiChatSession = Treaty.Data<typeof client.api.chat.sessions.get>[number]
export type ApiChatSessionSearchResult = Treaty.Data<typeof client.api.chat.sessions.search.get>[number]
export type ApiDocumentVersion = Treaty.Data<
  ReturnType<ReturnType<typeof client.api.documents>['versions']['get']>
>[number]

type ItemTemplatesApi = typeof client.api['item-templates']
type ItemTemplateGroupsApi = typeof client.api['item-template-groups']

export type ApiRemarkTemplate = Treaty.Data<typeof client.api.business.remarkTemplates.get>[number]
export type ApiSenderProfile = Treaty.Data<typeof client.api.business.senderProfiles.get>[number]
export type ApiItemTemplate = Treaty.Data<ItemTemplatesApi['get']>[number]
export type ApiItemTemplateGroup = Treaty.Data<ItemTemplateGroupsApi['get']>[number]

export type DocumentsQuery = NonNullable<Parameters<typeof client.api.documents.get>[0]>['query']

type DocumentPaymentSlipApi = ReturnType<typeof client.api.documents>['payment-slip']
export type ApiPaymentSlipConfirmResult = Treaty.Data<
  ReturnType<ReturnType<DocumentPaymentSlipApi>['confirm']['post']>
>
export type ApiPaymentSlipDismissResult = Treaty.Data<
  ReturnType<ReturnType<DocumentPaymentSlipApi>['dismiss']['post']>
>
export type ApiPaymentSlipVerifyResult = Treaty.Data<
  ReturnType<ReturnType<DocumentPaymentSlipApi>['verify']['post']>
>
export type ApiPaymentSlip = ApiPaymentSlipDismissResult['paymentSlip']
