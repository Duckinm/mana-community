import { ContactFilesTabSkeleton } from "@/components/contacts/contact-files-tab-skeleton";
import { ContactStatsSkeleton } from "@/components/contacts/contact-stats-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function ContactDetailBodySkeleton() {
  return (
    <div className="space-y-5">
      <ContactStatsSkeleton />
      <div className="rounded-2xl border border-primary-border bg-primary-soft/45 px-5 py-4">
        <Skeleton className="h-4 w-24 rounded-sm" />
        <Skeleton className="mt-3 h-5 w-full rounded-md" />
        <Skeleton className="mt-3 h-6 w-4/5 rounded-full" />
      </div>
      <ContactFilesTabSkeleton />
      <div className="stagger-fade">
        <div className="flex items-center justify-between pb-2">
          <Skeleton className="h-4 w-24 rounded-sm" />
          <Skeleton className="h-6 w-52 rounded-full" />
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 border-t border-border-subtle py-2.5"
          >
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="ml-auto h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
