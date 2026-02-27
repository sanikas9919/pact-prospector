import { Badge } from "@/components/ui/badge";

const typeColors: Record<string, string> = {
  "Time & Material": "bg-info/15 text-info border-info/30",
  "Fixed Price": "bg-success/15 text-success border-success/30",
  "Fixed Time": "bg-warning/15 text-warning border-warning/30",
  Other: "bg-muted text-muted-foreground border-border",
};

export function ContractTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted-foreground text-sm">—</span>;
  const colors = typeColors[type] || typeColors.Other;
  return (
    <Badge variant="outline" className={`${colors} font-medium text-xs`}>
      {type}
    </Badge>
  );
}
