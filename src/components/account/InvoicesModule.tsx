import { FileText, Download, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/currency";
import type { AccountModuleProps } from "./types";

interface Invoice {
  id: string;
  order_id: string;
  invoice_number: string;
  invoice_date: string;
  pdf_path: string | null;
  order_total?: number;
  order_status?: string;
}

interface Props extends AccountModuleProps {
  invoices: Invoice[];
}

const InvoicesModule = ({ tt, invoices }: Props) => {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { order_id: invoice.order_id },
      });
      if (error) throw error;
      if (data?.invoice_url) {
        window.open(data.invoice_url, "_blank");
      } else {
        toast({ title: "Invoice not available", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to download invoice.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p>{tt("account.invoices.empty", "No invoices yet. Invoices are generated after payment.")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => (
        <Card key={inv.id} className="glass-card transition-all hover:border-primary/30 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold uppercase text-card-foreground">
                    {inv.invoice_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.invoice_date).toLocaleDateString()} · <Package className="inline h-3 w-3" /> #{inv.order_id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {inv.order_total != null && (
                  <span className="font-display text-sm font-bold text-primary">
                    {formatPrice(Number(inv.order_total))}
                  </span>
                )}
                {inv.order_status && (
                  <Badge variant="outline" className="text-[10px] uppercase hidden sm:inline-flex">
                    {inv.order_status}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(inv)}
                  disabled={downloadingId === inv.id}
                  className="font-display text-xs uppercase tracking-wider"
                >
                  <Download className="mr-1 h-3 w-3" />
                  {downloadingId === inv.id ? "..." : tt("account.invoices.download", "Download")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InvoicesModule;
