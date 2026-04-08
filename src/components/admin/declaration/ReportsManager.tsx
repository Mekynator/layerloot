import { useState } from "react";
import { Download, FileSpreadsheet, Trash2, Eye, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MonthlyReport } from "@/hooks/use-monthly-reports";
import type { MonthlyData } from "@/hooks/use-monthly-declaration";
import { downloadDeclarationPDF, exportDeclarationCSV } from "@/lib/generate-declaration-pdf";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt = (v: number) => v.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  reports: MonthlyReport[];
  loading: boolean;
  onGenerate: (year: number, month: number, data: MonthlyData) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  currentData: MonthlyData;
  currentYear: number;
  currentMonth: number;
}

const ReportsManager = ({ reports, loading, onGenerate, onDelete, currentData, currentYear, currentMonth }: Props) => {
  const [generating, setGenerating] = useState(false);
  const [viewReport, setViewReport] = useState<MonthlyReport | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    const err = await onGenerate(currentYear, currentMonth, currentData);
    if (err) toast({ title: "Error generating report", variant: "destructive" });
    else toast({ title: "Report snapshot saved", description: `${MONTHS[currentMonth - 1]} ${currentYear}` });
    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this report snapshot?")) return;
    const err = await onDelete(id);
    if (err) toast({ title: "Error", variant: "destructive" });
    else toast({ title: "Deleted" });
  };

  const downloadFromSnapshot = (report: MonthlyReport) => {
    downloadDeclarationPDF(report.snapshot_json, report.month, report.year);
  };

  const csvFromSnapshot = (report: MonthlyReport) => {
    exportDeclarationCSV(report.snapshot_json, report.month, report.year);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Generated Reports</h3>
        <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating…" : `Generate ${MONTHS[currentMonth - 1]} ${currentYear}`}
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-8 text-center">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">No reports generated yet. Click "Generate" to create a snapshot.</p>
      ) : (
        <div className="space-y-2">
          {reports.map(r => {
            const snap = r.snapshot_json;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 px-3 py-2.5 text-sm">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{MONTHS[r.month - 1]} {r.year}</span>
                    <Badge variant="outline" className="text-[9px]">{r.month_key}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Generated: {new Date(r.generated_at).toLocaleDateString("da-DK")}
                    {snap && <span> · Result: {fmt(snap.operatingResult ?? 0)} kr</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewReport(r)} title="View summary">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadFromSnapshot(r)} title="Download PDF">
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => csvFromSnapshot(r)} title="Download CSV">
                    <FileSpreadsheet className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)} title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Snapshot — {viewReport && `${MONTHS[viewReport.month - 1]} ${viewReport.year}`}</DialogTitle>
          </DialogHeader>
          {viewReport?.snapshot_json && (
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Income</span><span className="font-mono">{fmt(viewReport.snapshot_json.totalIncome ?? 0)} kr</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Expenses</span><span className="font-mono">{fmt(viewReport.snapshot_json.totalExpenses ?? 0)} kr</span></div>
              <div className="flex justify-between border-t border-border/50 pt-2 font-semibold"><span>Operating Result</span><span className="font-mono">{fmt(viewReport.snapshot_json.operatingResult ?? 0)} kr</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Output VAT</span><span className="font-mono">{fmt(viewReport.snapshot_json.outputVAT ?? 0)} kr</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Input VAT</span><span className="font-mono">{fmt(viewReport.snapshot_json.inputVAT ?? 0)} kr</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VAT Difference</span><span className="font-mono">{fmt(viewReport.snapshot_json.vatDifference ?? 0)} kr</span></div>
              {viewReport.snapshot_json.expenses && viewReport.snapshot_json.expenses.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border/50">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{viewReport.snapshot_json.expenses.length} expense entries in snapshot</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsManager;
