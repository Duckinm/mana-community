import { ContactSection } from "@/components/contacts/contact-section";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ContactFilesTabSkeleton({ className }: { className?: string }) {
  return (
    <ContactSection className={cn("overflow-hidden stagger-fade", className)}>
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <Skeleton className="h-4 w-16 rounded-sm" />
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-3 border-border-subtle px-5 py-2.5",
            index > 0 && "border-t",
          )}
        >
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </ContactSection>
  );
}
