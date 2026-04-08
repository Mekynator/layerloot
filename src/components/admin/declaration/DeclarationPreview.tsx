import { TrendingUp, TrendingDown, AlertTriangle, FileText, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MonthlyData } from "@/hooks/use-monthly-declaration";

const TILE = "rounded-xl border border-border/50 bg-card/40 p-4";
const fmt = (v: number) => v.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SectionHeader = ({ label, letter }: { label: string; letter: string }) => (
  <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
    <Badge className="bg-primary/10 text-primary text-[10px] font-bold">{letter}</Badge>
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
  </div>
);

const Row = ({ label, value, bold, negative }: { label: string; value: number; bold?: boolean; negative?: boolean }) => (
  <div className={`flex justify-between py-1.5 text-sm ${bold ? "font-semibold border-t border-border/50 pt-2 mt-1" : ""}`}>
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-mono ${negative ? "text-destructive" : "text-foreground"} ${bold ? "text-foreground" : ""}`}>
      {negative && value > 0 ? "-" : ""}{fmt(Math.abs(value))} kr
    </span>
  </div>
);

interface Props {
  data: MonthlyData;
  month: number;
  year: number;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const DeclarationPreview = ({ data, month, year }: Props) => {
  const warnings: string[] = [];
  const missingReceipts = data.expenses.filter(e => !e.receipt_reference && !e.receipt_file_url).length;
  if (missingReceipts > 0) warnings.push(`${missingReceipts} expense(s) missing receipt`);
  if (data.totalIncome === 0 && data.orderCount === 0) warnings.push("No income recorded this month");
  if (data.vatDifference < 0) warnings.push("Negative VAT balance — more input than output VAT");

  const prevDelta = data.prevMonthResult !== undefined ? data.operatingResult - data.prevMonthResult : null;
  const lyDelta = data.sameMonthLastYearResult !== undefined ? data.operatingResult - data.sameMonthLastYearResult : null;

  return (
    <div className="space-y-1">
      {/* Title */}
      <div className="text-center mb-4">
        <h2 className="font-display text-lg font-bold uppercase tracking-tight">Monthly Declaration</h2>
        <p className="text-sm text-muted-foreground">{MONTHS[month - 1]} {year}</p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className={`${TILE} border-amber-500/30 bg-amber-500/5 mb-4`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Attention</span>
          </div>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-300/80 ml-6">• {w}</p>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className={`${TILE} text-center`}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Income</p>
          <p className="font-display text-lg font-bold text-emerald-400">{fmt(data.totalIncome)} kr</p>
        </div>
        <div className={`${TILE} text-center`}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Expenses</p>
          <p className="font-display text-lg font-bold text-destructive">{fmt(data.totalExpenses)} kr</p>
        </div>
        <div className={`${TILE} text-center`}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Result</p>
          <p className={`font-display text-lg font-bold ${data.operatingResult >= 0 ? "text-emerald-400" : "text-destructive"}`}>
            {fmt(data.operatingResult)} kr
          </p>
        </div>
      </div>

      {/* Comparison */}
      {(prevDelta !== null || lyDelta !== null) && (
        <div className="flex gap-3 mb-2">
          {prevDelta !== null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {prevDelta >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <span>vs prev month: {prevDelta >= 0 ? "+" : ""}{fmt(prevDelta)} kr</span>
            </div>
          )}
          {lyDelta !== null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {lyDelta >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <span>vs same month last year: {lyDelta >= 0 ? "+" : ""}{fmt(lyDelta)} kr</span>
            </div>
          )}
        </div>
      )}

      {/* Section A: Income */}
      <SectionHeader letter="A" label="Income" />
      <div className={TILE}>
        <Row label={`Webshop Sales (${data.orderCount} orders)`} value={data.webshopSales} />
        <Row label={`Custom Order Sales (${data.customOrderCount})`} value={data.customOrderSales} />
        <Row label="Shipping Income" value={data.shippingIncome} />
        <Row label="Refunds / Cancellations" value={data.refunds} negative />
        <Row label="Net Sales Total" value={data.netSales} bold />
      </div>

      {/* Section B: COGS */}
      <SectionHeader letter="B" label="Cost of Goods / Production" />
      <div className={TILE}>
        <Row label="Filament / Material Costs" value={data.materialCosts} />
        <Row label="Packaging" value={data.packagingCosts} />
        <Row label="Outsourced Production" value={data.outsourcedCosts} />
        <Row label="Product Consumables" value={data.consumableCosts} />
        <Row label="Total COGS" value={data.totalCOGS} bold />
      </div>

      {/* Section C: Operating Expenses */}
      <SectionHeader letter="C" label="Operating Expenses" />
      <div className={TILE}>
        <Row label="Shipping / Courier Costs" value={data.shippingExpenses} />
        <Row label="Stripe / Payment Fees" value={data.paymentFees} />
        <Row label="Software Subscriptions" value={data.softwareExpenses} />
        <Row label="Marketing / Ads" value={data.marketingExpenses} />
        <Row label="Website / App Tools" value={data.websiteExpenses} />
        <Row label="Office / Admin" value={data.officeExpenses} />
        <Row label="Electricity / Utilities" value={data.electricityExpenses} />
        <Row label="Equipment / Tools" value={data.equipmentExpenses} />
        <Row label="Miscellaneous" value={data.miscExpenses} />
        <Row label="Total Operating Expenses" value={data.totalOperating} bold />
      </div>

      {/* Section D: VAT */}
      <SectionHeader letter="D" label="VAT Overview" />
      <div className={TILE}>
        <Row label="Output VAT (from sales)" value={data.outputVAT} />
        <Row label="Input VAT (from expenses)" value={data.inputVAT} />
        <Row label="VAT Difference" value={data.vatDifference} bold />
        <p className="text-[10px] text-muted-foreground mt-2 italic">This is an overview only. Not a legal VAT return.</p>
      </div>

      {/* Section E: Summary */}
      <SectionHeader letter="E" label="Summary" />
      <div className={TILE}>
        <Row label="Total Income" value={data.totalIncome} />
        <Row label="Total Expenses" value={data.totalExpenses} />
        <Row label="Estimated Operating Result" value={data.operatingResult} bold />
      </div>

      {/* YTD */}
      <SectionHeader letter="YTD" label="Year-to-Date" />
      <div className={TILE}>
        <Row label={`YTD Income (Jan–${MONTHS[month - 1].slice(0, 3)})`} value={data.ytdIncome} />
        <Row label="YTD Expenses" value={data.ytdExpenses} />
        <Row label="YTD Result" value={data.ytdResult} bold />
      </div>

      {/* Section F: Receipt Index */}
      {data.expenses.length > 0 && (
        <>
          <SectionHeader letter="F" label="Attachments / Receipt Index" />
          <div className={TILE}>
            <div className="space-y-1">
              {data.expenses.map((e, i) => (
                <div key={e.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground w-5">{i + 1}.</span>
                  <span className="flex-1 truncate">{e.description || e.category}</span>
                  <span className="text-muted-foreground">{e.expense_date}</span>
                  <span className="font-mono">{fmt(e.gross_amount)} kr</span>
                  {e.receipt_reference ? (
                    <Badge variant="outline" className="text-[8px]">{e.receipt_reference}</Badge>
                  ) : e.receipt_file_url ? (
                    <FileText className="h-3 w-3 text-primary" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center mt-4 italic">
        This report is a bookkeeping summary for review and does not replace professional tax/accounting advice.
      </p>
    </div>
  );
};

export default DeclarationPreview;
