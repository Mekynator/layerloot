import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart, MessageSquareMore, Package, Star, Palette,
  TicketPercent, Users, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MarketingSuggestion {
  title: string;
  reason: string;
  impact: string;
  action?: { label: string; to: string };
}

interface ActionItem {
  label: string;
  description: string;
  count: number;
  icon: LucideIcon;
  to: string;
  severity: "urgent" | "warning" | "info";
}

export function useAdminGrowth() {
  const [marketing, setMarketing] = useState<MarketingSuggestion[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setLoading(true);

      const [
        pendingOrdRes, quotesRes, pendingRevRes, pendingShowRes,
        lowStockRes, topProductsRes, vouchersRes, ordersRes,
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
        supabase.from("custom_orders").select("id", { count: "exact", head: true }).eq("status", "quoted").eq("customer_response_status", "pending"),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("custom_order_showcases").select("id", { count: "exact", head: true }).eq("visibility_status", "shared").eq("approved_by_admin", false),
        supabase.from("products").select("id, name, stock").lte("stock", 5).eq("is_active", true),
        supabase.from("order_items").select("product_name, quantity").order("quantity", { ascending: false }).limit(5),
        supabase.from("user_vouchers").select("id", { count: "exact", head: true }).eq("is_used", false),
        supabase.from("orders").select("id, total, created_at").order("created_at", { ascending: false }).limit(50),
      ]);

      if (!mounted) return;

      // Build marketing suggestions
      const suggestions: MarketingSuggestion[] = [];
      const topProducts = topProductsRes.data ?? [];
      if (topProducts.length > 0) {
        suggestions.push({
          title: `Promote "${topProducts[0].product_name}"`,
          reason: `This product has ${topProducts[0].quantity} units sold — feature it on the homepage.`,
          impact: "High conversion potential",
          action: { label: "Feature product", to: "/admin/products" },
        });
      }
      const lowStockCount = (lowStockRes.data ?? []).length;
      if (lowStockCount > 0) {
        suggestions.push({
          title: `Create urgency for ${lowStockCount} low-stock items`,
          reason: "Use 'Limited stock' badges to drive faster purchases.",
          impact: "Urgency-driven sales",
          action: { label: "View products", to: "/admin/products" },
        });
      }
      const unusedVouchers = vouchersRes.count ?? 0;
      if (unusedVouchers > 3) {
        suggestions.push({
          title: "Push voucher redemption campaign",
          reason: `${unusedVouchers} vouchers are unused — send reminders or create promotional content.`,
          impact: "Increase repeat purchases",
          action: { label: "View discounts", to: "/admin/discounts" },
        });
      }
      const pendingQuotes = quotesRes.count ?? 0;
      if (pendingQuotes > 0) {
        suggestions.push({
          title: "Follow up on pending custom quotes",
          reason: `${pendingQuotes} customers haven't responded — a gentle follow-up could close sales.`,
          impact: "Revenue recovery",
          action: { label: "View custom orders", to: "/admin/custom-orders" },
        });
      }
      if (suggestions.length === 0) {
        suggestions.push({
          title: "Everything looks great!",
          reason: "Keep monitoring — new suggestions will appear as more data comes in.",
          impact: "Steady growth",
        });
      }

      // Build action items
      const actions: ActionItem[] = [];
      const pendOrd = pendingOrdRes.count ?? 0;
      if (pendOrd > 0) actions.push({ label: "Pending orders", description: "Orders waiting to be processed", count: pendOrd, icon: ShoppingCart, to: "/admin/orders", severity: pendOrd > 3 ? "urgent" : "warning" });
      if (pendingQuotes > 0) actions.push({ label: "Quotes awaiting reply", description: "Customers waiting on your quote", count: pendingQuotes, icon: MessageSquareMore, to: "/admin/custom-orders", severity: "warning" });
      const pendRev = pendingRevRes.count ?? 0;
      if (pendRev > 0) actions.push({ label: "Reviews pending", description: "Approve to build trust", count: pendRev, icon: Star, to: "/admin/reviews", severity: "info" });
      const pendShow = pendingShowRes.count ?? 0;
      if (pendShow > 0) actions.push({ label: "Showcases pending", description: "Community content awaiting approval", count: pendShow, icon: Palette, to: "/admin/showcases", severity: "info" });
      if (lowStockCount > 0) actions.push({ label: "Low stock products", description: "Products with ≤5 units left", count: lowStockCount, icon: Package, to: "/admin/products", severity: "warning" });

      setMarketing(suggestions);
      setActionItems(actions);
      setLoading(false);
    };

    fetch();
    return () => { mounted = false; };
  }, []);

  return { marketing, actionItems, loading };
}
