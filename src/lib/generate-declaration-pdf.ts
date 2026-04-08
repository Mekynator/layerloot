import type { MonthlyData } from "@/hooks/use-monthly-declaration";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt = (v: number) => v.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function row(label: string, value: number, bold = false, negative = false): string {
  const sign = negative && value > 0 ? "-" : "";
  const cls = bold ? "font-weight:700;border-top:1px solid #333;padding-top:6px;margin-top:4px;" : "";
  return `<tr style="${cls}"><td style="padding:3px 0;color:#aaa;">${label}</td><td style="text-align:right;padding:3px 0;font-family:monospace;${negative ? "color:#e74c3c;" : ""}">${sign}${fmt(Math.abs(value))} kr</td></tr>`;
}

function sectionHeader(letter: string, label: string): string {
  return `<div style="margin-top:24px;margin-bottom:8px;display:flex;align-items:center;gap:8px;">
    <span style="background:#7c3aed20;color:#7c3aed;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;">${letter}</span>
    <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#888;">${label}</span>
  </div>`;
}

function tableWrap(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;">${rows}</table>`;
}

export function generateDeclarationHTML(data: MonthlyData, month: number, year: number, compact = false): string {
  const now = new Date().toLocaleDateString("da-DK");

  const header = `
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin:0;">LayerLoot</h1>
      <p style="font-size:13px;color:#888;margin:4px 0 0;">Monthly Declaration · ${MONTHS[month - 1]} ${year}</p>
      <p style="font-size:11px;color:#666;margin:2px 0 0;">Generated: ${now}</p>
    </div>`;

  const summaryCards = `
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="flex:1;text-align:center;border:1px solid #333;border-radius:10px;padding:12px;">
        <p style="font-size:10px;text-transform:uppercase;color:#888;margin:0 0 4px;">Income</p>
        <p style="font-size:18px;font-weight:700;color:#2ecc71;margin:0;">${fmt(data.totalIncome)} kr</p>
      </div>
      <div style="flex:1;text-align:center;border:1px solid #333;border-radius:10px;padding:12px;">
        <p style="font-size:10px;text-transform:uppercase;color:#888;margin:0 0 4px;">Expenses</p>
        <p style="font-size:18px;font-weight:700;color:#e74c3c;margin:0;">${fmt(data.totalExpenses)} kr</p>
      </div>
      <div style="flex:1;text-align:center;border:1px solid #333;border-radius:10px;padding:12px;">
        <p style="font-size:10px;text-transform:uppercase;color:#888;margin:0 0 4px;">Result</p>
        <p style="font-size:18px;font-weight:700;color:${data.operatingResult >= 0 ? "#2ecc71" : "#e74c3c"};margin:0;">${fmt(data.operatingResult)} kr</p>
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

  const sC = sectionHeader("C", "Operating Expenses") + tableWrap(
    row("Shipping / Courier Costs", data.shippingExpenses) +
    row("Stripe / Payment Fees", data.paymentFees) +
    row("Software Subscriptions", data.softwareExpenses) +
    row("Marketing / Ads", data.marketingExpenses) +
    row("Website / App Tools", data.websiteExpenses) +
    row("Office / Admin", data.officeExpenses) +
    row("Electricity / Utilities", data.electricityExpenses) +
    row("Equipment / Tools", data.equipmentExpenses) +
    row("Miscellaneous", data.miscExpenses) +
    row("Total Operating Expenses", data.totalOperating, true)
  );

  const sD = sectionHeader("D", "VAT Overview") + tableWrap(
    row("Output VAT (from sales)", data.outputVAT) +
    row("Input VAT (from expenses)", data.inputVAT) +
    row("VAT Difference", data.vatDifference, true)
  ) + `<p style="font-size:10px;color:#666;font-style:italic;margin-top:4px;">Overview only. Not a legal VAT return.</p>`;

  const sE = sectionHeader("E", "Summary") + tableWrap(
    row("Total Income", data.totalIncome) +
    row("Total Expenses", data.totalExpenses) +
    row("Estimated Operating Result", data.operatingResult, true)
  );

  const ytd = sectionHeader("YTD", "Year-to-Date") + tableWrap(
    row(`YTD Income (Jan–${MONTHS[month - 1].slice(0, 3)})`, data.ytdIncome) +
    row("YTD Expenses", data.ytdExpenses) +
    row("YTD Result", data.ytdResult, true)
  );

  let sF = "";
  if (data.expenses.length > 0 && !compact) {
    const receipts = data.expenses.map((e, i) =>
      `<tr><td style="padding:2px 0;color:#666;">${i + 1}.</td><td style="padding:2px 4px;">${e.description || e.category}</td><td style="padding:2px 4px;color:#888;">${e.expense_date}</td><td style="text-align:right;font-family:monospace;padding:2px 0;">${fmt(e.gross_amount)} kr</td><td style="padding:2px 4px;color:#888;font-size:10px;">${e.receipt_reference || (e.receipt_file_url ? "📎" : "⚠")}</td></tr>`
    ).join("");
    sF = sectionHeader("F", "Attachments / Receipt Index") + `<table style="width:100%;font-size:12px;border-collapse:collapse;">${receipts}</table>`;
  }

  const footer = `<p style="text-align:center;font-size:10px;color:#666;font-style:italic;margin-top:32px;border-top:1px solid #333;padding-top:12px;">
    This report is a bookkeeping summary for review and does not replace professional tax/accounting advice.
  </p>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e0e0e0; background: #0a0a0a; max-width: 700px; margin: 0 auto; padding: 24px; }
    @media print { body { background: white; color: #222; } td { color: #444 !important; } }
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
  const rows = [
    ["Section", "Category", "Amount (kr)"],
    ["Income", "Webshop Sales", data.webshopSales.toFixed(2)],
    ["Income", "Custom Order Sales", data.customOrderSales.toFixed(2)],
    ["Income", "Shipping Income", data.shippingIncome.toFixed(2)],
    ["Income", "Refunds", (-data.refunds).toFixed(2)],
    ["Income", "Net Sales Total", data.netSales.toFixed(2)],
    [],
    ["COGS", "Material Costs", data.materialCosts.toFixed(2)],
    ["COGS", "Packaging", data.packagingCosts.toFixed(2)],
    ["COGS", "Outsourced", data.outsourcedCosts.toFixed(2)],
    ["COGS", "Consumables", data.consumableCosts.toFixed(2)],
    ["COGS", "Total COGS", data.totalCOGS.toFixed(2)],
    [],
    ["Operating", "Shipping Costs", data.shippingExpenses.toFixed(2)],
    ["Operating", "Payment Fees", data.paymentFees.toFixed(2)],
    ["Operating", "Software", data.softwareExpenses.toFixed(2)],
    ["Operating", "Marketing", data.marketingExpenses.toFixed(2)],
    ["Operating", "Website/App", data.websiteExpenses.toFixed(2)],
    ["Operating", "Office/Admin", data.officeExpenses.toFixed(2)],
    ["Operating", "Electricity", data.electricityExpenses.toFixed(2)],
    ["Operating", "Equipment", data.equipmentExpenses.toFixed(2)],
    ["Operating", "Miscellaneous", data.miscExpenses.toFixed(2)],
    ["Operating", "Total Operating", data.totalOperating.toFixed(2)],
    [],
    ["VAT", "Output VAT", data.outputVAT.toFixed(2)],
    ["VAT", "Input VAT", data.inputVAT.toFixed(2)],
    ["VAT", "VAT Difference", data.vatDifference.toFixed(2)],
    [],
    ["Summary", "Total Income", data.totalIncome.toFixed(2)],
    ["Summary", "Total Expenses", data.totalExpenses.toFixed(2)],
    ["Summary", "Operating Result", data.operatingResult.toFixed(2)],
    [],
    ["YTD", "Income", data.ytdIncome.toFixed(2)],
    ["YTD", "Expenses", data.ytdExpenses.toFixed(2)],
    ["YTD", "Result", data.ytdResult.toFixed(2)],
  ];

  if (data.expenses.length > 0) {
    rows.push([]);
    rows.push(["Expense Date", "Supplier", "Category", "Description", "Net", "VAT", "Gross", "Receipt Ref"] as any);
    data.expenses.forEach(e => {
      rows.push([e.expense_date, e.supplier || "", e.category, e.description, e.net_amount.toFixed(2), e.vat_amount.toFixed(2), e.gross_amount.toFixed(2), e.receipt_reference || ""] as any);
    });
  }

  const csv = rows.map(r => (r as string[]).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `layerloot-declaration-${year}-${String(month).padStart(2, "0")}.csv`;
  a.click();
}
