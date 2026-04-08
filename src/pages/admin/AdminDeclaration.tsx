import { useState } from "react";
import { FileText, Download, Printer, FileSpreadsheet, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin/AdminLayout";
import DeclarationPreview from "@/components/admin/declaration/DeclarationPreview";
import ExpenseManager from "@/components/admin/declaration/ExpenseManager";
import RecurringExpenseManager from "@/components/admin/declaration/RecurringExpenseManager";
import ReportsManager from "@/components/admin/declaration/ReportsManager";
import { useMonthlyDeclaration, useBusinessExpenses } from "@/hooks/use-monthly-declaration";
import { useRecurringExpenses } from "@/hooks/use-recurring-expenses";
import { useMonthlyReports } from "@/hooks/use-monthly-reports";
import { downloadDeclarationPDF, exportDeclarationCSV, generateDeclarationHTML } from "@/lib/generate-declaration-pdf";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const AdminDeclaration = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, loading } = useMonthlyDeclaration(year, month);
  const expenses = useBusinessExpenses(year, month);
  const recurring = useRecurringExpenses();
  const reports = useMonthlyReports();

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handlePrint = () => {
    const html = generateDeclarationHTML(data, month, year);
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Monthly Declaration
            </h1>
            <p className="text-xs text-muted-foreground">
              Generate accountant-ready monthly reports
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={String(month)} onValueChange={v => setMonth(+v)}>
              <SelectTrigger className="w-32 h-9 rounded-lg bg-card/40 text-xs">
                <Calendar className="mr-1 h-3.5 w-3.5 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(+v)}>
              <SelectTrigger className="w-24 h-9 rounded-lg bg-card/40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportDeclarationCSV(data, month, year)} className="gap-1.5 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button size="sm" onClick={() => downloadDeclarationPDF(data, month, year)} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => downloadDeclarationPDF(data, month, year, true)} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Compact
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="rounded-xl border border-border/50 bg-card/20 p-6">
                <DeclarationPreview data={data} month={month} year={year} />
              </div>
            </TabsContent>

            <TabsContent value="expenses">
              <div className="rounded-xl border border-border/50 bg-card/20 p-6">
                <ExpenseManager
                  expenses={expenses.expenses}
                  loading={expenses.loading}
                  onAdd={expenses.addExpense}
                  onUpdate={expenses.updateExpense}
                  onDelete={expenses.deleteExpense}
                />
              </div>
            </TabsContent>

            <TabsContent value="recurring">
              <div className="rounded-xl border border-border/50 bg-card/20 p-6">
                <RecurringExpenseManager
                  items={recurring.items}
                  loading={recurring.loading}
                  onAdd={recurring.add}
                  onUpdate={recurring.update}
                  onRemove={recurring.remove}
                  onApply={recurring.applyToMonth}
                  year={year}
                  month={month}
                />
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <div className="rounded-xl border border-border/50 bg-card/20 p-6">
                <ReportsManager
                  reports={reports.reports}
                  loading={reports.loading}
                  onGenerate={reports.generateSnapshot}
                  onDelete={reports.deleteReport}
                  currentData={data}
                  currentYear={year}
                  currentMonth={month}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDeclaration;
