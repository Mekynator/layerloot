import { LANGUAGE_LABELS, type SupportedLanguage } from "@/lib/i18n";
import { useTranslationStats } from "@/hooks/use-translation-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Globe, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function TranslationOverview() {
  const { data: stats, isLoading } = useTranslationStats();

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12">Loading stats...</div>;
  }

  if (!stats) return null;

  const enTotal = stats.en?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(stats).map(([lang, s]) => {
          const completion = enTotal > 0 ? Math.round((s.published / enTotal) * 100) : 0;
          return (
            <Card key={lang} className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-primary" />
                  {LANGUAGE_LABELS[lang as SupportedLanguage] ?? lang}
                  <span className="ml-auto text-xs text-muted-foreground">{lang.toUpperCase()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">{completion}%</span>
                  </div>
                  <Progress value={completion} className="h-2" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-500">
                    <CheckCircle2 className="h-3 w-3" /> {s.published} published
                  </Badge>
                  {s.draft > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/40 text-blue-500">
                      <Clock className="h-3 w-3" /> {s.draft} draft
                    </Badge>
                  )}
                  {s.missing > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-red-500/40 text-red-500">
                      <AlertTriangle className="h-3 w-3" /> {s.missing} missing
                    </Badge>
                  )}
                  {s.outdated > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-500">
                      <AlertTriangle className="h-3 w-3" /> {s.outdated} outdated
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
