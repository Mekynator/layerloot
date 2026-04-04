import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Period = "7d" | "30d" | "90d" | "all";

const getThreshold = (p: Period) => {
  if (p === "all") return null;
  const d = new Date();
  if (p === "7d") d.setDate(d.getDate() - 7);
  else if (p === "30d") d.setDate(d.getDate() - 30);
  else if (p === "90d") d.setDate(d.getDate() - 90);
  return d.toISOString();
};

export interface DashboardData {
  revenue: number;
  ordersCount: number;
  avgOrderValue: number;
  productsCount: number;
  clientsCount: number;
  customOrdersActive: number;
  reviewsTotal: number;
  pendingOrders: number;
  pendingReviews: number;
  pendingShowcases: number;
  quotesAwaiting: number;
  loyaltyPointsIssued: number;
  vouchersRedeemed: number;
  revenueByDay: { name: string; revenue: number; orders: number }[];
  ordersByStatus: { name: string; value: number }[];
  topProducts: { name: string; qty: number; rev: number }[];
  recentOrders: { id: string; total: number; status: string; created_at: string }[];
  customOrdersByStatus: { name: string; value: number }[];
  lowStockProducts: { id: string; name: string; stock: number }[];
  insights: { message: string; type: "positive" | "neutral" | "warning" }[];
  // New fields for role-based dashboard
  draftBlocksCount: number;
  scheduledPublishCount: number;
  draftProductsCount: number;
  ordersAwaitingShipment: number;
  ordersOnHold: number;
  unansweredCustomMessages: number;
  missingTranslations: number;
  outdatedTranslations: number;
}

const EMPTY: DashboardData = {
  revenue: 0, ordersCount: 0, avgOrderValue: 0, productsCount: 0, clientsCount: 0,
  customOrdersActive: 0, reviewsTotal: 0, pendingOrders: 0, pendingReviews: 0,
  pendingShowcases: 0, quotesAwaiting: 0, loyaltyPointsIssued: 0, vouchersRedeemed: 0,
  revenueByDay: [], ordersByStatus: [], topProducts: [], recentOrders: [],
  customOrdersByStatus: [], lowStockProducts: [], insights: [],
  draftBlocksCount: 0, scheduledPublishCount: 0, draftProductsCount: 0,
  ordersAwaitingShipment: 0, ordersOnHold: 0, unansweredCustomMessages: 0,
  missingTranslations: 0, outdatedTranslations: 0,
};

export function useAdminDashboard(period: Period) {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      const threshold = getThreshold(period);

      let oq = supabase.from("orders").select("id, total, status, created_at");
      if (threshold) oq = oq.gte("created_at", threshold);
      const { data: orders } = await oq;
      const allOrders = orders ?? [];

      const [
        productsRes, profilesRes, activeCoRes, pendingOrdRes,
        pendingRevRes, pendingShowRes, quotesRes,
        loyaltyRes, vouchersRes, lowStockRes, coAllRes,
        // New queries
        draftBlocksRes, scheduledBlocksRes, scheduledProductsRes,
        draftProductsRes, shipmentRes, onHoldRes,
        outdatedTransRes, missingTransRes,
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("custom_orders").select("id", { count: "exact", head: true })
          .in("status", ["pending", "reviewing", "quoted", "accepted"]),
        supabase.from("orders").select("id", { count: "exact", head: true })
          .in("status", ["pending", "processing"]),
        supabase.from("product_reviews").select("id", { count: "exact", head: true })
          .eq("is_approved", false),
        supabase.from("custom_order_showcases").select("id", { count: "exact", head: true })
          .eq("visibility_status", "shared").eq("approved_by_admin", false),
        supabase.from("custom_orders").select("id", { count: "exact", head: true })
          .eq("status", "quoted").eq("customer_response_status", "pending"),
        supabase.from("loyalty_points").select("points"),
        supabase.from("user_vouchers").select("id", { count: "exact", head: true })
          .eq("is_used", true),
        supabase.from("products").select("id, name, stock").gt("stock", 0).lte("stock", 5).eq("is_active", true).order("stock").limit(10),
        supabase.from("custom_orders").select("status"),
        // New parallel queries
        supabase.from("site_blocks").select("id", { count: "exact", head: true }).eq("has_draft", true),
        supabase.from("site_blocks").select("id", { count: "exact", head: true }).not("scheduled_publish_at", "is", null),
        supabase.from("products").select("id", { count: "exact", head: true }).not("scheduled_publish_at", "is", null),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "processing", "printing", "finishing", "packed"]),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "on_hold"),
        supabase.from("translation_entries").select("id", { count: "exact", head: true }).eq("status", "outdated"),
        supabase.from("translation_entries").select("id", { count: "exact", head: true }).eq("status", "missing"),
      ]);

      const revenue = allOrders.reduce((s, o) => s + Number(o.total), 0);
      const avgOV = allOrders.length > 0 ? revenue / allOrders.length : 0;

      const dayMap: Record<string, { revenue: number; orders: number }> = {};
      const statusMap: Record<string, number> = {};
      allOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        if (!dayMap[key]) dayMap[key] = { revenue: 0, orders: 0 };
        dayMap[key].revenue += Number(o.total);
        dayMap[key].orders += 1;
        statusMap[o.status] = (statusMap[o.status] || 0) + 1;
      });

      const coStatusMap: Record<string, number> = {};
      (coAllRes.data ?? []).forEach((c: any) => {
        coStatusMap[c.status] = (coStatusMap[c.status] || 0) + 1;
      });

      const { data: items } = await supabase.from("order_items").select("product_name, quantity, total_price");
      const prodMap: Record<string, { qty: number; rev: number }> = {};
      (items ?? []).forEach((i) => {
        if (!prodMap[i.product_name]) prodMap[i.product_name] = { qty: 0, rev: 0 };
        prodMap[i.product_name].qty += i.quantity;
        prodMap[i.product_name].rev += Number(i.total_price);
      });

      const totalPoints = (loyaltyRes.data ?? []).reduce((s, p) => s + (p.points || 0), 0);

      const { data: recentOrd } = await supabase.from("orders")
        .select("id, total, status, created_at")
        .order("created_at", { ascending: false }).limit(8);

      // Unanswered custom messages: custom orders where last message sender_role = 'user'
      const { data: coWithMessages } = await supabase
        .from("custom_order_messages")
        .select("custom_order_id, sender_role, created_at")
        .order("created_at", { ascending: false });
      
      const lastMsgByOrder: Record<string, string> = {};
      (coWithMessages ?? []).forEach((m) => {
        if (!lastMsgByOrder[m.custom_order_id]) {
          lastMsgByOrder[m.custom_order_id] = m.sender_role;
        }
      });
      const unanswered = Object.values(lastMsgByOrder).filter(r => r === "user").length;

      // Generate insights
      const insights: DashboardData["insights"] = [];
      if (allOrders.length > 0) insights.push({ message: `${allOrders.length} orders in this period generating ${revenue.toFixed(0)} kr revenue.`, type: "positive" });
      if ((pendingOrdRes.count ?? 0) > 3) insights.push({ message: `${pendingOrdRes.count} orders pending — consider processing soon.`, type: "warning" });
      if ((quotesRes.count ?? 0) > 0) insights.push({ message: `${quotesRes.count} custom quotes awaiting customer response.`, type: "neutral" });
      if ((lowStockRes.data ?? []).length > 0) insights.push({ message: `${lowStockRes.data!.length} products have low stock (≤5 units).`, type: "warning" });
      if ((pendingShowRes.count ?? 0) > 0) insights.push({ message: `${pendingShowRes.count} community showcases pending approval.`, type: "neutral" });

      if (!mounted) return;
      setData({
        revenue, ordersCount: allOrders.length, avgOrderValue: avgOV,
        productsCount: productsRes.count ?? 0, clientsCount: profilesRes.count ?? 0,
        customOrdersActive: activeCoRes.count ?? 0, reviewsTotal: 0,
        pendingOrders: pendingOrdRes.count ?? 0, pendingReviews: pendingRevRes.count ?? 0,
        pendingShowcases: pendingShowRes.count ?? 0, quotesAwaiting: quotesRes.count ?? 0,
        loyaltyPointsIssued: totalPoints, vouchersRedeemed: vouchersRes.count ?? 0,
        revenueByDay: Object.entries(dayMap).map(([name, v]) => ({ name, ...v })),
        ordersByStatus: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
        topProducts: Object.entries(prodMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 6).map(([name, v]) => ({ name, ...v })),
        recentOrders: recentOrd ?? [],
        customOrdersByStatus: Object.entries(coStatusMap).map(([name, value]) => ({ name, value })),
        lowStockProducts: (lowStockRes.data ?? []) as any,
        insights,
        draftBlocksCount: draftBlocksRes.count ?? 0,
        scheduledPublishCount: (scheduledBlocksRes.count ?? 0) + (scheduledProductsRes.count ?? 0),
        draftProductsCount: draftProductsRes.count ?? 0,
        ordersAwaitingShipment: shipmentRes.count ?? 0,
        ordersOnHold: onHoldRes.count ?? 0,
        unansweredCustomMessages: unanswered,
        missingTranslations: missingTransRes.count ?? 0,
        outdatedTranslations: outdatedTransRes.count ?? 0,
      });
      setLoading(false);
    };

    fetch();
    return () => { mounted = false; };
  }, [period]);

  return { data, loading };
}
