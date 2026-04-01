import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerSegment {
  id: string;
  email: string | null;
  name: string;
  tier: "new" | "active" | "loyal" | "vip" | "dormant" | "at_risk";
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
  lastPurchase: string | null;
  daysSinceLastPurchase: number | null;
  pointsBalance: number;
  unusedVouchers: number;
  customOrderCount: number;
}

export interface RevenueOpportunity {
  id: string;
  title: string;
  description: string;
  type: "reorder" | "winback" | "upsell" | "bundle" | "loyalty" | "custom_followup";
  estimatedValue: number;
  priority: "high" | "medium" | "low";
  relatedCustomerId?: string;
  relatedProductId?: string;
  suggestedAction: string;
}

export interface RevenueMetrics {
  totalRevenue: number;
  repeatCustomerRate: number;
  avgOrderValue: number;
  customOrderRevenue: number;
  loyaltyDrivenPurchases: number;
  voucherDrivenRevenue: number;
  atRiskCustomers: number;
  dormantCustomers: number;
  revenueByCategory: { name: string; revenue: number }[];
  topSpenders: CustomerSegment[];
  segments: Record<CustomerSegment["tier"], number>;
  opportunities: RevenueOpportunity[];
  winbackCandidates: CustomerSegment[];
  retentionInsights: { message: string; type: "positive" | "neutral" | "warning" }[];
}

const EMPTY: RevenueMetrics = {
  totalRevenue: 0,
  repeatCustomerRate: 0,
  avgOrderValue: 0,
  customOrderRevenue: 0,
  loyaltyDrivenPurchases: 0,
  voucherDrivenRevenue: 0,
  atRiskCustomers: 0,
  dormantCustomers: 0,
  revenueByCategory: [],
  topSpenders: [],
  segments: { new: 0, active: 0, loyal: 0, vip: 0, dormant: 0, at_risk: 0 },
  opportunities: [],
  winbackCandidates: [],
  retentionInsights: [],
};

function classifyTier(orderCount: number, totalSpent: number, daysSince: number | null): CustomerSegment["tier"] {
  if (daysSince !== null && daysSince > 90) return "dormant";
  if (daysSince !== null && daysSince > 60 && totalSpent > 500) return "at_risk";
  if (totalSpent > 3000 || orderCount > 8) return "vip";
  if (orderCount >= 3 || totalSpent > 1000) return "loyal";
  if (orderCount >= 1) return "active";
  return "new";
}

export function useRevenueEngine() {
  const [data, setData] = useState<RevenueMetrics>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);

      const [
        ordersRes,
        profilesRes,
        customOrdersRes,
        loyaltyRes,
        vouchersRes,
        itemsRes,
        productsRes,
      ] = await Promise.all([
        supabase.from("orders").select("id, user_id, total, status, created_at"),
        supabase.from("profiles").select("id, user_id, full_name"),
        supabase.from("custom_orders").select("id, user_id, email, name, status, final_agreed_price, quoted_price, customer_response_status"),
        supabase.from("loyalty_points").select("user_id, points, reason"),
        supabase.from("user_vouchers").select("user_id, is_used, balance, vouchers(discount_value, discount_type)"),
        supabase.from("order_items").select("product_id, product_name, quantity, total_price"),
        supabase.from("products").select("id, name, category_id, price, is_featured, stock"),
      ]);

      if (!mounted) return;

      const orders = ordersRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const customOrders = customOrdersRes.data ?? [];
      const loyalty = loyaltyRes.data ?? [];
      const vouchers = vouchersRes.data ?? [];
      const items = itemsRes.data ?? [];
      const products = productsRes.data ?? [];

      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
      const now = Date.now();

      // Build per-user metrics
      const userMap = new Map<string, {
        orders: typeof orders;
        customOrders: typeof customOrders;
        points: number;
        unusedVouchers: number;
      }>();

      orders.forEach((o) => {
        if (!o.user_id) return;
        const u = userMap.get(o.user_id) ?? { orders: [], customOrders: [], points: 0, unusedVouchers: 0 };
        u.orders.push(o);
        userMap.set(o.user_id, u);
      });

      customOrders.forEach((co) => {
        const u = userMap.get(co.user_id) ?? { orders: [], customOrders: [], points: 0, unusedVouchers: 0 };
        u.customOrders.push(co);
        userMap.set(co.user_id, u);
      });

      loyalty.forEach((l) => {
        const u = userMap.get(l.user_id) ?? { orders: [], customOrders: [], points: 0, unusedVouchers: 0 };
        u.points += l.points;
        userMap.set(l.user_id, u);
      });

      vouchers.forEach((v) => {
        const u = userMap.get(v.user_id) ?? { orders: [], customOrders: [], points: 0, unusedVouchers: 0 };
        if (!v.is_used) u.unusedVouchers++;
        userMap.set(v.user_id, u);
      });

      // Also ensure profiles without orders are included
      profiles.forEach((p) => {
        if (!userMap.has(p.user_id)) {
          userMap.set(p.user_id, { orders: [], customOrders: [], points: 0, unusedVouchers: 0 });
        }
      });

      const segments: CustomerSegment[] = [];
      const segmentCounts: Record<CustomerSegment["tier"], number> = { new: 0, active: 0, loyal: 0, vip: 0, dormant: 0, at_risk: 0 };

      userMap.forEach((u, userId) => {
        const totalSpent = u.orders.reduce((s, o) => s + Number(o.total), 0);
        const orderCount = u.orders.length;
        const avgOV = orderCount > 0 ? totalSpent / orderCount : 0;
        const lastOrder = u.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        const lastPurchase = lastOrder?.created_at ?? null;
        const daysSince = lastPurchase ? Math.floor((now - new Date(lastPurchase).getTime()) / 86400000) : null;
        const profile = profileMap.get(userId);
        const tier = classifyTier(orderCount, totalSpent, daysSince);

        segmentCounts[tier]++;
        segments.push({
          id: userId,
          email: null,
          name: profile?.full_name || "User",
          tier,
          totalSpent,
          orderCount,
          avgOrderValue: avgOV,
          lastPurchase,
          daysSinceLastPurchase: daysSince,
          pointsBalance: u.points,
          unusedVouchers: u.unusedVouchers,
          customOrderCount: u.customOrders.length,
        });
      });

      const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
      const usersWithMultipleOrders = segments.filter((s) => s.orderCount > 1).length;
      const usersWithOrders = segments.filter((s) => s.orderCount > 0).length;
      const repeatRate = usersWithOrders > 0 ? (usersWithMultipleOrders / usersWithOrders) * 100 : 0;
      const avgOV = orders.length > 0 ? totalRevenue / orders.length : 0;

      const customOrderRevenue = customOrders.reduce((s, co) => s + Number(co.final_agreed_price ?? co.quoted_price ?? 0), 0);

      const loyaltyPoints = loyalty.filter((l) => l.reason?.includes("purchase") || l.reason?.includes("order")).length;

      // Revenue by product
      const prodRevMap = new Map<string, number>();
      items.forEach((i) => {
        const current = prodRevMap.get(i.product_name) ?? 0;
        prodRevMap.set(i.product_name, current + Number(i.total_price));
      });
      const revenueByCategory = Array.from(prodRevMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, revenue]) => ({ name, revenue }));

      const topSpenders = [...segments].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
      const winbackCandidates = segments.filter((s) => s.tier === "dormant" || s.tier === "at_risk").sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

      // Generate opportunities
      const opportunities: RevenueOpportunity[] = [];

      // Win-back opportunities
      winbackCandidates.slice(0, 3).forEach((c) => {
        opportunities.push({
          id: `winback-${c.id}`,
          title: `Win back ${c.name}`,
          description: `${c.daysSinceLastPurchase}+ days since last order. Previous spend: ${c.totalSpent.toFixed(0)} kr`,
          type: "winback",
          estimatedValue: c.avgOrderValue * 0.6,
          priority: c.totalSpent > 1000 ? "high" : "medium",
          relatedCustomerId: c.id,
          suggestedAction: "Send personalized win-back offer",
        });
      });

      // Loyalty reactivation
      const nearReward = segments.filter((s) => s.pointsBalance > 200 && s.pointsBalance < 350 && s.tier !== "dormant");
      if (nearReward.length > 0) {
        opportunities.push({
          id: "loyalty-near-reward",
          title: `${nearReward.length} users close to reward milestone`,
          description: "Users with 200-350 points may convert with a small incentive.",
          type: "loyalty",
          estimatedValue: nearReward.length * avgOV * 0.3,
          priority: "medium",
          suggestedAction: "Offer bonus points promotion",
        });
      }

      // Unused vouchers
      const totalUnusedVouchers = segments.reduce((s, c) => s + c.unusedVouchers, 0);
      if (totalUnusedVouchers > 3) {
        opportunities.push({
          id: "unused-vouchers",
          title: `${totalUnusedVouchers} unused vouchers`,
          description: "Active vouchers not yet redeemed — remind users.",
          type: "loyalty",
          estimatedValue: totalUnusedVouchers * 50,
          priority: "low",
          suggestedAction: "Send voucher reminder campaign",
        });
      }

      // Custom order follow-up
      const pendingCustom = customOrders.filter((co) => co.status === "quoted" && co.customer_response_status === "pending");
      if (pendingCustom.length > 0) {
        opportunities.push({
          id: "custom-followup",
          title: `${pendingCustom.length} custom quotes awaiting response`,
          description: "Follow up to close pending custom order quotes.",
          type: "custom_followup",
          estimatedValue: pendingCustom.reduce((s, co) => s + Number(co.quoted_price ?? 0), 0),
          priority: "high",
          suggestedAction: "Review and follow up on pending quotes",
        });
      }

      // Low stock upsell
      const lowStockFeatured = products.filter((p) => p.stock <= 5 && p.stock > 0 && p.is_featured);
      if (lowStockFeatured.length > 0) {
        opportunities.push({
          id: "scarcity-upsell",
          title: `${lowStockFeatured.length} featured products nearly sold out`,
          description: "Create urgency campaigns for low-stock featured items.",
          type: "upsell",
          estimatedValue: lowStockFeatured.reduce((s, p) => s + Number(p.price) * p.stock, 0),
          priority: "medium",
          suggestedAction: "Add scarcity badges and promote",
        });
      }

      // Insights
      const retentionInsights: RevenueMetrics["retentionInsights"] = [];
      if (repeatRate > 20) retentionInsights.push({ message: `${repeatRate.toFixed(0)}% repeat customer rate — strong retention.`, type: "positive" });
      else if (repeatRate > 0) retentionInsights.push({ message: `${repeatRate.toFixed(0)}% repeat rate — room for improvement.`, type: "warning" });
      if (segmentCounts.dormant > 0) retentionInsights.push({ message: `${segmentCounts.dormant} dormant customers could be reactivated.`, type: "warning" });
      if (segmentCounts.at_risk > 0) retentionInsights.push({ message: `${segmentCounts.at_risk} high-value customers are at risk of churning.`, type: "warning" });
      if (segmentCounts.vip > 0) retentionInsights.push({ message: `${segmentCounts.vip} VIP customers driving premium revenue.`, type: "positive" });
      if (totalUnusedVouchers > 0) retentionInsights.push({ message: `${totalUnusedVouchers} unused vouchers represent untapped revenue.`, type: "neutral" });
      if (pendingCustom.length > 0) retentionInsights.push({ message: `${pendingCustom.length} custom quotes pending — estimated ${pendingCustom.reduce((s, co) => s + Number(co.quoted_price ?? 0), 0).toFixed(0)} kr opportunity.`, type: "neutral" });

      setData({
        totalRevenue,
        repeatCustomerRate: repeatRate,
        avgOrderValue: avgOV,
        customOrderRevenue,
        loyaltyDrivenPurchases: loyaltyPoints,
        voucherDrivenRevenue: totalUnusedVouchers * 50,
        atRiskCustomers: segmentCounts.at_risk,
        dormantCustomers: segmentCounts.dormant,
        revenueByCategory,
        topSpenders,
        segments: segmentCounts,
        opportunities: opportunities.sort((a, b) => {
          const p = { high: 0, medium: 1, low: 2 };
          return p[a.priority] - p[b.priority];
        }),
        winbackCandidates,
        retentionInsights,
      });
      setLoading(false);
    };

    run();
    return () => { mounted = false; };
  }, []);

  return { data, loading };
}
