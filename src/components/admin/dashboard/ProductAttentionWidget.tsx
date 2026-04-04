import { Package, AlertTriangle, EyeOff, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardWidget from "./DashboardWidget";
import type { DashboardData } from "@/hooks/use-admin-dashboard";

interface Props { data: DashboardData }

const ProductAttentionWidget = ({ data }: Props) => {
  const drafts = data.draftProductsCount ?? 0;
  const lowStock = data.lowStockProducts;

  return (
    <DashboardWidget title="Product Attention" icon={Package} linkTo="/admin/products" linkLabel="Products">
      {drafts > 0 && (
        <Link to="/admin/products" className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-background/40">
          <EyeOff className="h-4 w-4 text-amber-400" />
          <span className="flex-1 text-sm text-foreground">Draft / unpublished products</span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">{drafts}</span>
        </Link>
      )}
      {lowStock.length > 0 ? (
        <div className="space-y-1 mt-1">
          {lowStock.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-amber-500/5 px-3 py-2">
              <span className="text-xs text-foreground truncate max-w-[60%]">{p.name}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400">
                {`${p.stock} left`}
              </span>
            </div>
          ))}
        </div>
      ) : drafts === 0 ? (
        <div className="flex items-center gap-2 py-4 justify-center">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <p className="text-xs text-muted-foreground">All products healthy.</p>
        </div>
      ) : null}
    </DashboardWidget>
  );
};

export default ProductAttentionWidget;
