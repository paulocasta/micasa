import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES = {
  paid: "border-success/30 bg-success-soft text-success",
  pending: "border-primary/25 bg-secondary text-secondary-foreground",
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
  done: "border-success/30 bg-success-soft text-success",
} as const;

export function StatusBadge({ kind, children }: { kind: keyof typeof STYLES; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[kind])}>
      {children}
    </Badge>
  );
}
