import { createFileRoute } from '@tanstack/react-router'
import { ContactTimeline } from '@/components/contacts/contact-timeline'

export const Route = createFileRoute('/_app/contacts/$contactId/')({
 component: ContactTimelineTab,
})

function ContactTimelineTab() {
 const { contactId } = Route.useParams()
 return <ContactTimeline contactId={contactId} />
}
