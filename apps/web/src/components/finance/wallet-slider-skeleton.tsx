import { Skeleton } from "@/components/ui/skeleton";

export function WalletSliderSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scroll-px-1.5">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="shrink-0 w-52 h-32 rounded-2xl" />
      ))}
    </div>
  );
}
