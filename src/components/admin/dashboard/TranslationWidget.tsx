import { Globe, AlertTriangle, Clock } from "lucide-react";
import DashboardWidget from "./DashboardWidget";
import type { DashboardData } from "@/hooks/use-admin-dashboard";

interface Props { data: DashboardData }

const TranslationWidget = ({ data }: Props) => {
  const missing = data.missingTranslations ?? 0;
  const outdated = data.outdatedTranslations ?? 0;

  if (missing === 0 && outdated === 0) {
    return (
      <DashboardWidget title="Translations" icon={Globe} linkTo="/admin/translations" linkLabel="Manage">
        <p className="py-4 text-center text-xs text-muted-foreground">All translations up to date.</p>
      </DashboardWidget>
    );
  }

  return (
    <DashboardWidget title="Translations" icon={Globe} linkTo="/admin/translations" linkLabel="Manage">
      <div className="space-y-2">
        {missing > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-500/5 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="flex-1 text-sm text-foreground">Missing translations</span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">{missing}</span>
          </div>
        )}
        {outdated > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 px-3 py-2.5">
            <Clock className="h-4 w-4 text-primary" />
            <span className="flex-1 text-sm text-foreground">Outdated translations</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{outdated}</span>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
};

export default TranslationWidget;
