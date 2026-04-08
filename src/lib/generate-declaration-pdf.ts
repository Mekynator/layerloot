import type { MonthlyData } from "@/hooks/use-monthly-declaration";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt = (v: number) => v.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function row(label: string, value: number, bold = false, negative = false): string {
  const sign = negative && value > 0 ? "-" : "";
  const border = bold ? "border-top:1px solid #ccc;padding-top:6px;margin-top:4px;font-weight:700;" : "";
  return `<tr style="${border}"><td style="padding:3px 0;color:#555;">${label}</td><td style="text-align:right;padding:3px 0;font-family:'Courier New',monospace;${negative ? "color:#c0392b;" : "color:#222;"}">${sign}${fmt(Math.abs(value))} DKK</td></tr>`;
}

function row3col(label: string, net: number, vat: number, gross: number, bold = false): string {
  const border = bold ? "border-top:1px solid #ccc;padding-top:6px;font-weight:700;" : "";
  return `<tr style="${border}">
    <td style="padding:3px 0;color:#555;">${label}</td>
    <td style="text-align:right;padding:3px 8px;font-family:'Courier New',monospace;color:#222;">${fmt(net)}</td>
    <td style="text-align:right;padding:3px 8px;font-family:'Courier New',monospace;color:#222;">${fmt(vat)}</td>
    <td style="text-align:right;padding:3px 0;font-family:'Courier New',monospace;color:#222;">${fmt(gross)}</td>
  </tr>`;
}

function sectionHeader(letter: string, label: string): string {
  return `<div style="margin-top:28px;margin-bottom:10px;display:flex;align-items:center;gap:8px;border-bottom:2px solid #222;padding-bottom:4px;">
    <span style="background:#f0f0f0;color:#333;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;">${letter}</span>
    <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#222;">${label}</span>
  </div>`;
}

function tableWrap(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;">${rows}</table>`;
}

function table3colWrap(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead><tr style="border-bottom:1px solid #ddd;">
      <th style="text-align:left;padding:3px 0;color:#888;font-size:10px;font-weight:600;">Category</th>
      <th style="text-align:right;padding:3px 8px;color:#888;font-size:10px;font-weight:600;">Net</th>
      <th style="text-align:right;padding:3px 8px;color:#888;font-size:10px;font-weight:600;">VAT</th>
      <th style="text-align:right;padding:3px 0;color:#888;font-size:10px;font-weight:600;">Gross</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function generateDeclarationHTML(data: MonthlyData, month: number, year: number, compact = false): string {
  const now = new Date().toLocaleDateString("da-DK");

  const header = `
    <div style="text-align:center;margin-bottom:28px;border-bottom:2px solid #222;padding-bottom:16px;">
      <h1 style="font-size:26px;font-weight:800;text-transform:uppercase;letter-spacing:3px;margin:0;color:#111;">LayerLoot</h1>
      <p style="font-size:14px;color:#555;margin:6px 0 0;">Monthly Financial Summary</p>
      <p style="font-size:13px;color:#333;margin:4px 0 0;font-weight:600;">${MONTHS[month - 1]} ${year}</p>
      <p style="font-size:11px;color:#888;margin:2px 0 0;">Generated: ${now}</p>
    </div>`;

  const summaryCards = `
    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <div style="flex:1;text-align:center;border:1px solid #ddd;border-radius:8px;padding:14px;">
        <p style="font-size:10px;text-transform:uppercase;color:#888;margin:0 0 4px;">Income</p>
        <p style="font-size:20px;font-weight:700;color:#27ae60;margin:0;">${fmt(data.totalIncome)} DKK</p>
      </div>
      <div style="flex:1;text-align:center;border:1px solid #ddd;border-radius:8px;padding:14px;">
        <p style="font-size:10px;text-transform:uppercase;color:#888;margin:0 0 4px;">Expenses</p>
        <p style="font-size:20px;font-weight:700;color:#c0392b;margin:0;">${fmt(data.totalExpenses)} DKK</p>
      </div>
      <div style="flex:1;text-align:center;border:1px solid #ddd;border-radius:8px;padding:14px;">
        <p style="font-size:10px;text-transform:uppercase;color:#888;margin:0 0 4px;">Result</p>
        <p style="font-size:20px;font-weight:700;color:${data.operatingResult >= 0 ? "#27ae60" : "#c0392b"};margin:0;">${fmt(data.operatingResult)} DKK</p>
      </div>
    </div>`;

  const sA = sectionHeader("A", "Income") + tableWrap(
    row(`Webshop Sales (${data.orderCount} orders)`, data.webshopSales) +
    row(`Custom Order Sales (${data.customOrderCount})`, data.customOrderSales) +
    row("Shipping Income", data.shippingIncome) +
    row("Refunds / Cancellations", data.refunds, false, true) +
    row("Net Sales Total", data.netSales, true)
  );

  const sB = sectionHeader("B", "Cost of Goods / Production") + tableWrap(
    row("Filament / Material Costs", data.materialCosts) +
    row("Packaging", data.packagingCosts) +
    row("Outsourced Production", data.outsourcedCosts) +
    row("Product Consumables", data.consumableCosts) +
    row("Total COGS", data.totalCOGS, true)
  );

  // Build expense breakdown by category with Net/VAT/Gross columns
  const expensesByCategory: Record<string, { net: number; vat: number; gross: number }> = {};
  (data.expenses || []).forEach(e => {
    const cat = e.category;
    if (!expensesByCategory[cat]) expensesByCategory[cat] = { net: 0, vat: 0, gross: 0 };
    expensesByCategory[cat].net += Number(e.net_amount);
    expensesByCategory[cat].vat += Number(e.vat_amount);
    expensesByCategory[cat].gross += Number(e.gross_amount);
  });

  const opExpenseRows = Object.entries(expensesByCategory)
    .filter(([cat]) => !["Materials", "Packaging"].includes(cat))
    .map(([cat, v]) => row3col(cat, v.net, v.vat, v.gross))
    .join("");

  const totalOpNet = Object.entries(expensesByCategory).filter(([c]) => !["Materials", "Packaging"].includes(c)).reduce((s, [, v]) => s + v.net, 0);
  const totalOpVat = Object.entries(expensesByCategory).filter(([c]) => !["Materials", "Packaging"].includes(c)).reduce((s, [, v]) => s + v.vat, 0);

  const sC = sectionHeader("C", "Operating Expenses") + (
    Object.keys(expensesByCategory).length > 0
      ? table3colWrap(opExpenseRows + row3col("Total Operating", totalOpNet, totalOpVat, data.totalOperating, true))
      : tableWrap(
          row("Shipping / Courier Costs", data.shippingExpenses) +
          row("Stripe / Payment Fees", data.paymentFees) +
          row("Software Subscriptions", data.softwareExpenses) +
          row("Marketing / Ads", data.marketingExpenses) +
          row("Electricity / Utilities", data.electricityExpenses) +
          row("Equipment / Tools", data.equipmentExpenses) +
          row("Miscellaneous", data.miscExpenses) +
          row("Total Operating Expenses", data.totalOperating, true)
        )
  );

  const sD = sectionHeader("D", "VAT Overview") + tableWrap(
    row("Output VAT (from sales)", data.outputVAT) +
    row("Input VAT (from expenses)", data.inputVAT) +
    row("VAT Difference", data.vatDifference, true)
  ) + `<p style="font-size:10px;color:#888;font-style:italic;margin-top:4px;">Overview only. Not a legal VAT return.</p>`;

  const sE = sectionHeader("E", "Summary") + `
    <div style="border:2px solid #222;border-radius:8px;padding:16px;margin-top:8px;">
      ${tableWrap(
        row("Total Income", data.totalIncome) +
        row("Total Expenses", data.totalExpenses) +
        row("Estimated Operating Result", data.operatingResult, true)
      )}
    </div>`;

  const ytd = sectionHeader("YTD", "Year-to-Date") + tableWrap(
    row(`YTD Income (Jan–${MONTHS[month - 1].slice(0, 3)})`, data.ytdIncome) +
    row("YTD Expenses", data.ytdExpenses) +
    row("YTD Result", data.ytdResult, true)
  );

  let sF = "";
  if (data.expenses.length > 0 && !compact) {
    const receipts = data.expenses.map((e, i) =>
      `<tr style="border-bottom:1px solid #eee;">
        <td style="padding:3px 0;color:#888;font-size:11px;">${i + 1}.</td>
        <td style="padding:3px 4px;font-size:12px;">${e.expense_date}</td>
        <td style="padding:3px 4px;font-size:12px;">${e.supplier || "—"}</td>
        <td style="padding:3px 4px;font-size:12px;">${e.description || e.category}</td>
        <td style="text-align:right;font-family:'Courier New',monospace;font-size:12px;padding:3px 4px;">${fmt(e.gross_amount)} DKK</td>
        <td style="padding:3px 4px;font-size:11px;color:#888;">${e.receipt_reference || (e.receipt_file_url ? "📎 File" : "⚠ Missing")}</td>
      </tr>`
    ).join("");
    sF = sectionHeader("F", "Receipt Index") + `<table style="width:100%;font-size:12px;border-collapse:collapse;">
      <thead><tr style="border-bottom:1px solid #ccc;">
        <th style="text-align:left;padding:3px 0;color:#888;font-size:10px;">#</th>
        <th style="text-align:left;padding:3px 4px;color:#888;font-size:10px;">Date</th>
        <th style="text-align:left;padding:3px 4px;color:#888;font-size:10px;">Vendor</th>
        <th style="text-align:left;padding:3px 4px;color:#888;font-size:10px;">Description</th>
        <th style="text-align:right;padding:3px 4px;color:#888;font-size:10px;">Gross</th>
        <th style="text-align:left;padding:3px 4px;color:#888;font-size:10px;">Receipt</th>
      </tr></thead>
      <tbody>${receipts}</tbody>
    </table>`;
  }

  const footer = `<p style="text-align:center;font-size:10px;color:#999;font-style:italic;margin-top:36px;border-top:1px solid #ccc;padding-top:12px;">
    This report is a bookkeeping summary for review and does not replace professional tax/accounting advice.<br>
    Generated by LayerLoot system.
  </p>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #222; background: #fff; max-width: 700px; margin: 0 auto; padding: 24px; }
  </style></head><body>
    ${header}${summaryCards}${sA}${sB}${sC}${sD}${sE}${ytd}${sF}${footer}
  </body></html>`;
}

export function downloadDeclarationPDF(data: MonthlyData, month: number, year: number, compact = false) {
  const html = generateDeclarationHTML(data, month, year, compact);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

export function exportDeclarationCSV(data: MonthlyData, month: number, year: number) {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const rows: string[][] = [
    ["Date", "Month", "Category", "Source", "Vendor", "Description", "Net (DKK)", "VAT (DKK)", "Gross (DKK)", "Receipt Ref", "Notes"],
  ];

  // System income rows
  rows.push([monthKey, monthKey, "Income", "system", "", "Webshop Sales", data.webshopSales.toFixed(2), "", "", "", ""]);
  rows.push([monthKey, monthKey, "Income", "system", "", "Custom Order Sales", data.customOrderSales.toFixed(2), "", "", "", ""]);
  rows.push([monthKey, monthKey, "Income", "system", "", "Shipping Income", data.shippingIncome.toFixed(2), "", "", "", ""]);
  rows.push([monthKey, monthKey, "Refunds", "system", "", "Refunds / Cancellations", (-data.refunds).toFixed(2), "", "", "", ""]);

  // Expense rows from actual entries
  if (data.expenses.length > 0) {
    data.expenses.forEach(e => {
      rows.push([
        e.expense_date, monthKey, e.category, "manual",
        e.supplier || "", e.description,
        Number(e.net_amount).toFixed(2), Number(e.vat_amount).toFixed(2), Number(e.gross_amount).toFixed(2),
        e.receipt_reference || "", e.notes || "",
      ]);
    });
  }

  // Summary
  rows.push([]);
  rows.push(["", "", "Summary", "", "", "Total Income", data.totalIncome.toFixed(2), "", "", "", ""]);
  rows.push(["", "", "Summary", "", "", "Total Expenses", data.totalExpenses.toFixed(2), "", "", "", ""]);
  rows.push(["", "", "Summary", "", "", "Operating Result", data.operatingResult.toFixed(2), "", "", "", ""]);
  rows.push(["", "", "VAT", "", "", "Output VAT", data.outputVAT.toFixed(2), "", "", "", ""]);
  rows.push(["", "", "VAT", "", "", "Input VAT", data.inputVAT.toFixed(2), "", "", "", ""]);
  rows.push(["", "", "VAT", "", "", "VAT Difference", data.vatDifference.toFixed(2), "", "", "", ""]);
  rows.push(["", "", "YTD", "", "", "YTD Income", data.ytdIncome.toFixed(2), "", "", "", ""]);
  rows.push(["", "", "YTD", "", "", "YTD Expenses", data.ytdExpenses.toFixed(2), "", "", "", ""]);
  rows.push(["", "", "YTD", "", "", "YTD Result", data.ytdResult.toFixed(2), "", "", "", ""]);

  const escapeCsv = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  const csv = rows.map(r => r.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `layerloot-declaration-${year}-${String(month).padStart(2, "0")}.csv`;
  a.click();
}
