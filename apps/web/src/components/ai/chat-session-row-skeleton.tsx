import { Skeleton } from "@/components/ui/skeleton";

export function ChatSessionRowSkeleton() {
 return (
 <div className="flex flex-col gap-1.5 px-2.5 py-2">
 <Skeleton className="h-3 w-3/4 rounded" />
 <Skeleton className="h-2.5 w-1/3 rounded" />
 </div>
 );
}
