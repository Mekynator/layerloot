import { Sparkles } from "lucide-react";

interface InsightCardProps {
  message: string;
  type?: "positive" | "neutral" | "warning";
}

const typeStyles = {
  positive: "border-emerald-500/20 bg-emerald-500/5",
  neutral: "border-primary/20 bg-primary/5",
  warning: "border-amber-500/20 bg-amber-500/5",
};

const InsightCard = ({ message, type = "neutral" }: InsightCardProps) => (
  <div className={`flex items-start gap-3 rounded-lg border p-4 ${typeStyles[type]}`}>
    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
    <p className="text-sm text-foreground/80">{message}</p>
  </div>
);

export default InsightCard;
