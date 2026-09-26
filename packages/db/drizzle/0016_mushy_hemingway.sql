ALTER TABLE "users" ADD COLUMN "notification_preferences" jsonb DEFAULT '{"quotationViewed.inApp":true,"quotationViewed.email":true,"quotationViewed.push":true,"quotationViewed.line":true,"quotationAccepted.inApp":true,"quotationAccepted.email":true,"quotationAccepted.push":true,"quotationAccepted.line":true,"quotationRejected.inApp":true,"quotationRejected.email":true,"quotationRejected.push":true,"quotationRejected.line":true,"quotationExpiring.inApp":false,"quotationExpiring.email":false,"quotationExpiring.push":false,"quotationExpiring.line":false,"quotationDeliveryFailed.inApp":false,"quotationDeliveryFailed.email":true,"quotationDeliveryFailed.push":false,"quotationDeliveryFailed.line":false,"invoiceViewed.inApp":true,"invoiceViewed.email":true,"invoiceViewed.push":true,"invoiceViewed.line":true,"invoiceDueSoon.inApp":false,"invoiceDueSoon.email":false,"invoiceDueSoon.push":false,"invoiceDueSoon.line":false,"invoiceOverdue.inApp":false,"invoiceOverdue.email":false,"invoiceOverdue.push":false,"invoiceOverdue.line":false,"invoiceReminderSent.inApp":true,"invoiceReminderSent.email":false,"invoiceReminderSent.push":true,"invoiceReminderSent.line":false,"invoicePaymentReceived.inApp":true,"invoicePaymentReceived.email":false,"invoicePaymentReceived.push":true,"invoicePaymentReceived.line":false,"invoiceDeliveryFailed.inApp":false,"invoiceDeliveryFailed.email":true,"invoiceDeliveryFailed.push":false,"invoiceDeliveryFailed.line":false,"receiptGenerated.inApp":false,"receiptGenerated.email":false,"receiptGenerated.push":false,"receiptGenerated.line":false,"receiptViewed.inApp":true,"receiptViewed.email":true,"receiptViewed.push":true,"receiptViewed.line":true,"receiptDeliveryFailed.inApp":false,"receiptDeliveryFailed.email":true,"receiptDeliveryFailed.push":false,"receiptDeliveryFailed.line":false,"recurringDraftReady.inApp":false,"recurringDraftReady.email":true,"recurringDraftReady.push":false,"recurringDraftReady.line":true,"taskDeadline.inApp":false,"taskDeadline.email":true,"taskDeadline.push":false,"taskDeadline.line":false,"calendarReminder.inApp":true,"calendarReminder.email":true,"calendarReminder.push":true,"calendarReminder.line":false,"budgetApproaching.inApp":true,"budgetApproaching.email":true,"budgetApproaching.push":true,"budgetApproaching.line":false,"budgetExceeded.inApp":true,"budgetExceeded.email":true,"budgetExceeded.push":true,"budgetExceeded.line":false,"weeklySummary.inApp":false,"weeklySummary.email":false,"weeklySummary.push":false,"weeklySummary.line":false,"aiResponseCompleted.inApp":false,"aiResponseCompleted.email":false,"aiResponseCompleted.push":false,"aiResponseCompleted.line":false,"aiNeedsInput.inApp":true,"aiNeedsInput.email":false,"aiNeedsInput.push":true,"aiNeedsInput.line":false,"contactAdded.inApp":false,"contactAdded.email":false,"contactAdded.push":false,"contactAdded.line":false,"receiptReview.inApp":true,"receiptReview.email":false,"receiptReview.push":true,"receiptReview.line":false,"reconciliationAttention.inApp":true,"reconciliationAttention.email":false,"reconciliationAttention.push":true,"reconciliationAttention.line":false,"paymentSlipAttention.inApp":true,"paymentSlipAttention.email":false,"paymentSlipAttention.push":true,"paymentSlipAttention.line":false}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "users"
SET "notification_preferences" = "notification_preferences" || jsonb_build_object(
  'quotationViewed.inApp', coalesce("notif_invoice_viewed", true),
  'quotationViewed.email', coalesce("notif_invoice_viewed", true),
  'quotationViewed.push', coalesce("notif_invoice_viewed", true),
  'quotationViewed.line', coalesce("notif_line_enabled", false),
  'quotationAccepted.inApp', coalesce("notif_invoice_viewed", true),
  'quotationAccepted.email', coalesce("notif_invoice_viewed", true),
  'quotationAccepted.push', coalesce("notif_invoice_viewed", true),
  'quotationAccepted.line', coalesce("notif_line_enabled", false),
  'quotationRejected.inApp', coalesce("notif_invoice_viewed", true),
  'quotationRejected.email', coalesce("notif_invoice_viewed", true),
  'quotationRejected.push', coalesce("notif_invoice_viewed", true),
  'quotationRejected.line', coalesce("notif_line_enabled", false),
  'invoiceViewed.inApp', coalesce("notif_invoice_viewed", true),
  'invoiceViewed.email', coalesce("notif_invoice_viewed", true),
  'invoiceViewed.push', coalesce("notif_invoice_viewed", true),
  'invoiceViewed.line', coalesce("notif_line_enabled", false),
  'receiptViewed.inApp', coalesce("notif_invoice_viewed", true),
  'receiptViewed.email', coalesce("notif_invoice_viewed", true),
  'receiptViewed.push', coalesce("notif_invoice_viewed", true),
  'receiptViewed.line', coalesce("notif_line_enabled", false),
  'recurringDraftReady.line', coalesce("notif_line_enabled", false),
  'invoiceReminderSent.inApp', coalesce("notif_invoice_reminders", true),
  'invoiceReminderSent.push', coalesce("notif_invoice_reminders", true),
  'taskDeadline.email', coalesce("notif_task_deadlines", true),
  'calendarReminder.inApp', coalesce("notif_task_deadlines", true),
  'calendarReminder.push', coalesce("notif_task_deadlines", true),
  'budgetApproaching.inApp', coalesce("notif_budget_alert", true),
  'budgetApproaching.email', coalesce("notif_budget_alert", true),
  'budgetApproaching.push', coalesce("notif_budget_alert", true),
  'budgetExceeded.inApp', coalesce("notif_budget_alert", true),
  'budgetExceeded.email', coalesce("notif_budget_alert", true),
  'budgetExceeded.push', coalesce("notif_budget_alert", true),
  'weeklySummary.email', coalesce("notif_weekly_digest", false),
  'aiResponseCompleted.email', coalesce("notif_ai_response_email", false),
  'aiNeedsInput.inApp', coalesce("notif_ai_needs_input", true),
  'aiNeedsInput.push', coalesce("notif_ai_needs_input", true),
  'contactAdded.inApp', coalesce("notif_contact_added", false),
  'contactAdded.push', coalesce("notif_contact_added", false)
);--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notif_invoice_reminders";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notif_task_deadlines";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notif_invoice_viewed";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notif_weekly_digest";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notif_budget_alert";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notif_ai_response_email";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notif_ai_needs_input";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notif_contact_added";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notif_line_enabled";
