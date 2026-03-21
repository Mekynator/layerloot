import { Badge } from "@/components/ui/badge";

export default function ProductTrustBadges({ badges }: { badges: string[] }) {
  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <Badge key={badge} variant="outline" className="rounded-full border-primary/15 bg-primary/5 text-[10px] uppercase tracking-[0.18em] text-primary">
          {badge}
        </Badge>
      ))}
    </div>
  );
}
