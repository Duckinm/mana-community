import { Skeleton } from "@/components/ui/skeleton";

export function ChatMessagesSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-48 rounded-2xl rounded-br-md" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-24 w-full max-w-md rounded-2xl rounded-bl-md" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-8 w-56 rounded-2xl rounded-br-md" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-16 w-full max-w-lg rounded-2xl rounded-bl-md" />
      </div>
    </div>
  );
}
