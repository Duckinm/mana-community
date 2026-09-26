import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/components/icons";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function DocumentPagination({ page, totalPages, onPageChange }: Props) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="h-8 gap-1 text-sm"
      >
        <ChevronLeft size={14} />
        Previous
      </Button>

      <span className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="h-8 gap-1 text-sm"
      >
        Next
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}
