import { CheckCircle2 } from "@/components/icons";
import { Button } from "@/components/ui/button";

export interface FeedbackReference {
  id: string;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "in triage",
  planned: "planned",
  in_progress: "in progress",
  resolved: "resolved",
  declined: "declined",
};

interface Props {
  reference: FeedbackReference;
  title: string;
  description: string;
  doneLabel: string;
  onDone: () => void;
}

export function FeedbackReferenceChip({
  reference,
  title,
  description,
  doneLabel,
  onDone,
}: Props) {
  const shortRef = `FB-${reference.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  const statusLabel = STATUS_LABEL[reference.status] ?? reference.status;

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckCircle2 size={20} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-body font-medium text-foreground">{title}</p>
        <p className="text-caption">{description}</p>
      </div>
      <span className="badge badge-neutral font-mono text-2xs">
        {shortRef} — {statusLabel}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onDone}>
        {doneLabel}
      </Button>
    </div>
  );
}
