import { emailLogs, ledgerEntries, stripeWebhookEvents, users } from '@mana/db'
import { and, eq, inArray } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '@api/db'
import { env } from '@api/env'
import { toCalendarDateString } from '@api/lib/calendar-date'
import { sendEmailBatch } from '@api/utils/email'
import { renderCatalogEmail, type EmailTemplateData, type EmailTemplateId } from '@api/utils/email/catalog'
import { getStripeClient, isEntitledSubscriptionStatus, planForPriceId, planForSubscription, syncUserSubscriptionProjection, type Plan } from '@api/modules/billing/service'

export { isEntitledSubscriptionStatus } from '@api/modules/billing/service'

export function emailTemplateForStripeEvent(event: Stripe.Event): EmailTemplateId | null {
  if (event.type === 'customer.subscription.deleted') return 'subscription-ended'
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object
    const previous = event.data.previous_attributes
    if (previous?.cancel_at_period_end === false && subscription.cancel_at_period_end) return 'cancellation-scheduled'
    if (previous?.cancel_at_period_end === true && !subscription.cancel_at_period_end) return 'cancellation-resumed'
    const previousPrice = previous?.items?.data?.[0]?.price?.id
    const currentPrice = subscription.items.data[0]?.price.id
    if (previousPrice && currentPrice && previousPrice !== currentPrice) return 'plan-changed'
    return null
  }
  if (event.type === 'invoice.payment_failed') return 'payment-failed'
  if (event.type === 'invoice.payment_action_required') return 'payment-action-required'
  if (event.type === 'invoice.paid') {
    if (event.data.object.billing_reason === 'subscription_create') return 'subscription-started'
    if (event.data.object.attempt_count > 1) return 'payment-recovered'
  }
  return null
}

export async function handleBillingStripeEvent(event: Stripe.Event): Promise<void> {
  // Stripe redelivers events (retries, manual resends) — the id is globally unique per
  // event, so a second insert of the same id means we've already run this handler.
  const [claimed] = await db.insert(stripeWebhookEvents).values({ id: event.id }).onConflictDoNothing({ target: stripeWebhookEvents.id }).returning()
  if (!claimed) {
    console.log(`[billing] Skipping already-processed Stripe event ${event.id}`)
    return
  }
  try {
    await processBillingStripeEvent(event)
  } catch (error) {
    // A claimed-but-failed event must not swallow Stripe's redelivery — release the
    // claim so the retry actually re-runs the handler.
    await db.delete(stripeWebhookEvents).where(eq(stripeWebhookEvents.id, event.id))
    throw error
  }
}

async function processBillingStripeEvent(event: Stripe.Event): Promise<void> {
  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const eventSubscription = event.data.object
    const user = await findUser(eventSubscription.customer)
    if (!user) return
    const subscription = await retrieveCurrentSubscription(eventSubscription)
    const resolved = planForSubscription(subscription)
    if (!resolved && isEntitledSubscriptionStatus(subscription.status)) {
      console.warn(`[billing] Active Stripe subscription ${subscription.id} has no recognized plan price`)
    }
    await syncUserSubscriptionProjection(user.id, subscription, event.created)

    if (event.type === 'customer.subscription.updated' && resolved) {
      const previous = event.data.previous_attributes
      const date = formatUnixDate(subscription.items.data[0]?.current_period_end)
      const templateId = emailTemplateForStripeEvent(event)
      if (templateId === 'cancellation-scheduled') {
        await sendBillingEmail(event, user, 'cancellation-scheduled', { planName: planLabel(resolved.plan), date })
      } else if (templateId === 'cancellation-resumed') {
        await sendBillingEmail(event, user, 'cancellation-resumed', { planName: planLabel(resolved.plan), date })
      }

      const previousPrice = previous?.items?.data?.[0]?.price?.id
      const previousPlan = previousPrice ? planForPriceId(previousPrice) : null
      if (previousPlan && (previousPlan.plan !== resolved.plan || previousPlan.interval !== resolved.interval)) {
        await sendBillingEmail(event, user, 'plan-changed', { previousPlanName: planLabel(previousPlan.plan), planName: planLabel(resolved.plan), date })
      }
    }
    return
  }

  if (event.type === 'customer.subscription.deleted') {
    const eventSubscription = event.data.object
    const user = await findUser(eventSubscription.customer)
    if (!user) return
    const subscription = await retrieveCurrentSubscription(eventSubscription)
    const resolved = planForSubscription(subscription)
    await syncUserSubscriptionProjection(user.id, subscription, event.created)
    await sendBillingEmail(event, user, 'subscription-ended', { planName: planLabel(resolved?.plan ?? user.plan as Plan) })
    return
  }

  if (event.type === 'invoice.payment_failed' || event.type === 'invoice.payment_action_required' || event.type === 'invoice.paid') {
    const invoice = event.data.object
    // Ledger earn is written before the user lookup — revenue is real even when
    // the Stripe customer can't be mapped to a MANA user.
    if (event.type === 'invoice.paid' && invoice.amount_paid > 0) {
      await db.insert(ledgerEntries).values({
        source: 'stripe',
        direction: 'earn',
        amountCents: invoice.amount_paid,
        currency: invoice.currency,
        date: toCalendarDateString(new Date(event.created * 1000)),
        note: `Invoice ${invoice.number ?? invoice.id ?? ''}`.trim(),
        stripeEventId: event.id,
      }).onConflictDoNothing({ target: ledgerEntries.stripeEventId })
    }
    const user = await findUser(invoice.customer)
    if (!user) return
    const planName = planLabel(planForInvoice(invoice) ?? user.plan as Plan)
    const actionUrl = invoice.hosted_invoice_url ?? `${env.WEB_URL}/settings/billing`
    if (event.type === 'invoice.payment_failed') {
      await sendBillingEmail(event, user, 'payment-failed', { planName, amount: formatMoney(invoice.amount_remaining, invoice.currency), actionUrl })
    } else if (event.type === 'invoice.payment_action_required') {
      await sendBillingEmail(event, user, 'payment-action-required', { planName, amount: formatMoney(invoice.amount_remaining, invoice.currency), actionUrl })
    } else if (invoice.billing_reason === 'subscription_create') {
      await sendBillingEmail(event, user, 'subscription-started', { planName, amount: formatMoney(invoice.amount_paid, invoice.currency), actionUrl })
    } else if (invoice.attempt_count > 1) {
      await sendBillingEmail(event, user, 'payment-recovered', { planName, amount: formatMoney(invoice.amount_paid, invoice.currency), actionUrl })
    }
  }
}

async function retrieveCurrentSubscription(
  eventSubscription: Stripe.Subscription,
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()
  if (!stripe) return eventSubscription
  try {
    return await stripe.subscriptions.retrieve(eventSubscription.id)
  } catch {
    return eventSubscription
  }
}

function planForInvoice(invoice: Stripe.Invoice): Plan | null {
  for (const line of invoice.lines.data) {
    const price = line.pricing?.price_details?.price
    const priceId = typeof price === 'string' ? price : price?.id
    const resolved = priceId ? planForPriceId(priceId) : null
    if (resolved) return resolved.plan
  }
  return null
}

async function findUser(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  const customerId = typeof customer === 'string' ? customer : customer?.id
  if (!customerId) return null
  const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId))
  return user ?? null
}

async function sendBillingEmail(
  event: Stripe.Event,
  user: typeof users.$inferSelect,
  templateId: EmailTemplateId,
  data: EmailTemplateData,
) {
  const referenceId = `stripe:${event.id}:${templateId}`
  const [existing] = await db.select({ id: emailLogs.id }).from(emailLogs).where(and(
    eq(emailLogs.referenceId, referenceId),
    inArray(emailLogs.status, ['sent', 'blocked']),
  ))
  if (existing) return
  const rendered = await renderCatalogEmail(templateId, {
    recipientName: user.name || user.email.split('@')[0],
    actionUrl: `${env.WEB_URL}/settings/billing`,
    ...data,
  })
  const [result] = await sendEmailBatch([{ to: user.email, subject: rendered.subject, html: rendered.html }])
  await db.insert(emailLogs).values({
    userId: user.id,
    recipient: user.email,
    subject: rendered.subject,
    type: templateId,
    referenceId,
    status: result.status,
    resendId: result.resendId,
  })
  if (result.status === 'failed') throw new Error(result.error ?? 'Billing email delivery failed')
}

function formatUnixDate(value: number | undefined) {
  return value ? new Date(value * 1000).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'the end of the billing period'
}

function planLabel(plan: Plan) {
  if (plan === 'free') return 'Free'
  if (plan === 'mana') return 'Mana'
  return 'Aether'
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}
